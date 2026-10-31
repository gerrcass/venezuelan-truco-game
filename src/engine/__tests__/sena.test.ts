import { cardKey, type Card, type Rank, type Suit } from '../../domain/cards';
import { SEATS, type Seat } from '../../domain/seats';
import { createGame, reduce, viewFor } from '../game';
import { computeSena } from '../sena';
import type { GameState } from '../types';

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

const VIRA_REY_BASTO = card(12, 'basto');

function rigPanaHand(hand: readonly Card[], overrides: Partial<GameState> = {}): GameState {
  const base = createGame({ seed: 'sena-rig' });
  const hands: Record<Seat, readonly Card[]> = {
    ...base.hands,
    2: hand,
  };

  return {
    ...base,
    vira: VIRA_REY_BASTO,
    hands,
    dealtHands: hands,
    turn: 0,
    lead: 0,
    pending: null,
    ...overrides,
  };
}

function senaOf(hand: readonly Card[]): ReturnType<typeof computeSena> {
  return computeSena(hand, VIRA_REY_BASTO);
}

describe('El Pana’s seña', () => {
  it('signals the perico with the right-eye wink', () => {
    const sena = senaOf([card(11, 'basto'), card(4, 'oro'), card(6, 'copa')]);

    expect(sena).toEqual({ kind: 'perico', card: card(11, 'basto') });
  });

  it('signals the perica with the left-eye wink', () => {
    const sena = senaOf([card(10, 'basto'), card(4, 'oro'), card(6, 'copa')]);

    expect(sena).toEqual({ kind: 'perica', card: card(10, 'basto') });
  });

  it('walks the matas in order', () => {
    expect(senaOf([card(1, 'espada'), card(4, 'oro'), card(6, 'copa')]).kind).toBe('espadilla');
    expect(senaOf([card(1, 'basto'), card(4, 'oro'), card(6, 'copa')]).kind).toBe('bastillo');
    expect(senaOf([card(7, 'espada'), card(4, 'oro'), card(6, 'copa')]).kind).toBe('sieteEspada');
    expect(senaOf([card(7, 'oro'), card(4, 'copa'), card(6, 'basto')]).kind).toBe('sieteOro');
  });

  it('prefers a flor over the piece that makes it', () => {
    const sena = senaOf([card(11, 'basto'), card(4, 'basto'), card(5, 'basto')]);

    expect(sena).toEqual({ kind: 'flor', card: null });
  });

  it('calls the reservada before any other signal', () => {
    const sena = senaOf([card(11, 'basto'), card(10, 'basto'), card(4, 'oro')]);

    expect(sena).toEqual({ kind: 'reservada', card: null });
  });

  it('shrugs when there is nothing to signal', () => {
    expect(senaOf([card(4, 'oro'), card(5, 'copa'), card(6, 'espada')])).toEqual({
      kind: 'none',
      card: null,
    });
  });

  it('is visible only to the human seat', () => {
    const state = rigPanaHand([card(11, 'basto'), card(4, 'oro'), card(6, 'copa')]);

    expect(viewFor(state, 0).sena).toEqual({ kind: 'perico', card: card(11, 'basto') });

    for (const seat of SEATS.filter((candidate) => candidate !== 0)) {
      expect(viewFor(state, seat).sena).toBeNull();
    }
  });

  it('stays on the table after El Pana plays a card', () => {
    const hand = [card(11, 'basto'), card(4, 'oro'), card(6, 'copa')];
    const state = rigPanaHand(hand, { turn: 2, lead: 2 });
    const played = reduce(state, {
      type: 'playCard',
      seat: 2,
      cardKey: cardKey(card(4, 'oro')),
    });

    expect(played).not.toBe(state);
    expect(viewFor(played, 0).sena).toEqual({ kind: 'perico', card: card(11, 'basto') });
  });

  it('resets with the next deal', () => {
    const state = rigPanaHand([card(11, 'basto'), card(4, 'oro'), card(6, 'copa')], {
      phase: 'handOver',
    });
    const next = reduce(state, { type: 'nextHand' });

    expect(next.handNumber).toBe(state.handNumber + 1);
    expect(viewFor(next, 0).sena).toEqual(computeSena(next.dealtHands[2], next.vira));
  });
});
