import type { GiftConfigV1 } from '../config/gift.config';
import { GiftStateMachine, type GiftEvent, type SceneId } from '../state/machine';

interface MusicElements {
  audio: HTMLAudioElement;
  button: HTMLButtonElement;
  progress: HTMLInputElement;
  current: HTMLElement;
  duration: HTMLElement;
  status: HTMLElement;
  prevButton?: HTMLButtonElement;
  nextButton?: HTMLButtonElement;
  eyebrow?: HTMLElement;
  titleViewport?: HTMLElement;
  titleNode?: HTMLElement;
  artistNode?: HTMLElement;
  coverImage?: HTMLImageElement;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function actionButton(label: string, event: GiftEvent, variant: 'primary' | 'ghost' = 'primary'): HTMLButtonElement {
  const button = element('button', `button button--${variant}`, label);
  button.type = 'button';
  button.dataset.event = event;
  return button;
}

function createScene(id: SceneId, className = ''): HTMLElement {
  const scene = element('section', `scene scene--${id} ${className}`.trim());
  scene.dataset.scene = id;
  scene.setAttribute('aria-hidden', 'true');
  scene.setAttribute('inert', '');
  return scene;
}

function addTypewriterHeading(parent: HTMLElement, text: string, level: 1 | 2 = 1): HTMLHeadingElement {
  const heading = element(`h${level}`, 'script-heading js-typewriter', text) as HTMLHeadingElement;
  heading.dataset.fullText = text;
  heading.tabIndex = -1;
  parent.append(heading);
  return heading;
}

function letterTypeNode<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text: string): HTMLElementTagNameMap[K] {
  const node = element(tag, `${className} js-letter-type`.trim(), text);
  node.dataset.fullText = text;
  return node;
}

function addCharacter(parent: HTMLElement, config: GiftConfigV1, modifier: string, sources: string[]): HTMLDivElement {
  const frame = element('div', `character character--${modifier}`);
  const motion = element('div', 'character__motion');
  const validSources = sources.filter(Boolean);
  let failedImages = 0;

  if (validSources.length > 1) frame.classList.add('character--multi');
  for (const [index, source] of validSources.entries()) {
    const image = element('img', 'character__frame');
    image.src = source;
    image.alt = index === 0 ? config.media.characterAlt : '';
    image.decoding = 'async';
    image.style.setProperty('--frame-index', String(index));
    image.addEventListener('error', () => {
      image.hidden = true;
      failedImages += 1;
      if (failedImages === validSources.length) frame.classList.add('character--missing');
    });
    motion.append(image);
  }

  if (validSources.length === 0) frame.classList.add('character--missing');
  frame.append(motion);
  parent.append(frame);
  return frame;
}

function createIntro(config: GiftConfigV1): HTMLElement {
  const scene = createScene('intro', 'scene--center');
  const content = element('div', 'scene__content scene__content--intro');
  addTypewriterHeading(content, config.intro.title);
  content.append(element('p', 'intro-copy', config.intro.subtitle));
  content.append(actionButton(config.intro.startLabel, 'START'));
  scene.append(content);
  return scene;
}

