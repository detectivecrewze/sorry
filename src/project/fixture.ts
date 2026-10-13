import type { SorryGiftProjectV1 } from './schema';
import { PROJECT_CONTENT_PRESETS } from './presets';

const now = '2026-10-07T00:00:00.000Z';

export const demoProject: SorryGiftProjectV1 = {
  schemaVersion: 1,
  projectId: 'demo-sorry-letter',
  status: 'published',
  locale: 'en',
  mascotId: 'bunny',
  paletteId: 'burgundy',
  identity: { recipient: 'Al', sender: 'Lis' },
  intro: {
    title: "I'm Sorry, Love...",
    subtitle: 'A space to clear the air, share my heart, and bridge the gap between us.',
  },
  letter: {
    heading: "I'm Sorry, Love...",
    paragraphs: [
      "Dear Al..",
      "Aku tulis ini karena kamu berhak dapat permintaan maaf yang tulus. Ngeliat kesalahpahaman kita kemarin, aku sadar banget kalau ego dan reaksiku udah bikin kamu terluka. I am so sorry for my part in this.",
      "Jujur aku benci banget ada jarak di antara kita. It was never my intention to hurt you, tapi aku tahu niat baik aja nggak bisa menghapus rasa kecewa kamu. Your feelings are completely valid. Apa yang udah kita bangun bareng-bareng itu berharga banget buat aku, dan aku nggak mau miskomunikasi ini merusak semuanya.",
      "Please know that I love you so much, dan maafin ego aku yang udah nyakitin kamu ya sayang. Aku mau kamu tetap di sini sama aku, I really need you and please don't leave me alone. I promise to be better for us, let's fix this together, Al! ♡",
    ],
    signoff: 'with all my love, Lis',
  },
  music: {
    audioUrl: 'https://cdn.for-you-always.my.id/1791567694002-yj6vzujp.mp3',
    coverUrl: 'https://cdn.for-you-always.my.id/1791567932279-lm8e5o.jpg',
    title: 'Promise',
    artist: 'Laufey',
    tracks: [
      {
        audioUrl: 'https://cdn.for-you-always.my.id/1791567694002-yj6vzujp.mp3',
        coverUrl: 'https://cdn.for-you-always.my.id/1791567932279-lm8e5o.jpg',
        title: 'Promise',
        artist: 'Laufey',
      },
      {
        audioUrl: 'https://cdn.for-you-always.my.id/1791465566473-v1ppg.mp3',
        coverUrl: 'https://cdn.for-you-always.my.id/1791466716102-9gvgds.jpg',
        title: 'White Ferrari',
        artist: 'Frank Ocean',
      },
    ],
  },
  question: { heading: 'Will you forgive me, my love?' },
  endings: {
    accepted: { heading: 'Yeees!!!', body: 'Thank you for giving my heart another chance.' },
    needTime: {
      heading: 'Take all the time you need to process, love.',
      body: "There is no pressure. I'll be here whenever you feel ready.",
      loveLine: 'I Love You, Love!',
    },
    promise: { heading: "I Promise that this won't happen again!", body: 'I Love You, Love!' },
  },
  createdAt: now,
  updatedAt: now,
  publishedAt: now,
};

export function createBlankProject(projectId: string, date = new Date().toISOString()): SorryGiftProjectV1 {
  const preset = structuredClone(PROJECT_CONTENT_PRESETS.id);
  return {
    ...structuredClone(demoProject),
    projectId,
    status: 'draft',
    locale: 'id',
    identity: { recipient: '', sender: '' },
    intro: preset.intro,
    letter: preset.letter,
    music: { audioUrl: '', coverUrl: '', title: '', artist: '', tracks: [] },
    question: preset.question,
    endings: preset.endings,
    createdAt: date,
    updatedAt: date,
    publishedAt: null,
  };
}
