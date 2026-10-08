import { describe, expect, it } from 'vitest';
import worker, { type WorkerEnv } from '../worker/src/index';
import { demoProject } from '../src/project/fixture';

class MockKV {
  values = new Map<string, string>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async put(key: string, value: string) { this.values.set(key, value); }
  async delete(key: string) { this.values.delete(key); }
  async list(options: { prefix?: string } = {}) {
    return { keys: [...this.values.keys()].filter((key) => key.startsWith(options.prefix || '')).map((name) => ({ name })), list_complete: true };
  }
}

class MockR2 {
  values = new Map<string, { data: ArrayBuffer; contentType?: string }>();
  async put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }) {
    this.values.set(key, { data: value, contentType: options?.httpMetadata?.contentType });
  }
  async get(key: string) {
    const value = this.values.get(key);
    if (!value) return null;
    return {
      body: new Blob([value.data]).stream(),
      httpMetadata: { contentType: value.contentType },
    };
  }
  async delete(keys: string | string[]) { for (const key of Array.isArray(keys) ? keys : [keys]) this.values.delete(key); }
  async list(options: { prefix?: string } = {}) {
    return { objects: [...this.values.keys()].filter((key) => key.startsWith(options.prefix || '')).map((key) => ({ key })), truncated: false };
  }
}

function environment(): WorkerEnv {
  return {
    GIFT_KV: new MockKV(), MEDIA_BUCKET: new MockR2(),
    MEDIA_BASE_URL: 'https://cdn.example.test', PUBLIC_GIFT_BASE_URL: 'https://gift.example.test',
    PUBLIC_STUDIO_BASE_URL: 'https://gift.example.test', ADMIN_SECRET: 'admin-test-secret',
    PROJECT_SIGNING_SECRET: 'a-long-test-signing-secret', ALLOWED_ORIGINS: 'https://gift.example.test',
  };
}

async function call(env: WorkerEnv, path: string, init: RequestInit = {}) {
  const request = new Request(`https://api.example.test${path}`, init);
  const response = await worker.fetch(request, env);
  const body = await response.json() as any;
  return { response, body };
}

