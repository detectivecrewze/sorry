import { button, el } from '../ui/dom';
import { loadPlaylist, resetPlaylistCache, type PlaylistTrack } from './playlist';
import type { StudioTranslator } from './localization';

interface MusicCatalogOptions {
  selectedAudioUrl?: () => string;
  selectedAudioUrls?: () => string[];
  beforePlay: () => void;
  onSelect: (track: PlaylistTrack) => void;
  onDeselect?: (audioUrl: string) => void;
  t: StudioTranslator;
}

export interface MusicCatalogController {
  root: HTMLElement;
  stop: () => void;
  render: () => void;
  destroy: () => void;
}

export function createMusicCatalog(options: MusicCatalogOptions): MusicCatalogController {
  const root = el('section', 'music-catalog');
  const toggle = button('', 'music-catalog__toggle');
  toggle.setAttribute('aria-expanded', 'false');
  const toggleCopy = el('span', 'music-catalog__toggle-copy');
  toggleCopy.append(
    el('strong', '', options.t('music.catalogTitle')),
    el('small', '', options.t('music.catalogCopy')),
  );
  const toggleIcon = el('span', 'music-catalog__toggle-icon', '⌄');
  toggleIcon.setAttribute('aria-hidden', 'true');
  toggle.append(toggleCopy, toggleIcon);
  const content = el('div', 'music-catalog__content');
  content.hidden = true;
  const status = el('p', 'music-catalog__status', options.t('music.catalogLoading'));
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const searchLabel = el('label', 'form-field music-catalog__search');
  const search = el('input', 'text-input');
  search.type = 'search';
  search.placeholder = options.t('music.catalogSearchPlaceholder');
  search.autocomplete = 'off';
  searchLabel.append(el('span', 'form-field__label', options.t('music.catalogSearch')), search);
  const list = el('div', 'music-catalog__list');
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', options.t('music.catalogAria'));
  content.append(searchLabel, status, list);
  root.append(toggle, content);

  const audio = new Audio();
  audio.preload = 'metadata';
  audio.volume = 0.65;
  let tracks: PlaylistTrack[] = [];
  let activeAudioUrl = '';
  let destroyed = false;
  let expanded = false;

  const setExpanded = (next: boolean): void => {
    expanded = next;
    content.hidden = !expanded;
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.classList.toggle('is-expanded', expanded);
    toggleIcon.textContent = expanded ? '⌃' : '⌄';
    if (expanded) window.requestAnimationFrame(() => search.focus({ preventScroll: true }));
  };

  const getSelectedUrls = (): string[] => {
    if (options.selectedAudioUrls) return options.selectedAudioUrls();
    if (options.selectedAudioUrl) {
      const single = options.selectedAudioUrl();
      return single ? [single] : [];
    }
    return [];
  };

  const setStatus = (message: string, state = ''): void => {
    status.textContent = message;
    status.dataset.state = state;
  };

  const stop = (): void => {
    audio.pause();
    activeAudioUrl = '';
    setStatus(tracks.length ? options.t('music.catalogAvailable', { count: tracks.length }) : '');
    render();
  };

  toggle.addEventListener('click', () => {
    if (expanded) stop();
    setExpanded(!expanded);
  });

  const togglePreview = async (track: PlaylistTrack): Promise<void> => {
    if (activeAudioUrl === track.audioUrl && !audio.paused) {
      stop();
      return;
    }
    options.beforePlay();
    audio.pause();
    if (audio.src !== track.audioUrl) {
      audio.src = track.audioUrl;
      audio.load();
    }
    activeAudioUrl = track.audioUrl;
    setStatus(options.t('music.catalogLoadingPreview', { title: track.title }), 'loading');
    render();
    try {
      await audio.play();
      setStatus(options.t('music.catalogPlaying', { title: track.title }), 'playing');
    } catch {
      activeAudioUrl = '';
      setStatus(options.t('music.catalogPreviewError'), 'error');
    }
    render();
  };

  const render = (): void => {
    if (destroyed) return;
    list.replaceChildren();
    const query = search.value.trim().toLocaleLowerCase();
    const matches = tracks.filter((track) => `${track.title} ${track.artist}`.toLocaleLowerCase().includes(query));
    const selectedUrls = getSelectedUrls();
    const isFull = selectedUrls.length >= 3;

    for (const track of matches) {
      const selectedIndex = selectedUrls.indexOf(track.audioUrl);
      const selected = selectedIndex !== -1;
      const playing = activeAudioUrl === track.audioUrl && !audio.paused;
      const card = el('article', `catalog-track${selected ? ' is-selected' : ''}`);
      card.setAttribute('role', 'option');
      card.setAttribute('aria-selected', String(selected));
      const cover = el('span', 'catalog-track__cover');
      const image = el('img');
      image.src = track.coverUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.addEventListener('error', () => image.remove(), { once: true });
      cover.append(image);
      const copy = el('span', 'catalog-track__copy');
      const titleWrap = el('span', 'catalog-track__title-wrap');
      titleWrap.append(el('strong', '', track.title));
      if (selected) {
        titleWrap.append(el('span', 'catalog-track__badge', `#${selectedIndex + 1}`));
      }
      copy.append(titleWrap, el('small', '', track.artist));

      const actions = el('div', 'catalog-track__actions');
      const preview = button(playing ? options.t('music.catalogPause') : options.t('music.catalogListen'), `catalog-track__preview${playing ? ' is-active' : ''}`);
      preview.setAttribute('aria-label', options.t('music.catalogListenAria', { action: playing ? options.t('music.catalogPause') : options.t('music.catalogListen'), title: track.title, artist: track.artist }));
      preview.addEventListener('click', () => void togglePreview(track));

      let select: HTMLButtonElement;
      if (selected) {
        select = button(options.t('music.catalogRemove'), 'catalog-track__select catalog-track__select--remove is-selected');
        select.setAttribute('aria-label', options.t('music.catalogRemoveAria', { title: track.title }));
        select.addEventListener('click', () => {
          stop();
          options.onDeselect?.(track.audioUrl);
        });
      } else {
        select = button(options.t('music.catalogSelect'), `catalog-track__select${isFull ? ' is-disabled' : ''}`);
        select.setAttribute('aria-label', options.t('music.catalogSelectAria', { title: track.title }));
        if (isFull) {
          select.disabled = true;
          select.title = options.t('music.catalogFull');
        } else {
          select.addEventListener('click', () => {
            stop();
            options.onSelect(track);
          });
        }
      }
      actions.append(preview, select);

      card.append(cover, copy, actions);
      list.append(card);
    }
    if (!matches.length && tracks.length) list.append(el('p', 'music-catalog__empty', options.t('music.catalogEmpty')));
  };

  search.addEventListener('input', render);
  audio.addEventListener('play', render);
  audio.addEventListener('pause', render);
  audio.addEventListener('ended', stop);
  audio.addEventListener('error', () => {
    activeAudioUrl = '';
    setStatus(options.t('music.catalogPreviewError'), 'error');
    render();
  });

  const load = (): void => {
    setStatus(options.t('music.catalogLoading'), 'loading');
    list.replaceChildren();
    void loadPlaylist().then((loaded) => {
      if (destroyed) return;
      tracks = loaded;
      setStatus(options.t('music.catalogAvailable', { count: tracks.length }), 'ready');
      const summary = toggleCopy.querySelector('small');
      if (summary) summary.textContent = options.t('music.catalogSummary', { count: tracks.length });
      render();
    }).catch(() => {
      if (destroyed) return;
      setStatus(options.t('music.catalogFailed'), 'error');
      const summary = toggleCopy.querySelector('small');
      if (summary) summary.textContent = options.t('music.catalogFailedSummary');
      const retry = button(options.t('music.catalogRetry'), 'ui-button ui-button--secondary music-catalog__retry');
      retry.addEventListener('click', () => {
        resetPlaylistCache();
        load();
      });
      list.replaceChildren(retry);
    });
  };
  load();

  return {
    root,
    stop,
    render,
    destroy: () => {
      destroyed = true;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      root.remove();
    },
  };
}
