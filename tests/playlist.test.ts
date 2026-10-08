import { describe, expect, it } from 'vitest';
import playlist from '../public/playlist.json';
import { normalizePlaylist } from '../src/studio/playlist';

describe('Studio music playlist', () => {
  it('ships 37 valid, unique catalog tracks', () => {
    const tracks = normalizePlaylist(playlist);
    expect(tracks).toHaveLength(37);
    expect(new Set(tracks.map((track) => track.audioUrl)).size).toBe(37);
    expect(tracks.every((track) => track.title && track.artist && track.coverUrl && track.audioUrl)).toBe(true);
  });

  it('drops malformed and duplicate records without rejecting valid songs', () => {
    const tracks = normalizePlaylist([
      { title: 'Valid', artist: 'Artist', coverUrl: 'https://cdn.example.test/cover.jpg', audioUrl: 'https://cdn.example.test/song.mp3', audioName: '', genre: '' },
      { title: 'Duplicate', artist: 'Artist', coverUrl: 'https://cdn.example.test/cover-2.jpg', audioUrl: 'https://cdn.example.test/song.mp3' },
      { title: '', artist: 'Missing title', coverUrl: 'https://cdn.example.test/cover.jpg', audioUrl: 'https://cdn.example.test/missing.mp3' },
      { title: 'Unsafe', artist: 'Artist', coverUrl: 'javascript:alert(1)', audioUrl: 'https://cdn.example.test/unsafe.mp3' },
    ]);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].audioName).toBe('Artist - Valid');
  });
});
