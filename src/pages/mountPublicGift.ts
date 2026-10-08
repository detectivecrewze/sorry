import { ApiError, getPublishedGift } from '../api/client';
import { projectToGiftConfig } from '../project/adapter';
import { mountGift } from '../renderer/mountGift';
import { el } from '../ui/dom';

export async function mountPublicGift(target: HTMLElement, projectId: string): Promise<() => void> {
  const loading = el('main', 'access-state access-state--gift');
  loading.append(el('div', 'loading-mark'), el('h1', '', 'Membuka surat…'));
  target.replaceChildren(loading);
  try {
    const { project } = await getPublishedGift(projectId);
    return mountGift(target, projectToGiftConfig(project));
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0;
    const root = el('main', 'access-state access-state--gift');
    root.append(
      el('span', 'eyebrow', status === 410 ? 'Gift archived' : 'Private gift'),
      el('h1', '', status === 410 ? 'Surat ini sedang tidak tersedia' : 'Surat belum dapat dibuka'),
      el('p', '', error instanceof Error ? error.message : 'Coba buka kembali beberapa saat lagi.'),
    );
    target.replaceChildren(root);
    return () => target.replaceChildren();
  }
}
