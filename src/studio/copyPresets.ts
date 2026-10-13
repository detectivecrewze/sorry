import type { ProjectLocale } from '../project/schema';

export interface StudioCopyPreset {
  id: 'heartfelt' | 'gentle' | 'simple';
  label: Record<ProjectLocale, string>;
  value: Record<ProjectLocale, string>;
}

export const OPENING_SUBTITLE_PRESETS: StudioCopyPreset[] = [
  {
    id: 'heartfelt',
    label: { id: 'Tulus', en: 'Heartfelt' },
    value: {
      id: 'Sebuah ruang kecil untuk menyampaikan isi hati dan memperbaiki semuanya bersama.',
      en: 'A quiet space to share my heart, say I am sorry, and make things right together.',
    },
  },
  {
    id: 'gentle',
    label: { id: 'Tenang', en: 'Gentle' },
    value: {
      id: 'Tidak semua kata mudah diucapkan langsung. Semoga halaman ini membantu kita saling memahami.',
      en: 'Some words are difficult to say out loud. I hope this little space helps us understand each other again.',
    },
  },
  {
    id: 'simple',
    label: { id: 'Singkat', en: 'Simple' },
    value: {
      id: 'Satu surat kecil untuk menjernihkan hati dan menemukan jalan kembali kepadamu.',
      en: 'One small letter to clear the air and find my way back to you.',
    },
  },
];

export const LETTER_BODY_PRESETS: StudioCopyPreset[] = [
  {
    id: 'heartfelt',
    label: { id: 'Tulus', en: 'Heartfelt' },
    value: {
      id: 'Aku menulis surat ini karena ingin meminta maaf dengan tulus. Aku sadar sikap dan kata-kataku sudah membuatmu terluka, dan aku bertanggung jawab atas kesalahanku.\n\nHubungan kita sangat berarti bagiku. Kalau kamu sudah siap, aku ingin mendengarkan perasaanmu dan memperbaiki semuanya bersama-sama.',
      en: 'I am writing this because I owe you a sincere apology. I understand that my words and actions hurt you, and I take responsibility for my part in what happened.\n\nWhat we have means so much to me. Whenever you are ready, I want to listen, understand how you feel, and make things right together.',
    },
  },
  {
    id: 'gentle',
    label: { id: 'Tenang', en: 'Gentle' },
    value: {
      id: 'Aku tidak ingin memaksamu untuk langsung menjawab. Aku hanya ingin kamu tahu bahwa aku menyesal sudah membuat keadaan terasa berat.\n\nAmbil waktu yang kamu butuhkan. Aku akan tetap di sini, siap mendengarkan dan belajar menjadi pasangan yang lebih baik.',
      en: 'I do not want to pressure you for an answer. I only want you to know that I am sorry for making things feel so heavy.\n\nTake all the time you need. I will be here, ready to listen and learn how to be a better partner.',
    },
  },
  {
    id: 'simple',
    label: { id: 'Singkat', en: 'Simple' },
    value: {
      id: 'Aku minta maaf atas kesalahanku dan rasa sakit yang kubuat. Kamu sangat berarti bagiku.\n\nAku ingin memperbaiki semuanya dengan tindakan yang lebih baik, pelan-pelan dan bersama-sama.',
      en: 'I am sorry for my mistake and for the hurt I caused. You mean so much to me.\n\nI want to make things right through better actions, one step at a time, together.',
    },
  },
];
