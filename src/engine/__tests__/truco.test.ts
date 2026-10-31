import { chooseBotAction } from '../../ai/policy';
import { botPersonaForSeat } from '../../ai/personas';
import { cardKey, type Card, type Rank, type Suit } from '../../domain/cards';
import { SEATS, type Seat, type Team } from '../../domain/seats';

import {
  actingSeat,
  createGame,
  declinePayout,
  getLegalActions,
  nextSeat,
  reduce,
  stakeForLevel,
  viewFor,
} from '../game';
import type { GameState, TrucoCallLevel, TrucoLevel } from '../types';

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

const VIRA_REY_BASTO = card(12, 'basto');

function rigGame(overrides: Partial<GameState> = {}): GameState {
  const base = createGame({ seed: 'truco-rig' });

  return {
    ...base,
    vira: VIRA_REY_BASTO,
    turn: 0,
    lead: 0,
    tricks: [],
    currentTrick: [],
    bazaWins: { nosotros: 0, ellos: 0 },
    lastTrick: null,
    result: null,
    matchWinner: null,
    phase: 'playing',
    scores: { nosotros: 0, ellos: 0 },
    truco: { level: 0, acceptedByTeam: null },
    pending: null,
    log: [],
    nextLogId: 0,
    event: null,
    ...overrides,
  };
}

function rigBazaHand(overrides: Partial<GameState> = {}): GameState {
  const hands: Record<Seat, readonly Card[]> = {
    0: [card(3, 'oro'), card(3, 'copa'), card(4, 'espada')],
    1: [card(2, 'oro'), card(2, 'copa'), card(3, 'espada')],
    2: [card(4, 'oro'), card(4, 'copa'), card(5, 'espada')],
    3: [card(5, 'oro'), card(5, 'copa'), card(6, 'espada')],
  };

  return rigGame({ hands, dealtHands: hands, ...overrides });
}

function playCard(state: GameState, seat: Seat, played: Card): GameState {
  expect(state.turn).toBe(seat);
  const next = reduce(state, { type: 'playCard', seat, cardKey: cardKey(played) });
  expect(next).not.toBe(state);
  return next;
}

function playTwoBazas(state: GameState): GameState {
  const afterFirst = [
    [0, card(3, 'oro')],
    [1, card(2, 'oro')],
    [2, card(4, 'oro')],
    [3, card(5, 'oro')],
  ].reduce((current, [seat, played]) => playCard(current, seat as Seat, played as Card), state);

  return [
    [0, card(3, 'copa')],
    [1, card(2, 'copa')],
    [2, card(4, 'copa')],
    [3, card(5, 'copa')],
  ].reduce(
    (current, [seat, played]) => playCard(current, seat as Seat, played as Card),
    afterFirst,
  );
}

function withAccepted(level: TrucoLevel, acceptedByTeam: Team | null = 'nosotros'): GameState {
  return rigGame({ truco: { level, acceptedByTeam: level === 0 ? null : acceptedByTeam } });
}