describe('sorry-letter Worker', () => {
  it('keeps drafts separate, publishes, archives and deletes all media', async () => {
    const env = environment();
    const adminHeaders = { 'X-Admin-Secret': 'admin-test-secret', 'Idempotency-Key': 'same-request', 'Content-Type': 'application/json' };
    const first = await call(env, '/api/admin/projects', { method: 'POST', headers: adminHeaders, body: '{}' });
    expect(first.response.status).toBe(201);
    expect(first.body.project.projectId).toMatch(/^sorry-[a-f0-9]{16}$/);
    expect(first.body.studioUrl).toContain('#token=');
    const repeated = await call(env, '/api/admin/projects', { method: 'POST', headers: adminHeaders, body: '{}' });
    expect(repeated.body.project.projectId).toBe(first.body.project.projectId);

    const id = first.body.project.projectId as string;
    const token = first.body.editToken as string;
    const studioHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const draft = { ...first.body.project, identity: { recipient: 'Draft Recipient', sender: 'Draft Sender' } };
    expect((await call(env, `/api/studio/${id}`, { method: 'PUT', headers: studioHeaders, body: JSON.stringify({ project: draft }) })).response.status).toBe(200);
    expect((await call(env, `/api/gift/${id}`)).response.status).toBe(404);

    const incompletePublish = await call(env, `/api/studio/${id}`, { method: 'PUT', headers: studioHeaders, body: JSON.stringify({ project: draft, publish: true }) });
    expect(incompletePublish.response.status).toBe(422);

    const complete = {
      ...demoProject, projectId: id, status: 'draft', createdAt: draft.createdAt,
      updatedAt: draft.updatedAt, publishedAt: null, mascotId: 'brown-bear', paletteId: 'forest',
    };
    const published = await call(env, `/api/studio/${id}`, { method: 'PUT', headers: studioHeaders, body: JSON.stringify({ project: complete, publish: true }) });
    expect(published.response.status).toBe(200);
    expect(published.body.project.status).toBe('published');
    const publicBefore = await call(env, `/api/gift/${id}`);
    expect(publicBefore.response.status).toBe(200);
    expect(publicBefore.body.project.intro.title).toBe(complete.intro.title);

    const editedDraft = { ...published.body.project, intro: { ...published.body.project.intro, title: 'Draft only title' } };
    await call(env, `/api/studio/${id}`, { method: 'PUT', headers: studioHeaders, body: JSON.stringify({ project: editedDraft }) });
    const publicAfter = await call(env, `/api/gift/${id}`);
    expect(publicAfter.body.project.intro.title).toBe(complete.intro.title);

    const form = new FormData(); form.set('projectId', id); form.set('kind', 'cover');
    form.set('file', new Blob(['image'], { type: 'image/png' }), 'cover.png');
    const upload = await call(env, '/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
    expect(upload.response.status).toBe(201);
    expect((env.MEDIA_BUCKET as MockR2).values.size).toBe(1);
    expect(upload.body.url).toBe(`https://cdn.example.test/${upload.body.key}`);

    const admin = { 'X-Admin-Secret': 'admin-test-secret', 'Content-Type': 'application/json' };
    await call(env, `/api/admin/projects/${id}`, { method: 'PATCH', headers: admin, body: JSON.stringify({ status: 'archived' }) });
    expect((await call(env, `/api/gift/${id}`)).response.status).toBe(410);
    await call(env, `/api/admin/projects/${id}`, { method: 'PATCH', headers: admin, body: JSON.stringify({ status: 'published' }) });
    expect((await call(env, `/api/gift/${id}`)).response.status).toBe(200);

    expect((await call(env, `/api/admin/projects/${id}`, { method: 'DELETE', headers: admin })).body.deleted).toBe(true);
    expect((env.MEDIA_BUCKET as MockR2).values.size).toBe(0);
    expect((await call(env, `/api/studio/${id}`, { headers: { Authorization: `Bearer ${token}` } })).response.status).toBe(404);
  });

  it('rejects bad admin credentials and upload formats', async () => {
    const env = environment();
    expect((await call(env, '/api/admin/projects', { headers: { 'X-Admin-Secret': 'wrong' } })).response.status).toBe(401);
    const created = await call(env, '/api/admin/projects', { method: 'POST', headers: { 'X-Admin-Secret': 'admin-test-secret' } });
    const form = new FormData(); form.set('projectId', created.body.project.projectId); form.set('kind', 'audio');
    form.set('file', new Blob(['not audio'], { type: 'text/plain' }), 'bad.txt');
    const result = await call(env, '/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${created.body.editToken}` }, body: form });
    expect(result.response.status).toBe(415);

    const oversized = new FormData(); oversized.set('projectId', created.body.project.projectId); oversized.set('kind', 'audio');
    oversized.set('file', new Blob([new Uint8Array(25 * 1024 * 1024 + 1)], { type: 'audio/mpeg' }), 'large.mp3');
    const tooLarge = await call(env, '/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${created.body.editToken}` }, body: oversized });
    expect(tooLarge.response.status).toBe(413);
  });

  it('allows only explicitly configured browser origins', async () => {
    const env = environment();
    const allowed = await call(env, '/api/health', { headers: { Origin: 'https://gift.example.test' } });
    expect(allowed.response.status).toBe(200);
    expect(allowed.response.headers.get('Access-Control-Allow-Origin')).toBe('https://gift.example.test');

    const rejected = await call(env, '/api/health', { headers: { Origin: 'https://untrusted.example.test' } });
    expect(rejected.response.status).toBe(403);
    expect(rejected.response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('serves locally uploaded media from the Worker in local development', async () => {
    const env = environment();
    const created = await call(env, '/api/admin/projects', { method: 'POST', headers: { 'X-Admin-Secret': 'admin-test-secret' } });
    const form = new FormData();
    form.set('projectId', created.body.project.projectId);
    form.set('kind', 'cover');
    form.set('file', new Blob(['image'], { type: 'image/webp' }), 'cover.webp');
    const request = new Request('http://127.0.0.1:8787/api/upload', {
      method: 'POST', headers: { Authorization: `Bearer ${created.body.editToken}` }, body: form,
    });
    const response = await worker.fetch(request, env);
    const uploaded = await response.json() as { url: string; key: string };
    expect(uploaded.url).toBe(`http://127.0.0.1:8787/api/media/${uploaded.key}`);

    const media = await worker.fetch(new Request(uploaded.url), env);
    expect(media.status).toBe(200);
    expect(media.headers.get('Content-Type')).toBe('image/webp');
    expect(await media.text()).toBe('image');
  });
});
