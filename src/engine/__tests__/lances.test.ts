import { chooseBotAction } from '../../ai/policy';
import { botPersonaForSeat } from '../../ai/personas';
import { cardKey, type Card, type Rank, type Suit } from '../../domain/cards';
import { SEATS, type Seat, type Team } from '../../domain/seats';

import { florValue, scoreFlor } from '../cards';
import {
  actingSeat,
  createGame,
  envidoDeclinePayout,
  envidoStake,
  getLegalActions,
  reduce,
  tantoWinner,
  teamTantos,
  viewFor,
} from '../game';
import type { GameState, Settlement, TrucoLevel } from '../types';

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

const VIRA = card(12, 'basto');

const ENVIDO_HANDS: Record<Seat, readonly Card[]> = {
  0: [card(7, 'oro'), card(6, 'oro'), card(4, 'copa')],
  1: [card(3, 'copa'), card(2, 'copa'), card(5, 'espada')],
  2: [card(5, 'oro'), card(4, 'oro'), card(6, 'espada')],
  3: [card(7, 'espada'), card(3, 'oro'), card(2, 'oro')],
};

const TIE_HANDS: Record<Seat, readonly Card[]> = {
  0: [card(7, 'oro'), card(6, 'oro'), card(3, 'basto')],
  1: [card(7, 'copa'), card(6, 'copa'), card(2, 'espada')],
  2: [card(5, 'espada'), card(6, 'espada'), card(4, 'basto')],
  3: [card(5, 'copa'), card(4, 'copa'), card(2, 'basto')],
};

const FLOR_HANDS: Record<Seat, readonly Card[]> = {
  0: [card(7, 'copa'), card(6, 'copa'), card(5, 'copa')],
  1: [card(3, 'oro'), card(4, 'oro'), card(5, 'espada')],
  2: [card(2, 'basto'), card(3, 'basto'), card(4, 'basto')],
  3: [card(12, 'oro'), card(11, 'oro'), card(10, 'oro')],
};

const FLOR_TIE_HANDS: Record<Seat, readonly Card[]> = {
  0: [card(7, 'copa'), card(6, 'copa'), card(5, 'copa')],
  1: [card(7, 'oro'), card(6, 'oro'), card(5, 'oro')],
  2: [card(2, 'basto'), card(3, 'basto'), card(4, 'basto')],
  3: [card(12, 'espada'), card(11, 'espada'), card(10, 'espada')],
};

const PRIVE_LOSE_HANDS: Record<Seat, readonly Card[]> = {
  0: [card(2, 'oro'), card(3, 'oro'), card(5, 'basto')],
  1: [card(7, 'copa'), card(6, 'copa'), card(2, 'espada')],
  2: [card(5, 'espada'), card(6, 'espada'), card(4, 'basto')],
  3: [card(5, 'copa'), card(4, 'copa'), card(3, 'espada')],
};

function rigGame(overrides: Partial<GameState> = {}): GameState {
  const base = createGame({ seed: 'lances-rig' });

  return {
    ...base,
    vira: VIRA,
    turn: 0,
    lead: 0,
    phase: 'playing',
    tricks: [],
    currentTrick: [],
    bazaWins: { nosotros: 0, ellos: 0 },
    lastTrick: null,
    result: null,
    matchWinner: null,
    scores: { nosotros: 0, ellos: 0 },
    truco: { level: 0, acceptedByTeam: null },
    envido: {
      status: 'none',
      level: null,
      stake: null,
      callerTeam: null,
      acceptedByTeam: null,
      tantos: null,
    },
    flor: { declarations: [], settled: false, winnerTeam: null, winnerSeat: null, points: 0 },
    prive: { called: false, callerTeam: null, winnerTeam: null, points: 0, tantos: null },
    settlements: [],
    pending: null,
    log: [],
    nextLogId: 0,
    event: null,
    ...overrides,
  };
}

function rigHands(
  hands: Record<Seat, readonly Card[]>,
  overrides: Partial<GameState> = {},
): GameState {
  return rigGame({ hands, dealtHands: hands, ...overrides });
}

function playFirstBaza(state: GameState): GameState {
  let current = state;
  const baza = state.tricks.length;
  let guard = 0;

  while (current.phase === 'playing' && current.tricks.length === baza && guard < 4) {
    guard += 1;
    expect(current.pending).toBeNull();
    const seat = current.turn;
    const played = current.hands[seat][0];

    if (!played) {
      throw new Error(`Seat ${seat} has no card to play.`);
    }

    const next = reduce(current, { type: 'playCard', seat, cardKey: cardKey(played) });
    expect(next).not.toBe(current);
    current = next;
  }

  return current;
}

function playOut(state: GameState): GameState {
  let current = state;
  let guard = 0;

  while (current.phase === 'playing' && guard < 40) {
    guard += 1;
    expect(current.pending).toBeNull();
    const seat = actingSeat(current);
    const played = current.hands[seat][0];

    if (!played) {
      throw new Error(`Seat ${seat} has no card to play.`);
    }

    const next = reduce(current, { type: 'playCard', seat, cardKey: cardKey(played) });
    expect(next).not.toBe(current);
    current = next;
  }

  return current;
}

function envidoRow(state: GameState): Settlement | undefined {
  return state.settlements.find((settlement) => settlement.kind === 'envido');
}

function row(state: GameState, kind: Settlement['kind']): Settlement | undefined {
  return state.settlements.find((settlement) => settlement.kind === kind);
}

function acceptEnvido(state: GameState, seats: readonly Seat[]): GameState {
  let current = reduce(state, { type: 'callEnvido', seat: state.turn });

  for (const seat of seats) {
    current = reduce(current, { type: 'respondEnvido', seat, response: 'raise' });
    expect(current.pending).not.toBeNull();
  }

  return current;
}