describe('the truco call', () => {
  it('opens the ladder with a pending truco and keeps the turn on the caller', () => {
    const state = rigGame();
    const called = reduce(state, { type: 'callTruco', seat: 0 });

    expect(called).not.toBe(state);
    expect(called.pending).toEqual({
      kind: 'truco',
      level: 1,
      callerSeat: 0,
      callerTeam: 'nosotros',
      respondingTeam: 'ellos',
      returnSeat: 0,
    });
    expect(called.truco).toEqual({ level: 0, acceptedByTeam: null });
    expect(called.turn).toBe(0);
    expect(called.lead).toBe(0);
    expect(called.currentTrick).toEqual([]);
    expect(called.log.at(-1)).toMatchObject({
      kind: 'call',
      seat: 0,
      team: 'nosotros',
      call: 'truco',
      level: 1,
    });
    expect(called.event).toEqual({ type: 'trucoCalled', seat: 0, team: 'nosotros', level: 1 });
  });

  it('lets either partner answer for the responding team', () => {
    const called = reduce(rigGame(), { type: 'callTruco', seat: 0 });

    for (const seat of [1, 3] as const) {
      const accepted = reduce(called, { type: 'respondTruco', seat, response: 'accept' });

      expect(accepted).not.toBe(called);
      expect(accepted.truco).toEqual({ level: 1, acceptedByTeam: 'ellos' });
      expect(accepted.pending).toBeNull();
      expect(accepted.turn).toBe(0);
    }
  });

  it('returns the turn to the caller after an accept and logs the answer', () => {
    const called = reduce(rigGame(), { type: 'callTruco', seat: 0 });
    const accepted = reduce(called, { type: 'respondTruco', seat: 1, response: 'accept' });

    expect(accepted.log.at(-1)).toMatchObject({
      kind: 'respond',
      seat: 1,
      team: 'ellos',
      call: 'truco',
      level: 1,
      response: 'accept',
    });
    expect(accepted.event).toEqual({
      type: 'trucoResponded',
      seat: 1,
      team: 'ellos',
      level: 1,
      response: 'accept',
    });
  });

  it('does not auto-play when a call is raised or accepted', () => {
    const called = reduce(rigGame(), { type: 'callTruco', seat: 0 });
    const accepted = reduce(called, { type: 'respondTruco', seat: 1, response: 'accept' });

    expect(called.currentTrick).toEqual([]);
    expect(accepted.currentTrick).toEqual([]);
    expect(accepted.hands[0]).toHaveLength(3);
  });

  it('rejects a call out of turn, a duplicate call and a call above vale juego', () => {
    const state = rigGame();

    expect(reduce(state, { type: 'callTruco', seat: 1 })).toBe(state);

    const called = reduce(state, { type: 'callTruco', seat: 0 });
    expect(reduce(called, { type: 'callTruco', seat: 0 })).toBe(called);

    const accepted = reduce(called, { type: 'respondTruco', seat: 1, response: 'accept' });
    const played = playCard(accepted, 0, accepted.hands[0][0]);
    const retruco = reduce(played, { type: 'callTruco', seat: 1 });
    const acceptedRetruco = reduce(retruco, {
      type: 'respondTruco',
      seat: 0,
      response: 'accept',
    });
    const next = playCard(acceptedRetruco, 1, acceptedRetruco.hands[1][0]);
    const valeNueve = reduce(next, { type: 'callTruco', seat: 2 });
    const acceptedValeNueve = reduce(valeNueve, {
      type: 'respondTruco',
      seat: 1,
      response: 'accept',
    });
    const final = playCard(acceptedValeNueve, 2, acceptedValeNueve.hands[2][0]);
    const valeJuego = reduce(final, { type: 'callTruco', seat: 3 });

    expect(valeJuego.pending).toMatchObject({ level: 4 });
    expect(reduce(valeJuego, { type: 'callTruco', seat: 1 })).toBe(valeJuego);
  });
});

