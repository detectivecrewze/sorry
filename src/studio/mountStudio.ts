import QRCode from 'qrcode';
import { ApiError, getStudioProject, saveStudioProject, uploadMedia } from '../api/client';
import { forgetStudioToken, resolveStudioToken } from '../api/studio-token';
import { MASCOTS } from '../project/mascots';
import { PALETTES } from '../project/palettes';
import type { SceneId } from '../state/machine';
import {
  formatLetterText,
  parseLetterText,
  validateProjectForPublish,
  type MascotId,
  type PaletteId,
  type ProjectLocale,
  type SorryGiftProjectV1,
} from '../project/schema';
import { button, el, field, setBusy } from '../ui/dom';
import { createStudioLivePreview, type StudioPreviewRequest } from './livePreview';
import { createMusicCatalog, type MusicCatalogController } from './musicCatalog';
import type { PlaylistTrack } from './playlist';

type StudioStatus = 'idle' | 'saving' | 'saved' | 'error' | 'published' | 'unpublished' | 'dirty';

const steps = [
  ['Identitas & Intro', 'Nama dan pembuka'],
  ['Gaya', 'Maskot dan warna'],
  ['Surat & Jawaban', 'Isi utama gift'],
  ['Musik', 'Lagu dan thumbnail'],
  ['Preview & Publish', 'Periksa lalu terbitkan'],
] as const;

const STUDIO_EXAMPLES: Record<ProjectLocale, {
  recipient: string;
  sender: string;
  introTitle: string;
  introSubtitle: string;
  letterHeading: string;
  letterBody: string;
  signoff: string;
  question: string;
  acceptedHeading: string;
  acceptedBody: string;
  waitHeading: string;
  waitBody: string;
  loveLine: string;
  promiseHeading: string;
  promiseBody: string;
  musicTitle: string;
  musicArtist: string;
}> = {
  id: {
    recipient: 'Contoh: Alya',
    sender: 'Contoh: Raka',
    introTitle: 'Maafkan Aku, Sayang...',
    introSubtitle: 'Sebuah ruang kecil untuk menyampaikan isi hati dan memperbaiki semuanya bersama.',
    letterHeading: 'Untuk Kamu yang Paling Berarti...',
    letterBody: 'Aku menulis surat ini karena ingin meminta maaf dengan tulus.\n\nHubungan kita sangat berarti untukku dan aku ingin memperbaiki semuanya bersama.',
    signoff: 'Dengan segenap cintaku, Raka',
    question: 'Maukah kamu memaafkanku?',
    acceptedHeading: 'Terima kasih sudah memaafkanku!',
    acceptedBody: 'Terima kasih sudah memberi kita kesempatan untuk memulai kembali.',
    waitHeading: 'Ambil waktu yang kamu butuhkan, ya.',
    waitBody: 'Tidak ada paksaan. Aku akan tetap di sini ketika kamu sudah siap.',
    loveLine: 'Aku sayang kamu.',
    promiseHeading: 'Aku berjanji akan menjadi lebih baik.',
    promiseBody: 'Terima kasih sudah tetap memilih kita.',
    musicTitle: 'Contoh: Bergema Sampai Selamanya',
    musicArtist: 'Contoh: Nadhif Basalamah',
  },
  en: {
    recipient: 'Example: Alya',
    sender: 'Example: Raka',
    introTitle: "I'm Sorry, Love...",
    introSubtitle: 'A little space to share my heart and make things right together.',
    letterHeading: 'For the One Who Means the Most...',
    letterBody: 'I am writing this because I want to apologize sincerely.\n\nOur relationship means so much to me, and I want to make things right together.',
    signoff: 'With all my love, Raka',
    question: 'Will you forgive me?',
    acceptedHeading: 'Thank you for forgiving me!',
    acceptedBody: 'Thank you for giving us another chance to begin again.',
    waitHeading: 'Take all the time you need.',
    waitBody: 'There is no pressure. I will be here whenever you are ready.',
    loveLine: 'I love you.',
    promiseHeading: 'I promise to be better.',
    promiseBody: 'Thank you for still choosing us.',
    musicTitle: 'Example: Keep Me',
    musicArtist: 'Example: Novo Amor',
  },
};

function textInput(value: string, maxLength: number, placeholder = ''): HTMLInputElement {
  const input = el('input', 'text-input');
  input.type = 'text';
  input.value = value;
  input.maxLength = maxLength;
  input.placeholder = placeholder;
  return input;
}

function textArea(value: string, maxLength: number, rows = 4, placeholder = ''): HTMLTextAreaElement {
  const input = el('textarea', 'text-input text-area');
  input.value = value;
  input.maxLength = maxLength;
  input.rows = rows;
  input.placeholder = placeholder;
  return input;
}

function sectionHeader(kicker: string, title: string, copy: string): HTMLElement {
  const root = el('header', 'studio-section-heading');
  root.append(el('span', 'eyebrow', kicker), el('h2', '', title), el('p', '', copy));
  return root;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.';
}

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

const PLAY_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="margin-left: 2px;"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z"/></svg>';
const PAUSE_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
const PREV_TRACK_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>';
const NEXT_TRACK_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>';
const COMPASS_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align: -2px; margin-right: 6px;"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>';
const EYE_PREVIEW_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align: -2px; margin-right: 5px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const MUSIC_NOTE_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';
const REMOVE_ICON_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align: -1px; margin-right: 4px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
const DOWNLOAD_ICON_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align: -2px; margin-right: 6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
const COPY_ICON_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align: -1px; margin-right: 4px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const EXTERNAL_LINK_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align: -1px; margin-right: 4px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

function renderScannableLoveBarcode(
  canvas: HTMLCanvasElement,
  url: string,
  color: string,
  pixelSize = 1000,
): void {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const moduleCount = qr.modules.size;
  const quietZone = 4;
  const totalModules = moduleCount + quietZone * 2;
  const scale = pixelSize / totalModules;

  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Crisp white quiet zone & background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pixelSize, pixelSize);

  // 2. Draw scannable QR code modules in selected palette color
  ctx.fillStyle = color;
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qr.modules.get(r, c)) {
        const x = (c + quietZone) * scale;
        const y = (r + quietZone) * scale;
        ctx.fillRect(x, y, scale, scale);
      }
    }
  }

  // 3. Clear center badge for the aesthetic heart emblem
  const centerModules = Math.floor(moduleCount * 0.22);
  const centerSize = centerModules * scale;
  const centerX = pixelSize / 2;
  const centerY = pixelSize / 2;
  const half = centerSize / 2;
  const badgeRadius = scale * 1.4;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(centerX - half, centerY - half, centerSize, centerSize, badgeRadius);
  } else {
    ctx.rect(centerX - half, centerY - half, centerSize, centerSize);
  }
  ctx.fill();

  // 4. Draw aesthetic heart emblem inside center
  ctx.fillStyle = color;
  const heartScale = (centerSize * 0.72) / 24;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(heartScale, heartScale);
  ctx.translate(-12, -12);
  const heartPath = new Path2D('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
  ctx.fill(heartPath);
  ctx.restore();
}