describe('scoreFlor', () => {
  const cases: ReadonlyArray<{
    readonly name: string;
    readonly vira: Card;
    readonly hand: readonly Card[];
    readonly expected: { kind: 'flor' | 'reservada'; value: number } | null;
  }> = [
    {
      name: 'perico + perica is the reservada',
      vira: VIRA,
      hand: [card(11, 'basto'), card(10, 'basto'), card(3, 'oro')],
      expected: { kind: 'reservada', value: 5 },
    },
    {
      name: 'perico + two of another palo',
      vira: VIRA,
      hand: [card(11, 'basto'), card(7, 'oro'), card(6, 'oro')],
      expected: { kind: 'flor', value: 43 },
    },
    {
      name: 'perico + two of its own palo',
      vira: VIRA,
      hand: [card(11, 'basto'), card(7, 'basto'), card(6, 'basto')],
      expected: { kind: 'flor', value: 43 },
    },
    {
      name: 'perica + two of another palo',
      vira: VIRA,
      hand: [card(10, 'basto'), card(7, 'oro'), card(6, 'oro')],
      expected: { kind: 'flor', value: 42 },
    },
    {
      name: 'three of a palo with no piece',
      vira: VIRA,
      hand: [card(7, 'oro'), card(6, 'oro'), card(4, 'oro')],
      expected: { kind: 'flor', value: 37 },
    },
    {
      name: 'figures are worth zero',
      vira: VIRA,
      hand: [card(12, 'oro'), card(11, 'oro'), card(10, 'oro')],
      expected: { kind: 'flor', value: 20 },
    },
    {
      name: 'a piece with no pair is not a flor',
      vira: VIRA,
      hand: [card(11, 'basto'), card(7, 'oro'), card(6, 'copa')],
      expected: null,
    },
    {
      name: 'three different palos with no piece',
      vira: card(5, 'espada'),
      hand: [card(7, 'oro'), card(6, 'copa'), card(4, 'basto')],
      expected: null,
    },
    {
      name: 'a vira caballo promotes the rey to perico',
      vira: card(11, 'espada'),
      hand: [card(12, 'espada'), card(7, 'oro'), card(6, 'oro')],
      expected: { kind: 'flor', value: 43 },
    },
    {
      name: 'a vira caballo keeps the sota as perica',
      vira: card(11, 'espada'),
      hand: [card(10, 'espada'), card(7, 'oro'), card(6, 'oro')],
      expected: { kind: 'flor', value: 42 },
    },
    {
      name: 'a vira sota promotes the rey to perica',
      vira: card(10, 'espada'),
      hand: [card(12, 'espada'), card(7, 'oro'), card(6, 'oro')],
      expected: { kind: 'flor', value: 42 },
    },
    {
      name: 'a vira sota keeps the caballo as perico',
      vira: card(10, 'espada'),
      hand: [card(11, 'espada'), card(7, 'oro'), card(6, 'oro')],
      expected: { kind: 'flor', value: 43 },
    },
    {
      name: 'a promoted rey and the remaining piece make a reservada',
      vira: card(11, 'espada'),
      hand: [card(12, 'espada'), card(10, 'espada'), card(3, 'oro')],
      expected: { kind: 'reservada', value: 5 },
    },
  ];

  it.each(cases)('$name', ({ vira, hand, expected }) => {
    expect(scoreFlor(hand, vira)).toEqual(expected);
  });

  it('compares a reservada above every numeric flor, including the maximum 43', () => {
    expect(florValue({ kind: 'reservada', value: 5 })).toBeGreaterThan(
      florValue({ kind: 'flor', value: 43 }),
    );
    expect(florValue({ kind: 'flor', value: 43 })).toBeGreaterThan(
      florValue({ kind: 'flor', value: 42 }),
    );
  });
});

