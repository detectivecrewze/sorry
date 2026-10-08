import { button, el } from '../ui/dom';
import { loadPlaylist, resetPlaylistCache, type PlaylistTrack } from './playlist';

interface MusicCatalogOptions {
  selectedAudioUrl?: () => string;
  selectedAudioUrls?: () => string[];
  beforePlay: () => void;
  onSelect: (track: PlaylistTrack) => void;
  onDeselect?: (audioUrl: string) => void;
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
    el('strong', '', 'Katalog lagu'),
    el('small', '', 'Buka untuk mencari dan mendengarkan lagu'),
  );
  const toggleIcon = el('span', 'music-catalog__toggle-icon', '⌄');
  toggleIcon.setAttribute('aria-hidden', 'true');
  toggle.append(toggleCopy, toggleIcon);
  const content = el('div', 'music-catalog__content');
  content.hidden = true;
  const status = el('p', 'music-catalog__status', 'Memuat katalog lagu…');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const searchLabel = el('label', 'form-field music-catalog__search');
  const search = el('input', 'text-input');
  search.type = 'search';
  search.placeholder = 'Cari judul atau artis…';
  search.autocomplete = 'off';
  searchLabel.append(el('span', 'form-field__label', 'Cari katalog'), search);
  const list = el('div', 'music-catalog__list');
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Katalog lagu');
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
    setStatus(tracks.length ? `${tracks.length} lagu tersedia. Dengarkan dulu sebelum memilih.` : '');
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
    setStatus(`Memuat preview “${track.title}”…`, 'loading');
    render();
    try {
      await audio.play();
      setStatus(`Sedang memutar “${track.title}”.`, 'playing');
    } catch {
      activeAudioUrl = '';
      setStatus('Preview lagu ini tidak dapat diputar di browser kamu. Pilih lagu lain atau upload MP3 sendiri.', 'error');
    }
    render();
  };

  const render = (): void => {
    if (destroyed) return;
    list.replaceChildren();
    const query = search.value.trim().toLocaleLowerCase('id-ID');
    const matches = tracks.filter((track) => `${track.title} ${track.artist}`.toLocaleLowerCase('id-ID').includes(query));
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
      const preview = button(playing ? 'Jeda' : 'Dengarkan', `catalog-track__preview${playing ? ' is-active' : ''}`);
      preview.setAttribute('aria-label', `${playing ? 'Jeda' : 'Dengarkan'} ${track.title} oleh ${track.artist}`);
      preview.addEventListener('click', () => void togglePreview(track));

      let select: HTMLButtonElement;
      if (selected) {
        select = button('Hapus', 'catalog-track__select catalog-track__select--remove is-selected');
        select.setAttribute('aria-label', `Hapus ${track.title} dari playlist`);
        select.addEventListener('click', () => {
          stop();
          options.onDeselect?.(track.audioUrl);
        });
      } else {
        select = button('Pilih lagu', `catalog-track__select${isFull ? ' is-disabled' : ''}`);
        select.setAttribute('aria-label', `Pilih lagu ${track.title}`);
        if (isFull) {
          select.disabled = true;
          select.title = 'Maksimal 3 lagu sudah dipilih. Hapus salah satu lagu untuk mengganti.';
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
    if (!matches.length && tracks.length) list.append(el('p', 'music-catalog__empty', 'Lagu tidak ditemukan. Coba judul atau nama artis lain.'));
  };

  search.addEventListener('input', render);
  audio.addEventListener('play', render);
  audio.addEventListener('pause', render);
  audio.addEventListener('ended', stop);
  audio.addEventListener('error', () => {
    activeAudioUrl = '';
    setStatus('Preview lagu ini tidak dapat diputar di browser kamu. Pilih lagu lain atau upload MP3 sendiri.', 'error');
    render();
  });

  const load = (): void => {
    setStatus('Memuat katalog lagu…', 'loading');
    list.replaceChildren();
    void loadPlaylist().then((loaded) => {
      if (destroyed) return;
      tracks = loaded;
      setStatus(`${tracks.length} lagu tersedia. Dengarkan dulu sebelum memilih.`, 'ready');
      const summary = toggleCopy.querySelector('small');
      if (summary) summary.textContent = `${tracks.length} lagu tersedia • buka untuk memilih`;
      render();
    }).catch((error) => {
      if (destroyed) return;
      setStatus(error instanceof Error ? error.message : 'Katalog musik gagal dimuat.', 'error');
      const summary = toggleCopy.querySelector('small');
      if (summary) summary.textContent = 'Katalog gagal dimuat • buka untuk mencoba lagi';
      const retry = button('Coba muat lagi', 'ui-button ui-button--secondary music-catalog__retry');
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
