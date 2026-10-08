import type { SorryGiftProjectV1 } from '../project/schema';

export interface AdminProjectSummary {
  projectId: string;
  status: SorryGiftProjectV1['status'];
  mascotId: SorryGiftProjectV1['mascotId'];
  paletteId: SorryGiftProjectV1['paletteId'];
  recipient: string;
  sender: string;
  updatedAt: string;
  publishedAt: string | null;
  studioUrl: string;
  giftUrl: string | null;
}

export interface GeneratedProject {
  project: SorryGiftProjectV1;
  studioUrl: string;
  giftUrl: string | null;
  editToken: string;
}

export interface UploadResult {
  url: string;
  key: string;
  contentType: string;
  size: number;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

const configuredBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const localApiBase = ['127.0.0.1', 'localhost'].includes(window.location.hostname)
  ? 'http://127.0.0.1:8787'
  : '';
export const API_BASE_URL = (configuredBase || localApiBase).replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError('API production belum dikonfigurasi. Set VITE_API_BASE_URL saat build.', 0);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init.headers },
  });
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new ApiError(payload?.error || `Request failed (${response.status}).`, response.status, payload);
  return payload as T;
}

export function getPublishedGift(projectId: string): Promise<{ project: SorryGiftProjectV1 }> {
  return request(`/api/gift/${encodeURIComponent(projectId)}`);
}

export function getStudioProject(projectId: string, token: string): Promise<{ project: SorryGiftProjectV1 }> {
  return request(`/api/studio/${encodeURIComponent(projectId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function saveStudioProject(projectId: string, token: string, project: SorryGiftProjectV1, publish = false): Promise<{ project: SorryGiftProjectV1; giftUrl: string | null }> {
  return request(`/api/studio/${encodeURIComponent(projectId)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, publish }),
  });
}

export function uploadMedia(
  projectId: string,
  token: string,
  kind: 'audio' | 'cover',
  file: File,
  onProgress: (progress: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    if (!API_BASE_URL) {
      reject(new ApiError('API production belum dikonfigurasi. Set VITE_API_BASE_URL saat build.', 0));
      return;
    }
    const body = new FormData();
    body.append('projectId', projectId);
    body.append('kind', kind);
    body.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener('load', () => {
      let payload: UploadResult & { error?: string };
      try {
        payload = JSON.parse(xhr.responseText || '{}') as UploadResult & { error?: string };
      } catch {
        payload = {} as UploadResult;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
      else reject(new ApiError(payload.error || 'Upload gagal.', xhr.status, payload));
    });
    xhr.addEventListener('error', () => reject(new ApiError('API upload tidak dapat dihubungi. Jalankan Worker lokal atau periksa VITE_API_BASE_URL.', 0)));
    xhr.addEventListener('abort', () => reject(new ApiError('Upload dibatalkan.', 0)));
    xhr.addEventListener('timeout', () => reject(new ApiError('Upload terlalu lama. Silakan coba lagi.', 0)));
    xhr.timeout = 120_000;
    xhr.send(body);
  });
}

function adminHeaders(secret: string): HeadersInit {
  return { 'X-Admin-Secret': secret };
}

export function listAdminProjects(secret: string): Promise<{ projects: AdminProjectSummary[] }> {
  return request('/api/admin/projects', { headers: adminHeaders(secret) });
}

export function createAdminProject(secret: string, idempotencyKey: string): Promise<GeneratedProject> {
  return request('/api/admin/projects', {
    method: 'POST',
    headers: { ...adminHeaders(secret), 'Idempotency-Key': idempotencyKey, 'Content-Type': 'application/json' },
    body: '{}',
  });
}

export function updateAdminProject(secret: string, projectId: string, status: SorryGiftProjectV1['status']): Promise<{ project: SorryGiftProjectV1 }> {
  return request(`/api/admin/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    headers: { ...adminHeaders(secret), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export function deleteAdminProject(secret: string, projectId: string): Promise<{ deleted: true }> {
  return request(`/api/admin/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
    headers: adminHeaders(secret),
  });
}
