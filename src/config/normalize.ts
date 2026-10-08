import { giftConfig, type GiftConfigV1 } from './gift.config';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? U[]
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P];
};

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function merge<T extends Record<string, unknown>>(base: T, input: DeepPartial<T> | undefined): T {
  const result = { ...base } as T;
  if (!input || typeof input !== 'object') return result;

  for (const key of Object.keys(base) as Array<keyof T>) {
    const current = base[key];
    const incoming = input[key];
    if (Array.isArray(current)) {
      result[key] = (Array.isArray(incoming) && incoming.length ? incoming : current) as T[keyof T];
    } else if (current && typeof current === 'object') {
      result[key] = merge(
        current as Record<string, unknown>,
        incoming as DeepPartial<Record<string, unknown>> | undefined,
      ) as T[keyof T];
    } else if (incoming !== undefined) {
      result[key] = incoming as T[keyof T];
    }
  }

  return result;
}

export function normalizeGiftConfig(input?: DeepPartial<GiftConfigV1>): GiftConfigV1 {
  const merged = merge(giftConfig as unknown as Record<string, unknown>, input as DeepPartial<Record<string, unknown>>) as unknown as GiftConfigV1;
  const paragraphs = Array.isArray(merged.letter.paragraphs)
    ? merged.letter.paragraphs.map((paragraph) => text(paragraph, '')).filter(Boolean)
    : [];

  return {
    ...merged,
    version: 1,
    locale: merged.locale === 'id' ? 'id' : 'en',
    meta: {
      title: text(merged.meta.title, giftConfig.meta.title),
      description: text(merged.meta.description, giftConfig.meta.description),
    },
    recipient: {
      name: text(merged.recipient.name, giftConfig.recipient.name),
      address: text(merged.recipient.address, giftConfig.recipient.address),
    },
    sender: { name: text(merged.sender.name, giftConfig.sender.name) },
    letter: {
      ...merged.letter,
      paragraphs: paragraphs.length ? paragraphs : giftConfig.letter.paragraphs,
    },
    music: {
      ...merged.music,
      audioUrl: typeof merged.music.audioUrl === 'string' ? merged.music.audioUrl.trim() : '',
      coverUrl: typeof merged.music.coverUrl === 'string' ? merged.music.coverUrl.trim() : '',
    },
    animation: {
      typewriter: merged.animation.typewriter !== false,
      typewriterSpeedMs: Math.min(120, Math.max(16, Number(merged.animation.typewriterSpeedMs) || 54)),
      letterTypewriter: merged.animation.letterTypewriter !== false,
      letterTypewriterSpeedMs: Math.min(80, Math.max(5, Number(merged.animation.letterTypewriterSpeedMs) || 16)),
      sceneDurationMs: Math.min(900, Math.max(0, Number(merged.animation.sceneDurationMs) || 480)),
    },
  };
}

export type { DeepPartial };
