import type { GameEvent } from '../../engine/types';
import { cueForEvent, TableAudio, type TableCue } from '../table-audio';

class FakeParam {
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class FakeOscillator {
  type = 'sine' as OscillatorType;
  frequency = new FakeParam();
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain {
  gain = new FakeParam();
  connect = vi.fn();
}

class FakeContext {
  currentTime = 0;
  destination = {};
  oscillators: FakeOscillator[] = [];
  createOscillator = vi.fn(() => {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  });
  createGain = vi.fn(() => new FakeGain());
  close = vi.fn(async () => undefined);
}

function audioWith(context: FakeContext) {
  return new TableAudio(true, () => context as unknown as AudioContext);
}

describe('cue selection', () => {
  it('maps every table event to a deterministic cue', () => {
    const cases: ReadonlyArray<readonly [GameEvent, TableCue]> = [
      [{ type: 'handDealt', handNumber: 1 }, 'deal'],
      [{ type: 'cardPlayed', seat: 0, burned: false }, 'play'],
      [{ type: 'cardPlayed', seat: 1, burned: true }, 'burn'],
      [{ type: 'trickResolved', baza: 1, winnerTeam: 'nosotros', parda: false }, 'stone'],
      [{ type: 'trucoCalled', seat: 0, team: 'nosotros', level: 1 }, 'call'],
      [{ type: 'trucoResponded', seat: 1, team: 'ellos', level: 1, response: 'accept' }, 'call'],
      [{ type: 'envidoCalled', seat: 0, team: 'nosotros', level: 1 }, 'call'],
      [{ type: 'envidoResponded', seat: 1, team: 'ellos', level: 1, response: 'decline' }, 'call'],
      [{ type: 'florCalled', seat: 0, team: 'nosotros', kind: 'flor' }, 'flor'],
      [{ type: 'priveCalled', seat: 0, team: 'nosotros' }, 'prive'],
      [
        {
          type: 'pointsAwarded',
          settlement: { kind: 'envido', team: 'nosotros', points: 4, detail: 'accepted' },
        },
        'stone',
      ],
      [{ type: 'folded', seat: 0, team: 'nosotros' }, 'call'],
      [{ type: 'handEnded', winnerTeam: 'nosotros', points: 3, reason: 'bazas' }, 'stone'],
      [{ type: 'matchEnded', winnerTeam: 'nosotros' }, 'win'],
      [{ type: 'matchEnded', winnerTeam: 'ellos' }, 'lose'],
    ];

    for (const [event, cue] of cases) {
      expect(cueForEvent(event)).toBe(cue);
    }

    expect(cueForEvent(null)).toBeNull();
  });
});

describe('the audio player', () => {
  it('synthesizes every cue without files once unlocked', () => {
    const context = new FakeContext();
    const audio = audioWith(context);

    audio.unlock();

    for (const cue of [
      'deal',
      'play',
      'burn',
      'stone',
      'call',
      'flor',
      'prive',
      'win',
      'lose',
    ] as const) {
      expect(() => audio.play(cue)).not.toThrow();
    }

    expect(context.createOscillator).toHaveBeenCalled();
    expect(context.createGain).toHaveBeenCalled();
  });

  it('does not make a sound when muted or before the first gesture', () => {
    const context = new FakeContext();
    const audio = audioWith(context);

    expect(() => audio.play('deal')).not.toThrow();
    expect(context.createOscillator).not.toHaveBeenCalled();

    audio.unlock();
    audio.setEnabled(false);
    audio.play('deal');

    expect(context.createOscillator).not.toHaveBeenCalled();
  });

  it('never throws when WebAudio is unavailable', () => {
    const audio = new TableAudio();

    expect(() => {
      audio.arm();
      audio.unlock();
      audio.play('deal');
      audio.play('win');
      audio.disarm();
    }).not.toThrow();
  });
});
