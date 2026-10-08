import { describe, expect, it } from 'vitest';
import { projectToGiftConfig } from '../src/project/adapter';
import { demoProject } from '../src/project/fixture';
import { PALETTES, resolvePaletteId } from '../src/project/palettes';
import type { PaletteId } from '../src/project/schema';

describe('palettes resolution & dynamic theme switching', () => {
  it('resolves standard palette IDs correctly', () => {
    expect(resolvePaletteId('burgundy')).toBe('burgundy');
    expect(resolvePaletteId('midnight')).toBe('midnight');
    expect(resolvePaletteId('forest')).toBe('forest');
    expect(resolvePaletteId('dusty-purple')).toBe('dusty-purple');
  });

  it('handles case-insensitivity, whitespace, and underscore/hyphen variations', () => {
    expect(resolvePaletteId('BURGUNDY')).toBe('burgundy');
    expect(resolvePaletteId('  Midnight  ')).toBe('midnight');
    expect(resolvePaletteId('dusty_purple')).toBe('dusty-purple');
    expect(resolvePaletteId('dustypurple')).toBe('dusty-purple');
    expect(resolvePaletteId('Dusty-Purple')).toBe('dusty-purple');
  });

  it('returns undefined for invalid or unknown palettes', () => {
    expect(resolvePaletteId('nonexistent')).toBeUndefined();
    expect(resolvePaletteId('')).toBeUndefined();
    expect(resolvePaletteId(null)).toBeUndefined();
    expect(resolvePaletteId(123)).toBeUndefined();
  });

  it('contains all 4 required palettes with non-empty theme tokens and envelope URLs', () => {
    const requiredPalettes: PaletteId[] = ['burgundy', 'midnight', 'forest', 'dusty-purple'];
    for (const id of requiredPalettes) {
      const palette = PALETTES[id];
      expect(palette).toBeDefined();
      expect(palette.id).toBe(id);
      expect(palette.envelopeUrl).toMatch(/^\/assets\/vintage-envelope-.*\.webp$/);
      expect(palette.theme.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.theme.surface).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.theme.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.theme.playerGradient).toBeDefined();
    }
  });

  it('applies the chosen palette to gift config accurately via projectToGiftConfig', () => {
    const allPalettes: PaletteId[] = ['burgundy', 'midnight', 'forest', 'dusty-purple'];
    for (const id of allPalettes) {
      const config = projectToGiftConfig({
        ...demoProject,
        paletteId: id,
      });
      expect(config.theme.background).toBe(PALETTES[id].theme.background);
      expect(config.media.envelopeUrl).toBe(PALETTES[id].envelopeUrl);
    }
  });
});
