import { botPersonaForSeat } from '../../ai/personas';
import { chooseBotAction } from '../../ai/policy';
import { en, es } from '../../content';
import { actingSeat, createGame, reduce, viewFor } from '../../engine/game';
import type { GameState, GameView } from '../../engine/types';
import { deriveTableBeat, speechForEntry } from '../table-talk';

function botStep(state: GameState): GameState {
  const seat = actingSeat(state);
  const action = chooseBotAction(viewFor(state, seat), botPersonaForSeat(seat), state.seed);
  const next = reduce(state, action);

  expect(next).not.toBe(state);
  return next;
}

function playToFirstTrick(seed: string): GameState {
  let state = createGame({ seed });
  let guard = 0;

  while (guard < 200) {
    guard += 1;

    if (state.phase === 'handOver') {
      state = reduce(state, { type: 'nextHand' });
      continue;
    }

    if (state.phase === 'matchOver') {
      state = reduce(state, { type: 'rematch', seed: `${seed}-${guard}` });
      continue;
    }

    state = botStep(state);

    if (state.tricks.length > 0) {
      return state;
    }
  }

  throw new Error('The simulation never resolved a baza.');
}

function playToHandOver(seed: string): GameState {
  let state = createGame({ seed });
  let guard = 0;

  while (state.phase === 'playing' && guard < 300) {
    guard += 1;
    state = botStep(state);
  }

  expect(state.phase).not.toBe('playing');
  return state;
}

describe('the table-talk beats', () => {
  it('speaks after the deal with a persona taunt', () => {
    const view = viewFor(createGame({ seed: 'habla-reparto' }), 0);
    const beat = deriveTableBeat(view);

    expect(beat?.kind).toBe('taunt');

    if (beat?.kind === 'taunt') {
      expect(beat.event).toBe('deal');
      expect([1, 2, 3]).toContain(beat.seat);
    }
  });

  it('keeps the immediate canto bubble instead of a taunt', () => {
    const called = reduce(createGame({ seed: 'habla-canto' }), {
      type: 'callTruco',
      seat: 0,
    });
    const beat = deriveTableBeat(viewFor(called, 0));

    expect(beat?.kind).toBe('speech');

    if (beat?.kind === 'speech') {
      expect(speechForEntry(beat.entry, es)).toBe('¡Truco!');
    }
  });

  it('fills the quiet beat after a trick with a persona line', () => {
    const state = playToFirstTrick('habla-baza');
    const beat = deriveTableBeat(viewFor(state, 0));

    expect(beat?.kind).toBe('taunt');

    if (beat?.kind === 'taunt') {
      expect(['trickWin', 'trickLose']).toContain(beat.event);
    }
  });

  it('never gives a parda a trickWin taunt', () => {
    const view = viewFor(createGame({ seed: 'habla-parda' }), 0);
    const pardaView: GameView = {
      ...view,
      log: [
        {
          kind: 'trick',
          id: 1,
          baza: 1,
          winnerSeat: null,
          winnerTeam: null,
          parda: true,
        },
      ],
    };

    expect(deriveTableBeat(pardaView)).toBeNull();
  });

  it('speaks after the reparto closes', () => {
    const state = playToHandOver('habla-reparto-cerrado');
    const beat = deriveTableBeat(viewFor(state, 0));

    expect(beat?.kind).toBe('taunt');

    if (beat?.kind === 'taunt') {
      expect(['handWin', 'handLose']).toContain(beat.event);
    }
  });

  it('localizes the immediate answer bubble', () => {
    const opened = reduce(createGame({ seed: 'habla-idioma' }), {
      type: 'callEnvido',
      seat: 0,
    });
    const declined = reduce(opened, {
      type: 'respondEnvido',
      seat: 1,
      response: 'decline',
    });
    const beat = deriveTableBeat(viewFor(declined, 0));

    expect(beat?.kind).toBe('speech');

    if (beat?.kind === 'speech') {
      expect(speechForEntry(beat.entry, es)).toBe('No quiero, chamo.');
      expect(speechForEntry(beat.entry, en)).toBe('No quiero, pana.');
    }
  });
});