function createEnvelope(config: GiftConfigV1): HTMLElement {
  const scene = createScene('envelope', 'scene--center');
  const content = element('div', 'scene__content scene__content--envelope');
  const envelope = element('div', 'envelope-art');
  envelope.setAttribute('role', 'img');
  envelope.setAttribute('aria-label', config.envelope.ariaLabel);
  const envelopeImage = element('img', 'envelope-art__image');
  envelopeImage.src = config.media.envelopeUrl;
  envelopeImage.alt = '';
  envelopeImage.decoding = 'async';
  envelopeImage.addEventListener('error', () => envelope.classList.add('envelope-art--missing'));
  envelope.append(envelopeImage);

  const actions = element('div', 'button-stack');
  actions.append(actionButton(config.envelope.readLabel, 'READ'));
  actions.append(actionButton(config.envelope.needTimeLabel, 'NEED_TIME', 'ghost'));
  content.append(envelope, actions);
  scene.append(content);
  return scene;
}

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function createMusicPlayer(config: GiftConfigV1): { root: HTMLElement; elements: MusicElements } {
  const root = element('div', 'music-player');

  const rawTracks = config.music.tracks && config.music.tracks.length > 0
    ? config.music.tracks
    : (config.music.audioUrl ? [{
        title: config.music.title,
        artist: config.music.artist,
        audioUrl: config.music.audioUrl,
        coverUrl: config.music.coverUrl,
      }] : []);
  const tracks = rawTracks.filter((t) => Boolean(t.audioUrl));
  const hasMultiple = tracks.length > 1;
  const initialTrack = tracks[0] ?? {
    title: config.music.title,
    artist: config.music.artist,
    audioUrl: config.music.audioUrl,
    coverUrl: config.music.coverUrl,
  };

  const cover = element('div', 'music-player__cover');
  let coverImage: HTMLImageElement | undefined;
  if (initialTrack.coverUrl) {
    coverImage = element('img');
    coverImage.src = initialTrack.coverUrl;
    coverImage.alt = '';
    coverImage.decoding = 'async';
    cover.append(coverImage);
  }

  const details = element('div', 'music-player__details');
  const meta = element('div', 'music-player__meta');
  const eyebrowText = hasMultiple
    ? `${config.music.nowPlayingLabel} • 1 ${config.music.positionSeparator} ${tracks.length}`
    : config.music.nowPlayingLabel;
  const eyebrow = element('span', 'music-player__eyebrow', eyebrowText);
  const titleViewport = element('span', 'music-player__title-viewport');
  const titleNode = element('strong', 'music-player__title-text', initialTrack.title || 'Untitled');
  titleViewport.append(titleNode);
  const artistNode = element('span', 'music-player__artist', initialTrack.artist || '');
  meta.append(eyebrow, titleViewport, artistNode);

  const controls = element('div', 'music-player__controls');
  let prevButton: HTMLButtonElement | undefined;
  let nextButton: HTMLButtonElement | undefined;

  if (hasMultiple) {
    prevButton = element('button', 'music-player__nav music-player__nav--prev');
    prevButton.type = 'button';
    prevButton.setAttribute('aria-label', config.music.previousLabel);
    prevButton.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>';
    controls.append(prevButton);
  }

  const button = element('button', 'music-player__toggle');
  button.type = 'button';
  button.setAttribute('aria-label', config.music.playLabel);
  button.append(element('span', 'play-icon'));
  controls.append(button);

  if (hasMultiple) {
    nextButton = element('button', 'music-player__nav music-player__nav--next');
    nextButton.type = 'button';
    nextButton.setAttribute('aria-label', config.music.nextLabel);
    nextButton.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>';
    controls.append(nextButton);
  } else {
    const more = element('span', 'music-player__more');
    more.setAttribute('aria-hidden', 'true');
    more.append(element('i'), element('i'), element('i'));
    controls.prepend(more);
  }

  details.append(meta, controls);

  const timeline = element('div', 'music-player__timeline');
  const current = element('span', '', '0:00');
  const progress = element('input');
  progress.type = 'range';
  progress.min = '0';
  progress.max = '100';
  progress.value = '0';
  progress.step = '0.1';
  progress.setAttribute('aria-label', config.music.progressLabel);
  const duration = element('span', '', '0:00');
  timeline.append(current, progress, duration);
  details.append(timeline);

  const status = element('p', 'music-player__status');
  status.setAttribute('aria-live', 'polite');
  root.append(cover, details, status);

  const audio = element('audio');
  audio.preload = 'metadata';
  audio.loop = !hasMultiple;
  if (initialTrack.audioUrl) audio.src = initialTrack.audioUrl;
  root.append(audio);

  if (!initialTrack.audioUrl) {
    button.disabled = true;
    progress.disabled = true;
    status.textContent = config.music.emptyMessage;
  }

  return {
    root,
    elements: {
      audio,
      button,
      progress,
      current,
      duration,
      status,
      prevButton,
      nextButton,
      eyebrow,
      titleViewport,
      titleNode,
      artistNode,
      coverImage,
    },
  };
}

