import { projectToGiftConfig } from '../project/adapter';
import type { SorryGiftProjectV1 } from '../project/schema';
import { mountGift } from '../renderer/mountGift';
import type { SceneId } from '../state/machine';
import { button, el, trapFocus } from '../ui/dom';

export interface PreviewSceneTab {
  label: string;
  scene: SceneId;
}

export interface StudioPreviewRequest {
  title: string;
  description: string;
  initialScene: SceneId;
  tabs?: PreviewSceneTab[];
}

interface LivePreviewOptions {
  getProject: () => SorryGiftProjectV1;
  beforeOpen: () => void;
}

export interface StudioLivePreviewController {
  open: (request: StudioPreviewRequest, trigger: HTMLElement) => void;
  close: () => void;
  destroy: () => void;
}

const BOLT_ICON_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7v8l11-12h-8l0-8z"/></svg>';
const MOTION_ICON_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 6.9 7.1.3-5.5 4.6 1.9 6.9L12 16.8 6.1 20.7l1.9-6.9-5.5-4.6 7.1-.3z"/></svg>';
const CLOSE_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

export function createStudioLivePreview(options: LivePreviewOptions): StudioLivePreviewController {
  let modal: HTMLElement | null = null;
  let restoreFocus: HTMLElement | null = null;
  let giftCleanup: (() => void) | null = null;
  let isInstantText = true;

  const close = (): void => {
    if (!modal) return;
    giftCleanup?.();
    giftCleanup = null;
    modal.remove();
    modal = null;
    document.body.classList.remove('has-modal');
    const target = restoreFocus;
    restoreFocus = null;
    window.requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  };

  const open = (request: StudioPreviewRequest, trigger: HTMLElement): void => {
    close();
    options.beforeOpen();
    restoreFocus = trigger;
    modal = el('div', 'studio-live-preview');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'studio-live-preview-title');

    const card = el('section', 'studio-live-preview__card');
    const header = el('header', 'studio-live-preview__header');
    const heading = el('div', 'studio-live-preview__heading');
    heading.append(el('span', 'eyebrow', 'Live Preview'));
    const title = el('h2', '', request.title);
    title.id = 'studio-live-preview-title';
    heading.append(title, el('p', '', request.description));

    const headerActions = el('div', 'studio-live-preview__header-actions');
    const modeToggle = button('', 'studio-live-preview__mode-toggle');
    const updateModeToggleUI = (): void => {
      modeToggle.innerHTML = isInstantText
        ? `${BOLT_ICON_SVG}<span>Teks Instan</span>`
        : `${MOTION_ICON_SVG}<span>Animasi Ketik</span>`;
      modeToggle.classList.toggle('is-animated', !isInstantText);
    };
    updateModeToggleUI();
    modeToggle.setAttribute('title', 'Alihkan antara teks instan cepat atau simulasi animasi ketik');
    modeToggle.setAttribute('aria-label', 'Alihkan mode tampilan teks preview');

    const closeButton = button('', 'studio-live-preview__close');
    closeButton.innerHTML = CLOSE_ICON_SVG;
    closeButton.setAttribute('aria-label', 'Tutup live preview');
    closeButton.addEventListener('click', close);
    headerActions.append(modeToggle, closeButton);
    header.append(heading, headerActions);

    const tabs = el('div', 'studio-live-preview__tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Bagian preview');
    const stage = el('div', 'studio-live-preview__stage');
    const device = el('div', 'studio-live-preview__device');
    stage.append(device);

    let activeScene = request.initialScene;

    const mountScene = (scene: SceneId): void => {
      activeScene = scene;
      giftCleanup?.();
      giftCleanup = mountGift(device, projectToGiftConfig(options.getProject()), {
        embedded: true,
        initialScene: scene,
        instantText: isInstantText,
        onSceneChange: (newScene) => {
          activeScene = newScene;
          [...tabs.querySelectorAll<HTMLButtonElement>('button')].forEach((tab) => {
            const isSelected = tab.dataset.scene === newScene;
            tab.setAttribute('aria-selected', String(isSelected));
            if (isSelected) {
              tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }
          });
        },
      });
      [...tabs.querySelectorAll<HTMLButtonElement>('button')].forEach((tab) => {
        const isSelected = tab.dataset.scene === activeScene;
        tab.setAttribute('aria-selected', String(isSelected));
        if (isSelected) {
          tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      });
    };

    modeToggle.addEventListener('click', () => {
      isInstantText = !isInstantText;
      updateModeToggleUI();
      mountScene(activeScene);
    });

    for (const tabDefinition of request.tabs ?? []) {
      const tab = button(tabDefinition.label, 'studio-live-preview__tab');
      tab.dataset.scene = tabDefinition.scene;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(tabDefinition.scene === activeScene));
      tab.addEventListener('click', () => mountScene(tabDefinition.scene));
      tabs.append(tab);
    }
    tabs.hidden = !tabs.childElementCount;

    card.append(header, tabs, stage);
    modal.append(card);
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
      else trapFocus(modal!, event);
    });
    modal.addEventListener('mousedown', (event) => { if (event.target === modal) close(); });
    document.body.append(modal);
    document.body.classList.add('has-modal');
    mountScene(activeScene);
    closeButton.focus();
  };

  return { open, close, destroy: close };
}
