import { cardKey, type Card, type Rank, type Suit } from '../../domain/cards';
import { PERSONA_BY_SEAT, TEAM_BY_SEAT, type Seat } from '../../domain/seats';
import { actingSeat, createGame, reduce, viewFor } from '../../engine/game';
import type {
  EnvidoLevel,
  GameState,
  GameView,
  PendingEnvidoCall,
  PendingTrucoCall,
  TrucoCallLevel,
  TrucoLevel,
} from '../../engine/types';

import { botPersonaForSeat } from '../personas';
import { chooseBotAction, handStrength } from '../policy';

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

const VIRA_REY_BASTO = card(12, 'basto');

const CLEAN_ENVIDO: GameState['envido'] = {
  status: 'none',
  level: null,
  stake: null,
  callerTeam: null,
  acceptedByTeam: null,
  tantos: null,
};

const CLEAN_FLOR: GameState['flor'] = {
  declarations: [],
  settled: false,
  winnerTeam: null,
  winnerSeat: null,
  points: 0,
};

const CLEAN_PRIVE: GameState['prive'] = {
  called: false,
  callerTeam: null,
  winnerTeam: null,
  points: 0,
  tantos: null,
};

function rigGame(overrides: Partial<GameState> = {}): GameState {
  const base = createGame({ seed: 'persona-rig' });

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
    envido: CLEAN_ENVIDO,
    flor: CLEAN_FLOR,
    prive: CLEAN_PRIVE,
    pending: null,
    log: [],
    nextLogId: 0,
    event: null,
    ...overrides,
  };
}

function turnView(seat: Seat, hand: readonly Card[], overrides: Partial<GameState> = {}): GameView {
  const base = rigGame(overrides);
  const hands = { ...base.hands, [seat]: hand };

  return viewFor({ ...base, hands, dealtHands: hands, turn: seat, lead: seat }, seat);
}

function pendingTrucoView(
  seat: Seat,
  hand: readonly Card[],
  level: TrucoCallLevel,
  callerSeat: Seat,
): GameView {
  const base = rigGame();
  const hands = { ...base.hands, [seat]: hand };
  const callerTeam = TEAM_BY_SEAT[callerSeat];
  const pending: PendingTrucoCall = {
    kind: 'truco',
    level,
    callerSeat,
    callerTeam,
    respondingTeam: TEAM_BY_SEAT[seat],
    returnSeat: callerSeat,
  };

  return viewFor(
    {
      ...base,
      hands,
      dealtHands: hands,
      turn: callerSeat,
      pending,
      truco: {
        level: (level - 1) as TrucoLevel,
        acceptedByTeam: level === 1 ? null : callerTeam,
      },
    },
    seat,
  );
}

function pendingEnvidoView(
  seat: Seat,
  hand: readonly Card[],
  level: EnvidoLevel,
  callerSeat: Seat,
): GameView {
  const base = rigGame();
  const hands = { ...base.hands, [seat]: hand };
  const callerTeam = TEAM_BY_SEAT[callerSeat];
  const pending: PendingEnvidoCall = {
    kind: 'envido',
    level,
    callerSeat,
    callerTeam,
    respondingTeam: TEAM_BY_SEAT[seat],
    returnSeat: callerSeat,
  };

  return viewFor(
    {
      ...base,
      hands,
      dealtHands: hands,
      turn: callerSeat,
      pending,
      envido: {
        status: 'pending',
        level,
        stake: null,
        callerTeam,
        acceptedByTeam: null,
        tantos: null,
      },
    },
    seat,
  );
}

function playOut(seed: string, maxSteps = 4000) {
  let state = createGame({ seed });
  let steps = 0;
  let repartos = 0;
  const burns = new Map<Seat, number>();

  while (state.phase !== 'matchOver' && steps < maxSteps) {
    steps += 1;

    if (state.phase === 'handOver') {
      state = reduce(state, { type: 'nextHand' });
      repartos += 1;
      burns.clear();
      continue;
    }

    const seat = actingSeat(state);
    const view = viewFor(state, seat);
    const action = chooseBotAction(view, botPersonaForSeat(seat), state.seed);
    const next = reduce(state, action);

    expect(next).not.toBe(state);

    if (action.type === 'playCard') {
      expect(view.legal.playableCardKeys).toContain(action.cardKey);

      if (action.burned) {
        const count = (burns.get(action.seat) ?? 0) + 1;
        burns.set(action.seat, count);
        expect(view.legal.canBurn).toBe(true);
        expect(count).toBeLessThanOrEqual(1);
      }
    } else if (action.type === 'callTruco') {
      expect(view.legal.canCallTruco).toBe(true);
    } else if (action.type === 'callEnvido') {
      expect(view.legal.canCallEnvido).toBe(true);
    } else if (action.type === 'callFlor') {
      expect(view.legal.canCallFlor).toBe(true);
    } else if (action.type === 'callPrive') {
      expect(view.legal.canCallPrive).toBe(true);
    } else if (action.type === 'respondTruco') {
      expect(view.legal.canRespondTruco).toBe(true);
    } else if (action.type === 'respondEnvido') {
      expect(view.legal.canRespondEnvido).toBe(true);
    } else {
      expect(action.type).toBe('fold');
      expect(view.legal.canFold).toBe(true);
    }

    state = next;
  }

  return { state, steps, repartos };
}