describe('answering the truco', () => {
  const levels: ReadonlyArray<{ accepted: TrucoLevel; pending: TrucoCallLevel; pays: number }> = [
    { accepted: 0, pending: 1, pays: 1 },
    { accepted: 1, pending: 2, pays: 3 },
    { accepted: 2, pending: 3, pays: 6 },
    { accepted: 3, pending: 4, pays: 9 },
  ];

  it.each(levels)(
    'declining a $pending call pays the caller $pays and ends the reparto',
    ({ accepted, pending, pays }) => {
      const state = withAccepted(accepted);
      const called = reduce(state, { type: 'callTruco', seat: 0 });
      const declined = reduce(called, { type: 'respondTruco', seat: 1, response: 'decline' });

      expect(called.pending).toMatchObject({ level: pending });
      expect(declinePayout(pending)).toBe(pays);
      expect(declined.phase).toBe('handOver');
      expect(declined.pending).toBeNull();
      expect(declined.result).toMatchObject({
        winnerTeam: 'nosotros',
        points: pays,
        reason: 'decline',
        trucoLevel: accepted,
      });
      expect(declined.scores).toEqual({ nosotros: pays, ellos: 0 });
      expect(declined.log.at(-2)).toMatchObject({
        kind: 'points',
        settlement: { kind: 'truco', team: 'nosotros', points: pays, detail: 'declined' },
      });
    },
  );

  it('declining a raise pays the level the raiser implicitly accepted', () => {
    const called = reduce(rigGame(), { type: 'callTruco', seat: 0 });
    const raised = reduce(called, { type: 'respondTruco', seat: 1, response: 'raise' });
    const declined = reduce(raised, { type: 'respondTruco', seat: 0, response: 'decline' });

    expect(declined.phase).toBe('handOver');
    expect(declined.result).toMatchObject({
      winnerTeam: 'ellos',
      points: 3,
      reason: 'decline',
      trucoLevel: 1,
    });
    expect(declined.scores).toEqual({ nosotros: 0, ellos: 3 });
  });

  it('declining a second raise pays the previous accepted level', () => {
    const called = reduce(rigGame(), { type: 'callTruco', seat: 0 });
    const raised = reduce(called, { type: 'respondTruco', seat: 1, response: 'raise' });
    const reRaised = reduce(raised, { type: 'respondTruco', seat: 0, response: 'raise' });
    const declined = reduce(reRaised, { type: 'respondTruco', seat: 1, response: 'decline' });

    expect(reRaised.pending).toMatchObject({ level: 3, callerSeat: 0, callerTeam: 'nosotros' });
    expect(declined.result).toMatchObject({
      winnerTeam: 'nosotros',
      points: 6,
      reason: 'decline',
      trucoLevel: 2,
    });
    expect(declined.scores).toEqual({ nosotros: 6, ellos: 0 });
  });

  it('raises the pending call, flips the teams and keeps the previous level accepted', () => {
    const called = reduce(rigGame(), { type: 'callTruco', seat: 0 });
    const raised = reduce(called, { type: 'respondTruco', seat: 1, response: 'raise' });

    expect(raised.pending).toEqual({
      kind: 'truco',
      level: 2,
      callerSeat: 1,
      callerTeam: 'ellos',
      respondingTeam: 'nosotros',
      returnSeat: 0,
    });
    expect(raised.truco).toEqual({ level: 1, acceptedByTeam: 'ellos' });
    expect(raised.turn).toBe(0);
    expect(raised.log.at(-1)).toMatchObject({
      kind: 'respond',
      seat: 1,
      level: 1,
      response: 'raise',
    });

    const accepted = reduce(raised, { type: 'respondTruco', seat: 0, response: 'accept' });

    expect(accepted.pending).toBeNull();
    expect(accepted.truco).toEqual({ level: 2, acceptedByTeam: 'nosotros' });
    expect(accepted.turn).toBe(0);
  });

  it('lets the partner accept a raised call and returns the turn to the original caller', () => {
    const called = reduce(rigGame(), { type: 'callTruco', seat: 0 });
    const raised = reduce(called, { type: 'respondTruco', seat: 1, response: 'raise' });
    const accepted = reduce(raised, { type: 'respondTruco', seat: 2, response: 'accept' });

    expect(accepted.truco).toEqual({ level: 2, acceptedByTeam: 'nosotros' });
    expect(accepted.pending).toBeNull();
    expect(accepted.turn).toBe(0);
  });

  it('does not allow a raise above vale juego', () => {
    const called = reduce(withAccepted(3), { type: 'callTruco', seat: 0 });

    expect(called.pending).toMatchObject({ level: 4 });
    expect(reduce(called, { type: 'respondTruco', seat: 1, response: 'raise' })).toBe(called);
  });

  it('rejects a response from the caller team and from a seat out of the response', () => {
    const called = reduce(rigGame(), { type: 'callTruco', seat: 0 });

    expect(reduce(called, { type: 'respondTruco', seat: 0, response: 'accept' })).toBe(called);
    expect(reduce(called, { type: 'respondTruco', seat: 2, response: 'accept' })).toBe(called);
    expect(reduce(called, { type: 'respondTruco', seat: 1, response: 'accept' })).not.toBe(called);
  });

  it('only lets the team that accepted the previous level raise it later', () => {
    const called = reduce(rigGame(), { type: 'callTruco', seat: 0 });
    const accepted = reduce(called, { type: 'respondTruco', seat: 1, response: 'accept' });

    expect(accepted.turn).toBe(0);
    expect(reduce(accepted, { type: 'callTruco', seat: 0 })).toBe(accepted);

    const played = playCard(accepted, 0, accepted.hands[0][0]);

    expect(played.turn).toBe(1);
    const retruco = reduce(played, { type: 'callTruco', seat: 1 });

    expect(retruco.pending).toMatchObject({
      level: 2,
      callerSeat: 1,
      callerTeam: 'ellos',
      respondingTeam: 'nosotros',
      returnSeat: 1,
    });
  });

  it('rejects a play while a call is pending', () => {
    const called = reduce(rigGame(), { type: 'callTruco', seat: 0 });

    expect(
      reduce(called, { type: 'playCard', seat: 0, cardKey: cardKey(called.hands[0][0]) }),
    ).toBe(called);
    expect(
      reduce(called, { type: 'playCard', seat: 1, cardKey: cardKey(called.hands[1][0]) }),
    ).toBe(called);
  });
});

