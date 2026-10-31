import { chooseSimpleAction } from '../../ai/simpleBot';
import { cardKey, type Card, type Rank, type Suit } from '../../domain/cards';
import { SEATS, type Seat } from '../../domain/seats';

import {
  actingSeat,
  createGame,
  getLegalActions,
  handWinner,
  nextSeat,
  reduce,
  viewFor,
} from '../game';
import type { GameState } from '../types';

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

const VIRA_REY_BASTO = card(12, 'basto');

function rigGame(hands: Record<Seat, readonly Card[]>, vira: Card = VIRA_REY_BASTO): GameState {
  const base = createGame({ seed: 'rigged-table' });

  return {
    ...base,
    vira,
    hands,
    dealtHands: hands,
    turn: 0,
    lead: 0,
    trickIndex: 1,
    currentTrick: [],
    tricks: [],
    bazaWins: { nosotros: 0, ellos: 0 },
    lastTrick: null,
    result: null,
    matchWinner: null,
    phase: 'playing',
    scores: { nosotros: 0, ellos: 0 },
    log: [],
    nextLogId: 0,
    playedThisHand: { 0: 0, 1: 0, 2: 0, 3: 0 },
    event: null,
  };
}

function playCard(state: GameState, seat: Seat, played: Card): GameState {
  expect(state.turn).toBe(seat);
  const next = reduce(state, { type: 'playCard', seat, cardKey: cardKey(played) });
  expect(next).not.toBe(state);
  return next;
}

function playBaza(state: GameState, plays: ReadonlyArray<readonly [Seat, Card]>): GameState {
  return plays.reduce((current, [seat, played]) => playCard(current, seat, played), state);
}

function simulateHand(seed: string, target = 24): GameState {
  let state = createGame({ seed, target });
  let guard = 0;

  while (state.phase === 'playing' && guard < 200) {
    guard += 1;
    const action = chooseSimpleAction(viewFor(state, actingSeat(state)));
    const next = reduce(state, action);
    expect(next).not.toBe(state);
    state = next;
  }

  return state;
}

describe('createGame', () => {
  it('reproduces the same table from the same seed', () => {
    const first = createGame({ seed: 'mesa-de-prueba' });
    const second = createGame({ seed: 'mesa-de-prueba' });
    const other = createGame({ seed: 'otra-mesa' });

    expect(first).toEqual(second);
    expect(other.hands).not.toEqual(first.hands);
  });

  it('deals three cards to each seat and turns a distinct vira', () => {
    const state = createGame({ seed: 'reparto-1' });
    const dealt = [...SEATS.flatMap((seat) => state.hands[seat]), state.vira].map(cardKey);

    for (const seat of SEATS) {
      expect(state.hands[seat]).toHaveLength(3);
    }

    expect(new Set(dealt).size).toBe(13);
  });

  it('starts with La Comadre as pie, the human as mano and a clean score', () => {
    const state = createGame({ seed: 'mesa-3' });
    const view = viewFor(state, 0);

    expect(state.dealer).toBe(3);
    expect(state.mano).toBe(0);
    expect(state.turn).toBe(0);
    expect(state.lead).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.handNumber).toBe(1);
    expect(state.scores).toEqual({ nosotros: 0, ellos: 0 });
    expect(view.stake).toBe(1);
    expect(view.hand).toEqual(state.hands[0]);
    expect(state.truco).toEqual({ level: 0, acceptedByTeam: null });
    expect(state.envido.status).toBe('none');
    expect(state.flor.declarations).toEqual([]);
    expect(state.prive.called).toBe(false);
    expect(state.pending).toBeNull();
  });

  it('rotates seats counterclockwise', () => {
    expect(nextSeat(0)).toBe(1);
    expect(nextSeat(1)).toBe(2);
    expect(nextSeat(2)).toBe(3);
    expect(nextSeat(3)).toBe(0);
  });
});