describe('the persona policy', () => {
  it.each(['panas-a', 'panas-b', 'panas-c'])(
    'plays a full partida legally and reaches 24 (%s)',
    (seed) => {
      const { state, steps, repartos } = playOut(seed);

      expect(state.phase).toBe('matchOver');
      expect(state.matchWinner).not.toBeNull();
      expect(state.scores[state.matchWinner ?? 'nosotros']).toBe(24);
      expect(steps).toBeLessThan(4000);
      expect(repartos).toBeLessThan(100);
    },
  );

  it('is deterministic for the same view and seed', () => {
    const view = viewFor(createGame({ seed: 'panas-repetibles' }), 0);
    const first = chooseBotAction(view, 'pana', 42);
    const second = chooseBotAction(view, 'pana', 42);
    const otherSeed = chooseBotAction(view, 'pana', 43);

    expect(first).toEqual(second);
    expect(otherSeed).toEqual(first);
  });

  it('replays the same partida from the same seed', () => {
    const first = playOut('panas-replay');
    const second = playOut('panas-replay');

    expect(second.state.log).toEqual(first.state.log);
    expect(second.state.scores).toEqual(first.state.scores);
    expect(second.steps).toBe(first.steps);
  });

  it('does not see the other hands through the view', () => {
    const state = createGame({ seed: 'panas-ciegas' });
    const view = viewFor({ ...state, turn: 3 }, 3);
    const serialized = JSON.stringify(view);
    const hidden = [0, 1, 2].flatMap((seat) =>
      state.hands[seat as Seat].map((held) => cardKey(held)),
    );

    expect(view.revealedHands).toBeNull();
    expect(Object.keys(view)).not.toContain('hands');

    for (const key of hidden) {
      if (key === cardKey(state.vira)) {
        continue;
      }

      expect(serialized).not.toContain(key);
    }

    expect(() => chooseBotAction(view, 'comadre', state.seed)).not.toThrow();
  });

  it('lets El Catire open truco with a hand La Comadre would not touch', () => {
    const hand = [card(3, 'oro'), card(2, 'copa'), card(6, 'espada')];

    expect(handStrength(hand, VIRA_REY_BASTO)).toBe(165);
    expect(chooseBotAction(turnView(1, hand), 'catire', 11)).toEqual({
      type: 'callTruco',
      seat: 1,
    });
    expect(chooseBotAction(turnView(3, hand), 'comadre', 11).type).toBe('playCard');
    expect(chooseBotAction(turnView(2, hand), 'pana', 11).type).toBe('playCard');
  });

  it('lets El Catire open envido with a tanto La Comadre passes on', () => {
    const hand = [card(4, 'oro'), card(3, 'oro'), card(12, 'copa')];

    expect(chooseBotAction(turnView(1, hand), 'catire', 5)).toEqual({
      type: 'callEnvido',
      seat: 1,
    });
    expect(chooseBotAction(turnView(3, hand), 'comadre', 5).type).toBe('playCard');
    expect(chooseBotAction(turnView(2, hand), 'pana', 5).type).toBe('playCard');
  });

  it('answers envido at the persona line', () => {
    const modest = [card(3, 'copa'), card(2, 'copa'), card(5, 'espada')];

    expect(pendingEnvidoView(1, modest, 1, 0).ownEnvido).toBe(25);
    expect(chooseBotAction(pendingEnvidoView(1, modest, 1, 0), 'catire', 3)).toEqual({
      type: 'respondEnvido',
      seat: 1,
      response: 'accept',
    });
    expect(chooseBotAction(pendingEnvidoView(3, modest, 1, 0), 'comadre', 3)).toEqual({
      type: 'respondEnvido',
      seat: 3,
      response: 'decline',
    });
  });

  it('answers truco at the persona line and raises only with the goods', () => {
    const fair = [card(12, 'basto'), card(11, 'copa'), card(10, 'oro')];
    const strong = [card(3, 'oro'), card(3, 'copa'), card(2, 'espada')];

    expect(handStrength(fair, VIRA_REY_BASTO)).toBe(120);
    expect(chooseBotAction(pendingTrucoView(1, fair, 1, 0), 'catire', 3)).toEqual({
      type: 'respondTruco',
      seat: 1,
      response: 'accept',
    });
    expect(chooseBotAction(pendingTrucoView(3, fair, 1, 0), 'comadre', 3)).toEqual({
      type: 'respondTruco',
      seat: 3,
      response: 'decline',
    });

    expect(handStrength(strong, VIRA_REY_BASTO)).toBe(230);
    expect(chooseBotAction(pendingTrucoView(1, strong, 1, 0), 'catire', 3)).toEqual({
      type: 'respondTruco',
      seat: 1,
      response: 'raise',
    });
    expect(chooseBotAction(pendingTrucoView(2, strong, 1, 0), 'pana', 3)).toEqual({
      type: 'respondTruco',
      seat: 2,
      response: 'accept',
    });
    expect(chooseBotAction(pendingTrucoView(3, strong, 1, 0), 'comadre', 3)).toEqual({
      type: 'respondTruco',
      seat: 3,
      response: 'accept',
    });
  });

  it('never raises vale juego because there is nothing above it', () => {
    const strong = [card(3, 'oro'), card(3, 'copa'), card(2, 'espada')];

    expect(chooseBotAction(pendingTrucoView(1, strong, 4, 0), 'catire', 3)).toEqual({
      type: 'respondTruco',
      seat: 1,
      response: 'accept',
    });
  });

  it('declares flor with every persona because it is free points', () => {
    const flor = [card(7, 'copa'), card(6, 'copa'), card(5, 'copa')];

    for (const [seat, persona] of [
      [1, 'catire'],
      [2, 'pana'],
      [3, 'comadre'],
    ] as const) {
      expect(chooseBotAction(turnView(seat, flor), persona, 9)).toEqual({
        type: 'callFlor',
        seat,
      });
    }
  });

  it('calls prive at 23 only when the tanto clears the persona line', () => {
    const hand = [card(5, 'oro'), card(3, 'oro'), card(12, 'copa')];
    const ellosAt23 = { scores: { nosotros: 10, ellos: 23 } };
    const nosotrosAt23 = { scores: { nosotros: 23, ellos: 10 } };

    expect(chooseBotAction(turnView(1, hand, ellosAt23), 'catire', 2)).toEqual({
      type: 'callPrive',
      seat: 1,
    });
    expect(chooseBotAction(turnView(3, hand, ellosAt23), 'comadre', 2).type).toBe('playCard');
    expect(chooseBotAction(turnView(2, hand, nosotrosAt23), 'pana', 2).type).toBe('playCard');
  });

  it('ducks with its lowest card when the partner is winning the baza', () => {
    const state = rigGame({
      hands: {
        0: [card(4, 'oro'), card(2, 'oro'), card(4, 'basto')],
        1: [card(3, 'oro'), card(2, 'copa'), card(3, 'espada')],
        2: [card(5, 'oro'), card(2, 'basto'), card(4, 'espada')],
        3: [card(4, 'copa'), card(6, 'copa'), card(2, 'espada')],
      },
      turn: 3,
      lead: 0,
      currentTrick: [
        { seat: 0, card: card(4, 'oro'), burned: false },
        { seat: 1, card: card(3, 'oro'), burned: false },
        { seat: 2, card: card(5, 'oro'), burned: false },
      ],
    });

    expect(chooseBotAction(viewFor(state, 3), 'comadre', 4)).toEqual({
      type: 'playCard',
      seat: 3,
      cardKey: cardKey(card(4, 'copa')),
    });
  });

  it('plays the lowest card that beats the table when a rival is winning', () => {
    const state = rigGame({
      hands: {
        0: [card(7, 'copa'), card(2, 'oro'), card(4, 'basto')],
        1: [card(4, 'oro'), card(2, 'copa'), card(3, 'espada')],
        2: [card(6, 'oro'), card(2, 'basto'), card(4, 'espada')],
        3: [card(2, 'espada'), card(5, 'copa'), card(4, 'copa')],
      },
      turn: 3,
      lead: 0,
      currentTrick: [
        { seat: 0, card: card(7, 'copa'), burned: false },
        { seat: 1, card: card(4, 'oro'), burned: false },
        { seat: 2, card: card(6, 'oro'), burned: false },
      ],
    });

    expect(chooseBotAction(viewFor(state, 3), 'comadre', 4)).toEqual({
      type: 'playCard',
      seat: 3,
      cardKey: cardKey(card(2, 'espada')),
    });
  });

  it('burns a hopeless low card more often as El Catire, never twice per reparto', () => {
    const state = rigGame({
      hands: {
        0: [card(3, 'oro'), card(2, 'oro'), card(4, 'basto')],
        1: [card(3, 'copa'), card(2, 'copa'), card(3, 'espada')],
        2: [card(3, 'espada'), card(2, 'basto'), card(4, 'espada')],
        3: [card(4, 'copa'), card(5, 'basto'), card(6, 'espada')],
      },
      turn: 3,
      lead: 0,
      currentTrick: [
        { seat: 0, card: card(3, 'oro'), burned: false },
        { seat: 1, card: card(3, 'copa'), burned: false },
        { seat: 2, card: card(3, 'espada'), burned: false },
      ],
    });
    const view = viewFor(state, 3);
    let catireBurns = 0;
    let comadreBurns = 0;

    for (let seed = 0; seed < 40; seed += 1) {
      if (chooseBotAction(view, 'catire', seed).type === 'playCard') {
        const action = chooseBotAction(view, 'catire', seed);
        catireBurns += action.type === 'playCard' && action.burned === true ? 1 : 0;
      }

      const action = chooseBotAction(view, 'comadre', seed);
      comadreBurns += action.type === 'playCard' && action.burned === true ? 1 : 0;
    }

    expect(view.legal.canBurn).toBe(true);
    expect(catireBurns).toBeGreaterThan(0);
    expect(catireBurns).toBeGreaterThan(comadreBurns);
  });

  it('folds a clearly lost high-stake reparto only rarely', () => {
    const lostTrick: GameState['tricks'][number] = {
      baza: 1,
      leadSeat: 0,
      plays: [
        { seat: 0, card: card(3, 'oro'), burned: false },
        { seat: 1, card: card(5, 'copa'), burned: false },
        { seat: 2, card: card(6, 'basto'), burned: false },
        { seat: 3, card: card(4, 'copa'), burned: false },
      ],
      winnerTeam: 'nosotros',
      winnerSeat: 0,
      parda: false,
    };
    const state = rigGame({
      hands: {
        0: [card(6, 'oro'), card(2, 'oro'), card(4, 'basto')],
        1: [card(5, 'copa'), card(2, 'copa'), card(3, 'espada')],
        2: [card(6, 'basto'), card(2, 'basto'), card(4, 'espada')],
        3: [card(4, 'copa'), card(5, 'basto'), card(6, 'espada')],
      },
      turn: 3,
      lead: 0,
      tricks: [lostTrick],
      bazaWins: { nosotros: 1, ellos: 0 },
      currentTrick: [
        { seat: 0, card: card(6, 'oro'), burned: false },
        { seat: 1, card: card(5, 'copa'), burned: false },
        { seat: 2, card: card(6, 'basto'), burned: false },
      ],
      truco: { level: 2, acceptedByTeam: 'nosotros' },
    });

    expect(state.truco.level).toBe(2);

    const actions = Array.from({ length: 100 }, (_, seed) =>
      chooseBotAction(viewFor(state, 3), 'comadre', seed),
    );
    const folds = actions.filter((action) => action.type === 'fold');

    expect(folds.length).toBeGreaterThan(0);
    expect(folds.length).toBeLessThan(40);

    for (const fold of folds) {
      expect(fold).toEqual({ type: 'fold', seat: 3 });
    }
  });

  it('refuses to act once the reparto is closed', () => {
    const base = createGame({ seed: 'panas-cerrados' });

    expect(() => chooseBotAction(viewFor({ ...base, phase: 'handOver' }, 0), 'pana', 1)).toThrow(
      'no action',
    );
  });

  it('never answers for the other team', () => {
    const base = rigGame();
    const state: GameState = {
      ...base,
      turn: 0,
      pending: {
        kind: 'truco',
        level: 1,
        callerSeat: 0,
        callerTeam: 'nosotros',
        respondingTeam: 'ellos',
        returnSeat: 0,
      },
    };

    expect(() => chooseBotAction(viewFor(state, 0), 'pana', 1)).toThrow('does not answer');
  });

  it('keeps the human seat out of the bot policy', () => {
    const view = viewFor(createGame({ seed: 'panas-humano' }), 0);

    expect(() => chooseBotAction(view, 'you', 1)).toThrow('no bot persona');
    expect(PERSONA_BY_SEAT[0]).toBe('you');
    expect(botPersonaForSeat(0)).toBe('pana');
  });
});
