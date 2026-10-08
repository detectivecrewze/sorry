import { giftConfig, type GiftConfigV1 } from '../config/gift.config';
import { MASCOTS } from './mascots';
import { GIFT_UI_COPY } from './localization';
import { PALETTES } from './palettes';
import type { SorryGiftProjectV1 } from './schema';

export function projectToGiftConfig(project: SorryGiftProjectV1): GiftConfigV1 {
  const mascot = MASCOTS[project.mascotId];
  const palette = PALETTES[project.paletteId];
  const locale = project.locale === 'en' ? 'en' : 'id';
  const copy = GIFT_UI_COPY[locale];
  return {
    ...giftConfig,
    locale,
    meta: {
      title: project.intro.title || giftConfig.meta.title,
      description: `A private interactive letter for ${project.identity.recipient || 'someone special'}.`,
    },
    recipient: {
      name: project.identity.recipient || 'Love',
      address: project.identity.recipient || 'Love',
    },
    sender: { name: project.identity.sender || 'With love' },
    intro: { ...giftConfig.intro, ...copy.intro, title: project.intro.title, subtitle: project.intro.subtitle },
    envelope: { ...giftConfig.envelope, ...copy.envelope },
    letter: {
      ...giftConfig.letter,
      ...copy.letter,
      heading: project.letter.heading,
      paragraphs: project.letter.paragraphs,
      signoff: project.letter.signoff,
    },
    music: {
      ...giftConfig.music,
      ...copy.music,
      ...project.music,
      tracks: project.music.tracks && project.music.tracks.length > 0
        ? project.music.tracks.map((track) => ({
            title: track.title || 'Untitled',
            artist: track.artist || '',
            audioUrl: track.audioUrl,
            coverUrl: track.coverUrl,
          }))
        : (project.music.audioUrl ? [{
            title: project.music.title || 'Untitled',
            artist: project.music.artist || '',
            audioUrl: project.music.audioUrl,
            coverUrl: project.music.coverUrl,
          }] : []),
    },
    question: { ...giftConfig.question, ...copy.question, heading: project.question.heading },
    endings: {
      accepted: { ...giftConfig.endings.accepted, ...copy.endings.accepted, ...project.endings.accepted },
      needTime: { ...giftConfig.endings.needTime, ...copy.endings.needTime, ...project.endings.needTime },
      promise: { ...giftConfig.endings.promise, ...copy.endings.promise, ...project.endings.promise },
    },
    media: {
      ...giftConfig.media,
      envelopeUrl: palette.envelopeUrl,
      characterAlt: mascot.alt,
      characters: mascot.characters,
    },
    theme: palette.theme,
  };
}
