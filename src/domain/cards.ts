/** The four palos of the Spanish deck. */
export const SUITS = ['oro', 'copa', 'espada', 'basto'] as const;

/** A palo: oro, copa, espada or basto. */
export type Suit = (typeof SUITS)[number];

/** The ten ranks of the Spanish 40-card deck. There is no 8 or 9. */
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;

/** A card rank: 1–7, 10 (sota), 11 (caballo) or 12 (rey). */
export type Rank = (typeof RANKS)[number];

/** The three court ranks. */
export const COURT_RANKS = [10, 11, 12] as const;

/** A court rank: sota, caballo or rey. */
export type CourtRank = (typeof COURT_RANKS)[number];

/** The vira promotes one court card to perico and another to perica. */
export type Piece = 'perico' | 'perica';

/** A playing card from the Spanish 40-card deck. */
export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
}

/** All 40 cards, in palo order. */
export const SPANISH_DECK: readonly Card[] = SUITS.flatMap((suit) =>
  RANKS.map((rank) => ({ suit, rank })),
);

/** True when a rank is a court card (10, 11 or 12). */
export function isCourtRank(rank: Rank): rank is CourtRank {
  return rank >= 10;
}

/** A stable identity for a card, useful for keys and sets. */
export function cardKey(card: Card): string {
  return `${card.rank}-${card.suit}`;
}