export async function mountStudio(target: HTMLElement, projectId: string): Promise<() => void> {
  const token = resolveStudioToken(projectId);
  if (!token) {
    const missing = el('main', 'access-state');
    missing.append(el('span', 'eyebrow', 'Studio link'), el('h1', '', 'Magic link belum tersimpan'), el('p', '', 'Buka kembali link Studio lengkap yang diberikan admin. Setelah terbuka sekali, Safari akan menyimpannya untuk kunjungan berikutnya.'));
    target.replaceChildren(missing);
    return () => target.replaceChildren();
  }

  const loading = el('main', 'access-state');
  loading.append(el('div', 'loading-mark'), el('h1', '', 'Membuka Studio…'), el('p', '', 'Menyiapkan surat dan preview kamu.'));
  target.replaceChildren(loading);

  let project: SorryGiftProjectV1;
  try {
    project = (await getStudioProject(projectId, token)).project;
    project.locale = project.locale === 'en' ? 'en' : 'id';
  } catch (error) {
    const invalid = el('main', 'access-state');
    invalid.append(el('span', 'eyebrow', 'Studio link'), el('h1', '', 'Studio tidak dapat dibuka'), el('p', '', errorMessage(error)));
    if (error instanceof ApiError && error.status === 401) {
      const reset = button('Hapus token tersimpan', 'ui-button ui-button--secondary');
      reset.addEventListener('click', () => { forgetStudioToken(projectId); window.location.reload(); });
      invalid.append(reset);
    }
    target.replaceChildren(invalid);
    return () => target.replaceChildren();
  }

  let activeStep = 0;
  let status: StudioStatus = project.publishedAt
    ? (new Date(project.updatedAt).getTime() > new Date(project.publishedAt).getTime() ? 'unpublished' : 'published')
    : 'saved';
  let saveTimer = 0;
  let saveSequence = 0;
  let uploadRetry: (() => void) | null = null;
  let musicSource: 'catalog' | 'upload' = 'catalog';
  let musicCatalog: MusicCatalogController | null = null;
  let letterPreviewScene: SceneId = 'letter';
  let previewTrackIndex = 0;
  let studioTitleObserver: ResizeObserver | null = null;
  const audio = new Audio(project.music.audioUrl);
  audio.preload = 'metadata';

  const shell = el('main', 'studio-shell');
  const header = el('header', 'studio-header');
  const brand = el('div', 'studio-brand');
  brand.append(el('span', 'eyebrow', 'Sorry Letter Studio'), el('strong', '', project.identity.recipient || 'Project baru'));
  const statusPill = el('span', 'status-pill');
  header.append(brand, statusPill);

  const body = el('div', 'studio-layout');
  const nav = el('nav', 'studio-steps');
  nav.setAttribute('aria-label', 'Langkah Studio');
  const panel = el('section', 'studio-panel');
  body.append(nav, panel);
  shell.append(header, body, audio);
  target.replaceChildren(shell);

  function stopStudioAudio(): void {
    audio.pause();
    musicCatalog?.stop();
  }

  const livePreview = createStudioLivePreview({
    getProject: () => project,
    beforeOpen: stopStudioAudio,
  });

  function appendSectionHeader(
    kicker: string,
    title: string,
    copy: string,
    request?: (() => StudioPreviewRequest) | null,
  ): void {
    const heading = sectionHeader(kicker, title, copy);
    if (request) {
      const preview = button('Lihat live preview', 'ui-button ui-button--secondary live-preview-trigger');
      preview.addEventListener('click', () => livePreview.open(request(), preview));
      heading.append(preview);
    }
    panel.append(heading);
  }

  function setStatus(next: StudioStatus, detail = ''): void {
    status = next;
    const labels: Record<StudioStatus, string> = {
      idle: 'Siap', saving: 'Menyimpan…', saved: 'Tersimpan', error: detail || 'Gagal menyimpan',
      published: 'Sudah dipublikasikan', unpublished: 'Perubahan belum dipublish',
      dirty: project.publishedAt ? 'Ada perubahan baru' : 'Belum dipublikasikan',
    };
    statusPill.textContent = labels[next];
    statusPill.dataset.status = next;
  }

  async function save(publish = false): Promise<void> {
    window.clearTimeout(saveTimer);
    const sequence = ++saveSequence;
    setStatus('saving');
    try {
      const result = await saveStudioProject(projectId, token, project, publish);
      if (sequence !== saveSequence) return;
      project = result.project;
      setStatus(publish ? 'published' : (project.publishedAt ? 'unpublished' : 'saved'));
      if (publish) renderStep();
    } catch (error) {
      if (sequence !== saveSequence) return;
      setStatus('error', errorMessage(error));
      throw error;
    }
  }

  function changed(): void {
    project.updatedAt = new Date().toISOString();
    setStatus('dirty');
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => void save().catch(() => undefined), 700);
    brand.querySelector('strong')!.textContent = project.identity.recipient || 'Project baru';
  }

  function bind(input: HTMLInputElement | HTMLTextAreaElement, update: (value: string) => void, previewScene?: SceneId): void {
    input.addEventListener('input', () => { update(input.value); changed(); });
    if (previewScene) input.addEventListener('focus', () => { letterPreviewScene = previewScene; });
  }

  function renderNav(): void {
    nav.replaceChildren();
    steps.forEach(([title, subtitle], index) => {
      const item = button('', 'step-button');
      item.classList.toggle('is-active', index === activeStep);
      item.setAttribute('aria-current', index === activeStep ? 'step' : 'false');
      item.append(el('span', 'step-button__number', String(index + 1)), el('span', 'step-button__copy'));
      item.lastElementChild!.append(el('strong', '', title), el('small', '', subtitle));
      item.addEventListener('click', () => { activeStep = index; render(); });
      nav.append(item);
    });
  }

  function renderIdentity(): void {
    appendSectionHeader('Langkah 1 dari 5', 'Siapa yang menerima surat ini?', 'Isi nama orang yang akan membuka gift, nama kamu sebagai pengirim, dan kalimat pembukanya.', () => ({
      title: 'Identitas & Intro',
      description: 'Periksa bahasa tombol, pembuka gift, dan isi surat tanpa tambahan nama otomatis.',
      initialScene: 'intro',
      tabs: [{ label: 'Intro', scene: 'intro' }, { label: 'Surat', scene: 'letter' }],
    }));
    const examples = STUDIO_EXAMPLES[project.locale];
    const grid = el('div', 'form-grid form-grid--two');

    const languageSwitcher = el('div', 'language-switcher');
    const idBtn = button('Bahasa Indonesia', `language-pill${project.locale === 'id' ? ' is-active' : ''}`);
    const enBtn = button('English', `language-pill${project.locale === 'en' ? ' is-active' : ''}`);
    idBtn.setAttribute('aria-pressed', String(project.locale === 'id'));
    enBtn.setAttribute('aria-pressed', String(project.locale === 'en'));

    const language = el('select', 'language-switcher__select');
    language.setAttribute('aria-label', 'Bahasa gift');
    const indonesian = el('option', '', 'Bahasa Indonesia');
    indonesian.value = 'id';
    const english = el('option', '', 'English');
    english.value = 'en';
    language.append(indonesian, english);
    language.value = project.locale;

    const setLocale = (nextLocale: ProjectLocale): void => {
      if (project.locale === nextLocale) return;
      project.locale = nextLocale;
      language.value = nextLocale;
      changed();
      render();
    };

    idBtn.addEventListener('click', () => setLocale('id'));
    enBtn.addEventListener('click', () => setLocale('en'));

    language.addEventListener('change', () => {
      const nextLocale = language.value === 'en' ? 'en' : 'id';
      if (project.locale !== nextLocale) {
        project.locale = nextLocale;
        changed();
        render();
      }
    });

    languageSwitcher.append(idBtn, enBtn, language);

    const recipient = textInput(project.identity.recipient, 80, examples.recipient);
    const sender = textInput(project.identity.sender, 80, examples.sender);
    const title = textInput(project.intro.title, 120, examples.introTitle);
    const subtitle = textArea(project.intro.subtitle, 240, 3, examples.introSubtitle);
    bind(recipient, (value) => { project.identity.recipient = value; });
    bind(sender, (value) => { project.identity.sender = value; });
    bind(title, (value) => { project.intro.title = value; });
    bind(subtitle, (value) => { project.intro.subtitle = value; });

    const languageField = el('div', 'form-field form-field--full');
    languageField.append(
      el('span', 'form-field__label', 'Bahasa gift'),
      languageSwitcher,
      el('small', 'form-field__hint', 'Mengubah bahasa tombol dan pesan bawaan gift. Isi surat yang kamu tulis tidak diterjemahkan otomatis.'),
    );
    const subtitleField = field('Subtitle pembuka', subtitle, 'Kalimat pendek tepat di bawah judul pembuka. Maksimal 240 karakter.');
    subtitleField.classList.add('form-field--full');

    grid.append(
      languageField,
      field('Nama penerima — orang yang akan membuka gift ini', recipient, 'Dipakai sebagai identitas gift di Studio. Nama ini tidak ditambahkan otomatis ke isi surat.'),
      field('Nama pengirim — nama kamu sebagai pembuat surat', sender, 'Dipakai sebagai identitas gift di Studio. Tulis nama pada Penutup Surat jika ingin menampilkannya di gift.'),
      field('Judul pembuka', title, 'Teks besar pertama yang terlihat sebelum amplop dibuka.'),
      subtitleField,
    );
    panel.append(grid);
  }

  function renderStyle(): void {
    appendSectionHeader('Langkah 2 dari 5', 'Pilih suasana surat', 'Maskot dan warna dapat diganti kapan saja tanpa mengubah isi surat.', () => ({
      title: 'Gaya Gift',
      description: 'Scene Pertanyaan memperlihatkan warna dan maskot pilihanmu secara bersamaan.',
      initialScene: 'question',
      tabs: [{ label: 'Intro', scene: 'intro' }, { label: 'Pertanyaan', scene: 'question' }],
    }));
    panel.append(el('h3', 'form-subheading', 'Maskot'));
    const mascotGrid = el('div', 'choice-grid choice-grid--mascot');
    (Object.keys(MASCOTS) as MascotId[]).forEach((id) => {
      const mascot = MASCOTS[id];
      const card = button('', 'visual-choice');
      card.classList.toggle('is-selected', project.mascotId === id);
      const image = el('img'); image.src = mascot.preview; image.alt = '';
      const copy = el('span'); copy.append(el('strong', '', mascot.name), el('small', '', mascot.description));
      card.append(image, copy);
      card.addEventListener('click', () => { project.mascotId = id; changed(); render(); });
      mascotGrid.append(card);
    });
    panel.append(mascotGrid, el('h3', 'form-subheading', 'Preset warna'));
    const paletteGrid = el('div', 'choice-grid choice-grid--palette');
    (Object.keys(PALETTES) as PaletteId[]).forEach((id) => {
      const palette = PALETTES[id];
      const card = button('', 'palette-choice');
      card.classList.toggle('is-selected', project.paletteId === id);
      const swatches = el('span', 'palette-swatches');
      [palette.theme.background, palette.theme.surface, palette.theme.accent].forEach((color) => {
        const swatch = el('i'); swatch.style.background = color; swatches.append(swatch);
      });
      const copy = el('span'); copy.append(el('strong', '', palette.name), el('small', '', palette.description));
      card.append(swatches, copy);
      card.addEventListener('click', () => { project.paletteId = id; changed(); render(); });
      paletteGrid.append(card);
    });
    const live = el('div', 'style-preview');
    const selectedPalette = PALETTES[project.paletteId];
    const selectedMascot = MASCOTS[project.mascotId];
    live.style.setProperty('--preview-bg', selectedPalette.theme.background);
    live.style.setProperty('--preview-surface', selectedPalette.theme.surface);
    live.style.setProperty('--preview-text', selectedPalette.theme.text);
    live.style.setProperty('--preview-accent', selectedPalette.theme.accent);

    const previewCopy = el('div', 'style-preview__content');
    const badge = el('span', 'style-preview__badge');
    badge.append(el('span', 'style-preview__pulse'), document.createTextNode('LIVE PREVIEW'));

    const titleEl = el('strong', 'style-preview__title', project.intro.title || "I'm Sorry, Love...");

    const metaRow = el('div', 'style-preview__meta');
    const recipientBadge = el('span', 'style-preview__recipient');
    recipientBadge.append(
      el('span', 'style-preview__recipient-label', 'Untuk: '),
      el('strong', '', project.identity.recipient || 'Someone special'),
    );
    const themePill = el('span', 'style-preview__theme-pill', `${selectedPalette.name} • ${selectedMascot.name}`);
    metaRow.append(recipientBadge, themePill);

    previewCopy.append(badge, titleEl, metaRow);

    const mascotFrame = el('div', 'style-preview__mascot-frame');
    const previewImage = el('img', 'style-preview__image');
    previewImage.src = selectedMascot.preview;
    previewImage.alt = selectedMascot.alt || '';
    mascotFrame.append(previewImage);

    live.append(previewCopy, mascotFrame);
    panel.append(paletteGrid, live);
  }

  function renderLetter(): void {
    appendSectionHeader('Langkah 3 dari 5', 'Tulis isi hati dan jawabannya', 'Pisahkan paragraf surat dengan satu baris kosong. Tombol dan alurnya sudah diatur oleh template.', () => ({
      title: 'Surat & Jawaban',
      description: 'Preview dibuka langsung pada bagian yang terakhir kamu edit.',
      initialScene: letterPreviewScene,
      tabs: [
        { label: 'Surat', scene: 'letter' },
        { label: 'Pertanyaan', scene: 'question' },
        { label: 'Diterima', scene: 'accepted' },
        { label: 'Butuh waktu', scene: 'needs-time' },
        { label: 'Janji', scene: 'promise' },
      ],
    }));
    const examples = STUDIO_EXAMPLES[project.locale];
    const heading = textInput(project.letter.heading, 160, examples.letterHeading);
    const paragraphs = textArea(formatLetterText(project.letter.paragraphs), 10_000, 12, examples.letterBody);
    const signoff = textInput(project.letter.signoff, 160, examples.signoff);
    const question = textInput(project.question.heading, 160, examples.question);
    bind(heading, (value) => { project.letter.heading = value; }, 'letter');
    bind(paragraphs, (value) => { project.letter.paragraphs = parseLetterText(value); }, 'letter');
    bind(signoff, (value) => { project.letter.signoff = value; }, 'letter');
    bind(question, (value) => { project.question.heading = value; }, 'question');

    const acceptedHeading = textInput(project.endings.accepted.heading, 160, examples.acceptedHeading);
    const acceptedBody = textArea(project.endings.accepted.body, 800, 3, examples.acceptedBody);
    bind(acceptedHeading, (value) => { project.endings.accepted.heading = value; }, 'accepted');
    bind(acceptedBody, (value) => { project.endings.accepted.body = value; }, 'accepted');

    const waitHeading = textInput(project.endings.needTime.heading, 160, examples.waitHeading);
    const waitBody = textArea(project.endings.needTime.body, 800, 3, examples.waitBody);
    const loveLine = textInput(project.endings.needTime.loveLine, 160, examples.loveLine);
    bind(waitHeading, (value) => { project.endings.needTime.heading = value; }, 'needs-time');
    bind(waitBody, (value) => { project.endings.needTime.body = value; }, 'needs-time');
    bind(loveLine, (value) => { project.endings.needTime.loveLine = value; }, 'needs-time');

    const promiseHeading = textInput(project.endings.promise.heading, 160, examples.promiseHeading);
    const promiseBody = textArea(project.endings.promise.body, 800, 3, examples.promiseBody);
    bind(promiseHeading, (value) => { project.endings.promise.heading = value; }, 'promise');
    bind(promiseBody, (value) => { project.endings.promise.body = value; }, 'promise');

    // 1. Visual Storyline Tracker
    const tracker = el('div', 'storyline-tracker');
    tracker.setAttribute('aria-label', 'Alur perjalanan kado');
    const trackerTitle = el('div', 'storyline-tracker__title');
    const trackerTitleText = el('span', '');
    trackerTitleText.innerHTML = `${COMPASS_SVG}<span>Alur Perjalanan Kado</span>`;
    trackerTitle.append(
      trackerTitleText,
      el('small', '', 'Gunakan tombol preview di tiap blok untuk langsung meninjau adegan'),
    );
    const trackerSteps = el('div', 'storyline-tracker__steps');
    const makeStep = (num: string, stepTitle: string, stepSubtitle: string) => {
      const stepEl = el('div', 'storyline-step');
      stepEl.append(
        el('span', 'storyline-step__badge', num),
        el('div', 'storyline-step__copy'),
      );
      stepEl.lastElementChild!.append(el('strong', '', stepTitle), el('small', '', stepSubtitle));
      return stepEl;
    };
    trackerSteps.append(
      makeStep('1', 'Lembar Surat', 'Dibaca pertama'),
      el('span', 'storyline-step__arrow', '→'),
      makeStep('2', 'Pertanyaan Maaf', 'Muncul 2 opsi'),
      el('span', 'storyline-step__arrow', '→'),
      makeStep('3', 'Respon Pasangan', 'Yes / Butuh waktu'),
      el('span', 'storyline-step__arrow', '→'),
      makeStep('4', 'Layar Janji', 'Komitmen penutup'),
    );
    tracker.append(trackerTitle, trackerSteps);

    // 2. Helper to create a grouped card with direct preview button
    function createLetterCard(
      cardTitle: string,
      cardCopy: string,
      scene: SceneId,
      previewLabel: string,
    ): { card: HTMLElement; body: HTMLElement } {
      const card = el('section', 'letter-group-card');
      const header = el('div', 'letter-group-card__header');
      const titleWrap = el('div', 'letter-group-card__title-wrap');
      titleWrap.append(
        el('h3', 'letter-group-card__title', cardTitle),
        el('p', 'letter-group-card__copy', cardCopy),
      );
      const previewBtn = button('', 'letter-group-card__preview-btn');
      previewBtn.innerHTML = `${EYE_PREVIEW_SVG}<span>${previewLabel}</span>`;
      previewBtn.setAttribute('aria-label', `Lihat preview adegan ${cardTitle}`);
      previewBtn.addEventListener('click', () => {
        letterPreviewScene = scene;
        livePreview.open({
          title: 'Surat & Jawaban',
          description: 'Pratinjau lembar surat dan pilihan jawaban.',
          initialScene: scene,
          tabs: [
            { label: 'Surat', scene: 'letter' },
            { label: 'Pertanyaan', scene: 'question' },
            { label: 'Diterima', scene: 'accepted' },
            { label: 'Butuh waktu', scene: 'needs-time' },
            { label: 'Janji', scene: 'promise' },
          ],
        }, previewBtn);
      });
      header.append(titleWrap, previewBtn);
      const cardBody = el('div', 'letter-group-card__body');
      card.append(header, cardBody);
      return { card, body: cardBody };
    }

    // Card 1: Surat Utama
    const letterCard = createLetterCard(
      '1. Lembar Surat Utama',
      'Halaman pembuka setelah amplop dibuka, diiringi lagu dan tulisan tangan hangat.',
      'letter',
      'Preview Surat ↗',
    );
    letterCard.body.append(
      field('Judul surat', heading, 'Judul tulisan tangan di bagian paling atas halaman surat.'),
      field('Isi surat', paragraphs, 'Isi utama yang dibaca penerima. Pisahkan paragraf dengan satu baris kosong; maksimal 10.000 karakter dan 20 paragraf.'),
      field('Penutup surat', signoff, 'Kalimat sebelum nama pengirim, misalnya “With all my love”.'),
    );

    // Card 2: Pertanyaan Maaf
    const questionCard = createLetterCard(
      '2. Pertanyaan Permintaan Maaf',
      'Layar interaktif setelah pasangan selesai membaca surat dan menekan tombol Continue.',
      'question',
      'Preview Pertanyaan ↗',
    );
    questionCard.body.append(
      field('Pertanyaan maaf', question, 'Pertanyaan utama untuk meminta maaf, misalnya “Maukah kamu memaafkanku?”.'),
    );

    // Card 3: Jawaban Diterima
    const acceptedCard = createLetterCard(
      '3. Jawaban Ketika Diterima (Pilihan "Yes")',
      'Halaman bahagia dan rasa syukur yang muncul seketika saat pasangan menekan tombol “Yes”.',
      'accepted',
      'Preview Layar "Yes" ↗',
    );
    const acceptedGrid = el('div', 'form-grid form-grid--two');
    acceptedGrid.append(field('Judul', acceptedHeading), field('Isi', acceptedBody));
    acceptedCard.body.append(acceptedGrid);

    // Card 4: Jawaban Butuh Waktu
    const waitingCard = createLetterCard(
      '4. Jawaban Ketika Butuh Waktu (Pilihan "I need more time")',
      'Halaman penuh pengertian dan penenang jika pasangan masih memerlukan waktu untuk berpikir.',
      'needs-time',
      'Preview "Butuh Waktu" ↗',
    );
    const waitingGrid = el('div', 'form-grid form-grid--two');
    waitingGrid.append(field('Judul', waitHeading), field('Isi', waitBody), field('Kalimat cinta', loveLine));
    waitingCard.body.append(waitingGrid);

    // Card 5: Halaman Janji
    const promiseCard = createLetterCard(
      '5. Halaman Janji & Komitmen',
      'Halaman penutup kado setelah permintaan maaf diterima dan pasangan menekan tombol Continue.',
      'promise',
      'Preview Halaman Janji ↗',
    );
    const promiseGrid = el('div', 'form-grid form-grid--two');
    promiseGrid.append(field('Judul', promiseHeading), field('Isi', promiseBody));
    promiseCard.body.append(promiseGrid);

    panel.append(
      tracker,
      letterCard.card,
      questionCard.card,
      acceptedCard.card,
      waitingCard.card,
      promiseCard.card,
    );
  }

  function renderMusic(): void {
    appendSectionHeader('Langkah 4 dari 5', 'Pilih lagu untuk surat ini', 'Pilih hingga 3 lagu untuk mengiringi suratmu. Lagu akan diputar berurutan sebagai playlist.', () => ({
      title: 'Musik',
      description: 'Preview membuka halaman Surat agar player terlihat dalam konteks gift.',
      initialScene: 'letter',
    }));

    if (!Array.isArray(project.music.tracks) || project.music.tracks.length === 0) {
      project.music.tracks = project.music.audioUrl ? [{
        audioUrl: project.music.audioUrl,
        coverUrl: project.music.coverUrl,
        title: project.music.title,
        artist: project.music.artist,
      }] : [];
    }

    const syncPrimaryTrack = (): void => {
      const first = project.music.tracks?.[0];
      if (first) {
        project.music.audioUrl = first.audioUrl;
        project.music.coverUrl = first.coverUrl;
        project.music.title = first.title;
        project.music.artist = first.artist;
      } else {
        project.music.audioUrl = '';
        project.music.coverUrl = '';
        project.music.title = '';
        project.music.artist = '';
      }
    };

    const tracks = project.music.tracks;
    if (previewTrackIndex >= tracks.length) previewTrackIndex = Math.max(0, tracks.length - 1);
    const activeTrack = tracks[previewTrackIndex] ?? {
      audioUrl: project.music.audioUrl,
      coverUrl: project.music.coverUrl,
      title: project.music.title,
      artist: project.music.artist,
    };

    if (activeTrack.audioUrl && audio.src !== activeTrack.audioUrl) {
      audio.pause();
      audio.src = activeTrack.audioUrl;
      audio.load();
    } else if (!activeTrack.audioUrl) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }

    const musicLayout = el('div', 'music-editor music-editor--stacked');

    // 1. Playlist Terpilih (Up to 3 songs)
    const playlistCard = el('section', 'selected-playlist');
    const playlistHeader = el('header', 'selected-playlist__header');
    const playlistTitleWrap = el('div', 'selected-playlist__title-wrap');
    playlistTitleWrap.append(
      el('span', 'form-field__label', 'Daftar Lagu Terpilih'),
      el('p', 'selected-playlist__caption', 'Pilih hingga 3 lagu. Lagu akan diputar berurutan saat penerima membaca surat.'),
    );
    const countBadge = el('span', `selected-playlist__count-badge${tracks.length >= 3 ? ' is-full' : ''}`, `${tracks.length}/3 lagu terpilih`);
    playlistHeader.append(playlistTitleWrap, countBadge);
    playlistCard.append(playlistHeader);

    const playlistList = el('div', 'selected-playlist__list');
    if (tracks.length === 0) {
      const emptyNote = el('div', 'selected-playlist__empty', 'Belum ada lagu yang dipilih. Silakan pilih lagu dari katalog di bawah atau upload lagu sendiri.');
      playlistList.append(emptyNote);
    } else {
      tracks.forEach((track, index) => {
        const isCurrentPreview = previewTrackIndex === index;
        const item = el('div', `selected-playlist__item${isCurrentPreview ? ' is-active' : ''}`);

        const slotBadge = el('span', `selected-playlist__slot-badge${index === 0 ? ' is-primary' : ''}`, index === 0 ? '#1 (Utama)' : `#${index + 1}`);

        const coverThumb = el('span', 'selected-playlist__thumb');
        if (track.coverUrl) {
          const img = el('img');
          img.src = track.coverUrl;
          img.alt = '';
          img.loading = 'lazy';
          coverThumb.append(img);
        } else {
          coverThumb.innerHTML = MUSIC_NOTE_SVG;
        }

        const info = el('div', 'selected-playlist__info');
        info.append(
          el('strong', 'selected-playlist__track-title', track.title || 'Untitled'),
          el('span', 'selected-playlist__track-artist', track.artist || 'Unknown artist'),
        );

        const actions = el('div', 'selected-playlist__actions');

        const isThisPlaying = isCurrentPreview && !audio.paused;
        const playBtn = button(isThisPlaying ? 'Jeda' : 'Dengarkan', `selected-playlist__play-btn${isThisPlaying ? ' is-playing' : ''}`);
        playBtn.setAttribute('aria-label', `${isThisPlaying ? 'Jeda' : 'Dengarkan'} ${track.title}`);
        playBtn.addEventListener('click', async () => {
          musicCatalog?.stop();
          if (previewTrackIndex === index && !audio.paused) {
            audio.pause();
            render();
          } else {
            previewTrackIndex = index;
            audio.pause();
            audio.src = track.audioUrl;
            audio.load();
            try {
              await audio.play();
            } catch {
              // ignore
            }
            render();
          }
        });

        if (index > 0) {
          const moveUp = button('↑', 'selected-playlist__order-btn');
          moveUp.setAttribute('aria-label', `Pindahkan ${track.title} ke atas`);
          moveUp.title = 'Pindahkan ke atas';
          moveUp.addEventListener('click', () => {
            const temp = tracks[index - 1];
            tracks[index - 1] = track;
            tracks[index] = temp;
            syncPrimaryTrack();
            if (previewTrackIndex === index) previewTrackIndex = index - 1;
            else if (previewTrackIndex === index - 1) previewTrackIndex = index;
            changed();
            render();
          });
          actions.append(moveUp);
        }

        if (index < tracks.length - 1) {
          const moveDown = button('↓', 'selected-playlist__order-btn');
          moveDown.setAttribute('aria-label', `Pindahkan ${track.title} ke bawah`);
          moveDown.title = 'Pindahkan ke bawah';
          moveDown.addEventListener('click', () => {
            const temp = tracks[index + 1];
            tracks[index + 1] = track;
            tracks[index] = temp;
            syncPrimaryTrack();
            if (previewTrackIndex === index) previewTrackIndex = index + 1;
            else if (previewTrackIndex === index + 1) previewTrackIndex = index;
            changed();
            render();
          });
          actions.append(moveDown);
        }

        const removeBtn = button('', 'selected-playlist__remove-btn');
        removeBtn.innerHTML = `${REMOVE_ICON_SVG}<span>Hapus</span>`;
        removeBtn.setAttribute('aria-label', `Hapus ${track.title} dari playlist`);
        removeBtn.addEventListener('click', () => {
          stopStudioAudio();
          tracks.splice(index, 1);
          syncPrimaryTrack();
          if (previewTrackIndex >= tracks.length) previewTrackIndex = Math.max(0, tracks.length - 1);
          changed();
          render();
        });

        actions.append(playBtn, removeBtn);
        item.append(slotBadge, coverThumb, info, actions);
        playlistList.append(item);
      });

      if (tracks.length < 3) {
        const remaining = 3 - tracks.length;
        const emptySlot = el('div', 'selected-playlist__empty-slot');
        emptySlot.innerHTML = `<span class="empty-slot-plus">+</span> <span>Slot #${tracks.length + 1} Kosong — Pilih <strong>${remaining} lagu lagi</strong> dari katalog atau upload</span>`;
        playlistList.append(emptySlot);
      }
    }
    playlistCard.append(playlistList);

    // 2. Studio Player
    const player = el('div', 'studio-player');
    const cover = el('div', 'studio-player__cover');
    if (activeTrack.coverUrl) {
      const image = el('img');
      image.src = activeTrack.coverUrl;
      image.alt = '';
      cover.append(image);
    } else {
      cover.append(el('span', '', 'Cover'));
    }
    const meta = el('div', 'studio-player__meta');
    const previewBadge = tracks.length > 1
      ? `PREVIEW (${previewTrackIndex + 1}/${tracks.length})`
      : 'PREVIEW';
    const titleViewport = el('span', 'studio-player__title-viewport');
    const titleText = el('strong', 'studio-player__title-text', activeTrack.title || 'Judul lagu');
    titleViewport.append(titleText);
    meta.append(
      el('small', '', previewBadge),
      titleViewport,
      el('span', '', activeTrack.artist || 'Nama artis'),
    );

    const play = button('', 'player-button');
    play.innerHTML = audio.paused ? PLAY_ICON_SVG : PAUSE_ICON_SVG;
    play.disabled = !activeTrack.audioUrl;
    play.setAttribute('aria-label', audio.paused ? 'Putar lagu terpilih' : 'Jeda lagu terpilih');
    play.addEventListener('click', async () => {
      if (!activeTrack.audioUrl) return;
      musicCatalog?.stop();
      if (audio.paused) {
        try {
          await audio.play();
        } catch {
          const message = panel.querySelector<HTMLElement>('.studio-player__status');
          if (message) message.textContent = 'Lagu tidak dapat diputar. Pilih lagu lain atau upload MP3.';
        }
      } else {
        audio.pause();
      }
    });

    const seek = el('input', 'player-seek');
    seek.type = 'range';
    seek.min = '0';
    seek.max = '100';
    seek.value = audio.duration ? String((audio.currentTime / audio.duration) * 100) : '0';
    seek.disabled = !activeTrack.audioUrl;
    seek.setAttribute('aria-label', 'Posisi lagu terpilih');
    seek.addEventListener('input', () => {
      if (audio.duration) audio.currentTime = Number(seek.value) / 100 * audio.duration;
    });

    const current = el('span', 'studio-player__time studio-player__current', formatTime(audio.currentTime));
    const duration = el('span', 'studio-player__time studio-player__duration', formatTime(audio.duration));
    const controls = el('div', 'studio-player__controls');

    if (tracks.length > 1) {
      const prevTrackBtn = button('', 'player-nav-button');
      prevTrackBtn.innerHTML = PREV_TRACK_SVG;
      prevTrackBtn.setAttribute('aria-label', 'Lagu sebelumnya di playlist');
      prevTrackBtn.addEventListener('click', () => {
        musicCatalog?.stop();
        previewTrackIndex = (previewTrackIndex - 1 + tracks.length) % tracks.length;
        audio.pause();
        render();
      });
      const nextTrackBtn = button('', 'player-nav-button');
      nextTrackBtn.innerHTML = NEXT_TRACK_SVG;
      nextTrackBtn.setAttribute('aria-label', 'Lagu selanjutnya di playlist');
      nextTrackBtn.addEventListener('click', () => {
        musicCatalog?.stop();
        previewTrackIndex = (previewTrackIndex + 1) % tracks.length;
        audio.pause();
        render();
      });
      controls.append(prevTrackBtn, play, nextTrackBtn, current, seek, duration);
    } else {
      controls.append(play, current, seek, duration);
    }

    const playerStatus = el('p', 'studio-player__status', activeTrack.audioUrl ? '' : 'Pilih lagu dari katalog atau upload MP3 sendiri.');
    playerStatus.setAttribute('aria-live', 'polite');
    player.append(cover, meta, controls, playerStatus);

    // 3. Source Picker
    const sourcePicker = el('section', 'music-source-picker');
    const tabs = el('div', 'music-source-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Sumber musik');
    const catalogTab = button('Pilih dari katalog', 'music-source-tab');
    const uploadTab = button('Upload lagu sendiri', 'music-source-tab');
    catalogTab.setAttribute('role', 'tab');
    uploadTab.setAttribute('role', 'tab');
    const catalogPanel = el('div', 'music-source-panel');
    const uploadPanel = el('div', 'music-source-panel');
    catalogPanel.setAttribute('role', 'tabpanel');
    uploadPanel.setAttribute('role', 'tabpanel');

    musicCatalog = createMusicCatalog({
      selectedAudioUrls: () => (project.music.tracks ?? []).map((t) => t.audioUrl),
      beforePlay: () => stopStudioAudio(),
      onSelect: (track: PlaylistTrack) => {
        stopStudioAudio();
        const currentTracks = project.music.tracks ?? [];
        if (currentTracks.length < 3) {
          currentTracks.push({
            audioUrl: track.audioUrl,
            coverUrl: track.coverUrl,
            title: track.title,
            artist: track.artist,
          });
          project.music.tracks = currentTracks;
          syncPrimaryTrack();
          previewTrackIndex = currentTracks.length - 1;
          changed();
          render();
        }
      },
      onDeselect: (audioUrl: string) => {
        stopStudioAudio();
        project.music.tracks = (project.music.tracks ?? []).filter((t) => t.audioUrl !== audioUrl);
        syncPrimaryTrack();
        if (previewTrackIndex >= (project.music.tracks?.length ?? 0)) {
          previewTrackIndex = Math.max(0, (project.music.tracks?.length ?? 1) - 1);
        }
        changed();
        render();
      },
    });
    catalogPanel.append(musicCatalog.root);

    const form = el('div', 'music-fields');
    const examples = STUDIO_EXAMPLES[project.locale];
    const title = textInput(project.music.title, 120, examples.musicTitle);
    const artist = textInput(project.music.artist, 120, examples.musicArtist);
    bind(title, (value) => {
      project.music.title = value;
      if (project.music.tracks && project.music.tracks.length > 0) {
        project.music.tracks[0].title = value;
      }
    });
    bind(artist, (value) => {
      project.music.artist = value;
      if (project.music.tracks && project.music.tracks.length > 0) {
        project.music.tracks[0].artist = value;
      }
    });

    function uploadField(kind: 'audio' | 'cover', label: string, accept: string, currentUrl: string): HTMLElement {
      const root = el('div', 'upload-field');
      const top = el('div', 'upload-field__top');
      top.append(el('strong', '', label), el('span', currentUrl ? 'upload-state is-ready' : 'upload-state', currentUrl ? 'Sudah diunggah' : 'Belum ada file'));
      const input = el('input');
      input.type = 'file';
      input.accept = accept;
      input.hidden = true;
      const trigger = button(currentUrl ? 'Ganti file' : 'Pilih file', 'ui-button ui-button--secondary');
      const progress = el('div', 'upload-progress');
      progress.append(el('i'));
      const retry = button('Coba lagi', 'text-button');
      retry.hidden = true;
      let localPreviewUrl = '';
      const preview = kind === 'cover' ? el('div', 'upload-cover-preview') : null;
      const previewImage = kind === 'cover' ? el('img') as HTMLImageElement : null;
      if (preview && previewImage) {
        previewImage.alt = 'Preview thumbnail lagu';
        previewImage.decoding = 'async';
        previewImage.addEventListener('load', () => {
          if (localPreviewUrl && previewImage.src === localPreviewUrl) {
            URL.revokeObjectURL(localPreviewUrl);
            localPreviewUrl = '';
          }
        });
        if (currentUrl) previewImage.src = currentUrl;
        preview.hidden = !currentUrl;
        preview.append(previewImage);
      }
      trigger.addEventListener('click', () => input.click());

      const perform = async (file: File): Promise<void> => {
        trigger.disabled = true;
        retry.hidden = true;
        top.lastElementChild!.textContent = 'Mengunggah 0%';
        try {
          const result = await uploadMedia(projectId, token, kind, file, (percent) => {
            top.lastElementChild!.textContent = `Mengunggah ${percent}%`;
            (progress.firstElementChild as HTMLElement).style.width = `${percent}%`;
          });
          if (kind === 'audio') {
            project.music.audioUrl = result.url;
            audio.src = result.url;
            if (!project.music.tracks || project.music.tracks.length === 0) {
              project.music.tracks = [{
                audioUrl: result.url,
                coverUrl: project.music.coverUrl,
                title: project.music.title,
                artist: project.music.artist,
              }];
            } else {
              project.music.tracks[0].audioUrl = result.url;
            }
          } else {
            project.music.coverUrl = result.url;
            if (preview && previewImage) {
              previewImage.src = result.url;
              preview.hidden = false;
            }
            if (project.music.tracks && project.music.tracks.length > 0) {
              project.music.tracks[0].coverUrl = result.url;
            }
          }
          top.lastElementChild!.textContent = 'Upload selesai';
          changed();
          window.setTimeout(render, 350);
        } catch (error) {
          top.lastElementChild!.textContent = errorMessage(error);
          retry.hidden = false;
          uploadRetry = () => void perform(file);
        } finally {
          trigger.disabled = false;
        }
      };
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        if (kind === 'cover' && preview && previewImage) {
          if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
          localPreviewUrl = URL.createObjectURL(file);
          previewImage.src = localPreviewUrl;
          preview.hidden = false;
        }
        void perform(file);
      });
      retry.addEventListener('click', () => uploadRetry?.());
      root.append(top, trigger, input, ...(preview ? [preview] : []), progress, retry);
      return root;
    }

    form.append(
      field('Judul lagu', title, 'Nama lagu yang tampil pada player di dalam surat.'),
      field('Artis', artist, 'Nama penyanyi atau artis yang tampil di bawah judul.'),
      uploadField('audio', 'Lagu MP3', 'audio/mpeg,.mp3', project.music.audioUrl),
      uploadField('cover', 'Thumbnail lagu', 'image/jpeg,image/png,image/webp', project.music.coverUrl),
    );
    uploadPanel.append(el('p', 'music-source-help', 'Upload satu MP3 maksimal 25 MB dan satu thumbnail JPG, PNG, atau WebP.'), form);

    const selectSource = (source: 'catalog' | 'upload'): void => {
      musicSource = source;
      stopStudioAudio();
      const catalogActive = source === 'catalog';
      catalogTab.classList.toggle('is-active', catalogActive);
      uploadTab.classList.toggle('is-active', !catalogActive);
      catalogTab.setAttribute('aria-selected', String(catalogActive));
      uploadTab.setAttribute('aria-selected', String(!catalogActive));
      catalogPanel.hidden = !catalogActive;
      uploadPanel.hidden = catalogActive;
    };
    catalogTab.addEventListener('click', () => selectSource('catalog'));
    uploadTab.addEventListener('click', () => selectSource('upload'));
    tabs.append(catalogTab, uploadTab);
    sourcePicker.append(tabs, catalogPanel, uploadPanel);
    selectSource(musicSource);
    musicLayout.append(playlistCard, player, sourcePicker);
    panel.append(musicLayout);

    const refreshTitleMarquee = (): void => {
      const overflow = titleText.scrollWidth > titleViewport.clientWidth + 2;
      titleViewport.classList.toggle('is-overflowing', overflow);
      const distance = Math.max(0, titleText.scrollWidth - titleViewport.clientWidth);
      titleViewport.style.setProperty('--marquee-distance', `${distance}px`);
      titleViewport.style.setProperty('--marquee-duration', `${Math.max(6, distance / 16).toFixed(1)}s`);
    };
    studioTitleObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refreshTitleMarquee);
    studioTitleObserver?.observe(titleViewport);
    window.requestAnimationFrame(refreshTitleMarquee);
  }

  function renderPublish(): void {
    appendSectionHeader(
      'Langkah 5 dari 5',
      'Preview dan publikasikan',
      'Preview memakai renderer yang sama dengan halaman penerima. Perubahan draft tidak akan mengubah gift publik sampai kamu menekan Publish.',
      null,
    );

    const selectedPalette = PALETTES[project.paletteId];
    const issues = validateProjectForPublish(project);
    const giftUrl = `${window.location.origin}/gift/${project.projectId || projectId}`;

    const barcodeCard = el('section', 'publish-barcode-card');
    barcodeCard.style.setProperty('--ticket-color', selectedPalette.theme.surface);
    barcodeCard.style.setProperty('--ticket-accent', selectedPalette.theme.accent);

    const barcodeFrame = el('div', 'publish-barcode-frame');
    const barcodeCanvas = el('canvas', 'publish-barcode-canvas');
    barcodeFrame.append(barcodeCanvas);

    renderScannableLoveBarcode(barcodeCanvas, giftUrl, selectedPalette.theme.surface, 1000);

    const downloadButton = button('Download Barcode', 'publish-barcode-download-btn');
    downloadButton.innerHTML = `${DOWNLOAD_ICON_SVG}<span>Download Barcode</span>`;
    downloadButton.title = 'Download barcode beresolusi tinggi (PNG)';
    downloadButton.addEventListener('click', () => {
      const dataUrl = barcodeCanvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `Barcode-${(project.projectId || 'Love').toUpperCase()}.png`;
      downloadLink.href = dataUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
    });

    barcodeCard.append(barcodeFrame, downloadButton);

    const summary = el('div', issues.length ? 'publish-summary has-issues' : 'publish-summary is-ready');
    summary.append(el('strong', '', issues.length ? `${issues.length} hal perlu dilengkapi` : 'Semua komponen kado sudah lengkap'));
    if (issues.length) {
      const list = el('ul');
      issues.forEach((issue) => list.append(el('li', '', issue.message)));
      summary.append(list);
    } else {
      summary.append(el('p', '', 'Kado surat interaktif ini sudah siap untuk dipublikasikan dan dibagikan ke orang tersayang.'));
    }

    const actions = el('div', 'publish-actions');
    const preview = button('Buka preview penuh', 'ui-button ui-button--secondary');
    const publish = button(project.publishedAt ? 'Publish Changes' : 'Publish Gift', 'ui-button');
    publish.disabled = issues.length > 0 || project.status === 'archived';
    preview.addEventListener('click', () => livePreview.open({
      title: 'Preview Gift Lengkap',
      description: 'Coba seluruh alur mulai dari intro seperti yang akan dilihat penerima.',
      initialScene: 'intro',
    }, preview));
    publish.addEventListener('click', async () => {
      setBusy(publish, true, 'Mempublikasikan…');
      try {
        await save(true);
      } catch (error) {
        window.alert(errorMessage(error));
      } finally {
        setBusy(publish, false);
      }
    });
    actions.append(preview, publish);

    panel.append(barcodeCard, summary, actions);
    if (project.publishedAt) {
      const url = `${window.location.origin}/gift/${project.projectId || projectId}`;
      const published = el('div', 'published-link');
      published.style.setProperty('--ticket-color', selectedPalette.theme.surface);

      const publishedHeader = el('div', 'published-link__header');
      publishedHeader.append(
        el('span', 'published-link__label', 'Gift URL'),
        el('span', 'published-link__status', 'Live & Siap Dibagikan'),
      );

      const publishedBox = el('div', 'published-link__box');
      const urlInput = el('input', 'published-link__input');
      urlInput.type = 'text';
      urlInput.value = url;
      urlInput.readOnly = true;

      const copyBtn = button('Salin Link', 'published-link__copy-btn');
      copyBtn.innerHTML = `${COPY_ICON_SVG}<span>Salin Link</span>`;
      copyBtn.setAttribute('aria-label', 'Salin link kado');
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(url);
          copyBtn.innerHTML = '<span>Tersalin! ✓</span>';
          copyBtn.classList.add('is-copied');
          setTimeout(() => {
            copyBtn.innerHTML = `${COPY_ICON_SVG}<span>Salin Link</span>`;
            copyBtn.classList.remove('is-copied');
          }, 2000);
        } catch {
          urlInput.select();
        }
      });

      const openLink = el('a', 'published-link__open-btn');
      openLink.href = url;
      openLink.target = '_blank';
      openLink.rel = 'noopener noreferrer';
      openLink.innerHTML = `${EXTERNAL_LINK_SVG}<span>Buka</span>`;
      openLink.setAttribute('aria-label', 'Buka link kado');

      publishedBox.append(urlInput, copyBtn, openLink);
      published.append(publishedHeader, publishedBox);
      panel.append(published);
    }
  }

  function renderStep(): void {
    audio.pause();
    studioTitleObserver?.disconnect();
    studioTitleObserver = null;
    musicCatalog?.destroy();
    musicCatalog = null;
    panel.replaceChildren();
    [renderIdentity, renderStyle, renderLetter, renderMusic, renderPublish][activeStep]();
    const footer = el('footer', 'studio-panel-footer');
    const previous = button('Sebelumnya', 'ui-button ui-button--secondary'); previous.disabled = activeStep === 0;
    const next = button(activeStep === steps.length - 1 ? 'Kembali ke awal' : 'Berikutnya', 'ui-button');
    previous.addEventListener('click', () => { activeStep -= 1; render(); });
    next.addEventListener('click', () => { activeStep = activeStep === steps.length - 1 ? 0 : activeStep + 1; render(); });
    footer.append(previous, next); panel.append(footer);
  }

  function render(): void { renderNav(); renderStep(); }
  audio.addEventListener('timeupdate', () => {
    const seek = panel.querySelector<HTMLInputElement>('.player-seek');
    if (seek && audio.duration) seek.value = String((audio.currentTime / audio.duration) * 100);
    const current = panel.querySelector<HTMLElement>('.studio-player__current');
    if (current) current.textContent = formatTime(audio.currentTime);
  });
  audio.addEventListener('loadedmetadata', () => {
    const duration = panel.querySelector<HTMLElement>('.studio-player__duration');
    if (duration) duration.textContent = formatTime(audio.duration);
  });
  const syncSelectedAudioButton = (): void => {
    const play = panel.querySelector<HTMLButtonElement>('.player-button');
    if (!play) return;
    const isPaused = audio.paused;
    play.innerHTML = isPaused ? PLAY_ICON_SVG : PAUSE_ICON_SVG;
    play.setAttribute('aria-label', isPaused ? 'Putar lagu terpilih' : 'Jeda lagu terpilih');
  };
  audio.addEventListener('play', syncSelectedAudioButton);
  audio.addEventListener('pause', syncSelectedAudioButton);
  audio.addEventListener('ended', syncSelectedAudioButton);
  audio.addEventListener('error', () => {
    const message = panel.querySelector<HTMLElement>('.studio-player__status');
    if (message) message.textContent = 'Lagu tidak dapat diputar. Pilih lagu lain atau upload MP3.';
    syncSelectedAudioButton();
  });
  setStatus(status);
  render();

  return () => {
    window.clearTimeout(saveTimer);
    livePreview.destroy();
    musicCatalog?.destroy();
    studioTitleObserver?.disconnect();
    audio.pause(); audio.remove();
    target.replaceChildren();
  };
}
