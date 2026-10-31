import type { GameEvent } from '../engine/types';

/** The small, synthesized sounds of the mesa. No files, no samples. */
export type TableCue =
  'deal' | 'play' | 'burn' | 'stone' | 'call' | 'flor' | 'prive' | 'win' | 'lose';

/**
 * Which cue belongs to a reducer event. The mapping is deliberately
 * deterministic so a screenshot run and a live table sound the same.
 */
export function cueForEvent(event: GameEvent | null): TableCue | null {
  if (!event) {
    return null;
  }

  switch (event.type) {
    case 'handDealt':
      return 'deal';
    case 'cardPlayed':
      return event.burned ? 'burn' : 'play';
    case 'trickResolved':
      return 'stone';
    case 'trucoCalled':
    case 'envidoCalled':
    case 'trucoResponded':
    case 'envidoResponded':
      return 'call';
    case 'florCalled':
      return 'flor';
    case 'priveCalled':
      return 'prive';
    case 'pointsAwarded':
      return 'stone';
    case 'folded':
      return 'call';
    case 'handEnded':
      return 'stone';
    case 'matchEnded':
      return event.winnerTeam === 'nosotros' ? 'win' : 'lose';
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

interface Tone {
  readonly frequency: number;
  readonly slideTo?: number;
  readonly start: number;
  readonly duration: number;
  readonly gain: number;
  readonly type: OscillatorType;
}

/**
 * Warm, short tones: a card is a slap, a stone is a clink, a canto is a
 * rising pair. Everything stays below a quarter of a second.
 */
const CUES: Record<TableCue, readonly Tone[]> = {
  deal: [
    { frequency: 320, slideTo: 240, start: 0, duration: 0.07, gain: 0.045, type: 'triangle' },
    { frequency: 300, slideTo: 220, start: 0.08, duration: 0.06, gain: 0.04, type: 'triangle' },
    { frequency: 280, slideTo: 200, start: 0.15, duration: 0.06, gain: 0.035, type: 'triangle' },
  ],
  play: [{ frequency: 780, slideTo: 220, start: 0, duration: 0.05, gain: 0.05, type: 'triangle' }],
  burn: [{ frequency: 240, slideTo: 120, start: 0, duration: 0.12, gain: 0.04, type: 'sine' }],
  stone: [
    { frequency: 1120, start: 0, duration: 0.055, gain: 0.035, type: 'sine' },
    { frequency: 1520, start: 0.012, duration: 0.07, gain: 0.025, type: 'sine' },
  ],
  call: [
    { frequency: 380, start: 0, duration: 0.08, gain: 0.04, type: 'triangle' },
    { frequency: 540, start: 0.075, duration: 0.11, gain: 0.045, type: 'triangle' },
  ],
  flor: [
    { frequency: 520, start: 0, duration: 0.1, gain: 0.04, type: 'triangle' },
    { frequency: 660, start: 0.075, duration: 0.11, gain: 0.04, type: 'triangle' },
    { frequency: 880, start: 0.15, duration: 0.14, gain: 0.035, type: 'triangle' },
  ],
  prive: [
    { frequency: 180, start: 0, duration: 0.12, gain: 0.055, type: 'sine' },
    { frequency: 260, start: 0.09, duration: 0.16, gain: 0.045, type: 'sine' },
  ],
  win: [
    { frequency: 392, start: 0, duration: 0.11, gain: 0.045, type: 'triangle' },
    { frequency: 523, start: 0.09, duration: 0.12, gain: 0.045, type: 'triangle' },
    { frequency: 659, start: 0.18, duration: 0.18, gain: 0.04, type: 'triangle' },
  ],
  lose: [
    { frequency: 392, start: 0, duration: 0.12, gain: 0.04, type: 'sine' },
    { frequency: 311, start: 0.1, duration: 0.15, gain: 0.04, type: 'sine' },
    { frequency: 233, start: 0.22, duration: 0.2, gain: 0.035, type: 'sine' },
  ],
};

type AudioContextFactory = () => AudioContext | null;

function defaultContextFactory(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const Constructor =
    window.AudioContext ??
    (window as Window & { readonly webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!Constructor) {
    return null;
  }

  try {
    return new Constructor();
  } catch {
    return null;
  }
}

/**
 * Lazy WebAudio player. It never creates a context before a user gesture and
 * never throws when the browser has no WebAudio or the context is suspended.
 */
export class TableAudio {
  private context: AudioContext | null = null;
  private enabled: boolean;
  private armed = false;
  private readonly createContext: AudioContextFactory;
  private readonly onGesture = () => {
    this.unlock();
    this.detachGesture();
  };

  constructor(enabled = true, createContext: AudioContextFactory = defaultContextFactory) {
    this.enabled = enabled;
    this.createContext = createContext;
  }

  arm(): void {
    if (this.armed || typeof window === 'undefined') {
      return;
    }

    this.armed = true;
    window.addEventListener('pointerdown', this.onGesture, { passive: true });
    window.addEventListener('keydown', this.onGesture);
  }

  disarm(): void {
    this.detachGesture();
    const closing = this.context?.close?.();

    if (closing && typeof closing.catch === 'function') {
      closing.catch(() => undefined);
    }

    this.context = null;
  }

  private detachGesture(): void {
    this.armed = false;
    window.removeEventListener('pointerdown', this.onGesture);
    window.removeEventListener('keydown', this.onGesture);
  }

  /** Called from a real gesture; safe to call repeatedly. */
  unlock(): void {
    if (this.context) {
      return;
    }

    this.context = this.createContext();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(cue: TableCue): void {
    if (!this.enabled || !this.context) {
      return;
    }

    try {
      const context = this.context;
      const now = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(0.7, now);
      master.connect(context.destination);

      for (const tone of CUES[cue]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = now + tone.start;
        const end = start + tone.duration;

        oscillator.type = tone.type;
        oscillator.frequency.setValueAtTime(tone.frequency, start);

        if (tone.slideTo !== undefined) {
          oscillator.frequency.exponentialRampToValueAtTime(tone.slideTo, end);
        }

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(start);
        oscillator.stop(end + 0.01);
      }
    } catch {
      // Audio is a garnish. A refused or suspended context never breaks the table.
    }
  }
}