describe('the envido ladder', () => {
  const accepts: ReadonlyArray<{
    readonly level: 1 | 2 | 3 | 4;
    readonly raises: readonly Seat[];
    readonly responder: Seat;
    readonly callerTeam: Team;
    readonly acceptedByTeam: Team;
    readonly stake: number;
  }> = [
    {
      level: 1,
      raises: [],
      responder: 1,
      callerTeam: 'nosotros',
      acceptedByTeam: 'ellos',
      stake: 2,
    },
    {
      level: 2,
      raises: [1],
      responder: 0,
      callerTeam: 'ellos',
      acceptedByTeam: 'nosotros',
      stake: 4,
    },
    {
      level: 3,
      raises: [1, 0],
      responder: 1,
      callerTeam: 'nosotros',
      acceptedByTeam: 'ellos',
      stake: 7,
    },
    {
      level: 4,
      raises: [1, 0, 1],
      responder: 0,
      callerTeam: 'ellos',
      acceptedByTeam: 'nosotros',
      stake: 6,
    },
  ];

  it.each(accepts)(
    'accepts level $level at $stake piedras and compares the tantos at hand end',
    ({ level, raises, responder, callerTeam, acceptedByTeam, stake }) => {
      const state = rigHands(ENVIDO_HANDS, { scores: { nosotros: 5, ellos: 18 } });
      const opened = acceptEnvido(state, raises);

      expect(opened.pending).toMatchObject({ kind: 'envido', level });

      const accepted = reduce(opened, {
        type: 'respondEnvido',
        seat: responder,
        response: 'accept',
      });

      expect(accepted.envido).toMatchObject({
        status: 'accepted',
        level,
        stake,
        callerTeam,
        acceptedByTeam,
      });
      expect(accepted.pending).toBeNull();
      expect(accepted.turn).toBe(0);

      const finished = playOut(accepted);
      const row = envidoRow(finished);

      expect(row).toMatchObject({
        kind: 'envido',
        team: 'nosotros',
        points: stake,
        detail: 'accepted',
        level,
        tantos: { nosotros: 33, ellos: 25 },
      });
      expect(finished.result?.envidoResult).toEqual({
        winnerTeam: 'nosotros',
        points: stake,
        detail: 'accepted',
        level,
        tantos: { nosotros: 33, ellos: 25 },
      });
      expect(finished.scores.nosotros).toBeGreaterThanOrEqual(stake);
    },
  );

  const declines: ReadonlyArray<{
    readonly level: 1 | 2 | 3 | 4;
    readonly raises: readonly Seat[];
    readonly responder: Seat;
    readonly callerTeam: Team;
    readonly pays: number;
  }> = [
    { level: 1, raises: [], responder: 1, callerTeam: 'nosotros', pays: 1 },
    { level: 2, raises: [1], responder: 0, callerTeam: 'ellos', pays: 2 },
    { level: 3, raises: [1, 0], responder: 1, callerTeam: 'nosotros', pays: 4 },
    { level: 4, raises: [1, 0, 1], responder: 0, callerTeam: 'ellos', pays: 7 },
  ];

  it.each(declines)(
    'declining level $level pays the caller $pays at hand end, not immediately',
    ({ level, raises, responder, callerTeam, pays }) => {
      const state = rigHands(ENVIDO_HANDS);
      const opened = acceptEnvido(state, raises);
      const declined = reduce(opened, {
        type: 'respondEnvido',
        seat: responder,
        response: 'decline',
      });

      expect(envidoDeclinePayout(level)).toBe(pays);
      expect(declined.envido).toMatchObject({
        status: 'declined',
        level,
        stake: pays,
        callerTeam,
      });
      expect(declined.pending).toBeNull();
      expect(declined.turn).toBe(0);
      expect(declined.settlements).toEqual([]);
      expect(declined.scores).toEqual({ nosotros: 0, ellos: 0 });

      const finished = playOut(declined);
      const row = envidoRow(finished);

      expect(row).toMatchObject({
        kind: 'envido',
        team: callerTeam,
        points: pays,
        detail: 'declined',
        level,
        tantos: { nosotros: 33, ellos: 25 },
      });
      expect(finished.result?.envidoResult).toMatchObject({
        winnerTeam: callerTeam,
        points: pays,
        detail: 'declined',
        tantos: { nosotros: 33, ellos: 25 },
      });
    },
  );

  it('opens with a pending level 1 and preserves the caller turn', () => {
    const state = rigHands(ENVIDO_HANDS);
    const opened = reduce(state, { type: 'callEnvido', seat: 0 });

    expect(opened).not.toBe(state);
    expect(opened.pending).toEqual({
      kind: 'envido',
      level: 1,
      callerSeat: 0,
      callerTeam: 'nosotros',
      respondingTeam: 'ellos',
      returnSeat: 0,
    });
    expect(opened.envido).toMatchObject({ status: 'pending', level: 1, stake: null });
    expect(opened.turn).toBe(0);
    expect(opened.log.at(-1)).toMatchObject({
      kind: 'call',
      call: 'envido',
      level: 1,
      seat: 0,
      team: 'nosotros',
    });
    expect(opened.event).toEqual({ type: 'envidoCalled', seat: 0, team: 'nosotros', level: 1 });
  });

  it('flips the responding team on a raise and preserves the return seat', () => {
    const opened = reduce(rigHands(ENVIDO_HANDS), { type: 'callEnvido', seat: 0 });
    const raised = reduce(opened, { type: 'respondEnvido', seat: 1, response: 'raise' });

    expect(raised.pending).toEqual({
      kind: 'envido',
      level: 2,
      callerSeat: 1,
      callerTeam: 'ellos',
      respondingTeam: 'nosotros',
      returnSeat: 0,
    });
    expect(raised.turn).toBe(0);
    expect(raised.envido).toMatchObject({ status: 'pending', level: 2, callerTeam: 'ellos' });
    expect(raised.log.at(-1)).toMatchObject({
      kind: 'respond',
      call: 'envido',
      level: 1,
      response: 'raise',
      seat: 1,
    });

    const reRaised = reduce(raised, { type: 'respondEnvido', seat: 0, response: 'raise' });

    expect(reRaised.pending).toMatchObject({
      level: 3,
      callerSeat: 0,
      respondingTeam: 'ellos',
      returnSeat: 0,
    });
    expect(reRaised.envido).toMatchObject({ status: 'pending', level: 3, callerTeam: 'nosotros' });
  });

  it('does not allow a raise above la falta', () => {
    const opened = acceptEnvido(rigHands(ENVIDO_HANDS), [1, 0, 1]);

    expect(opened.pending).toMatchObject({ level: 4 });
    expect(reduce(opened, { type: 'respondEnvido', seat: 0, response: 'raise' })).toBe(opened);
  });

  it('only lets the responding team answer, and blocks play while pending', () => {
    const opened = reduce(rigHands(ENVIDO_HANDS), { type: 'callEnvido', seat: 0 });

    expect(reduce(opened, { type: 'respondEnvido', seat: 0, response: 'accept' })).toBe(opened);
    expect(reduce(opened, { type: 'respondEnvido', seat: 2, response: 'accept' })).toBe(opened);
    expect(
      reduce(opened, { type: 'playCard', seat: 0, cardKey: cardKey(ENVIDO_HANDS[0][0] as Card) }),
    ).toBe(opened);
    expect(reduce(opened, { type: 'respondEnvido', seat: 3, response: 'accept' })).not.toBe(opened);
  });

  it('can only be opened before the first card, with no flor and no prive', () => {
    const state = rigHands(ENVIDO_HANDS);

    expect(getLegalActions(state, 0).canCallEnvido).toBe(true);
    expect(getLegalActions(state, 1).canCallEnvido).toBe(false);

    const played = reduce(state, {
      type: 'playCard',
      seat: 0,
      cardKey: cardKey(ENVIDO_HANDS[0][0]),
    });

    expect(getLegalActions(played, 0).canCallEnvido).toBe(false);
    expect(reduce(played, { type: 'callEnvido', seat: 0 })).toBe(played);

    const withFlor = rigHands(ENVIDO_HANDS, {
      flor: {
        declarations: [{ seat: 0, team: 'nosotros', kind: 'flor', value: 33 }],
        settled: false,
        winnerTeam: null,
        winnerSeat: null,
        points: 0,
      },
    });

    expect(getLegalActions(withFlor, 0).canCallEnvido).toBe(false);

    const withPrive = rigHands(ENVIDO_HANDS, {
      prive: {
        called: true,
        callerTeam: 'nosotros',
        winnerTeam: 'nosotros',
        points: 1,
        tantos: { nosotros: 33, ellos: 25 },
      },
    });

    expect(getLegalActions(withPrive, 0).canCallEnvido).toBe(false);
  });

  it('rejects a duplicate call and a call after an accepted envido', () => {
    const state = rigHands(ENVIDO_HANDS);
    const opened = reduce(state, { type: 'callEnvido', seat: 0 });

    expect(reduce(opened, { type: 'callEnvido', seat: 0 })).toBe(opened);

    const accepted = reduce(opened, { type: 'respondEnvido', seat: 1, response: 'accept' });

    expect(reduce(accepted, { type: 'callEnvido', seat: 0 })).toBe(accepted);
  });

  it('computes la falta at acceptance and keeps it even if the score moves later', () => {
    const state = rigHands(ENVIDO_HANDS, { scores: { nosotros: 5, ellos: 18 } });
    const opened = acceptEnvido(state, [1, 0, 1]);

    expect(envidoStake(4, state.scores, state.target)).toBe(6);

    const accepted = reduce(opened, { type: 'respondEnvido', seat: 0, response: 'accept' });

    expect(accepted.envido.stake).toBe(6);

    const moved: GameState = { ...accepted, scores: { nosotros: 10, ellos: 12 } };
    const finished = playOut(moved);

    expect(envidoRow(finished)?.points).toBe(6);
  });

  it('counts the best tanto of the partnership, not just the caller', () => {
    const hands: Record<Seat, readonly Card[]> = {
      0: [card(3, 'oro'), card(2, 'oro'), card(4, 'copa')],
      1: [card(3, 'copa'), card(2, 'copa'), card(5, 'espada')],
      2: [card(7, 'basto'), card(6, 'basto'), card(5, 'oro')],
      3: [card(7, 'espada'), card(4, 'oro'), card(3, 'basto')],
    };
    const state = rigHands(hands);

    expect(teamTantos(hands, VIRA)).toEqual({ nosotros: 33, ellos: 25 });

    const opened = reduce(state, { type: 'callEnvido', seat: 0 });
    const accepted = reduce(opened, { type: 'respondEnvido', seat: 1, response: 'accept' });
    const finished = playOut(accepted);

    expect(envidoRow(finished)).toMatchObject({
      team: 'nosotros',
      tantos: { nosotros: 33, ellos: 25 },
    });
  });

  it('gives a tanto tie to the mano team', () => {
    const state = rigHands(TIE_HANDS);
    const tantos = teamTantos(TIE_HANDS, VIRA);

    expect(tantos).toEqual({ nosotros: 33, ellos: 33 });
    expect(tantoWinner(tantos, 0)).toBe('nosotros');
    expect(tantoWinner(tantos, 1)).toBe('ellos');

    const opened = reduce(state, { type: 'callEnvido', seat: 0 });
    const accepted = reduce(opened, { type: 'respondEnvido', seat: 1, response: 'accept' });
    const finished = playOut(accepted);

    expect(envidoRow(finished)).toMatchObject({
      team: 'nosotros',
      tantos: { nosotros: 33, ellos: 33 },
    });
  });

  it('a flor declaration cancels an accepted envido before settlement', () => {
    const state = rigHands(FLOR_HANDS);
    const opened = reduce(state, { type: 'callEnvido', seat: 0 });
    const accepted = reduce(opened, { type: 'respondEnvido', seat: 1, response: 'accept' });
    const withFlor = reduce(accepted, { type: 'callFlor', seat: 0 });

    expect(withFlor.envido.status).toBe('cancelled');
    expect(withFlor.settlements).toEqual([]);
    expect(withFlor.flor.declarations).toHaveLength(1);

    const finished = playOut(withFlor);

    expect(envidoRow(finished)).toBeUndefined();
    expect(finished.result?.envidoResult).toBeNull();
    expect(row(finished, 'flor')).toMatchObject({ team: 'nosotros', points: 3 });
  });

  it('a flor declaration cancels a declined envido and its pending payout', () => {
    const state = rigHands(FLOR_HANDS);
    const opened = reduce(state, { type: 'callEnvido', seat: 0 });
    const declined = reduce(opened, { type: 'respondEnvido', seat: 1, response: 'decline' });

    expect(declined.envido.status).toBe('declined');

    const withFlor = reduce(declined, { type: 'callFlor', seat: 0 });
    const finished = playOut(withFlor);

    expect(envidoRow(finished)).toBeUndefined();
    expect(finished.scores.nosotros).toBe(3);
  });

  it('a settlement that reaches 24 ends the partida by envido and skips the truco payout', () => {
    const state = rigHands(ENVIDO_HANDS, { scores: { nosotros: 22, ellos: 10 } });
    const opened = reduce(state, { type: 'callEnvido', seat: 0 });
    const accepted = reduce(opened, { type: 'respondEnvido', seat: 1, response: 'accept' });
    const finished = playOut(accepted);

    expect(finished.phase).toBe('matchOver');
    expect(finished.matchWinner).toBe('nosotros');
    expect(finished.result).toMatchObject({
      winnerTeam: 'nosotros',
      reason: 'envido',
      points: 0,
      totalPoints: 2,
    });
    expect(finished.result?.settlements).toHaveLength(1);
    expect(finished.result?.settlements[0]).toMatchObject({
      kind: 'envido',
      team: 'nosotros',
      points: 2,
    });
    expect(row(finished, 'truco')).toBeUndefined();
    expect(finished.scores).toEqual({ nosotros: 24, ellos: 10 });
  });
});

