import '@fontsource/sacramento/latin-400.css';
import '@fontsource/caveat/latin-400.css';
import '@fontsource/caveat/latin-500.css';
import '@fontsource/caveat/latin-600.css';
import '@fontsource/caveat/latin-700.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/nunito-sans/latin-400.css';
import '@fontsource/nunito-sans/latin-500.css';
import '@fontsource/nunito-sans/latin-600.css';
import '@fontsource/nunito-sans/latin-700.css';
import '@fontsource/nunito-sans/latin-800.css';
import './styles.css';
import './workspace.css';

import { mountAdmin } from './admin/mountAdmin';
import { mountPublicGift } from './pages/mountPublicGift';
import { projectToGiftConfig } from './project/adapter';
import { demoProject } from './project/fixture';
import { resolvePaletteId } from './project/palettes';
import type { PaletteId } from './project/schema';
import { mountGift } from './renderer/mountGift';
import { mountStudio } from './studio/mountStudio';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Gift root #app was not found.');
const root = app;

const path = window.location.pathname.replace(/\/+$/, '') || '/';
let cleanup: (() => void) | undefined;

function getThemeOverride(): PaletteId | undefined {
  const searchParams = new URLSearchParams(window.location.search);
  const rawTheme = searchParams.get('theme') || searchParams.get('palette');
  return resolvePaletteId(rawTheme);
}

async function route(): Promise<void> {
  const themeOverride = getThemeOverride();

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
    cleanup = await mountPublicGift(root, decodeURIComponent(giftMatch[1]), themeOverride);
    return;
  }
  document.documentElement.className = 'gift-root';
  document.body.className = 'gift-page';
  const activeDemo = themeOverride ? { ...demoProject, paletteId: themeOverride } : demoProject;
  cleanup = mountGift(root, projectToGiftConfig(activeDemo));
}

void route();
window.addEventListener('pagehide', () => cleanup?.(), { once: true });
