import { chooseSimpleAction, handStrength } from '../simpleBot';
import { cardKey, type Card, type Rank, type Suit } from '../../domain/cards';
import { TEAM_BY_SEAT, type Seat } from '../../domain/seats';
import { actingSeat, createGame, reduce, viewFor } from '../../engine/game';
import type {
  GameState,
  GameView,
  PendingTrucoCall,
  TrucoCallLevel,
  TrucoLevel,
} from '../../engine/types';

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

function viewForRigged(
  hands: Record<Seat, readonly Card[]>,
  currentTrick: GameState['currentTrick'],
  seat: Seat,
): GameView {
  const base = createGame({ seed: 'bot-rig' });
  const state: GameState = {
    ...base,
    vira: card(12, 'basto'),
    hands,
    dealtHands: hands,
    turn: seat,
    lead: 0,
    currentTrick,
  };

  return viewFor(state, seat);
}

function turnView(seat: Seat, hand: readonly Card[]): GameView {
  const base = createGame({ seed: 'bot-turn' });
  const state: GameState = {
    ...base,
    vira: card(12, 'basto'),
    hands: { ...base.hands, [seat]: hand },
    dealtHands: { ...base.dealtHands, [seat]: hand },
    turn: seat,
    lead: seat,
    pending: null,
    truco: { level: 0, acceptedByTeam: null },
  };

  return viewFor(state, seat);
}

function pendingView(
  seat: Seat,
  hand: readonly Card[],
  level: TrucoCallLevel,
  callerSeat: Seat,
): GameView {
  const base = createGame({ seed: 'bot-pending' });
  const callerTeam = TEAM_BY_SEAT[callerSeat];
  const pending: PendingTrucoCall = {
    kind: 'truco',
    level,
    callerSeat,
    callerTeam,
    respondingTeam: TEAM_BY_SEAT[seat],
    returnSeat: callerSeat,
  };
  const state: GameState = {
    ...base,
    vira: card(12, 'basto'),
    hands: { ...base.hands, [seat]: hand },
    dealtHands: { ...base.dealtHands, [seat]: hand },
    turn: callerSeat,
    pending,
    truco: {
      level: (level - 1) as TrucoLevel,
      acceptedByTeam: level === 1 ? null : callerTeam,
    },
  };

  return viewFor(state, seat);
}

const WEAK = [card(12, 'basto'), card(11, 'copa'), card(10, 'oro')] as const;
const DECENT = [card(3, 'oro'), card(2, 'copa'), card(6, 'espada')] as const;
const STRONG = [card(3, 'oro'), card(3, 'copa'), card(2, 'espada')] as const;

