import { createBlankProject } from '../../src/project/fixture';
import { normalizeProject, validateProjectForPublish, type SorryGiftProjectV1 } from '../../src/project/schema';

interface KVListKey { name: string }
interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string }): Promise<{ keys: KVListKey[]; cursor?: string; list_complete: boolean }>;
}

interface R2ObjectLike { key: string }
interface R2StoredObjectLike {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  writeHttpMetadata?(headers: Headers): void;
}
interface R2BucketLike {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<R2StoredObjectLike | null>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: { prefix?: string; cursor?: string }): Promise<{ objects: R2ObjectLike[]; cursor?: string; truncated: boolean }>;
}

export interface WorkerEnv {
  GIFT_KV: KVNamespaceLike;
  MEDIA_BUCKET: R2BucketLike;
  MEDIA_BASE_URL: string;
  PUBLIC_GIFT_BASE_URL: string;
  PUBLIC_STUDIO_BASE_URL: string;
  ADMIN_SECRET: string;
  PROJECT_SIGNING_SECRET: string;
  ALLOWED_ORIGINS: string;
}

const projectKey = (id: string) => `sorry-letter:project:${id}`;
const draftKey = (id: string) => `sorry-letter:draft:${id}`;
const idempotencyKey = (hash: string) => `sorry-letter:idempotency:${hash}`;
const PROJECT_ID_PATTERN = /^sorry-[a-f0-9]{16}$/;

class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly details?: unknown) {
    super(message);
  }
}

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

function allowedOrigin(request: Request, env: WorkerEnv): string {
  const origin = request.headers.get('Origin') || '';
  const configured = (env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (!origin) return '';
  if (configured.includes(origin)) return origin;
  throw new HttpError(403, 'Origin tidak diizinkan.');
}

function corsHeaders(request: Request, env: WorkerEnv): HeadersInit {
  const origin = allowedOrigin(request, env);
  return origin ? {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Admin-Secret, Idempotency-Key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  } : {};
}

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function deriveEditToken(projectId: string, secret: string): Promise<string> {
  if (!secret) throw new HttpError(500, 'PROJECT_SIGNING_SECRET belum dikonfigurasi.');
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`edit:${projectId}`));
  return toBase64Url(new Uint8Array(signature));
}

async function verifyStudio(request: Request, env: WorkerEnv, projectId: string): Promise<void> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  if (!token) throw new HttpError(401, 'Magic link tidak ditemukan.');
  const raw = await env.GIFT_KV.get(projectKey(projectId));
  if (!raw) throw new HttpError(404, 'Project tidak ditemukan.');
  const record = JSON.parse(raw) as SorryGiftProjectV1 & { editTokenHash?: string };
  const storedHash = record.editTokenHash || '';
  if (!storedHash || await digest(token) !== storedHash) throw new HttpError(401, 'Magic link tidak valid.');
}

function verifyAdmin(request: Request, env: WorkerEnv): void {
  if (!env.ADMIN_SECRET) throw new HttpError(500, 'ADMIN_SECRET belum dikonfigurasi.');
  if (request.headers.get('X-Admin-Secret') !== env.ADMIN_SECRET) throw new HttpError(401, 'Password admin salah.');
}

function publicProject(record: SorryGiftProjectV1 & { editTokenHash?: string }): SorryGiftProjectV1 {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'editTokenHash')) as unknown as SorryGiftProjectV1;
}

function baseUrl(value: string): string {
  return (value || '').replace(/\/$/, '');
}

function mediaUrl(request: Request, env: WorkerEnv, key: string): string {
  const requestUrl = new URL(request.url);
  if (['127.0.0.1', 'localhost'].includes(requestUrl.hostname)) {
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return `${requestUrl.origin}/api/media/${encodedKey}`;
  }
  return `${baseUrl(env.MEDIA_BASE_URL)}/${key}`;
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    throw new HttpError(400, 'Payload JSON tidak valid.');
  }
}

async function getRecord(env: WorkerEnv, key: string): Promise<(SorryGiftProjectV1 & { editTokenHash?: string }) | null> {
  const raw = await env.GIFT_KV.get(key);
  return raw ? JSON.parse(raw) : null;
}

