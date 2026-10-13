import { describe, expect, it } from 'vitest';
import { STUDIO_MESSAGE_KEYS, STUDIO_MESSAGES, studioText } from '../src/studio/localization';
import { LETTER_BODY_PRESETS, OPENING_SUBTITLE_PRESETS } from '../src/studio/copyPresets';

describe('Studio localization', () => {
  it('keeps Indonesian and English message keys identical', () => {
    expect(Object.keys(STUDIO_MESSAGES.en).sort()).toEqual(Object.keys(STUDIO_MESSAGES.id).sort());
    expect(STUDIO_MESSAGE_KEYS.length).toBeGreaterThan(150);
  });

  it('interpolates dynamic copy in both locales', () => {
    expect(studioText('id', 'step.progress', { current: 3 })).toBe('Langkah 3 dari 5');
    expect(studioText('en', 'step.progress', { current: 3 })).toBe('Step 3 of 5');
  });

  it('provides three editable opening and letter presets in both languages', () => {
    expect(OPENING_SUBTITLE_PRESETS).toHaveLength(3);
    expect(LETTER_BODY_PRESETS).toHaveLength(3);
    for (const presets of [OPENING_SUBTITLE_PRESETS, LETTER_BODY_PRESETS]) {
      for (const preset of presets) {
        expect(preset.value.id.length).toBeGreaterThan(30);
        expect(preset.value.en.length).toBeGreaterThan(30);
        expect(preset.value.id).not.toBe(preset.value.en);
      }
    }
  });
});