function createLetter(config: GiftConfigV1): { scene: HTMLElement; music: MusicElements } {
  const scene = createScene('letter', 'scene--scrollable');
  const scroll = element('div', 'scene__scroll');
  const content = element('div', 'scene__content scene__content--letter');
  addTypewriterHeading(content, config.letter.heading);

  const player = createMusicPlayer(config);
  content.append(player.root);

  const article = element('article', 'letter-card');
  article.tabIndex = 0;
  article.setAttribute('aria-label', config.letter.ariaLabel);
  for (const paragraph of config.letter.paragraphs) article.append(letterTypeNode('p', '', paragraph));
  const signoff = element('p', 'letter-card__signoff');
  signoff.append(letterTypeNode('span', 'letter-card__signoff-label', config.letter.signoff));
  article.append(signoff);

  const actions = element('div', 'letter-actions');
  const skipTyping = element('button', 'letter-skip', config.letter.skipLabel);
  skipTyping.type = 'button';
  skipTyping.dataset.skipLetter = 'true';
  skipTyping.hidden = true;
  const continueButton = actionButton(config.letter.continueLabel, 'CONTINUE');
  continueButton.classList.add('letter-continue');
  actions.append(skipTyping, continueButton);
  content.append(article, actions);
  scroll.append(content);
  scene.append(scroll);
  return { scene, music: player.elements };
}

function createQuestion(config: GiftConfigV1): HTMLElement {
  const scene = createScene('question', 'scene--center');
  const content = element('div', 'scene__content scene__content--choice');
  addTypewriterHeading(content, config.question.heading);
  addCharacter(content, config, 'question', config.media.characters.question);
  const actions = element('div', 'choice-actions');
  actions.append(actionButton(config.question.yesLabel, 'ACCEPT'));
  actions.append(actionButton(config.question.needTimeLabel, 'NEED_TIME', 'ghost'));
  content.append(actions);
  scene.append(content);
  return scene;
}

function createAccepted(config: GiftConfigV1): HTMLElement {
  const scene = createScene('accepted', 'scene--center');
  const content = element('div', 'scene__content scene__content--ending');
  addTypewriterHeading(content, config.endings.accepted.heading);
  addCharacter(content, config, 'celebrate', config.media.characters.accepted);
  content.append(element('p', 'ending-copy', config.endings.accepted.body));
  content.append(actionButton(config.endings.accepted.continueLabel, 'CONTINUE'));
  scene.append(content);
  return scene;
}

function createNeedsTime(config: GiftConfigV1): HTMLElement {
  const scene = createScene('needs-time', 'scene--center');
  const content = element('div', 'scene__content scene__content--ending scene__content--needs-time');
  addTypewriterHeading(content, config.endings.needTime.heading);
  addCharacter(content, config, 'comfort', config.media.characters.needTime);
  content.append(element('p', 'ending-copy', config.endings.needTime.body));
  content.append(element('strong', 'love-line', config.endings.needTime.loveLine));
  content.append(actionButton(config.endings.needTime.backLabel, 'BACK', 'ghost'));
  scene.append(content);
  return scene;
}

