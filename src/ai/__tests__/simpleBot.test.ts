import { chooseSimpleAction } from '../simpleBot';
import { cardKey, type Card, type Rank, type Suit } from '../../domain/cards';
import type { Seat } from '../../domain/seats';
import { createGame, reduce, viewFor } from '../../engine/game';
import type { GameState, GameView } from '../../engine/types';

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

describe('the simple bot', () => {
  it('always returns a legal card and never burns', () => {
    let state = createGame({ seed: 'bot-legal' });
    let guard = 0;

    while (state.phase === 'playing' && guard < 10) {
      guard += 1;
      const view = viewFor(state, state.turn);
      const action = chooseSimpleAction(view);

      expect(action.type).toBe('playCard');

      if (action.type === 'playCard') {
        expect(action.seat).toBe(state.turn);
        expect(view.legal.playableCardKeys).toContain(action.cardKey);
        expect(action.burned).toBeUndefined();
      }

      state = reduce(state, action);
    }
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
});