function randomProjectId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `sorry-${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function buildAdminPayload(env: WorkerEnv, project: SorryGiftProjectV1): Promise<{
  project: SorryGiftProjectV1; editToken: string; studioUrl: string; giftUrl: string | null;
}> {
  const editToken = await deriveEditToken(project.projectId, env.PROJECT_SIGNING_SECRET);
  return {
    project,
    editToken,
    studioUrl: `${baseUrl(env.PUBLIC_STUDIO_BASE_URL)}${baseUrl(env.PUBLIC_STUDIO_BASE_URL).endsWith('/studio') ? '' : '/studio'}/${project.projectId}#token=${editToken}`,
    giftUrl: project.publishedAt && project.status === 'published'
      ? `${baseUrl(env.PUBLIC_GIFT_BASE_URL)}${baseUrl(env.PUBLIC_GIFT_BASE_URL).endsWith('/gift') ? '' : '/gift'}/${project.projectId}`
      : null,
  };
}

async function listAllKeys(kv: KVNamespaceLike, prefix: string): Promise<KVListKey[]> {
  const keys: KVListKey[] = [];
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix, cursor });
    keys.push(...page.keys);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return keys;
}

async function deleteMediaPrefix(bucket: R2BucketLike, prefix: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor });
    if (page.objects.length) await bucket.delete(page.objects.map((item) => item.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

async function route(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (path === '/api/health' && request.method === 'GET') {
    return json({
      ok: Boolean(env.GIFT_KV && env.MEDIA_BUCKET && env.MEDIA_BASE_URL),
      service: 'sorry-letter-api',
      storage: {
        kv: Boolean(env.GIFT_KV),
        r2: Boolean(env.MEDIA_BUCKET),
        mediaBaseUrl: Boolean(env.MEDIA_BASE_URL),
      },
    });
  }

  const mediaMatch = path.match(/^\/api\/media\/(sorry-letter\/[^/]+\/(?:audio|covers)\/[^/]+)$/);
  if (mediaMatch && request.method === 'GET') {
    if (!env.MEDIA_BUCKET) throw new HttpError(503, 'Binding R2 belum dikonfigurasi.');
    const key = decodeURIComponent(mediaMatch[1]);
    const object = await env.MEDIA_BUCKET.get(key);
    if (!object) throw new HttpError(404, 'Media tidak ditemukan.');
    const headers = new Headers({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
    object.writeHttpMetadata?.(headers);
    if (!headers.has('Content-Type') && object.httpMetadata?.contentType) {
      headers.set('Content-Type', object.httpMetadata.contentType);
    }
    return new Response(object.body, { headers });
  }

  const giftMatch = path.match(/^\/api\/gift\/([^/]+)$/);
  if (giftMatch && request.method === 'GET') {
    const record = await getRecord(env, projectKey(decodeURIComponent(giftMatch[1])));
    if (!record || record.status === 'draft') throw new HttpError(404, 'Gift belum dipublikasikan.');
    if (record.status === 'archived') throw new HttpError(410, 'Gift telah diarsipkan.');
    return json({ project: publicProject(record) }, 200, { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' });
  }

  const studioMatch = path.match(/^\/api\/studio\/([^/]+)$/);
  if (studioMatch) {
    const projectId = decodeURIComponent(studioMatch[1]);
    if (!PROJECT_ID_PATTERN.test(projectId)) throw new HttpError(400, 'Project ID tidak valid.');
    await verifyStudio(request, env, projectId);
    if (request.method === 'GET') {
      const record = await getRecord(env, draftKey(projectId)) || await getRecord(env, projectKey(projectId));
      if (!record) throw new HttpError(404, 'Project tidak ditemukan.');
      return json({ project: publicProject(record) }, 200, { 'Cache-Control': 'no-store' });
    }
    if (request.method === 'PUT') {
      const body = await readJson<{ project?: unknown; publish?: boolean }>(request);
      const base = await getRecord(env, draftKey(projectId)) || await getRecord(env, projectKey(projectId));
      if (!base) throw new HttpError(404, 'Project tidak ditemukan.');
      const normalized = normalizeProject(body.project, publicProject(base));
      if (normalized.projectId !== projectId) throw new HttpError(400, 'Project ID tidak boleh diubah.');
      const now = new Date().toISOString();
      normalized.createdAt = base.createdAt;
      normalized.updatedAt = now;
      normalized.publishedAt = base.publishedAt || null;
      normalized.status = base.status === 'archived' ? 'archived' : (base.publishedAt ? 'published' : 'draft');
      const withHash = { ...normalized, editTokenHash: base.editTokenHash };
      if (body.publish) {
        const issues = validateProjectForPublish(normalized);
        if (issues.length) throw new HttpError(422, 'Project belum lengkap.', { issues });
        normalized.status = 'published';
        normalized.publishedAt = now;
        const published = { ...normalized, editTokenHash: base.editTokenHash };
        await Promise.all([
          env.GIFT_KV.put(projectKey(projectId), JSON.stringify(published)),
          env.GIFT_KV.put(draftKey(projectId), JSON.stringify(published)),
        ]);
      } else {
        await env.GIFT_KV.put(draftKey(projectId), JSON.stringify(withHash));
      }
      return json({
        project: normalized,
        giftUrl: normalized.publishedAt ? `${baseUrl(env.PUBLIC_GIFT_BASE_URL)}/gift/${projectId}` : null,
      });
    }
  }

  if (path === '/api/upload' && request.method === 'POST') {
    if (!env.MEDIA_BUCKET) throw new HttpError(503, 'Binding R2 belum dikonfigurasi.');
    const form = await request.formData();
    const projectId = String(form.get('projectId') || '');
    const kind = String(form.get('kind') || '');
    const file = form.get('file');
    if (!PROJECT_ID_PATTERN.test(projectId)) throw new HttpError(400, 'Project ID tidak valid.');
    await verifyStudio(request, env, projectId);
    if (!(file instanceof File)) throw new HttpError(400, 'File belum dipilih.');
    const audioTypes = ['audio/mpeg', 'audio/mp3', 'audio/x-mpeg', 'audio/mpeg3', 'audio/x-mp3', 'audio/mpg'];
    const coverTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (kind === 'audio') {
      const hasMp3Extension = file.name.toLowerCase().endsWith('.mp3');
      const genericType = !file.type || file.type === 'application/octet-stream';
      if (!audioTypes.includes(file.type) && !(hasMp3Extension && genericType)) {
        throw new HttpError(415, 'Lagu harus berupa MP3.');
      }
      if (file.size > 25 * 1024 * 1024) throw new HttpError(413, 'Ukuran MP3 maksimal 25 MB.');
    } else if (kind === 'cover') {
      if (!coverTypes.includes(file.type)) throw new HttpError(415, 'Thumbnail harus JPG, PNG, atau WebP.');
      if (file.size > 8 * 1024 * 1024) throw new HttpError(413, 'Ukuran thumbnail maksimal 8 MB.');
    } else throw new HttpError(400, 'Jenis upload tidak valid.');
    const extension = kind === 'audio' ? 'mp3' : ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type] || 'bin');
    const key = `sorry-letter/${projectId}/${kind === 'audio' ? 'audio' : 'covers'}/${crypto.randomUUID()}.${extension}`;
    const contentType = kind === 'audio' ? 'audio/mpeg' : file.type;
    try {
      await env.MEDIA_BUCKET.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType },
        customMetadata: { projectId, kind, uploadedAt: new Date().toISOString() },
      });
    } catch {
      throw new HttpError(502, 'Media belum berhasil disimpan ke R2. Periksa binding bucket Worker.');
    }
    return json({ url: mediaUrl(request, env, key), key, contentType, size: file.size }, 201);
  }

  if (path === '/api/admin/projects') {
    verifyAdmin(request, env);
    if (request.method === 'GET') {
      const keys = await listAllKeys(env.GIFT_KV, 'sorry-letter:project:');
      const projects = (await Promise.all(keys.map(async ({ name }) => {
        const id = name.slice('sorry-letter:project:'.length);
        const draft = await getRecord(env, draftKey(id));
        const base = draft || await getRecord(env, name);
        if (!base) return null;
        const project = publicProject(base);
        const editToken = await deriveEditToken(id, env.PROJECT_SIGNING_SECRET);
        return {
          projectId: id, status: project.status, mascotId: project.mascotId, paletteId: project.paletteId,
          recipient: project.identity.recipient, sender: project.identity.sender,
          updatedAt: project.updatedAt, publishedAt: project.publishedAt,
          studioUrl: `${baseUrl(env.PUBLIC_STUDIO_BASE_URL)}/studio/${id}#token=${editToken}`,
          giftUrl: project.publishedAt && project.status === 'published' ? `${baseUrl(env.PUBLIC_GIFT_BASE_URL)}/gift/${id}` : null,
        };
      }))).filter(Boolean);
      projects.sort((a, b) => String(b?.updatedAt).localeCompare(String(a?.updatedAt)));
      return json({ projects }, 200, { 'Cache-Control': 'no-store' });
    }
    if (request.method === 'POST') {
      const rawIdempotency = request.headers.get('Idempotency-Key')?.trim() || crypto.randomUUID();
      const idHash = await digest(rawIdempotency);
      const existingId = await env.GIFT_KV.get(idempotencyKey(idHash));
      if (existingId) {
        const existing = await getRecord(env, draftKey(existingId)) || await getRecord(env, projectKey(existingId));
        if (existing) return json(await buildAdminPayload(env, publicProject(existing)));
      }
      const projectId = randomProjectId();
      const project = createBlankProject(projectId);
      const token = await deriveEditToken(projectId, env.PROJECT_SIGNING_SECRET);
      const record = { ...project, editTokenHash: await digest(token) };
      await Promise.all([
        env.GIFT_KV.put(projectKey(projectId), JSON.stringify(record)),
        env.GIFT_KV.put(draftKey(projectId), JSON.stringify(record)),
        env.GIFT_KV.put(idempotencyKey(idHash), projectId),
      ]);
      return json(await buildAdminPayload(env, project), 201);
    }
  }

  const adminProjectMatch = path.match(/^\/api\/admin\/projects\/([^/]+)$/);
  if (adminProjectMatch) {
    verifyAdmin(request, env);
    const projectId = decodeURIComponent(adminProjectMatch[1]);
    const base = await getRecord(env, projectKey(projectId));
    if (!base) throw new HttpError(404, 'Project tidak ditemukan.');
    if (request.method === 'PATCH') {
      const body = await readJson<{ status?: string }>(request);
      if (!['draft', 'published', 'archived'].includes(body.status || '')) throw new HttpError(400, 'Status tidak valid.');
      const draft = await getRecord(env, draftKey(projectId)) || base;
      const nextStatus = body.status === 'published' && !base.publishedAt ? 'draft' : body.status as SorryGiftProjectV1['status'];
      const nextBase = { ...base, status: nextStatus, updatedAt: new Date().toISOString() };
      const nextDraft = { ...draft, status: nextStatus, updatedAt: nextBase.updatedAt };
      await Promise.all([
        env.GIFT_KV.put(projectKey(projectId), JSON.stringify(nextBase)),
        env.GIFT_KV.put(draftKey(projectId), JSON.stringify(nextDraft)),
      ]);
      return json({ project: publicProject(nextDraft) });
    }
    if (request.method === 'DELETE') {
      const mappings = await listAllKeys(env.GIFT_KV, 'sorry-letter:idempotency:');
      const matchingMappings = [];
      for (const mapping of mappings) {
        if (await env.GIFT_KV.get(mapping.name) === projectId) matchingMappings.push(mapping.name);
      }
      await Promise.all([
        env.GIFT_KV.delete(projectKey(projectId)),
        env.GIFT_KV.delete(draftKey(projectId)),
        ...matchingMappings.map((key) => env.GIFT_KV.delete(key)),
        deleteMediaPrefix(env.MEDIA_BUCKET, `sorry-letter/${projectId}/`),
      ]);
      return json({ deleted: true });
    }
  }

  throw new HttpError(404, 'Endpoint tidak ditemukan.');
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    let cors: HeadersInit = {};
    try {
      cors = corsHeaders(request, env);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      const response = await route(request, env);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors)) headers.set(key, String(value));
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan pada server.';
      const details = error instanceof HttpError ? error.details : undefined;
      return json({ error: message, ...(details && typeof details === 'object' ? details : {}) }, status, cors);
    }
  },
};
