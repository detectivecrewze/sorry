import { describe, expect, it } from 'vitest';
import { projectToGiftConfig } from '../src/project/adapter';
import { createBlankProject, demoProject } from '../src/project/fixture';
import { MASCOTS } from '../src/project/mascots';
import { PALETTES } from '../src/project/palettes';
import { normalizeProject, parseLetterText, validateProjectForPublish, type MascotId, type PaletteId } from '../src/project/schema';

describe('SorryGiftProjectV1', () => {
  function luminance(hex: string): number {
    const channels = hex.slice(1).match(/.{2}/g)!.map((value) => parseInt(value, 16) / 255)
      .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  function contrast(first: string, second: string): number {
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  }

  it('normalizes limits and paragraph separators', () => {
    const blank = createBlankProject('sorry-0123456789abcdef');
    const project = normalizeProject({
      ...blank,
      identity: { recipient: 'R'.repeat(100), sender: 'S'.repeat(100) },
      letter: { ...blank.letter, paragraphs: Array.from({ length: 30 }, (_, index) => `Paragraph ${index}`) },
    }, blank);
    expect(project.identity.recipient).toHaveLength(80);
    expect(project.identity.sender).toHaveLength(80);
    expect(project.locale).toBe('id');
    expect(project.letter.paragraphs).toHaveLength(20);
    expect(parseLetterText('One\n\nTwo\n\n\nThree')).toEqual(['One', 'Two', 'Three']);
  });

  it('requires all publish fields', () => {
    const blank = createBlankProject('sorry-0123456789abcdef');
    expect(validateProjectForPublish(blank).map((issue) => issue.path)).toContain('music.audioUrl');
    expect(validateProjectForPublish(demoProject)).toEqual([]);
  });

  it('maps all mascot and palette combinations to the same renderer contract', () => {
    for (const mascotId of Object.keys(MASCOTS) as MascotId[]) {
      for (const paletteId of Object.keys(PALETTES) as PaletteId[]) {
        const config = projectToGiftConfig({ ...demoProject, mascotId, paletteId });
        expect(config.media.characters.question).toHaveLength(2);
        expect(config.media.characters.promise).toHaveLength(2);
        expect(config.theme.background).toBe(PALETTES[paletteId].theme.background);
        expect(config.media.envelopeUrl).toBe(PALETTES[paletteId].envelopeUrl);
        expect(config.media.characterAlt).toBe(MASCOTS[mascotId].alt);
      }
    }
  });

  it('uses Indonesian by default and translates fixed gift controls without changing letter content', () => {
    const blank = createBlankProject('sorry-0123456789abcdef');
    const indonesian = projectToGiftConfig(blank);
    expect(blank.locale).toBe('id');
    expect(indonesian.intro.startLabel).toBe('Mulai');
    expect(indonesian.letter.skipLabel).toBe('Skip');

    const english = projectToGiftConfig({ ...blank, locale: 'en' });
    expect(english.intro.startLabel).toBe('Start');
    expect(english.letter.paragraphs).toEqual(blank.letter.paragraphs);
  });

  it('keeps primary and muted text WCAG AA across every palette surface', () => {
    for (const palette of Object.values(PALETTES)) {
      for (const background of [palette.theme.background, palette.theme.backgroundDeep, palette.theme.surface]) {
        expect(contrast(palette.theme.text, background), `${palette.id} primary text`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.theme.muted, background), `${palette.id} muted text`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps music player tokens accessible and harmonious across every palette', () => {
    for (const palette of Object.values(PALETTES)) {
      expect(palette.theme.playerGradient).toBeDefined();
      expect(palette.theme.playerToggleBg).toBeDefined();
      expect(palette.theme.playerToggleColor).toBeDefined();
      if (palette.theme.playerToggleColor && palette.theme.playerToggleBg) {
        expect(
          contrast(palette.theme.playerToggleColor, palette.theme.playerToggleBg),
          `${palette.id} player toggle contrast`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
