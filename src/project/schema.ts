export type ProjectStatus = 'draft' | 'published' | 'archived';
export type MascotId = 'bunny' | 'brown-bear';
export type PaletteId = 'burgundy' | 'midnight' | 'forest' | 'dusty-purple';
export type ProjectLocale = 'id' | 'en';

export interface ProjectMusicTrack {
  audioUrl: string;
  coverUrl: string;
  title: string;
  artist: string;
}

export interface SorryGiftProjectV1 {
  schemaVersion: 1;
  projectId: string;
  status: ProjectStatus;
  locale: ProjectLocale;
  mascotId: MascotId;
  paletteId: PaletteId;
  identity: {
    recipient: string;
    sender: string;
  };
  intro: {
    title: string;
    subtitle: string;
  };
  letter: {
    heading: string;
    paragraphs: string[];
    signoff: string;
  };
  music: {
    audioUrl: string;
    coverUrl: string;
    title: string;
    artist: string;
    tracks?: ProjectMusicTrack[];
  };
  question: {
    heading: string;
  };
  endings: {
    accepted: { heading: string; body: string };
    needTime: { heading: string; body: string; loveLine: string };
    promise: { heading: string; body: string };
  };
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface ProjectValidationIssue {
  path: string;
  message: string;
}

const LIMITS = {
  name: 80,
  introTitle: 120,
  introSubtitle: 240,
  heading: 160,
  signoff: 160,
  musicMeta: 120,
  ending: 800,
  letterTotal: 10_000,
  paragraphCount: 20,
} as const;

export const PROJECT_LIMITS = LIMITS;

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanUrl(value: unknown): string {
  const raw = cleanText(value, 2_000);
  if (!raw) return '';
  try {
    const url = new URL(raw, 'https://local.invalid');
    return ['http:', 'https:', 'blob:', 'data:'].includes(url.protocol) ? raw : '';
  } catch {
    return '';
  }
}

function normalizeParagraphs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  let remaining = LIMITS.letterTotal;
  return value
    .slice(0, LIMITS.paragraphCount)
    .map((paragraph) => {
      const cleaned = cleanText(paragraph, remaining);
      remaining -= cleaned.length;
      return cleaned;
    })
    .filter(Boolean);
}

function normalizeTracks(musicSource: Partial<SorryGiftProjectV1['music']> | undefined, fallbackTracks: ProjectMusicTrack[] = []): ProjectMusicTrack[] {
  if (!musicSource) return fallbackTracks.slice(0, 3);
  if (Array.isArray(musicSource.tracks) && musicSource.tracks.length > 0) {
    const list: ProjectMusicTrack[] = [];
    for (const item of musicSource.tracks) {
      if (!item || typeof item !== 'object') continue;
      const t = item as unknown as Record<string, unknown>;
      const audioUrl = cleanUrl(t.audioUrl);
      const coverUrl = cleanUrl(t.coverUrl);
      const title = cleanText(t.title, LIMITS.musicMeta);
      const artist = cleanText(t.artist, LIMITS.musicMeta);
      if (audioUrl) {
        list.push({ audioUrl, coverUrl, title, artist });
      }
      if (list.length >= 3) break;
    }
    if (list.length > 0) return list;
  }
  const audioUrl = cleanUrl(musicSource.audioUrl);
  if (audioUrl) {
    return [{
      audioUrl,
      coverUrl: cleanUrl(musicSource.coverUrl),
      title: cleanText(musicSource.title, LIMITS.musicMeta),
      artist: cleanText(musicSource.artist, LIMITS.musicMeta),
    }];
  }
  return fallbackTracks.slice(0, 3);
}