describe('irse al mazo', () => {
  const levels: ReadonlyArray<{ level: TrucoLevel; pays: number }> = [
    { level: 0, pays: 1 },
    { level: 1, pays: 3 },
    { level: 2, pays: 6 },
    { level: 3, pays: 9 },
  ];

  it.each(levels)('folding at level $level pays the rivals $pays', ({ level, pays }) => {
    const state = withAccepted(level, level === 0 ? null : 'nosotros');
    const folded = reduce(state, { type: 'fold', seat: 0 });

    expect(folded.phase).toBe('handOver');
    expect(folded.result).toMatchObject({
      winnerTeam: 'ellos',
      points: pays,
      reason: 'fold',
      trucoLevel: level,
    });
    expect(folded.scores).toEqual({ nosotros: 0, ellos: pays });
    expect(folded.log.some((entry) => entry.kind === 'fold')).toBe(true);
  });

  it('a fold at vale juego loses the partida', () => {
    const state = rigGame({
      truco: { level: 4, acceptedByTeam: 'nosotros' },
      scores: { nosotros: 11, ellos: 9 },
    });
    const folded = reduce(state, { type: 'fold', seat: 0 });

    expect(folded.phase).toBe('matchOver');
    expect(folded.matchWinner).toBe('ellos');
    expect(folded.scores).toEqual({ nosotros: 11, ellos: 24 });
    expect(folded.result).toMatchObject({
      winnerTeam: 'ellos',
      points: 'match',
      reason: 'fold',
      trucoLevel: 4,
    });
  });

  it('rejects a fold out of turn or while a call is pending', () => {
    const state = rigGame();

    expect(reduce(state, { type: 'fold', seat: 1 })).toBe(state);

    const called = reduce(state, { type: 'callTruco', seat: 0 });

    expect(reduce(called, { type: 'fold', seat: 0 })).toBe(called);
    expect(reduce(called, { type: 'fold', seat: 1 })).toBe(called);
  });
});

describe('the reparto payout', () => {
  const levels: ReadonlyArray<{ level: TrucoLevel; points: number }> = [
    { level: 0, points: 1 },
    { level: 1, points: 3 },
    { level: 2, points: 6 },
    { level: 3, points: 9 },
  ];

  it.each(levels)(
    'pays the accepted $level stake ($points) to the baza winner',
    ({ level, points }) => {
      const state = rigBazaHand({
        truco: { level, acceptedByTeam: level === 0 ? null : 'nosotros' },
      });
      const finished = playTwoBazas(state);

      expect(finished.phase).toBe('handOver');
      expect(finished.result).toMatchObject({
        winnerTeam: 'nosotros',
        points,
        reason: 'bazas',
        trucoLevel: level,
      });
      expect(finished.scores).toEqual({ nosotros: points, ellos: 0 });
      expect(finished.result?.bazas).toHaveLength(2);
    },
  );

  it('an accepted vale juego makes the reparto decide the partida', () => {
    const state = rigBazaHand({
      truco: { level: 4, acceptedByTeam: 'nosotros' },
      scores: { nosotros: 12, ellos: 17 },
    });
    const finished = playTwoBazas(state);

    expect(finished.phase).toBe('matchOver');
    expect(finished.matchWinner).toBe('nosotros');
    expect(finished.scores).toEqual({ nosotros: 24, ellos: 17 });
    expect(finished.result).toMatchObject({
      winnerTeam: 'nosotros',
      points: 'match',
      reason: 'bazas',
      trucoLevel: 4,
    });
  });

  it('clamps a declining team at 24 and ends the partida immediately', () => {
    const state = rigGame({
      scores: { nosotros: 23, ellos: 10 },
      truco: { level: 0, acceptedByTeam: null },
    });
    const called = reduce(state, { type: 'callTruco', seat: 0 });
    const declined = reduce(called, { type: 'respondTruco', seat: 1, response: 'decline' });

    expect(declined.phase).toBe('matchOver');
    expect(declined.matchWinner).toBe('nosotros');
    expect(declined.scores).toEqual({ nosotros: 24, ellos: 10 });
    expect(declined.result).toMatchObject({ points: 1, reason: 'decline' });
  });

  it('clamps a folding team at 24 and ends the partida immediately', () => {
    const state = rigGame({ scores: { nosotros: 11, ellos: 23 } });
    const folded = reduce(state, { type: 'fold', seat: 0 });

    expect(folded.phase).toBe('matchOver');
    expect(folded.matchWinner).toBe('ellos');
    expect(folded.scores).toEqual({ nosotros: 11, ellos: 24 });
    expect(folded.result).toMatchObject({ points: 1, reason: 'fold' });
  });
});

