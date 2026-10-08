import type { GiftConfigV1 } from '../config/gift.config';
import type { ProjectLocale } from './schema';

interface GiftUiCopy {
  intro: Pick<GiftConfigV1['intro'], 'startLabel'>;
  envelope: GiftConfigV1['envelope'];
  letter: Pick<GiftConfigV1['letter'], 'continueLabel' | 'skipLabel' | 'ariaLabel'>;
  music: Pick<
    GiftConfigV1['music'],
    | 'emptyMessage'
    | 'errorMessage'
    | 'nowPlayingLabel'
    | 'playLabel'
    | 'pauseLabel'
    | 'tapToPlayMessage'
    | 'previousLabel'
    | 'nextLabel'
    | 'progressLabel'
    | 'positionSeparator'
  >;
  question: Pick<GiftConfigV1['question'], 'yesLabel' | 'needTimeLabel'>;
  endings: {
    accepted: Pick<GiftConfigV1['endings']['accepted'], 'continueLabel'>;
    needTime: Pick<GiftConfigV1['endings']['needTime'], 'backLabel'>;
    promise: Pick<GiftConfigV1['endings']['promise'], 'backLabel' | 'replayLabel'>;
  };
}

export const GIFT_UI_COPY: Record<ProjectLocale, GiftUiCopy> = {
  id: {
    intro: { startLabel: 'Mulai' },
    envelope: {
      ariaLabel: 'Sebuah amplop tertutup yang menunggu untuk dibuka',
      readLabel: 'Baca surat',
      needTimeLabel: 'Aku butuh waktu',
    },
    letter: {
      continueLabel: 'Lanjutkan',
      skipLabel: 'Skip',
      ariaLabel: 'Isi surat. Gunakan tombol Lewati animasi untuk langsung menampilkan seluruh pesan.',
    },
    music: {
      emptyMessage: 'Lagu belum dipilih, tetapi surat tetap dapat dibaca.',
      errorMessage: 'Lagu tidak dapat dimuat, tetapi suratmu tetap ada di sini.',
      nowPlayingLabel: 'Sedang diputar',
      playLabel: 'Putar lagu',
      pauseLabel: 'Jeda lagu',
      tapToPlayMessage: 'Tekan putar saat kamu siap.',
      previousLabel: 'Lagu sebelumnya',
      nextLabel: 'Lagu berikutnya',
      progressLabel: 'Posisi lagu',
      positionSeparator: 'dari',
    },
    question: { yesLabel: 'Ya', needTimeLabel: 'Aku butuh waktu' },
    endings: {
      accepted: { continueLabel: 'Lanjutkan' },
      needTime: { backLabel: 'Kembali' },
      promise: { backLabel: 'Kembali', replayLabel: 'Putar ulang' },
    },
  },
  en: {
    intro: { startLabel: 'Start' },
    envelope: {
      ariaLabel: 'A sealed letter waiting to be opened',
      readLabel: 'Read',
      needTimeLabel: 'I need more time',
    },
    letter: {
      continueLabel: 'Continue',
      skipLabel: 'Skip',
      ariaLabel: 'Letter. Use the Skip button to reveal the complete message.',
    },
    music: {
      emptyMessage: 'No song has been selected, but the letter is still here.',
      errorMessage: "The song couldn't load, but your letter is still here.",
      nowPlayingLabel: 'Now playing',
      playLabel: 'Play song',
      pauseLabel: 'Pause song',
      tapToPlayMessage: 'Tap play whenever you are ready.',
      previousLabel: 'Previous song',
      nextLabel: 'Next song',
      progressLabel: 'Song progress',
      positionSeparator: 'of',
    },
    question: { yesLabel: 'Yes', needTimeLabel: 'I need more time' },
    endings: {
      accepted: { continueLabel: 'Continue' },
      needTime: { backLabel: 'Back' },
      promise: { backLabel: 'Back', replayLabel: 'Replay' },
    },
  },
};