export function normalizeProject(input: unknown, fallback: SorryGiftProjectV1): SorryGiftProjectV1 {
  const source = input && typeof input === 'object' ? input as Partial<SorryGiftProjectV1> : {};
  const identity = source.identity ?? fallback.identity;
  const intro = source.intro ?? fallback.intro;
  const letter = source.letter ?? fallback.letter;
  const music = source.music ?? fallback.music;
  const question = source.question ?? fallback.question;
  const endings = source.endings ?? fallback.endings;
  const accepted = endings.accepted ?? fallback.endings.accepted;
  const needTime = endings.needTime ?? fallback.endings.needTime;
  const promise = endings.promise ?? fallback.endings.promise;

  const fallbackTracks = fallback.music?.tracks && fallback.music.tracks.length > 0
    ? fallback.music.tracks
    : (fallback.music?.audioUrl ? [{
        audioUrl: fallback.music.audioUrl,
        coverUrl: fallback.music.coverUrl,
        title: fallback.music.title,
        artist: fallback.music.artist,
      }] : []);

  const normalizedTracks = normalizeTracks(music, fallbackTracks);
  const primaryTrack = normalizedTracks[0] ?? {
    audioUrl: cleanUrl(music.audioUrl),
    coverUrl: cleanUrl(music.coverUrl),
    title: cleanText(music.title, LIMITS.musicMeta),
    artist: cleanText(music.artist, LIMITS.musicMeta),
  };

  return {
    schemaVersion: 1,
    projectId: cleanText(source.projectId, 80) || fallback.projectId,
    status: source.status === 'published' || source.status === 'archived' ? source.status : 'draft',
    locale: source.locale === 'en' ? 'en' : 'id',
    mascotId: source.mascotId === 'brown-bear' ? 'brown-bear' : 'bunny',
    paletteId: ['midnight', 'forest', 'dusty-purple'].includes(String(source.paletteId))
      ? source.paletteId as PaletteId
      : 'burgundy',
    identity: {
      recipient: cleanText(identity.recipient, LIMITS.name),
      sender: cleanText(identity.sender, LIMITS.name),
    },
    intro: {
      title: cleanText(intro.title, LIMITS.introTitle),
      subtitle: cleanText(intro.subtitle, LIMITS.introSubtitle),
    },
    letter: {
      heading: cleanText(letter.heading, LIMITS.heading),
      paragraphs: normalizeParagraphs(letter.paragraphs),
      signoff: cleanText(letter.signoff, LIMITS.signoff),
    },
    music: {
      audioUrl: primaryTrack.audioUrl,
      coverUrl: primaryTrack.coverUrl,
      title: primaryTrack.title,
      artist: primaryTrack.artist,
      tracks: normalizedTracks,
    },
    question: { heading: cleanText(question.heading, LIMITS.heading) },
    endings: {
      accepted: {
        heading: cleanText(accepted.heading, LIMITS.heading),
        body: cleanText(accepted.body, LIMITS.ending),
      },
      needTime: {
        heading: cleanText(needTime.heading, LIMITS.heading),
        body: cleanText(needTime.body, LIMITS.ending),
        loveLine: cleanText(needTime.loveLine, LIMITS.heading),
      },
      promise: {
        heading: cleanText(promise.heading, LIMITS.heading),
        body: cleanText(promise.body, LIMITS.ending),
      },
    },
    createdAt: cleanText(source.createdAt, 40) || fallback.createdAt,
    updatedAt: cleanText(source.updatedAt, 40) || fallback.updatedAt,
    publishedAt: typeof source.publishedAt === 'string' ? source.publishedAt : null,
  };
}

export function validateProjectForPublish(project: SorryGiftProjectV1): ProjectValidationIssue[] {
  const fields: Array<[string, string, string]> = [
    ['identity.recipient', project.identity.recipient, 'Nama penerima wajib diisi.'],
    ['identity.sender', project.identity.sender, 'Nama pengirim wajib diisi.'],
    ['intro.title', project.intro.title, 'Judul pembuka wajib diisi.'],
    ['intro.subtitle', project.intro.subtitle, 'Subtitle pembuka wajib diisi.'],
    ['letter.heading', project.letter.heading, 'Judul surat wajib diisi.'],
    ['letter.signoff', project.letter.signoff, 'Penutup surat wajib diisi.'],
    ['question.heading', project.question.heading, 'Pertanyaan maaf wajib diisi.'],
    ['endings.accepted.heading', project.endings.accepted.heading, 'Judul jawaban diterima wajib diisi.'],
    ['endings.accepted.body', project.endings.accepted.body, 'Isi jawaban diterima wajib diisi.'],
    ['endings.needTime.heading', project.endings.needTime.heading, 'Judul butuh waktu wajib diisi.'],
    ['endings.needTime.body', project.endings.needTime.body, 'Isi butuh waktu wajib diisi.'],
    ['endings.needTime.loveLine', project.endings.needTime.loveLine, 'Kalimat cinta wajib diisi.'],
    ['endings.promise.heading', project.endings.promise.heading, 'Judul janji wajib diisi.'],
    ['endings.promise.body', project.endings.promise.body, 'Isi janji wajib diisi.'],
    ['music.audioUrl', project.music.audioUrl, 'Lagu MP3 wajib diunggah.'],
    ['music.coverUrl', project.music.coverUrl, 'Thumbnail lagu wajib diunggah.'],
    ['music.title', project.music.title, 'Judul lagu wajib diisi.'],
    ['music.artist', project.music.artist, 'Nama artis wajib diisi.'],
  ];
  const issues = fields.filter(([, value]) => !value.trim()).map(([path, , message]) => ({ path, message }));
  if (project.letter.paragraphs.length === 0) issues.push({ path: 'letter.paragraphs', message: 'Isi surat wajib diisi.' });
  return issues;
}

export function parseLetterText(value: string): string[] {
  return value.split(/\r?\n\s*\r?\n/g).map((item) => item.trim()).filter(Boolean).slice(0, LIMITS.paragraphCount);
}

export function formatLetterText(paragraphs: string[]): string {
  return paragraphs.join('\n\n');
}