describe('the flor', () => {
  it('is exposed to its own seat and declared without consuming the turn', () => {
    const state = rigHands(FLOR_HANDS);
    const view = viewFor(state, 0);

    expect(view.ownFlor).toEqual({ kind: 'flor', value: 38 });
    expect(getLegalActions(state, 0).canCallFlor).toBe(true);

    const declared = reduce(state, { type: 'callFlor', seat: 0 });

    expect(declared).not.toBe(state);
    expect(declared.flor.declarations).toEqual([
      { seat: 0, team: 'nosotros', kind: 'flor', value: 38 },
    ]);
    expect(declared.turn).toBe(0);
    expect(declared.settlements).toEqual([]);
    expect(declared.log.at(-1)).toMatchObject({ kind: 'call', call: 'flor', flor: 'flor' });
    expect(getLegalActions(declared, 0).canCallFlor).toBe(false);
    expect(getLegalActions(declared, 0).canCallEnvido).toBe(false);
  });

  it('is forfeited once the holder has played a card', () => {
    const state = rigHands(FLOR_HANDS);
    const played = reduce(state, { type: 'playCard', seat: 0, cardKey: cardKey(FLOR_HANDS[0][0]) });

    expect(getLegalActions(played, 0).canCallFlor).toBe(false);
    expect(reduce(played, { type: 'callFlor', seat: 0 })).toBe(played);
  });

  it('settles when the first baza closes, before the next trick', () => {
    const state = rigHands(FLOR_HANDS);
    const declared = reduce(state, { type: 'callFlor', seat: 0 });
    const afterFirst = playFirstBaza(declared);

    expect(afterFirst.phase).toBe('playing');
    expect(afterFirst.flor.settled).toBe(true);
    expect(afterFirst.settlements).toEqual([
      {
        kind: 'flor',
        team: 'nosotros',
        points: 3,
        tantos: { nosotros: 38, ellos: 0 },
      },
    ]);
    expect(afterFirst.scores.nosotros).toBe(3);

    const finished = playOut(afterFirst);

    expect(row(finished, 'flor')).toMatchObject({ team: 'nosotros', points: 3 });
    expect(finished.result?.florResult).toEqual({
      winnerTeam: 'nosotros',
      winnerSeat: 0,
      kind: 'flor',
      points: 3,
      tantos: { nosotros: 38, ellos: 0 },
    });
  });

  it('settles in finishHand when the reparto ends before the first baza', () => {
    const state = rigHands(FLOR_HANDS);
    const declared = reduce(state, { type: 'callFlor', seat: 0 });
    const folded = reduce(declared, { type: 'fold', seat: 0 });

    expect(folded.phase).toBe('handOver');
    expect(folded.result?.reason).toBe('fold');
    expect(folded.result?.settlements.map((settlement) => settlement.kind)).toEqual([
      'flor',
      'truco',
    ]);
    expect(folded.result?.totalPoints).toBe(4);
    expect(folded.scores).toEqual({ nosotros: 3, ellos: 1 });
  });

  it('only scores the declared team; the other flor is forfeited', () => {
    const state = rigHands(FLOR_TIE_HANDS);
    const declared = reduce(state, { type: 'callFlor', seat: 0 });
    const afterFirst = playFirstBaza(declared);

    expect(afterFirst.flor.settled).toBe(true);
    expect(afterFirst.settlements).toEqual([
      {
        kind: 'flor',
        team: 'nosotros',
        points: 3,
        tantos: { nosotros: 38, ellos: 0 },
      },
    ]);
  });

  it('compares both flors and gives a numeric tie to the mano', () => {
    const state = rigHands(FLOR_TIE_HANDS);
    const ours = reduce(state, { type: 'callFlor', seat: 0 });
    const afterOurCard = reduce(ours, {
      type: 'playCard',
      seat: 0,
      cardKey: cardKey(FLOR_TIE_HANDS[0][0]),
    });
    const theirs = reduce(afterOurCard, { type: 'callFlor', seat: 1 });
    const afterFirst = playFirstBaza(theirs);

    expect(afterFirst.flor.declarations).toHaveLength(2);
    expect(row(afterFirst, 'flor')).toMatchObject({
      kind: 'flor',
      team: 'nosotros',
      points: 3,
      tantos: { nosotros: 38, ellos: 38 },
    });
  });

  it('a reservada beats a numeric flor', () => {
    const hands: Record<Seat, readonly Card[]> = {
      0: [card(7, 'copa'), card(6, 'copa'), card(5, 'copa')],
      1: [card(11, 'basto'), card(10, 'basto'), card(3, 'oro')],
      2: [card(2, 'basto'), card(3, 'basto'), card(4, 'basto')],
      3: [card(12, 'oro'), card(11, 'oro'), card(10, 'oro')],
    };
    const state = rigHands(hands);
    const ours = reduce(state, { type: 'callFlor', seat: 0 });
    const afterOurCard = reduce(ours, {
      type: 'playCard',
      seat: 0,
      cardKey: cardKey(hands[0][0]),
    });
    const theirs = reduce(afterOurCard, { type: 'callFlor', seat: 1 });
    const afterFirst = playFirstBaza(theirs);

    expect(row(afterFirst, 'flor')).toMatchObject({
      kind: 'flor',
      team: 'ellos',
      points: 5,
      detail: 'reservada',
      tantos: { nosotros: 38, ellos: 100 },
    });
    expect(afterFirst.flor.winnerTeam).toBe('ellos');

    const finished = playOut(afterFirst);

    expect(finished.result?.florResult?.kind).toBe('reservada');
  });

  it('declares a reservada automatically at the deal', () => {
    let state: GameState | null = null;

    for (let index = 0; index < 5000 && !state; index += 1) {
      const candidate = createGame({ seed: `reservada-${index}` });

      if (candidate.flor.declarations.some((entry) => entry.kind === 'reservada')) {
        state = candidate;
      }
    }

    expect(state).not.toBeNull();

    const reservada = state?.flor.declarations.find((entry) => entry.kind === 'reservada');

    expect(reservada).toMatchObject({ kind: 'reservada', value: 5 });
    expect(state?.log.some((entry) => entry.kind === 'call' && entry.call === 'flor')).toBe(true);

    const declaredSeat = reservada?.seat ?? 0;

    expect(getLegalActions(state as GameState, declaredSeat).canCallFlor).toBe(false);
    expect(getLegalActions(state as GameState, declaredSeat).canCallEnvido).toBe(false);

    const afterFirst = playFirstBaza(state as GameState);
    const florRow = row(afterFirst, 'flor');

    expect(florRow).toMatchObject({ team: TEAM_OF(declaredSeat), points: 5, detail: 'reservada' });
  });

  it('ends the partida on a flor that reaches 24, without a truco payout', () => {
    const state = rigHands(FLOR_HANDS, { scores: { nosotros: 22, ellos: 10 } });
    const declared = reduce(state, { type: 'callFlor', seat: 0 });
    const afterFirst = playFirstBaza(declared);

    expect(afterFirst.phase).toBe('matchOver');
    expect(afterFirst.matchWinner).toBe('nosotros');
    expect(afterFirst.result).toMatchObject({
      winnerTeam: 'nosotros',
      reason: 'flor',
      points: 0,
      totalPoints: 2,
    });
    expect(afterFirst.result?.settlements).toHaveLength(1);
    expect(afterFirst.result?.settlements[0]).toMatchObject({ kind: 'flor', points: 2 });
    expect(afterFirst.result?.bazas).toHaveLength(1);
    expect(afterFirst.scores).toEqual({ nosotros: 24, ellos: 10 });
    expect(row(afterFirst, 'truco')).toBeUndefined();
  });

  it('can be declared while answering an envido, cancelling the envido', () => {
    const state = rigHands(FLOR_HANDS, { turn: 1, lead: 1 });
    const called = reduce(state, { type: 'callEnvido', seat: 1 });

    expect(called.pending).toMatchObject({ kind: 'envido', respondingTeam: 'nosotros' });
    expect(getLegalActions(called, 0).canCallFlor).toBe(true);

    const declared = reduce(called, { type: 'callFlor', seat: 0 });

    expect(declared.pending).toBeNull();
    expect(declared.envido.status).toBe('cancelled');
    expect(declared.turn).toBe(1);
    expect(declared.flor.declarations).toEqual([
      { seat: 0, team: 'nosotros', kind: 'flor', value: 38 },
    ]);
  });

  it('can be declared while answering a truco, which stays pending', () => {
    const hands = {
      ...FLOR_HANDS,
      1: [card(7, 'oro'), card(6, 'oro'), card(5, 'oro')] as const,
    };
    const state = rigHands(hands, { turn: 0, lead: 0 });
    const called = reduce(state, { type: 'callTruco', seat: 0 });

    expect(called.pending).toMatchObject({ kind: 'truco', respondingTeam: 'ellos' });
    expect(getLegalActions(called, 1).canCallFlor).toBe(true);

    const declared = reduce(called, { type: 'callFlor', seat: 1 });

    expect(declared.pending).toMatchObject({ kind: 'truco', level: 1 });
    expect(declared.flor.declarations).toEqual([
      { seat: 1, team: 'ellos', kind: 'flor', value: 38 },
    ]);
  });
});