function createPromise(config: GiftConfigV1): HTMLElement {
  const scene = createScene('promise', 'scene--center');
  const content = element('div', 'scene__content scene__content--ending scene__content--promise');
  addTypewriterHeading(content, config.endings.promise.heading);
  addCharacter(content, config, 'promise', config.media.characters.promise);
  content.append(element('strong', 'love-line', config.endings.promise.body));
  const actions = element('div', 'choice-actions');
  actions.append(actionButton(config.endings.promise.backLabel, 'BACK', 'ghost'));
  actions.append(actionButton(config.endings.promise.replayLabel, 'REPLAY'));
  content.append(actions);
  scene.append(content);
  return scene;
}

function setupMusic(elements: MusicElements, config: GiftConfigV1): {
  tryPlay: () => Promise<void>;
  reset: () => void;
  destroy: () => void;
} {
  const {
    audio,
    button,
    progress,
    current,
    duration,
    status,
    prevButton,
    nextButton,
    eyebrow,
    titleViewport,
    titleNode,
    artistNode,
    coverImage,
  } = elements;

  const rawTracks = config.music.tracks && config.music.tracks.length > 0
    ? config.music.tracks
    : (config.music.audioUrl ? [{
        title: config.music.title,
        artist: config.music.artist,
        audioUrl: config.music.audioUrl,
        coverUrl: config.music.coverUrl,
      }] : []);
  const tracks = rawTracks.filter((t) => Boolean(t.audioUrl));
  let currentTrackIndex = 0;
  let marqueeFrame = 0;

  const refreshMarquee = (): void => {
    if (!titleViewport || !titleNode) return;
    const overflow = titleNode.scrollWidth > titleViewport.clientWidth + 2;
    titleViewport.classList.toggle('is-overflowing', overflow);
    const distance = Math.max(0, titleNode.scrollWidth - titleViewport.clientWidth);
    titleViewport.style.setProperty('--marquee-distance', `${distance}px`);
    titleViewport.style.setProperty('--marquee-duration', `${Math.max(6, distance / 16).toFixed(1)}s`);
  };

  const queueMarqueeRefresh = (): void => {
    window.cancelAnimationFrame(marqueeFrame);
    marqueeFrame = window.requestAnimationFrame(refreshMarquee);
  };

  const marqueeObserver = typeof ResizeObserver === 'undefined' || !titleViewport
    ? null
    : new ResizeObserver(queueMarqueeRefresh);
  if (titleViewport) marqueeObserver?.observe(titleViewport);
  queueMarqueeRefresh();

  const updateTrackDisplay = (index: number): void => {
    currentTrackIndex = index;
    const track = tracks[currentTrackIndex];
    if (!track) return;
    if (eyebrow) {
      eyebrow.textContent = tracks.length > 1
        ? `${config.music.nowPlayingLabel} • ${currentTrackIndex + 1} ${config.music.positionSeparator} ${tracks.length}`
        : config.music.nowPlayingLabel;
    }
    if (titleNode) titleNode.textContent = track.title || 'Untitled';
    if (artistNode) artistNode.textContent = track.artist || '';
    if (coverImage && track.coverUrl) {
      coverImage.src = track.coverUrl;
    }
    queueMarqueeRefresh();
  };

  const updateButton = (): void => {
    const playing = !audio.paused;
    button.classList.toggle('is-playing', playing);
    button.setAttribute('aria-label', playing ? config.music.pauseLabel : config.music.playLabel);
  };

  const tryPlay = async (): Promise<void> => {
    const activeUrl = tracks[currentTrackIndex]?.audioUrl || config.music.audioUrl;
    if (!activeUrl) return;
    try {
      await audio.play();
      status.textContent = '';
    } catch {
      status.textContent = config.music.tapToPlayMessage;
    }
    updateButton();
  };

  const switchTrack = async (targetIndex: number): Promise<void> => {
    if (tracks.length <= 1) return;
    const wasPlaying = !audio.paused;
    audio.pause();
    currentTrackIndex = (targetIndex + tracks.length) % tracks.length;
    const track = tracks[currentTrackIndex];
    if (!track) return;
    updateTrackDisplay(currentTrackIndex);
    audio.src = track.audioUrl;
    audio.load();
    progress.value = '0';
    progress.style.setProperty('--progress', '0%');
    current.textContent = '0:00';
    if (wasPlaying) {
      void tryPlay();
    } else {
      updateButton();
    }
  };

  prevButton?.addEventListener('click', () => {
    void switchTrack(currentTrackIndex - 1);
  });

  nextButton?.addEventListener('click', () => {
    void switchTrack(currentTrackIndex + 1);
  });

  button.addEventListener('click', () => {
    if (audio.paused) void tryPlay();
    else audio.pause();
  });

  progress.addEventListener('input', () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    progress.style.setProperty('--progress', `${progress.value}%`);
    audio.currentTime = (Number(progress.value) / 100) * audio.duration;
  });

  audio.addEventListener('loadedmetadata', () => {
    duration.textContent = formatTime(audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    current.textContent = formatTime(audio.currentTime);
    progress.value = Number.isFinite(audio.duration) && audio.duration > 0
      ? String((audio.currentTime / audio.duration) * 100)
      : '0';
    progress.style.setProperty('--progress', `${progress.value}%`);
  });
  audio.addEventListener('play', updateButton);
  audio.addEventListener('pause', updateButton);
  audio.addEventListener('ended', () => {
    if (tracks.length > 1) {
      void switchTrack(currentTrackIndex + 1).then(() => {
        void tryPlay();
      });
    } else {
      updateButton();
    }
  });
  audio.addEventListener('error', () => {
    status.textContent = config.music.errorMessage;
    button.disabled = true;
    progress.disabled = true;
    updateButton();
  });

  return {
    tryPlay,
    reset: () => {
      audio.pause();
      currentTrackIndex = 0;
      updateTrackDisplay(0);
      if (tracks[0]) audio.src = tracks[0].audioUrl;
      audio.currentTime = 0;
      progress.value = '0';
      progress.style.setProperty('--progress', '0%');
      current.textContent = '0:00';
      updateButton();
    },
    destroy: () => {
      audio.pause();
      marqueeObserver?.disconnect();
      window.cancelAnimationFrame(marqueeFrame);
      audio.removeAttribute('src');
      audio.load();
    },
  };
}