describe('the legal actions', () => {
  it('offers the next call only to the turn seat and the accepted team', () => {
    const state = rigGame();
    const ours = getLegalActions(state, 0);
    const theirs = getLegalActions(state, 1);

    expect(ours.canCallTruco).toBe(true);
    expect(ours.trucoLevel).toBe(1);
    expect(ours.canFold).toBe(true);
    expect(theirs.canCallTruco).toBe(false);
    expect(theirs.trucoLevel).toBeNull();
    expect(theirs.canRespondTruco).toBe(false);
  });

  it('offers the response to both seats of the responding team and blocks play', () => {
    const called = reduce(rigGame(), { type: 'callTruco', seat: 0 });
    const caller = getLegalActions(called, 0);
    const partner = getLegalActions(called, 2);
    const rival = getLegalActions(called, 1);
    const rivalPartner = getLegalActions(called, 3);

    expect(caller.canCallTruco).toBe(false);
    expect(caller.canRespondTruco).toBe(false);
    expect(caller.playableCardKeys).toEqual([]);
    expect(caller.canFold).toBe(false);
    expect(partner.canRespondTruco).toBe(false);
    expect(rival.canRespondTruco).toBe(true);
    expect(rival.canRaiseTruco).toBe(true);
    expect(rival.trucoRaiseLevel).toBe(2);
    expect(rivalPartner.canRespondTruco).toBe(true);
    expect(rival.playableCardKeys).toEqual([]);
    expect(rival.canFold).toBe(false);
  });

  it('offers the next raise only after the previous level was accepted', () => {
    const called = reduce(rigGame(), { type: 'callTruco', seat: 0 });
    const accepted = reduce(called, { type: 'respondTruco', seat: 1, response: 'accept' });

    expect(getLegalActions(accepted, 0).canCallTruco).toBe(false);
    expect(getLegalActions(accepted, 1).canCallTruco).toBe(false);

    const played = playCard(accepted, 0, accepted.hands[0][0]);

    expect(getLegalActions(played, 1).canCallTruco).toBe(true);
    expect(getLegalActions(played, 1).trucoLevel).toBe(2);
    expect(getLegalActions(played, 3).canCallTruco).toBe(false);
  });

  it('does not offer a raise when vale juego is the pending call', () => {
    const called = reduce(withAccepted(3), { type: 'callTruco', seat: 0 });

    expect(getLegalActions(called, 1).canRespondTruco).toBe(true);
    expect(getLegalActions(called, 1).canRaiseTruco).toBe(false);
    expect(getLegalActions(called, 1).trucoRaiseLevel).toBeNull();
  });

  it('exposes the accepted stake in the view and the pending call for the dialog', () => {
    const called = reduce(withAccepted(2), { type: 'callTruco', seat: 0 });
    const view = viewFor(called, 1);

    expect(view.stake).toBe(6);
    expect(view.pending).toEqual(called.pending);
    expect(stakeForLevel(4)).toBe('match');
  });
});