function TEAM_OF(seat: Seat): Team {
  return seat === 0 || seat === 2 ? 'nosotros' : 'ellos';
}

describe('the prive', () => {
  it('is offered only to the team one piedra from 24', () => {
    const state = rigHands(ENVIDO_HANDS, { scores: { nosotros: 23, ellos: 10 } });

    expect(getLegalActions(state, 0).canCallPrive).toBe(true);
    expect(getLegalActions(state, 1).canCallPrive).toBe(false);
    expect(reduce(state, { type: 'callPrive', seat: 1 })).toBe(state);

    const notYet = rigHands(ENVIDO_HANDS, { scores: { nosotros: 22, ellos: 10 } });

    expect(getLegalActions(notYet, 0).canCallPrive).toBe(false);
    expect(reduce(notYet, { type: 'callPrive', seat: 0 })).toBe(notYet);
  });

  it('compares the tantos, pays one piedra and replaces envido', () => {
    const state = rigHands(PRIVE_LOSE_HANDS, { scores: { nosotros: 23, ellos: 20 } });
    const called = reduce(state, { type: 'callPrive', seat: 0 });

    expect(called.prive).toEqual({
      called: true,
      callerTeam: 'nosotros',
      winnerTeam: 'ellos',
      points: 1,
      tantos: { nosotros: 31, ellos: 33 },
    });
    expect(called.scores).toEqual({ nosotros: 23, ellos: 21 });
    expect(called.envido.status).toBe('cancelled');
    expect(called.settlements).toEqual([
      { kind: 'prive', team: 'ellos', points: 1, tantos: { nosotros: 31, ellos: 33 } },
    ]);
    expect(getLegalActions(called, 0).canCallEnvido).toBe(false);
    expect(reduce(called, { type: 'callEnvido', seat: 0 })).toBe(called);
    expect(reduce(called, { type: 'callPrive', seat: 0 })).toBe(called);
    expect(called.turn).toBe(0);

    const finished = playOut(called);

    expect(finished.result?.priveResult).toEqual({
      callerTeam: 'nosotros',
      winnerTeam: 'ellos',
      points: 1,
      tantos: { nosotros: 31, ellos: 33 },
    });
    expect(finished.result?.settlements.map((settlement) => settlement.kind)).toEqual([
      'prive',
      'truco',
    ]);
  });

  it('gives a tie to the mano team', () => {
    const state = rigHands(TIE_HANDS, { scores: { nosotros: 23, ellos: 20 } });
    const called = reduce(state, { type: 'callPrive', seat: 0 });

    expect(called.prive).toMatchObject({
      winnerTeam: 'nosotros',
      tantos: { nosotros: 33, ellos: 33 },
    });
    expect(called.phase).toBe('matchOver');
    expect(called.matchWinner).toBe('nosotros');
    expect(called.result?.reason).toBe('prive');
  });

  it('can end the partida immediately and skips the truco payout', () => {
    const state = rigHands(ENVIDO_HANDS, { scores: { nosotros: 23, ellos: 10 } });
    const called = reduce(state, { type: 'callPrive', seat: 0 });

    expect(called.phase).toBe('matchOver');
    expect(called.matchWinner).toBe('nosotros');
    expect(called.scores).toEqual({ nosotros: 24, ellos: 10 });
    expect(called.result).toMatchObject({
      winnerTeam: 'nosotros',
      reason: 'prive',
      points: 0,
      totalPoints: 1,
    });
    expect(called.result?.settlements).toEqual([
      { kind: 'prive', team: 'nosotros', points: 1, tantos: { nosotros: 33, ellos: 25 } },
    ]);
    expect(row(called, 'truco')).toBeUndefined();
  });

  it('is unavailable once a flor has been declared', () => {
    const state = rigHands(ENVIDO_HANDS, {
      scores: { nosotros: 23, ellos: 10 },
      flor: {
        declarations: [{ seat: 2, team: 'nosotros', kind: 'flor', value: 29 }],
        settled: false,
        winnerTeam: null,
        winnerSeat: null,
        points: 0,
      },
    });

    expect(getLegalActions(state, 0).canCallPrive).toBe(false);
    expect(reduce(state, { type: 'callPrive', seat: 0 })).toBe(state);
  });
});