function setTheme(config: GiftConfigV1, root: HTMLElement): void {
  root.style.setProperty('--color-background', config.theme.background);
  root.style.setProperty('--color-background-deep', config.theme.backgroundDeep);
  root.style.setProperty('--color-surface', config.theme.surface);
  root.style.setProperty('--color-text', config.theme.text);
  root.style.setProperty('--color-muted', config.theme.muted);
  root.style.setProperty('--color-accent', config.theme.accent);
  root.style.setProperty('--color-accent-strong', config.theme.accentStrong);
  root.style.setProperty('--color-envelope', config.theme.envelope);

  if (config.theme.playerGradient) {
    root.style.setProperty('--player-gradient', config.theme.playerGradient);
  }
  if (config.theme.playerToggleBg) {
    root.style.setProperty('--player-toggle-bg', config.theme.playerToggleBg);
  }
  if (config.theme.playerToggleColor) {
    root.style.setProperty('--player-toggle-color', config.theme.playerToggleColor);
  }
  if (config.theme.playerToggleHover) {
    root.style.setProperty('--player-toggle-hover', config.theme.playerToggleHover);
  }
  if (config.theme.playerBorder) {
    root.style.setProperty('--player-border', config.theme.playerBorder);
  }
  if (config.theme.playerProgress) {
    root.style.setProperty('--player-progress', config.theme.playerProgress);
  }
  if (config.theme.playerThumb) {
    root.style.setProperty('--player-thumb', config.theme.playerThumb);
  }
  if (config.theme.playerThumbShadow) {
    root.style.setProperty('--player-thumb-shadow', config.theme.playerThumbShadow);
  }
  if (config.theme.playerShadow) {
    root.style.setProperty('--player-shadow', config.theme.playerShadow);
  }
}