describe('a partida to 24', () => {
  function playPartida(seed: string) {
    let state = createGame({ seed });
    let steps = 0;
    let repartos = 0;

    while (state.phase !== 'matchOver' && steps < 2000) {
      steps += 1;

      if (state.phase === 'handOver') {
        const next = reduce(state, { type: 'nextHand' });
        expect(next).not.toBe(state);
        state = next;
        repartos += 1;
        continue;
      }

      const seat = actingSeat(state);
      const view = viewFor(state, seat);
      const action = chooseBotAction(view, botPersonaForSeat(seat), state.seed);
      const next = reduce(state, action);

      expect(next).not.toBe(state);

      if (action.type === 'playCard') {
        expect(view.legal.playableCardKeys).toContain(action.cardKey);
      } else if (action.type === 'callTruco') {
        expect(view.legal.canCallTruco).toBe(true);
      } else if (action.type === 'callEnvido') {
        expect(view.legal.canCallEnvido).toBe(true);
      } else if (action.type === 'callFlor') {
        expect(view.legal.canCallFlor).toBe(true);
      } else if (action.type === 'callPrive') {
        expect(view.legal.canCallPrive).toBe(true);
      } else if (action.type === 'respondEnvido') {
        expect(view.legal.canRespondEnvido).toBe(true);
      } else if (action.type === 'respondTruco') {
        expect(view.legal.canRespondTruco).toBe(true);
      } else {
        expect(action.type).toBe('fold');
        expect(view.legal.canFold).toBe(true);
      }

      state = next;
    }

    return { state, steps, repartos };
  }

  it.each(['partida-a-24', 'partida-b-24'])(
    'plays every seat with the personas, legally, to a 24 winner (%s)',
    (seed) => {
      const { state, steps, repartos } = playPartida(seed);

      expect(state.phase).toBe('matchOver');
      expect(state.matchWinner).not.toBeNull();

      const winner = state.matchWinner ?? 'nosotros';
      const loser: Team = winner === 'nosotros' ? 'ellos' : 'nosotros';

      expect(state.scores[winner]).toBe(24);
      expect(state.scores[loser]).toBeLessThan(24);
      expect(state.result).not.toBeNull();
      expect(state.result?.winnerTeam).toBe(winner);
      expect(steps).toBeLessThan(2000);
      expect(repartos).toBeLessThan(200);

      const playedSeats = new Set(
        state.log.filter((entry) => entry.kind === 'play').map((entry) => entry.seat),
      );
      expect(playedSeats.size).toBe(SEATS.length);
    },
  );
});

describe('the next reparto and the rematch', () => {
  it('rotates the pie and clears the truco state after a decline', () => {
    const state = rigGame();
    const called = reduce(state, { type: 'callTruco', seat: 0 });
    const declined = reduce(called, { type: 'respondTruco', seat: 1, response: 'decline' });
    const next = reduce(declined, { type: 'nextHand' });

    expect(next.phase).toBe('playing');
    expect(next.handNumber).toBe(declined.handNumber + 1);
    expect(next.dealer).toBe(nextSeat(declined.dealer));
    expect(next.truco).toEqual({ level: 0, acceptedByTeam: null });
    expect(next.pending).toBeNull();
    expect(next.scores).toEqual(declined.scores);
  });

  it('resets the scores, hand and deck on a rematch', () => {
    const state = rigBazaHand({
      truco: { level: 4, acceptedByTeam: 'nosotros' },
      scores: { nosotros: 20, ellos: 3 },
    });
    const matchOver = playTwoBazas(state);

    expect(matchOver.phase).toBe('matchOver');

    const rematch = reduce(matchOver, { type: 'rematch', seed: 'revancha-24' });

    expect(rematch.phase).toBe('playing');
    expect(rematch.scores).toEqual({ nosotros: 0, ellos: 0 });
    expect(rematch.handNumber).toBe(1);
    expect(rematch.truco).toEqual({ level: 0, acceptedByTeam: null });
    expect(rematch.pending).toBeNull();
    expect(rematch.dealtHands).not.toEqual(matchOver.dealtHands);
  });
});
