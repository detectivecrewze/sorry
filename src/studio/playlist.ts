export interface PlaylistTrack {
  title: string;
  artist: string;
  genre: string;
  coverUrl: string;
  audioUrl: string;
  audioName: string;
}

let playlistRequest: Promise<PlaylistTrack[]> | null = null;

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanHttpUrl(value: unknown): string {
  const raw = cleanText(value);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}

export function normalizePlaylist(input: unknown): PlaylistTrack[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const tracks: PlaylistTrack[] = [];

  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const source = item as Record<string, unknown>;
    const title = cleanText(source.title);
    const artist = cleanText(source.artist);
    const audioUrl = cleanHttpUrl(source.audioUrl);
    const coverUrl = cleanHttpUrl(source.coverUrl);
    if (!title || !artist || !audioUrl || !coverUrl || seen.has(audioUrl)) continue;
    seen.add(audioUrl);
    tracks.push({
      title,
      artist,
      genre: cleanText(source.genre),
      coverUrl,
      audioUrl,
      audioName: cleanText(source.audioName) || `${artist} - ${title}`,
    });
  }

  return tracks;
}

export function loadPlaylist(): Promise<PlaylistTrack[]> {
  if (!playlistRequest) {
    playlistRequest = fetch('/playlist.json', { cache: 'force-cache' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Katalog musik gagal dimuat (${response.status}).`);
        const tracks = normalizePlaylist(await response.json());
        if (!tracks.length) throw new Error('Katalog musik masih kosong.');
        return tracks;
      })
      .catch((error) => {
        playlistRequest = null;
        throw error;
      });
  }
  return playlistRequest;
}

export function resetPlaylistCache(): void {
  playlistRequest = null;
}