describe('quemar', () => {
  it('a burned card is hidden from the other seats but stays in the dealt hand', () => {
    const state = rigHands(FLOR_HANDS);
    const burned = FLOR_HANDS[0][0];
    const afterBurn = reduce(state, {
      type: 'playCard',
      seat: 0,
      cardKey: cardKey(burned),
      burned: true,
    });

    expect(viewFor(afterBurn, 1).currentTrick[0]).toEqual({ seat: 0, card: null, burned: true });
    expect(viewFor(afterBurn, 0).currentTrick[0]).toEqual({ seat: 0, card: null, burned: true });
    expect(viewFor(afterBurn, 1).handCounts[0]).toBe(2);
    expect(afterBurn.dealtHands[0]).toContain(burned);
  });

  it('loses to every face-up card', () => {
    const hands: Record<Seat, readonly Card[]> = {
      0: [card(4, 'oro'), card(6, 'oro'), card(5, 'oro')],
      1: [card(3, 'copa'), card(6, 'copa'), card(5, 'copa')],
      2: [card(2, 'basto'), card(6, 'basto'), card(5, 'basto')],
      3: [card(7, 'copa'), card(3, 'basto'), card(2, 'espada')],
    };
    const state = rigHands(hands);
    const burned = reduce(state, {
      type: 'playCard',
      seat: 0,
      cardKey: cardKey(hands[0][0]),
      burned: true,
    });
    const finished = playFirstBaza(burned);

    expect(finished.lastTrick?.winnerSeat).toBe(1);
    expect(finished.lastTrick?.winnerTeam).toBe('ellos');
  });

  it('ties another burned card when the whole baza is face down', () => {
    const state = rigHands(FLOR_HANDS);
    let current = state;

    for (const seat of SEATS) {
      const played = current.hands[seat][0];

      current = reduce(current, {
        type: 'playCard',
        seat,
        cardKey: cardKey(played),
        burned: true,
      });
    }

    expect(current.lastTrick?.parda).toBe(true);
    expect(current.lastTrick?.winnerSeat).toBeNull();
    expect(current.bazaWins).toEqual({ nosotros: 0, ellos: 0 });
  });

  it('keeps the burned card in the hand summary', () => {
    const state = rigHands(ENVIDO_HANDS);
    const burned = ENVIDO_HANDS[0][0];
    const afterBurn = reduce(state, {
      type: 'playCard',
      seat: 0,
      cardKey: cardKey(burned),
      burned: true,
    });
    const finished = playOut(afterBurn);

    expect(finished.result?.hands[0]).toContain(burned);
    expect(viewFor(finished, 0).revealedHands?.[0]).toContain(burned);
  });
});

