import { describe, expect, it } from 'vitest';
import { giftConfig } from '../src/config/gift.config';
import { normalizeGiftConfig } from '../src/config/normalize';
import { GiftStateMachine } from '../src/state/machine';

describe('GiftStateMachine', () => {
  it('runs the accepted path and returns through history', () => {
    const machine = new GiftStateMachine();
    expect(machine.send('START')).toBe('envelope');
    expect(machine.send('READ')).toBe('letter');
    expect(machine.send('CONTINUE')).toBe('question');
    expect(machine.send('ACCEPT')).toBe('accepted');
    expect(machine.send('CONTINUE')).toBe('promise');
    expect(machine.send('BACK')).toBe('accepted');
    expect(machine.send('BACK')).toBe('question');
  });

  it('returns need-more-time to the scene that opened it', () => {
    const early = new GiftStateMachine();
    early.send('START');
    expect(early.send('NEED_TIME')).toBe('needs-time');
    expect(early.send('BACK')).toBe('envelope');

    const afterLetter = new GiftStateMachine();
    afterLetter.send('START');
    afterLetter.send('READ');
    afterLetter.send('CONTINUE');
    expect(afterLetter.send('NEED_TIME')).toBe('needs-time');
    expect(afterLetter.send('BACK')).toBe('question');
  });

  it('clears history on replay and ignores invalid transitions', () => {
    const machine = new GiftStateMachine();
    expect(machine.send('ACCEPT')).toBe('intro');
    machine.send('START');
    machine.send('READ');
    expect(machine.send('REPLAY')).toBe('intro');
    expect(machine.canGoBack).toBe(false);
  });

  it('can start from a requested Studio preview scene without changing the public default', () => {
    expect(new GiftStateMachine().scene).toBe('intro');
    const preview = new GiftStateMachine('question');
    expect(preview.scene).toBe('question');
    expect(preview.send('ACCEPT')).toBe('accepted');
    expect(preview.send('BACK')).toBe('question');
  });
});

describe('normalizeGiftConfig', () => {
  it('uses defaults for empty text and supports safe runtime overrides', () => {
    const config = normalizeGiftConfig({
      recipient: { name: '  Mina  ', address: '' },
      music: { audioUrl: '  ', title: 'Our song' },
      animation: { typewriterSpeedMs: 9999, sceneDurationMs: -20 },
    });

    expect(config.recipient.name).toBe('Mina');
    expect(config.recipient.address).toBe(giftConfig.recipient.address);
    expect(config.music.audioUrl).toBe('');
    expect(config.music.title).toBe('Our song');
    expect(config.animation.typewriterSpeedMs).toBe(120);
    expect(config.animation.sceneDurationMs).toBe(0);
  });

  it('falls back to the default paragraphs when all supplied paragraphs are empty', () => {
    const config = normalizeGiftConfig({ letter: { paragraphs: [' ', ''] } });
    expect(config.letter.paragraphs).toEqual(giftConfig.letter.paragraphs);
  });
});