describe('legal play', () => {
  it('offers the three cards only to the mano', () => {
    const state = createGame({ seed: 'legal-1' });
    const mano = getLegalActions(state, 0);
    const rival = getLegalActions(state, 1);

    expect(mano.playableCardKeys).toEqual(state.hands[0].map(cardKey));
    expect(mano.canBurn).toBe(true);
    expect(mano.canNextHand).toBe(false);
    expect(rival.playableCardKeys).toEqual([]);
    expect(rival.canBurn).toBe(false);
  });

  it('rejects an out-of-turn card without touching state', () => {
    const state = createGame({ seed: 'legal-2' });
    const cardInHand = state.hands[1][0];

    expect(reduce(state, { type: 'playCard', seat: 1, cardKey: cardKey(cardInHand) })).toBe(state);
  });

  it('rejects a duplicate play and any play after the reparto', () => {
    const state = createGame({ seed: 'legal-3' });
    const played = state.hands[0][0];
    const afterPlay = playCard(state, 0, played);

    expect(reduce(afterPlay, { type: 'playCard', seat: 0, cardKey: cardKey(played) })).toBe(
      afterPlay,
    );

    const handOver = simulateHand('legal-4');
    expect(handOver.phase).toBe('handOver');
    expect(
      reduce(handOver, {
        type: 'playCard',
        seat: 0,
        cardKey: cardKey(handOver.dealtHands[0][0]),
      }),
    ).toBe(handOver);
  });

  it('hides a burned card from the other seats and from the log', () => {
    const state = createGame({ seed: 'quemar-1' });
    const burned = state.hands[0][0];
    const next = reduce(state, {
      type: 'playCard',
      seat: 0,
      cardKey: cardKey(burned),
      burned: true,
    });
    const rivalView = viewFor(next, 1);

    expect(rivalView.currentTrick[0]).toEqual({ seat: 0, card: null, burned: true });
    expect(rivalView.log.at(-1)).toMatchObject({ kind: 'play', seat: 0, card: null, burned: true });
    expect(rivalView.legal.playableCardKeys).toHaveLength(3);
  });
});