describe('the settlement ledger', () => {
  it('pays an accepted envido before the truco stake', () => {
    const state = rigHands(ENVIDO_HANDS, {
      truco: { level: 1, acceptedByTeam: 'nosotros' },
    });
    const opened = reduce(state, { type: 'callEnvido', seat: 0 });
    const accepted = reduce(opened, { type: 'respondEnvido', seat: 1, response: 'accept' });
    const finished = playOut(accepted);

    expect(finished.result?.settlements.map((settlement) => settlement.kind)).toEqual([
      'envido',
      'truco',
    ]);
    expect(finished.result?.totalPoints).toBe(5);
    expect(finished.result?.points).toBe(3);
    expect(envidoRow(finished)).toMatchObject({ points: 2, detail: 'accepted' });
    expect(row(finished, 'truco')).toMatchObject({ points: 3, detail: 'bazas', level: 1 });
    expect(finished.scores.nosotros + finished.scores.ellos).toBe(5);
  });

  it('pays a flor before the truco stake', () => {
    const state = rigHands(FLOR_HANDS, {
      truco: { level: 1, acceptedByTeam: 'nosotros' },
    });
    const declared = reduce(state, { type: 'callFlor', seat: 0 });
    const afterFirst = playFirstBaza(declared);
    const finished = playOut(afterFirst);

    expect(finished.result?.settlements.map((settlement) => settlement.kind)).toEqual([
      'flor',
      'truco',
    ]);
    expect(finished.result?.totalPoints).toBe(6);
    expect(finished.result?.points).toBe(3);
    expect(finished.scores.nosotros + finished.scores.ellos).toBe(6);
  });

  it('orders flor, prive and truco however they were paid', () => {
    const hands: Record<Seat, readonly Card[]> = {
      0: [card(7, 'copa'), card(6, 'copa'), card(5, 'copa')],
      1: [card(11, 'basto'), card(7, 'oro'), card(6, 'oro')],
      2: [card(3, 'basto'), card(2, 'basto'), card(4, 'espada')],
      3: [card(12, 'oro'), card(11, 'oro'), card(10, 'oro')],
    };
    const state = rigHands(hands, {
      scores: { nosotros: 23, ellos: 19 },
      truco: { level: 1, acceptedByTeam: 'nosotros' },
    });
    const withPrive = reduce(state, { type: 'callPrive', seat: 0 });

    expect(withPrive.prive.winnerTeam).toBe('ellos');
    expect(withPrive.phase).toBe('playing');

    const afterOurCard = reduce(withPrive, {
      type: 'playCard',
      seat: 0,
      cardKey: cardKey(hands[0][0]),
    });
    const withFlor = reduce(afterOurCard, { type: 'callFlor', seat: 1 });
    const afterFirst = playFirstBaza(withFlor);
    const finished = playOut(afterFirst);

    expect(finished.result?.settlements.map((settlement) => settlement.kind)).toEqual([
      'flor',
      'prive',
      'truco',
    ]);
    expect(finished.result?.totalPoints).toBe(5);
    expect(finished.result?.settlements[0]).toMatchObject({
      kind: 'flor',
      team: 'ellos',
      points: 3,
    });
    expect(finished.result?.settlements[1]).toMatchObject({
      kind: 'prive',
      team: 'ellos',
      points: 1,
    });
    expect(finished.result?.settlements[2]).toMatchObject({ kind: 'truco', points: 1 });
    expect(finished.scores).toEqual({ nosotros: 23, ellos: 24 });
    expect(finished.phase).toBe('matchOver');
  });

  it('stops the later payouts when a settlement reaches 24', () => {
    const state = rigHands(FLOR_HANDS, {
      scores: { nosotros: 22, ellos: 10 },
      truco: { level: 3, acceptedByTeam: 'nosotros' },
    });
    const declared = reduce(state, { type: 'callFlor', seat: 0 });
    const afterFirst = playFirstBaza(declared);

    expect(afterFirst.phase).toBe('matchOver');
    expect(afterFirst.result?.settlements.map((settlement) => settlement.kind)).toEqual(['flor']);
    expect(afterFirst.result?.totalPoints).toBe(2);
    expect(afterFirst.result?.points).toBe(0);
    expect(afterFirst.result?.settlements[0]).toMatchObject({ kind: 'flor', points: 2 });
    expect(afterFirst.scores).toEqual({ nosotros: 24, ellos: 10 });
  });

  it('stores the applied piedras when the last settlement is clipped at 24', () => {
    const state = rigHands(FLOR_HANDS, {
      scores: { nosotros: 23, ellos: 10 },
      truco: { level: 1, acceptedByTeam: 'nosotros' },
    });
    const declared = reduce(state, { type: 'callFlor', seat: 0 });
    const finished = playFirstBaza(declared);

    expect(finished.phase).toBe('matchOver');
    expect(finished.result?.settlements[0]).toMatchObject({ kind: 'flor', points: 1 });
    expect(finished.result?.totalPoints).toBe(1);
    expect(finished.scores).toEqual({ nosotros: 24, ellos: 10 });
  });

  it('pays the truco stake at level 4 as a match row', () => {
    const hands: Record<Seat, readonly Card[]> = {
      0: [card(3, 'oro'), card(3, 'copa'), card(4, 'espada')],
      1: [card(2, 'oro'), card(2, 'copa'), card(3, 'espada')],
      2: [card(4, 'oro'), card(4, 'copa'), card(5, 'espada')],
      3: [card(5, 'oro'), card(5, 'copa'), card(6, 'espada')],
    };
    const state = rigHands(hands, {
      scores: { nosotros: 17, ellos: 12 },
      truco: { level: 4 as TrucoLevel, acceptedByTeam: 'nosotros' },
    });
    const finished = playOut(state);

    expect(finished.phase).toBe('matchOver');
    expect(finished.matchWinner).toBe('nosotros');
    expect(finished.result?.points).toBe('match');
    expect(row(finished, 'truco')).toMatchObject({ points: 7, detail: 'match', level: 4 });
    expect(finished.result?.totalPoints).toBe(7);
    expect(finished.scores).toEqual({ nosotros: 24, ellos: 12 });
  });
});

