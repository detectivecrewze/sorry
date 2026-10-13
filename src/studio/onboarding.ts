import type { ProjectLocale } from '../project/schema';
import { button, el, trapFocus } from '../ui/dom';
import { studioText, type StudioTranslator } from './localization';

const ONBOARDING_VERSION = 'v1';
const CLOSE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
const GUIDE_ICONS = [
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 5h14M5 12h14M5 19h14"/><circle cx="3" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="19" r="1" fill="currentColor" stroke="none"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M5 19h14"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/></svg>',
] as const;

export interface StudioOnboardingController {
  hasCompleted: () => boolean;
  open: (trigger?: HTMLElement | null, required?: boolean) => void;
  destroy: () => void;
}

interface StudioOnboardingOptions {
  projectId: string;
  getLocale: () => ProjectLocale;
  initialGuideLocale: ProjectLocale;
  onSelectLanguage: (locale: ProjectLocale, firstRun: boolean) => Promise<void>;
}

export function createStudioOnboarding(options: StudioOnboardingOptions): StudioOnboardingController {
  const storageKey = `sorry-letter:studio-onboarding:${ONBOARDING_VERSION}:${options.projectId}`;
  let backdrop: HTMLElement | null = null;
  let restoreFocus: HTMLElement | null = null;
  let mandatory = false;
  let busy = false;
  let guideLocale = options.initialGuideLocale;

  const hasCompleted = (): boolean => {
    try { return window.localStorage.getItem(storageKey) === 'complete'; } catch { return false; }
  };

  const markCompleted = (): void => {
    try { window.localStorage.setItem(storageKey, 'complete'); } catch { /* Storage may be disabled. */ }
  };

  const close = (): void => {
    if (!backdrop || mandatory || busy) return;
    const target = restoreFocus;
    backdrop.remove();
    backdrop = null;
    restoreFocus = null;
    document.body.classList.remove('has-modal');
    window.requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  };

  const finishClose = (): void => {
    if (!backdrop) return;
    const target = restoreFocus;
    backdrop.remove();
    backdrop = null;
    restoreFocus = null;
    mandatory = false;
    busy = false;
    document.body.classList.remove('has-modal');
    window.requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  };

  const renderLanguage = (): void => {
    if (!backdrop) return;
    const t: StudioTranslator = (key, variables) => studioText(guideLocale, key, variables);
    const card = backdrop.querySelector<HTMLElement>('.studio-onboarding__card');
    if (!card) return;
    card.replaceChildren();

    const header = el('header', 'studio-onboarding__header');
    const heading = el('div');
    heading.append(el('span', 'eyebrow', t('onboarding.languageKicker')), el('h2', '', t('onboarding.languageTitle')), el('p', '', t('onboarding.languageSubtitle')));
    header.append(heading);
    if (!mandatory) {
      const closeButton = button('', 'studio-onboarding__close');
      closeButton.innerHTML = CLOSE_ICON;
      closeButton.setAttribute('aria-label', t('common.close'));
      closeButton.addEventListener('click', close);
      header.append(closeButton);
    }

    const choices = el('div', 'studio-onboarding__languages');
    let selected: ProjectLocale | null = null;
    const continueButton = button(t('onboarding.chooseFirst'), 'ui-button studio-onboarding__confirm');
    continueButton.disabled = true;
    const error = el('p', 'studio-onboarding__error');
    error.setAttribute('role', 'alert');
    error.hidden = true;

    const setSelected = (locale: ProjectLocale): void => {
      selected = locale;
      choices.querySelectorAll<HTMLButtonElement>('button').forEach((node) => {
        const active = node.dataset.locale === locale;
        node.classList.toggle('is-selected', active);
        node.setAttribute('aria-pressed', String(active));
      });
      continueButton.disabled = false;
      continueButton.textContent = locale === 'id' ? t('onboarding.useId') : t('onboarding.useEn');
      error.hidden = true;
    };

    const makeChoice = (locale: ProjectLocale, code: string, titleKey: 'onboarding.idTitle' | 'onboarding.enTitle', copyKey: 'onboarding.idCopy' | 'onboarding.enCopy'): HTMLButtonElement => {
      const choice = button('', 'studio-language-card');
      choice.dataset.locale = locale;
      choice.setAttribute('aria-pressed', 'false');
      choice.append(el('span', 'studio-language-card__code', code), el('span', 'studio-language-card__copy'));
      choice.lastElementChild!.append(el('strong', '', t(titleKey)), el('small', '', t(copyKey)));
      choice.addEventListener('click', () => setSelected(locale));
      return choice;
    };

    choices.append(
      makeChoice('id', 'ID', 'onboarding.idTitle', 'onboarding.idCopy'),
      makeChoice('en', 'EN', 'onboarding.enTitle', 'onboarding.enCopy'),
    );

    continueButton.addEventListener('click', async () => {
      if (!selected || busy) return;
      busy = true;
      error.hidden = true;
      continueButton.disabled = true;
      continueButton.textContent = t('onboarding.saving');
      choices.querySelectorAll<HTMLButtonElement>('button').forEach((node) => { node.disabled = true; });
      try {
        await options.onSelectLanguage(selected, mandatory);
        guideLocale = selected;
        if (mandatory) markCompleted();
        finishClose();
      } catch {
        busy = false;
        error.textContent = t('onboarding.saveFailed');
        error.hidden = false;
        continueButton.disabled = false;
        continueButton.textContent = selected === 'id' ? t('onboarding.useId') : t('onboarding.useEn');
        choices.querySelectorAll<HTMLButtonElement>('button').forEach((node) => { node.disabled = false; });
      }
    });

    const footer = el('footer', 'studio-onboarding__footer studio-onboarding__footer--language');
    if (!mandatory) {
      const back = button(t('common.back'), 'ui-button ui-button--secondary');
      back.addEventListener('click', renderGuide);
      footer.append(back);
    }
    footer.append(error, continueButton);
    card.append(header, choices, footer);
    const title = card.querySelector('h2');
    if (title) title.id = 'studio-onboarding-title';
    window.requestAnimationFrame(() => choices.querySelector<HTMLButtonElement>('button')?.focus());
  };

  const renderGuide = (): void => {
    if (!backdrop) return;
    const t: StudioTranslator = (key, variables) => studioText(guideLocale, key, variables);
    const card = backdrop.querySelector<HTMLElement>('.studio-onboarding__card');
    if (!card) return;
    card.replaceChildren();

    const header = el('header', 'studio-onboarding__header');
    const heading = el('div');
    heading.append(el('span', 'eyebrow', t('onboarding.kicker')), el('h2', '', t('onboarding.title')), el('p', '', t('onboarding.subtitle')));
    header.append(heading);
    if (!mandatory) {
      const closeButton = button('', 'studio-onboarding__close');
      closeButton.innerHTML = CLOSE_ICON;
      closeButton.setAttribute('aria-label', t('common.close'));
      closeButton.addEventListener('click', close);
      header.append(closeButton);
    }

    const grid = el('div', 'studio-onboarding__guide-grid');
    const items = [
      ['onboarding.item1Title', 'onboarding.item1Copy'],
      ['onboarding.item2Title', 'onboarding.item2Copy'],
      ['onboarding.item3Title', 'onboarding.item3Copy'],
      ['onboarding.item4Title', 'onboarding.item4Copy'],
    ] as const;
    items.forEach(([titleKey, copyKey], index) => {
      const item = el('article', 'studio-guide-card');
      const icon = el('span', 'studio-guide-card__icon');
      icon.innerHTML = GUIDE_ICONS[index];
      item.append(icon, el('div'));
      item.lastElementChild!.append(el('strong', '', t(titleKey)), el('p', '', t(copyKey)));
      grid.append(item);
    });

    const footer = el('footer', 'studio-onboarding__footer');
    const skip = button(t('onboarding.skip'), 'text-button');
    const next = button(t('onboarding.continue'), 'ui-button');
    skip.addEventListener('click', renderLanguage);
    next.addEventListener('click', renderLanguage);
    footer.append(skip, next);
    card.append(header, grid, footer);
    const title = card.querySelector('h2');
    if (title) title.id = 'studio-onboarding-title';
    window.requestAnimationFrame(() => next.focus());
  };

  const open = (trigger: HTMLElement | null = null, required = false): void => {
    if (backdrop) return;
    mandatory = required;
    busy = false;
    guideLocale = required ? options.initialGuideLocale : options.getLocale();
    restoreFocus = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    backdrop = el('div', 'studio-onboarding');
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'studio-onboarding-title');
    const card = el('section', 'studio-onboarding__card');
    backdrop.append(card);
    backdrop.addEventListener('mousedown', (event) => { if (event.target === backdrop) close(); });
    backdrop.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
      else trapFocus(backdrop!, event);
    });
    document.body.append(backdrop);
    document.body.classList.add('has-modal');
    renderGuide();
  };

  return {
    hasCompleted,
    open,
    destroy: () => {
      mandatory = false;
      busy = false;
      finishClose();
    },
  };
}
