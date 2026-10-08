import type { SorryGiftProjectV1 } from './schema';

const now = '2026-10-07T00:00:00.000Z';

export const demoProject: SorryGiftProjectV1 = {
  schemaVersion: 1,
  projectId: 'demo-sorry-letter',
  status: 'published',
  locale: 'en',
  mascotId: 'bunny',
  paletteId: 'burgundy',
  identity: { recipient: 'Enggar Abi Z.', sender: 'Risa Nazmeliani ♡' },
  intro: {
    title: "I'm Sorry, Love...",
    subtitle: 'A space to clear the air, share my heart, and bridge the gap between us.',
  },
  letter: {
    heading: "I'm Sorry, Love...",
    paragraphs: [
      "I'm writing this because I want to give you some space, but I also need to clear the air about what happened between us. Looking back at our misunderstanding, I realize that my words/actions didn't reflect how I truly feel about you, and I am so sorry for my part in it.",
      "I hate the feeling of there being a wall between us. It was never my intention to hurt or upset you, but I know that intentions don't change how things landed. Your feelings are completely valid, and it pains me to know that I caused you any stress or doubt.",
      "Our relationship means the world to me, and I don't want a miscommunication to overshadow the love and respect we've built. I want to listen and truly understand your perspective whenever you are ready to talk.",
      "please know that i love u so much dan maafin ego aku yang nyakitin kamu yaa sayang. aku mau kamu tetep disini, sama akuu :( i need u, dont leave me aloneeeee please, i promise to be better for us, let’s fix thistogether. I love you more than anything, Abi! ♡",
    ],
    signoff: 'With all my love',
  },
  music: {
    audioUrl: 'https://cdn.for-you-always.my.id/1791371832328-ylylh.mp3',
    coverUrl: 'https://cdn.for-you-always.my.id/1791371973442-ehods.jpg',
    title: 'Keep Me',
    artist: 'Novo Amor',
    tracks: [
      {
        audioUrl: 'https://cdn.for-you-always.my.id/1791371832328-ylylh.mp3',
        coverUrl: 'https://cdn.for-you-always.my.id/1791371973442-ehods.jpg',
        title: 'Keep Me',
        artist: 'Novo Amor',
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
  return {
    ...structuredClone(demoProject),
    projectId,
    status: 'draft',
    locale: 'id',
    identity: { recipient: '', sender: '' },
    intro: {
      title: 'Maafkan Aku, Sayang...',
      subtitle: 'Sebuah ruang kecil untuk menyampaikan isi hati dan memperbaiki semuanya bersama.',
    },
    letter: {
      heading: 'Untuk Kamu yang Paling Berarti...',
      paragraphs: [
        'Aku menulis surat ini karena ingin menyampaikan isi hatiku dengan jujur. Aku benar-benar minta maaf atas sikap dan kata-kataku yang sudah membuat kamu terluka.',
        'Hubungan kita sangat berarti untukku. Kalau kamu sudah siap, aku ingin mendengarkan perasaanmu dan memperbaiki semuanya bersama-sama.',
      ],
      signoff: 'Dengan segenap cintaku',
    },
    music: { audioUrl: '', coverUrl: '', title: '', artist: '', tracks: [] },
    question: { heading: 'Maukah kamu memaafkanku?' },
    endings: {
      accepted: {
        heading: 'Terima kasih sudah memaafkanku!',
        body: 'Terima kasih sudah memberi kita kesempatan untuk memperbaiki semuanya bersama.',
      },
      needTime: {
        heading: 'Ambil waktu yang kamu butuhkan, ya.',
        body: 'Tidak ada paksaan. Aku akan tetap di sini ketika kamu sudah siap.',
        loveLine: 'Aku sayang kamu.',
      },
      promise: {
        heading: 'Aku berjanji akan menjadi lebih baik.',
        body: 'Terima kasih sudah tetap memilih kita.',
      },
    },
    createdAt: date,
    updatedAt: date,
    publishedAt: null,
  };
}
