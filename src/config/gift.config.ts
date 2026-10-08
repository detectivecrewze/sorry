export interface GiftMusicTrackV1 {
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
}

export interface GiftConfigV1 {
  version: 1;
  locale: 'en' | 'id';
  meta: {
    title: string;
    description: string;
  };
  recipient: {
    name: string;
    address: string;
  };
  sender: {
    name: string;
  };
  intro: {
    title: string;
    subtitle: string;
    startLabel: string;
  };
  envelope: {
    ariaLabel: string;
    readLabel: string;
    needTimeLabel: string;
  };
  letter: {
    heading: string;
    paragraphs: string[];
    signoff: string;
    continueLabel: string;
    skipLabel: string;
    ariaLabel: string;
  };
  music: {
    title: string;
    artist: string;
    audioUrl: string;
    coverUrl: string;
    emptyMessage: string;
    errorMessage: string;
    nowPlayingLabel: string;
    playLabel: string;
    pauseLabel: string;
    tapToPlayMessage: string;
    previousLabel: string;
    nextLabel: string;
    progressLabel: string;
    positionSeparator: string;
    tracks?: GiftMusicTrackV1[];
  };
  question: {
    heading: string;
    yesLabel: string;
    needTimeLabel: string;
  };
  endings: {
    accepted: {
      heading: string;
      body: string;
      continueLabel: string;
    };
    needTime: {
      heading: string;
      body: string;
      loveLine: string;
      backLabel: string;
    };
    promise: {
      heading: string;
      body: string;
      backLabel: string;
      replayLabel: string;
    };
  };
  media: {
    envelopeUrl: string;
    characterAlt: string;
    characters: {
      question: string[];
      accepted: string[];
      needTime: string[];
      promise: string[];
    };
  };
  theme: {
    background: string;
    backgroundDeep: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accentStrong: string;
    envelope: string;
    playerGradient?: string;
    playerToggleBg?: string;
    playerToggleColor?: string;
    playerToggleHover?: string;
    playerBorder?: string;
    playerProgress?: string;
    playerThumb?: string;
    playerThumbShadow?: string;
    playerShadow?: string;
  };
  animation: {
    typewriter: boolean;
    typewriterSpeedMs: number;
    letterTypewriter: boolean;
    letterTypewriterSpeedMs: number;
    sceneDurationMs: number;
  };
}

export const giftConfig: GiftConfigV1 = {
  version: 1,
  locale: 'en',
  meta: {
    title: "I'm Sorry, Love...",
    description: 'A private interactive letter, made with care.',
  },
  recipient: {
    name: 'Enggar Abi Z.',
    address: 'Enggar Abi Z.',
  },
  sender: {
    name: 'Risa Nazmeliani ♡',
  },
  intro: {
    title: "I'm Sorry, Love...",
    subtitle: 'A space to clear the air, share my heart, and bridge the gap between us.',
    startLabel: 'Start',
  },
  envelope: {
    ariaLabel: 'A sealed letter waiting to be opened',
    readLabel: 'Read',
    needTimeLabel: 'I need more time',
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
    continueLabel: 'Continue',
    skipLabel: 'Skip',
    ariaLabel: 'Letter. Use the Skip button to reveal the complete message.',
  },
  music: {
    title: 'Keep Me',
    artist: 'Novo Amor',
    audioUrl: 'https://cdn.for-you-always.my.id/1791371832328-ylylh.mp3',
    coverUrl: 'https://cdn.for-you-always.my.id/1791371973442-ehods.jpg',
    emptyMessage: 'Add an audio URL in gift.config.ts to play your song here.',
    errorMessage: "The song couldn't load, but your letter is still here.",
    nowPlayingLabel: 'Now playing',
    playLabel: 'Play song',
    pauseLabel: 'Pause song',
    tapToPlayMessage: 'Tap play whenever you are ready.',
    previousLabel: 'Previous song',
    nextLabel: 'Next song',
    progressLabel: 'Song progress',
    positionSeparator: 'of',
    tracks: [
      {
        title: 'Keep Me',
        artist: 'Novo Amor',
        audioUrl: 'https://cdn.for-you-always.my.id/1791371832328-ylylh.mp3',
        coverUrl: 'https://cdn.for-you-always.my.id/1791371973442-ehods.jpg',
      },
    ],
  },
  question: {
    heading: 'Will you forgive me, my love?',
    yesLabel: 'Yes',
    needTimeLabel: 'I need more time',
  },
  endings: {
    accepted: {
      heading: 'Yeees!!!',
      body: 'Thank you for giving my heart another chance.',
      continueLabel: 'Continue',
    },
    needTime: {
      heading: 'Take all the time you need to process, love.',
      body: "There is no pressure. I'll be here whenever you feel ready.",
      loveLine: 'I Love You, Love!',
      backLabel: 'Back',
    },
    promise: {
      heading: "I Promise that this won't happen again!",
      body: 'I Love You, Love!',
      backLabel: 'Back',
      replayLabel: 'Replay',
    },
  },
  media: {
    envelopeUrl: '/assets/vintage-envelope.webp',
    characterAlt: 'A small white bunny holding a pink heart',
    characters: {
      question: ['/assets/mascot-question.webp', '/assets/mascot-question-2.webp'],
      accepted: ['/assets/mascot-celebrate.webp', '/assets/mascot-celebrate-2.webp'],
      needTime: ['/assets/mascot-waiting.webp', '/assets/mascot-waiting-2.webp'],
      promise: ['/assets/mascot-heart.webp', '/assets/mascot-promise-2.webp'],
    },
  },
  theme: {
    background: '#65070d',
    backgroundDeep: '#3b0207',
    surface: '#8b1822',
    text: '#fff8f4',
    muted: '#e5c7c8',
    accent: '#f6c3cb',
    accentStrong: '#d98796',
    envelope: '#8c4b50',
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
  animation: {
    typewriter: true,
    typewriterSpeedMs: 54,
    letterTypewriter: true,
    letterTypewriterSpeedMs: 16,
    sceneDurationMs: 480,
  },
};

export default giftConfig;