describe('bazas', () => {
  it('resolves four cards and gives the next lead to the baza winner', () => {
    const state = rigGame({
      0: [card(4, 'oro'), card(2, 'oro'), card(2, 'espada')],
      1: [card(3, 'oro'), card(2, 'copa'), card(3, 'espada')],
      2: [card(5, 'oro'), card(2, 'basto'), card(4, 'espada')],
      3: [card(6, 'oro'), card(3, 'basto'), card(5, 'espada')],
    });

    const afterBaza = playBaza(state, [
      [0, card(4, 'oro')],
      [1, card(3, 'oro')],
      [2, card(5, 'oro')],
      [3, card(6, 'oro')],
    ]);

    expect(afterBaza.tricks).toHaveLength(1);
    expect(afterBaza.lastTrick).toMatchObject({
      baza: 1,
      leadSeat: 0,
      winnerSeat: 1,
      winnerTeam: 'ellos',
      parda: false,
    });
    expect(afterBaza.bazaWins).toEqual({ nosotros: 0, ellos: 1 });
    expect(afterBaza.lead).toBe(1);
    expect(afterBaza.turn).toBe(1);
    expect(afterBaza.trickIndex).toBe(2);
    expect(afterBaza.currentTrick).toEqual([]);
    expect(viewFor(afterBaza, 0).lastTrick?.winnerSeat).toBe(1);
  });

  it('keeps the previous lead after a parda (parda in the first baza)', () => {
    const state = rigGame({
      0: [card(3, 'oro'), card(2, 'oro'), card(4, 'espada')],
      1: [card(3, 'copa'), card(4, 'copa'), card(2, 'espada')],
      2: [card(4, 'oro'), card(5, 'copa'), card(5, 'espada')],
      3: [card(5, 'oro'), card(6, 'copa'), card(6, 'espada')],
    });

    const afterFirst = playBaza(state, [
      [0, card(3, 'oro')],
      [1, card(3, 'copa')],
      [2, card(4, 'oro')],
      [3, card(5, 'oro')],
    ]);

    expect(afterFirst.lastTrick?.parda).toBe(true);
    expect(afterFirst.lastTrick?.winnerSeat).toBeNull();
    expect(afterFirst.bazaWins).toEqual({ nosotros: 0, ellos: 0 });
    expect(afterFirst.lead).toBe(0);
    expect(afterFirst.turn).toBe(0);

    const afterSecond = playBaza(afterFirst, [
      [0, card(2, 'oro')],
      [1, card(4, 'copa')],
      [2, card(5, 'copa')],
      [3, card(6, 'copa')],
    ]);

    expect(afterSecond.bazaWins).toEqual({ nosotros: 1, ellos: 0 });
    expect(afterSecond.lead).toBe(0);

    const afterThird = playBaza(afterSecond, [
      [0, card(4, 'espada')],
      [1, card(2, 'espada')],
      [2, card(5, 'espada')],
      [3, card(6, 'espada')],
    ]);

    expect(afterThird.phase).toBe('handOver');
    expect(afterThird.result?.winnerTeam).toBe('nosotros');
    expect(afterThird.result?.bazaWins).toEqual({ nosotros: 1, ellos: 1 });
    expect(afterThird.scores).toEqual({ nosotros: 1, ellos: 0 });
  });

  it('gives an unresolved 1–1 finish to the first baza winner (parda in the second)', () => {
    const state = rigGame({
      0: [card(3, 'oro'), card(2, 'basto'), card(4, 'espada')],
      1: [card(2, 'oro'), card(2, 'copa'), card(3, 'espada')],
      2: [card(4, 'oro'), card(4, 'copa'), card(5, 'espada')],
      3: [card(5, 'oro'), card(5, 'copa'), card(6, 'espada')],
    });

    const afterFirst = playBaza(state, [
      [0, card(3, 'oro')],
      [1, card(2, 'oro')],
      [2, card(4, 'oro')],
      [3, card(5, 'oro')],
    ]);
    const afterSecond = playBaza(afterFirst, [
      [0, card(2, 'basto')],
      [1, card(2, 'copa')],
      [2, card(4, 'copa')],
      [3, card(5, 'copa')],
    ]);

    expect(afterSecond.lastTrick?.parda).toBe(true);
    expect(afterSecond.lead).toBe(0);

    const afterThird = playBaza(afterSecond, [
      [0, card(4, 'espada')],
      [1, card(3, 'espada')],
      [2, card(5, 'espada')],
      [3, card(6, 'espada')],
    ]);

    expect(afterThird.result?.winnerTeam).toBe('nosotros');
    expect(afterThird.result?.bazaWins).toEqual({ nosotros: 1, ellos: 1 });
  });

  it('gives a 1–1 finish to the first baza winner (parda in the third)', () => {
    const state = rigGame({
      0: [card(3, 'oro'), card(4, 'copa'), card(2, 'basto')],
      1: [card(2, 'oro'), card(3, 'copa'), card(2, 'copa')],
      2: [card(4, 'oro'), card(5, 'copa'), card(2, 'espada')],
      3: [card(5, 'oro'), card(6, 'copa'), card(4, 'espada')],
    });

    const afterFirst = playBaza(state, [
      [0, card(3, 'oro')],
      [1, card(2, 'oro')],
      [2, card(4, 'oro')],
      [3, card(5, 'oro')],
    ]);
    const afterSecond = playBaza(afterFirst, [
      [0, card(4, 'copa')],
      [1, card(3, 'copa')],
      [2, card(5, 'copa')],
      [3, card(6, 'copa')],
    ]);
    const afterThird = playBaza(afterSecond, [
      [1, card(2, 'copa')],
      [2, card(2, 'espada')],
      [3, card(4, 'espada')],
      [0, card(2, 'basto')],
    ]);

    expect(afterThird.lastTrick?.parda).toBe(true);
    expect(afterThird.result?.winnerTeam).toBe('nosotros');
    expect(afterThird.result?.bazaWins).toEqual({ nosotros: 1, ellos: 1 });
  });

  it('awards all-parda to the mano team and keeps the same leader every baza', () => {
    const state = rigGame({
      0: [card(3, 'oro'), card(2, 'oro'), card(6, 'oro')],
      1: [card(3, 'copa'), card(2, 'copa'), card(6, 'copa')],
      2: [card(3, 'espada'), card(2, 'espada'), card(6, 'espada')],
      3: [card(3, 'basto'), card(2, 'basto'), card(6, 'basto')],
    });

    const afterFirst = playBaza(state, [
      [0, card(3, 'oro')],
      [1, card(3, 'copa')],
      [2, card(3, 'espada')],
      [3, card(3, 'basto')],
    ]);
    const afterSecond = playBaza(afterFirst, [
      [0, card(2, 'oro')],
      [1, card(2, 'copa')],
      [2, card(2, 'espada')],
      [3, card(2, 'basto')],
    ]);
    const afterThird = playBaza(afterSecond, [
      [0, card(6, 'oro')],
      [1, card(6, 'copa')],
      [2, card(6, 'espada')],
      [3, card(6, 'basto')],
    ]);

    expect(afterThird.phase).toBe('handOver');
    expect(afterThird.tricks.map((trick) => trick.parda)).toEqual([true, true, true]);
    expect(afterThird.result?.bazaWins).toEqual({ nosotros: 0, ellos: 0 });
    expect(afterThird.result?.winnerTeam).toBe('nosotros');
  });

  it('ends the reparto as soon as a team wins two bazas', () => {
    const state = rigGame({
      0: [card(3, 'oro'), card(3, 'copa'), card(4, 'espada')],
      1: [card(2, 'oro'), card(2, 'copa'), card(3, 'espada')],
      2: [card(4, 'oro'), card(4, 'copa'), card(5, 'espada')],
      3: [card(5, 'oro'), card(5, 'copa'), card(6, 'espada')],
    });

    const afterFirst = playBaza(state, [
      [0, card(3, 'oro')],
      [1, card(2, 'oro')],
      [2, card(4, 'oro')],
      [3, card(5, 'oro')],
    ]);
    const afterSecond = playBaza(afterFirst, [
      [0, card(3, 'copa')],
      [1, card(2, 'copa')],
      [2, card(4, 'copa')],
      [3, card(5, 'copa')],
    ]);

    expect(afterSecond.phase).toBe('handOver');
    expect(afterSecond.tricks).toHaveLength(2);
    expect(afterSecond.bazaWins).toEqual({ nosotros: 2, ellos: 0 });
    expect(afterSecond.scores).toEqual({ nosotros: 1, ellos: 0 });
    expect(afterSecond.result).toMatchObject({
      winnerTeam: 'nosotros',
      points: 1,
      reason: 'bazas',
    });
  });

  it('handWinner follows the first-winner and mano fallbacks', () => {
    const parda = (baza: number): TrickRecordLike => ({
      baza,
      leadSeat: 0,
      plays: [],
      winnerTeam: null,
      winnerSeat: null,
      parda: true,
    });
    const won = (baza: number, team: 'nosotros' | 'ellos'): TrickRecordLike => ({
      baza,
      leadSeat: 0,
      plays: [],
      winnerTeam: team,
      winnerSeat: team === 'nosotros' ? 0 : 1,
      parda: false,
    });

    expect(handWinner({ nosotros: 0, ellos: 0 }, [parda(1), parda(2), parda(3)], 2)).toBe(
      'nosotros',
    );
    expect(
      handWinner({ nosotros: 1, ellos: 1 }, [won(1, 'ellos'), won(2, 'nosotros'), parda(3)], 0),
    ).toBe('ellos');
    expect(handWinner({ nosotros: 1, ellos: 0 }, [parda(1), won(2, 'nosotros'), parda(3)], 3)).toBe(
      'nosotros',
    );
  });
});

