import '@fontsource/sacramento/latin-400.css';
import '@fontsource/caveat/latin-400.css';
import '@fontsource/caveat/latin-500.css';
import '@fontsource/caveat/latin-600.css';
import '@fontsource/caveat/latin-700.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import './styles.css';
import './workspace.css';

import { mountAdmin } from './admin/mountAdmin';
import { mountPublicGift } from './pages/mountPublicGift';
import { projectToGiftConfig } from './project/adapter';
import { demoProject } from './project/fixture';
import { mountGift } from './renderer/mountGift';
import { mountStudio } from './studio/mountStudio';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Gift root #app was not found.');
const root = app;

const path = window.location.pathname.replace(/\/+$/, '') || '/';
let cleanup: (() => void) | undefined;

async function route(): Promise<void> {
  if (path === '/admin') {
    document.documentElement.className = 'workspace-root';
    document.body.className = 'workspace-page admin-page';
    cleanup = mountAdmin(root);
    return;
  }
  const studioMatch = path.match(/^\/studio\/([^/]+)$/);
  if (studioMatch) {
    document.documentElement.className = 'workspace-root';
    document.body.className = 'workspace-page studio-page';
    cleanup = await mountStudio(root, decodeURIComponent(studioMatch[1]));
    return;
  }
  const giftMatch = path.match(/^\/gift\/([^/]+)$/);
  if (giftMatch) {
    document.documentElement.className = 'gift-root';
    document.body.className = 'gift-page';
    cleanup = await mountPublicGift(root, decodeURIComponent(giftMatch[1]));
    return;
  }
  document.documentElement.className = 'gift-root';
  document.body.className = 'gift-page';
  cleanup = mountGift(root, projectToGiftConfig(demoProject));
}

void route();
window.addEventListener('pagehide', () => cleanup?.(), { once: true });
