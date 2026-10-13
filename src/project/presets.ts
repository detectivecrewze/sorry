import type { ProjectLocale, SorryGiftProjectV1 } from './schema';

export const PROJECT_CONTENT_PRESETS: Record<ProjectLocale, Pick<SorryGiftProjectV1, 'intro' | 'letter' | 'question' | 'endings'>> = {
  id: {
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
  },
  en: {
    intro: {
      title: "I'm Sorry, Love...",
      subtitle: 'A space to clear the air, share my heart, and bridge the gap between us.',
    },
    letter: {
      heading: "I'm Sorry, Love...",
      paragraphs: [
        "I'm writing this because I want to give you some space, but I also need to clear the air about what happened between us. Looking back, I realize that my words and actions did not reflect how I truly feel about you, and I am so sorry for my part in it.",
        'What we have means so much to me. Whenever you are ready, I want to listen, understand how you feel, and make things right together.',
      ],
      signoff: 'With all my love',
    },
    question: { heading: 'Will you forgive me, my love?' },
    endings: {
      accepted: {
        heading: 'Yeees!!!',
        body: 'Thank you for giving my heart another chance.',
      },
      needTime: {
        heading: 'Take all the time you need to process, love.',
        body: "There is no pressure. I'll be here whenever you feel ready.",
        loveLine: 'I Love You, Love!',
      },
      promise: {
        heading: "I Promise that this won't happen again!",
        body: 'I Love You, Love!',
      },
    },
  },
};

function sameContent(project: SorryGiftProjectV1, locale: ProjectLocale): boolean {
  const preset = PROJECT_CONTENT_PRESETS[locale];
  return JSON.stringify({
    intro: project.intro,
    letter: project.letter,
    question: project.question,
    endings: project.endings,
  }) === JSON.stringify(preset);
}

export function isPristineBlankProject(project: SorryGiftProjectV1): boolean {
  const tracks = project.music.tracks ?? [];
  return project.status === 'draft'
    && !project.publishedAt
    && !project.identity.recipient.trim()
    && !project.identity.sender.trim()
    && !project.music.audioUrl.trim()
    && !project.music.coverUrl.trim()
    && !project.music.title.trim()
    && !project.music.artist.trim()
    && tracks.length === 0
    && sameContent(project, 'id');
}

export function applyInitialLocalePreset(project: SorryGiftProjectV1, locale: ProjectLocale): boolean {
  const pristine = isPristineBlankProject(project);
  project.locale = locale;
  if (!pristine) return false;
  const preset = PROJECT_CONTENT_PRESETS[locale];
  project.intro = structuredClone(preset.intro);
  project.letter = structuredClone(preset.letter);
  project.question = structuredClone(preset.question);
  project.endings = structuredClone(preset.endings);
  return true;
}
