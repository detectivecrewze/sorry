import type { GiftConfigV1 } from '../config/gift.config';
import type { PaletteId } from './schema';

export type GiftTheme = GiftConfigV1['theme'];

export interface PaletteDefinition {
  id: PaletteId;
  name: string;
  description: string;
  envelopeUrl: string;
  theme: GiftTheme;
}

export const PALETTES: Record<PaletteId, PaletteDefinition> = {
  burgundy: {
    id: 'burgundy',
    name: 'Burgundy',
    description: 'Hangat, romantis, dan klasik.',
    envelopeUrl: '/assets/vintage-envelope-burgundy.webp',
    theme: {
      background: '#65070d', backgroundDeep: '#360106', surface: '#8b1822',
      text: '#fff8f4', muted: '#f0d2d4', accent: '#f6c3cb', accentStrong: '#d98796', envelope: '#8c4b50',
      playerGradient: 'linear-gradient(110deg, #b20e34, #8a0a27 58%, #71071f)',
      playerToggleBg: '#ffe4e7',
      playerToggleColor: '#65070d',
      playerToggleHover: '#fff4f5',
      playerBorder: 'rgba(255, 232, 235, 0.22)',
      playerProgress: '#fff5f5',
      playerThumb: '#fff5f5',
      playerThumbShadow: 'rgba(34, 0, 4, 0.32)',
      playerShadow: 'rgba(24, 0, 3, 0.24)',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Tenang seperti surat di malam hari.',
    envelopeUrl: '/assets/vintage-envelope-midnight.webp',
    theme: {
      background: '#0b1730', backgroundDeep: '#050b18', surface: '#162b50',
      text: '#f7f9ff', muted: '#d6def2', accent: '#b9ccff', accentStrong: '#809ee8', envelope: '#294777',
      playerGradient: 'linear-gradient(110deg, #22417a, #162b50 58%, #0c1a36)',
      playerToggleBg: '#dce6ff',
      playerToggleColor: '#0b1730',
      playerToggleHover: '#eef3ff',
      playerBorder: 'rgba(185, 204, 255, 0.22)',
      playerProgress: '#f0f4ff',
      playerThumb: '#f0f4ff',
      playerThumbShadow: 'rgba(5, 11, 24, 0.38)',
      playerShadow: 'rgba(5, 11, 24, 0.32)',
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Lembut, dewasa, dan menenangkan.',
    envelopeUrl: '/assets/vintage-envelope-forest.webp',
    theme: {
      background: '#103d32', backgroundDeep: '#071f19', surface: '#195548',
      text: '#f7fff9', muted: '#d5e8da', accent: '#bdd8c4', accentStrong: '#82b493', envelope: '#3d7163',
      playerGradient: 'linear-gradient(110deg, #226b5b, #195548 58%, #0f3a30)',
      playerToggleBg: '#dcf1e3',
      playerToggleColor: '#103d32',
      playerToggleHover: '#eef8f2',
      playerBorder: 'rgba(189, 216, 196, 0.22)',
      playerProgress: '#f0fbf4',
      playerThumb: '#f0fbf4',
      playerThumbShadow: 'rgba(7, 31, 25, 0.38)',
      playerShadow: 'rgba(7, 31, 25, 0.32)',
    },
  },
  'dusty-purple': {
    id: 'dusty-purple',
    name: 'Dusty Purple',
    description: 'Manis dengan nuansa dreamy.',
    envelopeUrl: '/assets/vintage-envelope-dusty-purple.webp',
    theme: {
      background: '#4b2b55', backgroundDeep: '#28152f', surface: '#6b3d76',
      text: '#fff9ff', muted: '#ead7ed', accent: '#dfc1e8', accentStrong: '#b78bc4', envelope: '#7f5687',
      playerGradient: 'linear-gradient(110deg, #864d94, #6b3d76 58%, #462550)',
      playerToggleBg: '#f5e4fa',
      playerToggleColor: '#4b2b55',
      playerToggleHover: '#fcf3ff',
      playerBorder: 'rgba(223, 193, 232, 0.22)',
      playerProgress: '#faf0fc',
      playerThumb: '#faf0fc',
      playerThumbShadow: 'rgba(40, 21, 47, 0.38)',
      playerShadow: 'rgba(40, 21, 47, 0.32)',
    },
  },
};
