export type SceneId = 'intro' | 'envelope' | 'letter' | 'question' | 'accepted' | 'promise' | 'needs-time';

export type GiftEvent =
  | 'START'
  | 'READ'
  | 'CONTINUE'
  | 'ACCEPT'
  | 'NEED_TIME'
  | 'BACK'
  | 'REPLAY';

const transitions: Partial<Record<SceneId, Partial<Record<Exclude<GiftEvent, 'BACK' | 'REPLAY'>, SceneId>>>> = {
  intro: { START: 'envelope' },
  envelope: { READ: 'letter', NEED_TIME: 'needs-time' },
  letter: { CONTINUE: 'question' },
  question: { ACCEPT: 'accepted', NEED_TIME: 'needs-time' },
  accepted: { CONTINUE: 'promise' },
};

export class GiftStateMachine {
  private currentScene: SceneId;
  private history: SceneId[] = [];

  constructor(initialScene: SceneId = 'intro') {
    this.currentScene = initialScene;
  }

  get scene(): SceneId {
    return this.currentScene;
  }

  get canGoBack(): boolean {
    return this.history.length > 0;
  }

  send(event: GiftEvent): SceneId {
    if (event === 'REPLAY') {
      this.currentScene = 'intro';
      this.history = [];
      return this.currentScene;
    }

    if (event === 'BACK') {
      const previous = this.history.pop();
      if (previous) this.currentScene = previous;
      return this.currentScene;
    }

    const next = transitions[this.currentScene]?.[event];
    if (!next) return this.currentScene;

    this.history.push(this.currentScene);
    this.currentScene = next;
    return this.currentScene;
  }
}