type TrickRecordLike = Parameters<typeof handWinner>[1][number];

describe('the hand lifecycle', () => {
  it('plays a whole seeded hand with the simple bot and reveals every hand', () => {
    const state = simulateHand('simulacion-completa');

    expect(state.phase).toBe('handOver');
    expect(state.tricks.length).toBeGreaterThanOrEqual(2);
    expect(state.tricks.length).toBeLessThanOrEqual(3);
    expect(state.result).toMatchObject({ points: 1, reason: 'bazas' });
    expect(state.scores.nosotros + state.scores.ellos).toBe(state.result?.totalPoints);
    expect(state.result?.settlements.at(-1)?.kind).toBe('truco');

    const view = viewFor(state, 0);
    expect(view.revealedHands).not.toBeNull();

    for (const seat of SEATS) {
      expect(view.revealedHands?.[seat]).toHaveLength(3);
      expect(state.result?.hands[seat]).toEqual(state.dealtHands[seat]);
    }
  });

  it('hides rival hands during play and reveals them at hand over', () => {
    const state = createGame({ seed: 'secreto-1' });
    const view = viewFor(state, 0);
    const rivalKeys = new Set(state.hands[1].map(cardKey));

    expect(view.revealedHands).toBeNull();
    expect(view.hand).toEqual(state.hands[0]);
    expect(view.handCounts).toEqual({ 0: 3, 1: 3, 2: 3, 3: 3 });
    expect(view.hand.some((entry) => rivalKeys.has(cardKey(entry)))).toBe(false);
    expect('hands' in view).toBe(false);

    const finished = simulateHand('secreto-2');
    const revealed = viewFor(finished, 0);

    expect(revealed.revealedHands?.[1]).toEqual(finished.dealtHands[1]);
  });

  it('computes the seat’s own envido from the dealt hand', () => {
    const state = rigGame({
      0: [card(11, 'basto'), card(7, 'oro'), card(4, 'copa')],
      1: [card(3, 'oro'), card(2, 'oro'), card(5, 'oro')],
      2: [card(4, 'oro'), card(4, 'copa'), card(4, 'espada')],
      3: [card(5, 'oro'), card(5, 'copa'), card(5, 'espada')],
    });

    expect(viewFor(state, 0).ownEnvido).toBe(37);
    expect(viewFor(state, 1).ownEnvido).toBe(28);
  });

  it('rotates the pie and keeps the score when the next reparto starts', () => {
    const state = simulateHand('siguiente-reparto', 24);
    const next = reduce(state, { type: 'nextHand' });

    expect(next).not.toBe(state);
    expect(next.phase).toBe('playing');
    expect(next.handNumber).toBe(2);
    expect(next.dealer).toBe(nextSeat(state.dealer));
    expect(next.mano).toBe(nextSeat(state.mano));
    expect(next.scores).toEqual(state.scores);
    expect(next.tricks).toEqual([]);
    expect(next.result).toBeNull();
    expect(next.log.length).toBeGreaterThan(state.log.length);

    for (const seat of SEATS) {
      expect(next.hands[seat]).toHaveLength(3);
    }
  });

  it('only starts the next reparto from hand over', () => {
    const playing = createGame({ seed: 'no-todavia' });

    expect(reduce(playing, { type: 'nextHand' })).toBe(playing);
  });

  it('ends the partida at the target and offers a rematch', () => {
    const state = simulateHand('partida-corta', 1);

    expect(state.phase).toBe('matchOver');
    expect(state.matchWinner).toBe(state.result?.winnerTeam);
    expect(state.scores[state.result?.winnerTeam ?? 'nosotros']).toBe(1);
    expect(viewFor(state, 0).legal.canRematch).toBe(true);
    expect(viewFor(state, 0).legal.canNextHand).toBe(false);
    expect(reduce(state, { type: 'nextHand' })).toBe(state);

    const fresh = reduce(state, { type: 'rematch', seed: 'revancha' });

    expect(fresh.phase).toBe('playing');
    expect(fresh.matchWinner).toBeNull();
    expect(fresh.scores).toEqual({ nosotros: 0, ellos: 0 });
    expect(fresh.handNumber).toBe(1);
    expect(fresh.dealer).toBe(nextSeat(state.dealer));
    expect(fresh.result).toBeNull();
    expect(fresh.dealtHands).not.toEqual(state.dealtHands);

    const automatic = reduce(state, { type: 'rematch' });

    expect(automatic.phase).toBe('playing');
    expect(automatic.dealtHands).not.toEqual(state.dealtHands);

    for (const seat of SEATS) {
      expect(fresh.hands[seat]).toHaveLength(3);
    }
  });

  it('declares the envido, flor and prive state clean at the deal', () => {
    const state = createGame({ seed: 'futuro' });

    expect(state.envido.status).toBe('none');
    expect(state.envido.level).toBeNull();
    expect(state.prive.called).toBe(false);
    expect(state.flor.declarations).toEqual([]);
    expect(state.settlements).toEqual([]);
  });
});
