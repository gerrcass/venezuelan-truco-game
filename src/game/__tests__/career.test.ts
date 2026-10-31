import { botPersonaForSeat } from '../../ai/personas';
import { chooseBotAction } from '../../ai/policy';
import { actingSeat, createGame, reduce, viewFor } from '../../engine/game';
import type { GameState } from '../../engine/types';
import {
  clearCareerStats,
  EMPTY_CAREER,
  readCareerStats,
  recordMatchInCareer,
  saveCareerStats,
} from '../career';

function playToMatchOver(seed: string): GameState {
  let state = createGame({ seed });
  let guard = 0;

  while (state.phase !== 'matchOver' && guard < 20_000) {
    guard += 1;

    if (state.phase === 'handOver') {
      state = reduce(state, { type: 'nextHand' });
      continue;
    }

    const seat = actingSeat(state);
    state = reduce(
      state,
      chooseBotAction(viewFor(state, seat), botPersonaForSeat(seat), state.seed),
    );
  }

  return state;
}

describe('the career', () => {
  it('records one finished partida from its log', () => {
    const finished = playToMatchOver('carrera-1');

    expect(finished.phase).toBe('matchOver');

    const view = viewFor(finished, 0);
    const stats = recordMatchInCareer(view, EMPTY_CAREER);

    expect(stats.matches).toBe(1);
    expect(stats.wins + stats.losses).toBe(1);
    expect(stats.hands).toBeGreaterThan(0);
    expect(readCareerStats()).toEqual(stats);
  });

  it('accumulates across partidas and counts the hand results', () => {
    const finished = playToMatchOver('carrera-2');
    const view = viewFor(finished, 0);
    const one = recordMatchInCareer(view, EMPTY_CAREER);
    const two = recordMatchInCareer(view, one);

    expect(two.matches).toBe(2);
    expect(two.hands).toBe(one.hands * 2);
    expect(two.envidos).toBeGreaterThanOrEqual(one.envidos);
    expect(two.flores).toBeGreaterThanOrEqual(one.flores);
  });

  it('reads bad storage as an empty career and clears cleanly', () => {
    window.localStorage.setItem('truco.stats', '{not json');
    expect(readCareerStats()).toEqual(EMPTY_CAREER);

    saveCareerStats({ ...EMPTY_CAREER, matches: 2, wins: 1, losses: 1 });
    expect(readCareerStats().matches).toBe(2);

    expect(clearCareerStats()).toEqual(EMPTY_CAREER);
    expect(window.localStorage.getItem('truco.stats')).toBeNull();
  });
});