describe('the simple bot', () => {
  it('always takes a legal action and never burns', () => {
    let state = createGame({ seed: 'bot-legal' });
    let guard = 0;

    while (state.phase === 'playing' && guard < 200) {
      guard += 1;
      const view = viewFor(state, actingSeat(state));
      const action = chooseSimpleAction(view);
      const next = reduce(state, action);

      expect(next).not.toBe(state);

      if (action.type === 'playCard') {
        expect(action.seat).toBe(view.seat);
        expect(view.legal.playableCardKeys).toContain(action.cardKey);
        expect(action.burned).toBeUndefined();
      } else if (action.type === 'callTruco') {
        expect(view.legal.canCallTruco).toBe(true);
        expect(action.seat).toBe(view.seat);
      } else if (action.type === 'respondTruco') {
        expect(view.legal.canRespondTruco).toBe(true);
        expect(action.seat).toBe(view.seat);
      } else {
        throw new Error(`The bot chose an unexpected action: ${action.type}`);
      }

      state = next;
    }

    expect(state.phase).toBe('handOver');
  });

  it('is deterministic for the same view', () => {
    const view = viewFor(createGame({ seed: 'bot-repetible' }), 0);

    expect(chooseSimpleAction(view)).toEqual(chooseSimpleAction(view));
  });

  it('ducks with its lowest card when the partner is winning the baza', () => {
    const view = viewForRigged(
      {
        0: [card(4, 'oro'), card(2, 'oro'), card(4, 'basto')],
        1: [card(3, 'oro'), card(2, 'copa'), card(3, 'espada')],
        2: [card(5, 'oro'), card(2, 'basto'), card(4, 'espada')],
        3: [card(4, 'copa'), card(6, 'copa'), card(2, 'espada')],
      },
      [
        { seat: 0, card: card(4, 'oro'), burned: false },
        { seat: 1, card: card(3, 'oro'), burned: false },
        { seat: 2, card: card(5, 'oro'), burned: false },
      ],
      3,
    );

    expect(chooseSimpleAction(view)).toEqual({
      type: 'playCard',
      seat: 3,
      cardKey: cardKey(card(4, 'copa')),
    });
  });

  it('plays the lowest card that beats the table when a rival is winning', () => {
    const view = viewForRigged(
      {
        0: [card(7, 'copa'), card(2, 'oro'), card(4, 'basto')],
        1: [card(4, 'oro'), card(2, 'copa'), card(3, 'espada')],
        2: [card(6, 'oro'), card(2, 'basto'), card(4, 'espada')],
        3: [card(2, 'espada'), card(5, 'copa'), card(4, 'copa')],
      },
      [
        { seat: 0, card: card(7, 'copa'), burned: false },
        { seat: 1, card: card(4, 'oro'), burned: false },
        { seat: 2, card: card(6, 'oro'), burned: false },
      ],
      3,
    );

    expect(chooseSimpleAction(view)).toEqual({
      type: 'playCard',
      seat: 3,
      cardKey: cardKey(card(2, 'espada')),
    });
  });

  it('scores its own hand from pieces, matas and the vira only', () => {
    const vira = card(12, 'basto');

    expect(handStrength(WEAK, vira)).toBeLessThan(140);
    expect(handStrength(DECENT, vira)).toBeGreaterThanOrEqual(140);
    expect(handStrength(STRONG, vira)).toBeGreaterThanOrEqual(230);
  });

  it('declines with a weak hand, accepts with a decent one and raises with a strong one', () => {
    expect(chooseSimpleAction(pendingView(1, WEAK, 1, 0))).toEqual({
      type: 'respondTruco',
      seat: 1,
      response: 'decline',
    });
    expect(chooseSimpleAction(pendingView(1, DECENT, 1, 0))).toEqual({
      type: 'respondTruco',
      seat: 1,
      response: 'accept',
    });
    expect(chooseSimpleAction(pendingView(1, STRONG, 1, 0))).toEqual({
      type: 'respondTruco',
      seat: 1,
      response: 'raise',
    });
  });

  it('accepts instead of raising when vale juego is already on the table', () => {
    expect(chooseSimpleAction(pendingView(1, STRONG, 4, 0))).toEqual({
      type: 'respondTruco',
      seat: 1,
      response: 'accept',
    });
  });

  it('calls truco with a strong hand and otherwise plays a card', () => {
    expect(chooseSimpleAction(turnView(0, STRONG))).toEqual({ type: 'callTruco', seat: 0 });

    const played = chooseSimpleAction(turnView(0, WEAK));
    expect(played.type).toBe('playCard');

    if (played.type === 'playCard') {
      expect(WEAK.map(cardKey)).toContain(played.cardKey);
    }
  });

  it('never answers for the other team', () => {
    const base = createGame({ seed: 'bot-otro-equipo' });
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

    expect(() => chooseSimpleAction(viewFor(state, 0))).toThrow('does not answer');
  });

  it('refuses to act once the reparto is closed', () => {
    const base = createGame({ seed: 'bot-cerrado' });
    const state: GameState = { ...base, phase: 'handOver' };

    expect(() => chooseSimpleAction(viewFor(state, 0))).toThrow('no action');
  });
});