describe('the personas at the new lances', () => {
  it('declares its flor before anything else', () => {
    const state = rigHands(FLOR_HANDS);
    const view = viewFor(state, 0);

    expect(view.legal.canCallFlor).toBe(true);
    expect(chooseBotAction(view, 'pana', state.seed)).toEqual({ type: 'callFlor', seat: 0 });
  });

  it('opens envido with a decent tanto', () => {
    const state = rigHands(ENVIDO_HANDS);
    const view = viewFor(state, 0);

    expect(view.ownEnvido).toBe(33);
    expect(chooseBotAction(view, 'pana', state.seed)).toEqual({ type: 'callEnvido', seat: 0 });
  });

  it('declines, accepts or raises an envido from its own tanto', () => {
    const weakHands: Record<Seat, readonly Card[]> = {
      ...ENVIDO_HANDS,
      1: [card(12, 'basto'), card(11, 'oro'), card(5, 'espada')],
    };
    const weak = reduce(rigHands(weakHands), { type: 'callEnvido', seat: 0 });
    const weakView = viewFor(weak, 1);

    expect(weakView.ownEnvido).toBe(5);
    expect(chooseBotAction(weakView, 'catire', weak.seed)).toEqual({
      type: 'respondEnvido',
      seat: 1,
      response: 'decline',
    });

    const decent = reduce(rigHands(ENVIDO_HANDS), { type: 'callEnvido', seat: 0 });
    const decentView = viewFor(decent, 1);

    expect(decentView.ownEnvido).toBe(25);
    expect(chooseBotAction(decentView, 'catire', decent.seed)).toEqual({
      type: 'respondEnvido',
      seat: 1,
      response: 'accept',
    });

    const strongHands: Record<Seat, readonly Card[]> = {
      ...ENVIDO_HANDS,
      1: [card(7, 'copa'), card(6, 'copa'), card(4, 'espada')],
    };
    const strong = reduce(rigHands(strongHands), { type: 'callEnvido', seat: 0 });
    const strongView = viewFor(strong, 1);

    expect(strongView.ownEnvido).toBe(33);
    expect(chooseBotAction(strongView, 'catire', strong.seed)).toEqual({
      type: 'respondEnvido',
      seat: 1,
      response: 'raise',
    });
  });

  it('never answers an envido for the other team', () => {
    const opened = reduce(rigHands(ENVIDO_HANDS), { type: 'callEnvido', seat: 0 });

    expect(() => chooseBotAction(viewFor(opened, 0), 'pana', opened.seed)).toThrow(
      'does not answer',
    );
  });

  it('calls prive at 23 with a strong tanto', () => {
    const state = rigHands(ENVIDO_HANDS, { scores: { nosotros: 23, ellos: 10 } });
    const view = viewFor(state, 0);

    expect(view.legal.canCallPrive).toBe(true);
    expect(chooseBotAction(view, 'pana', state.seed)).toEqual({ type: 'callPrive', seat: 0 });
  });
});

describe('a partida with the personas and every lance', () => {
  function playPartida(seed: string) {
    let state = createGame({ seed });
    let steps = 0;
    let repartos = 0;
    const kinds = new Set<Settlement['kind']>();

    while (state.phase !== 'matchOver' && steps < 4000) {
      steps += 1;

      if (state.phase === 'handOver') {
        state = reduce(state, { type: 'nextHand' });
        repartos += 1;
        continue;
      }

      const seat = actingSeat(state);
      const view = viewFor(state, seat);
      const action = chooseBotAction(view, botPersonaForSeat(seat), state.seed);
      const next = reduce(state, action);

      expect(next).not.toBe(state);

      switch (action.type) {
        case 'playCard':
          expect(view.legal.playableCardKeys).toContain(action.cardKey);
          if (action.burned) {
            expect(view.legal.canBurn).toBe(true);
          }
          break;
        case 'callTruco':
          expect(view.legal.canCallTruco).toBe(true);
          break;
        case 'callEnvido':
          expect(view.legal.canCallEnvido).toBe(true);
          break;
        case 'callFlor':
          expect(view.legal.canCallFlor).toBe(true);
          break;
        case 'callPrive':
          expect(view.legal.canCallPrive).toBe(true);
          break;
        case 'respondTruco':
          expect(view.legal.canRespondTruco).toBe(true);
          break;
        case 'respondEnvido':
          expect(view.legal.canRespondEnvido).toBe(true);
          break;
        case 'fold':
          expect(view.legal.canFold).toBe(true);
          break;
        default:
          throw new Error(`Unexpected action ${JSON.stringify(action)}`);
      }

      state = next;

      if (state.phase !== 'playing') {
        for (const settlement of state.result?.settlements ?? []) {
          kinds.add(settlement.kind);
        }
      }
    }

    return { state, steps, repartos, kinds };
  }

  it.each(['lances-a', 'lances-b', 'lances-c'])(
    'reaches 24 with every action legal (%s)',
    (seed) => {
      const { state, steps, repartos } = playPartida(seed);

      expect(state.phase).toBe('matchOver');
      expect(state.matchWinner).not.toBeNull();
      expect(steps).toBeLessThan(4000);
      expect(repartos).toBeLessThan(200);

      const winner = state.matchWinner ?? 'nosotros';
      const loser: Team = winner === 'nosotros' ? 'ellos' : 'nosotros';

      expect(state.scores[winner]).toBe(24);
      expect(state.scores[loser]).toBeLessThan(24);
    },
  );

  it('exercises every settlement source across a seeded partida', () => {
    const kinds = new Set<Settlement['kind']>();

    for (const seed of ['lances-a', 'lances-b', 'lances-c', 'lances-d', 'prive-busca-4']) {
      const { kinds: found } = playPartida(seed);

      for (const kind of found) {
        kinds.add(kind);
      }
    }

    expect([...kinds].sort()).toEqual(['envido', 'flor', 'prive', 'truco']);
  });
});