function addAtmosphere(shell: HTMLElement): void {
  const atmosphere = element('div', 'atmosphere');
  atmosphere.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 18; index += 1) {
    const mote = element('span', 'atmosphere__mote');
    mote.style.setProperty('--mote-index', String(index));
    mote.style.left = `${(index * 37 + 11) % 96}%`;
    mote.style.top = `${(index * 53 + 7) % 92}%`;
    atmosphere.append(mote);
  }
  shell.append(atmosphere);
}

export interface MountGiftOptions {
  embedded?: boolean;
  initialScene?: SceneId;
  instantText?: boolean;
  onSceneChange?: (scene: SceneId) => void;
}

export function mountGift(target: HTMLElement, config: GiftConfigV1, options: MountGiftOptions = {}): () => void {
  const machine = new GiftStateMachine(options.initialScene);
  const shell = element('main', 'gift-shell');
  setTheme(config, options.embedded ? shell : document.documentElement);
  if (!options.embedded) {
    document.documentElement.lang = config.locale;
    document.title = config.meta.title;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', config.meta.description);
  }
  shell.setAttribute('aria-label', config.meta.title);
  addAtmosphere(shell);

  const intro = createIntro(config);
  const envelope = createEnvelope(config);
  const letter = createLetter(config);
  const question = createQuestion(config);
  const accepted = createAccepted(config);
  const needsTime = createNeedsTime(config);
  const promise = createPromise(config);
  shell.append(intro, envelope, letter.scene, question, accepted, needsTime, promise);
  target.replaceChildren(shell);

  const music = setupMusic(letter.music, config);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let animationTimer = 0;
  let typingTimer = 0;
  let letterTypingTimer = 0;
  let letterTypingRun = 0;
  let transitioning = false;
  let finishLetterTyping = (): void => undefined;

  const cancelTimers = (): void => {
    window.clearTimeout(animationTimer);
    window.clearTimeout(typingTimer);
    window.clearTimeout(letterTypingTimer);
    letterTypingRun += 1;
    shell.querySelectorAll<HTMLButtonElement>('[data-skip-letter]').forEach((button) => { button.hidden = true; });
  };

  const typeLetter = (scene: HTMLElement): void => {
    const content = scene.querySelector<HTMLElement>('.scene__content--letter');
    const nodes = [...scene.querySelectorAll<HTMLElement>('.js-letter-type')];
    const skipButton = scene.querySelector<HTMLButtonElement>('[data-skip-letter]');
    const run = ++letterTypingRun;

    const revealAll = (): void => {
      if (run !== letterTypingRun) return;
      window.clearTimeout(letterTypingTimer);
      for (const node of nodes) {
        node.textContent = node.dataset.fullText ?? '';
        node.classList.remove('is-typing');
      }
      content?.classList.remove('is-typing-letter');
      if (skipButton) skipButton.hidden = true;
    };

    finishLetterTyping = revealAll;
    if (!content || nodes.length === 0 || options.instantText || !config.animation.letterTypewriter || reducedMotion.matches) {
      revealAll();
      return;
    }

    content.classList.add('is-typing-letter');
    if (skipButton) skipButton.hidden = false;
    for (const node of nodes) {
      node.textContent = '';
      node.classList.remove('is-typing');
    }

    let nodeIndex = 0;
    let characterIndex = 0;
    const typeNext = (): void => {
      if (run !== letterTypingRun || !scene.classList.contains('is-active')) return;
      const node = nodes[nodeIndex];
      const fullText = node?.dataset.fullText ?? '';
      if (!node) {
        revealAll();
        return;
      }

      node.classList.add('is-typing');
      characterIndex += 1;
      node.textContent = fullText.slice(0, characterIndex);
      if (characterIndex < fullText.length) {
        letterTypingTimer = window.setTimeout(typeNext, config.animation.letterTypewriterSpeedMs);
        return;
      }

      node.classList.remove('is-typing');
      nodeIndex += 1;
      characterIndex = 0;
      letterTypingTimer = window.setTimeout(typeNext, nodeIndex === 1 ? 420 : 280);
    };

    const headingDelay = Math.min(
      (scene.querySelector<HTMLElement>('.js-typewriter')?.dataset.fullText?.length ?? 0)
        * config.animation.typewriterSpeedMs,
      950,
    ) + 180;
    letterTypingTimer = window.setTimeout(typeNext, headingDelay);
  };

  const typeHeading = (scene: HTMLElement): void => {
    const heading = scene.querySelector<HTMLElement>('.js-typewriter');
    const fullText = heading?.dataset.fullText ?? '';
    if (!heading || !fullText) return;
    window.clearTimeout(typingTimer);
    if (options.instantText || !config.animation.typewriter || reducedMotion.matches) {
      heading.textContent = fullText;
      return;
    }

    heading.textContent = '';
    let index = 0;
    const tick = (): void => {
      index += 1;
      heading.textContent = fullText.slice(0, index);
      if (index < fullText.length) typingTimer = window.setTimeout(tick, config.animation.typewriterSpeedMs);
    };
    tick();
  };

  const activate = (id: SceneId, initial = false): void => {
    const current = shell.querySelector<HTMLElement>('.scene.is-active');
    const next = shell.querySelector<HTMLElement>(`[data-scene="${id}"]`);
    if (!next) return;

    cancelTimers();
    transitioning = !initial;
    if (current && current !== next) {
      current.classList.remove('is-active');
      current.classList.add('is-leaving');
      current.setAttribute('aria-hidden', 'true');
      current.setAttribute('inert', '');
    }

    next.classList.remove('is-leaving');
    next.classList.add('is-active');
    next.setAttribute('aria-hidden', 'false');
    next.removeAttribute('inert');
    next.querySelector<HTMLElement>('.scene__scroll')?.scrollTo({ top: 0, behavior: 'instant' });
    options.onSceneChange?.(id);
    typeHeading(next);
    if (id === 'letter') typeLetter(next);

    const finish = (): void => {
      current?.classList.remove('is-leaving');
      transitioning = false;
      const focusTarget = next.querySelector<HTMLElement>('.script-heading, button, [tabindex="-1"]');
      focusTarget?.focus({ preventScroll: true });
    };

    if (initial || reducedMotion.matches || config.animation.sceneDurationMs === 0) finish();
    else animationTimer = window.setTimeout(finish, config.animation.sceneDurationMs);
  };

  const handleAction = (event: GiftEvent): void => {
    if (transitioning) return;
    if (event === 'START') void music.tryPlay();
    if (event === 'REPLAY') music.reset();
    activate(machine.send(event));
  };

  const clickHandler = (event: MouseEvent): void => {
    if ((event.target as HTMLElement).closest('[data-skip-letter]')) {
      finishLetterTyping();
      return;
    }
    if ((event.target as HTMLElement).closest('.scene.is-active .letter-card')) finishLetterTyping();
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-event]');
    const action = button?.dataset.event as GiftEvent | undefined;
    if (action) handleAction(action);
  };

  const keyHandler = (event: KeyboardEvent): void => {
    const targetElement = event.target as HTMLElement;
    if ((event.key === 'Enter' || event.key === ' ') && targetElement.matches('.scene.is-active .letter-card')) {
      event.preventDefault();
      finishLetterTyping();
    }
  };

  shell.addEventListener('click', clickHandler);
  shell.addEventListener('keydown', keyHandler);
  activate(machine.scene, true);

  return () => {
    cancelTimers();
    music.destroy();
    shell.removeEventListener('click', clickHandler);
    shell.removeEventListener('keydown', keyHandler);
    target.replaceChildren();
  };
}
