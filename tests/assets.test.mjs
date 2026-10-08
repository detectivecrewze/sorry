import { statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const names = [
  'bear-question-1.webp', 'bear-question-2.webp',
  'bear-accepted-1.webp', 'bear-accepted-2.webp',
  'bear-waiting-1.webp', 'bear-waiting-2.webp',
  'bear-promise-1.webp', 'bear-promise-2.webp',
];

describe('brown bear production sprites', () => {
  for (const name of names) {
    it(`${name} stays below 100 KB`, () => {
      const size = statSync(new URL(`../public/assets/mascots/brown-bear/${name}`, import.meta.url)).size;
      expect(size).toBeGreaterThan(10_000);
      expect(size).toBeLessThanOrEqual(100_000);
    });
  }
});

const envelopeNames = [
  'vintage-envelope-burgundy.webp',
  'vintage-envelope-midnight.webp',
  'vintage-envelope-forest.webp',
  'vintage-envelope-dusty-purple.webp',
];

describe('palette envelope assets', () => {
  for (const name of envelopeNames) {
    it(`${name} is present and production-sized`, () => {
      const size = statSync(new URL(`../public/assets/${name}`, import.meta.url)).size;
      expect(size).toBeGreaterThan(20_000);
      expect(size).toBeLessThanOrEqual(120_000);
    });
  }
});
