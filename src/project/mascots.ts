import type { GiftConfigV1 } from '../config/gift.config';
import type { MascotId } from './schema';

export interface MascotDefinition {
  id: MascotId;
  name: string;
  description: string;
  alt: string;
  preview: string;
  characters: GiftConfigV1['media']['characters'];
}

export const MASCOTS: Record<MascotId, MascotDefinition> = {
  bunny: {
    id: 'bunny',
    name: 'Bunny',
    description: 'Lembut dan manis, cocok untuk pesan yang hangat.',
    alt: 'A small white bunny holding a pink heart',
    preview: '/assets/mascot-heart.webp',
    characters: {
      question: ['/assets/mascot-question.webp', '/assets/mascot-question-2.webp'],
      accepted: ['/assets/mascot-celebrate.webp', '/assets/mascot-celebrate-2.webp'],
      needTime: ['/assets/mascot-waiting.webp', '/assets/mascot-waiting-2.webp'],
      promise: ['/assets/mascot-heart.webp', '/assets/mascot-promise-2.webp'],
    },
  },
  'brown-bear': {
    id: 'brown-bear',
    name: 'Brown Bear',
    description: 'Hangat dan sedikit maskulin, tetap romantis.',
    alt: 'A small warm brown bear wearing a cocoa bow tie',
    preview: '/assets/mascots/brown-bear/bear-promise-1.webp',
    characters: {
      question: ['/assets/mascots/brown-bear/bear-question-1.webp', '/assets/mascots/brown-bear/bear-question-2.webp'],
      accepted: ['/assets/mascots/brown-bear/bear-accepted-1.webp', '/assets/mascots/brown-bear/bear-accepted-2.webp'],
      needTime: ['/assets/mascots/brown-bear/bear-waiting-1.webp', '/assets/mascots/brown-bear/bear-waiting-2.webp'],
      promise: ['/assets/mascots/brown-bear/bear-promise-1.webp', '/assets/mascots/brown-bear/bear-promise-2.webp'],
    },
  },
};
