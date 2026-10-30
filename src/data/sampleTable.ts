import type { Card, Piece } from '../domain/cards';
import type { Seat, Team } from '../domain/seats';

export interface HandCard {
  readonly card: Card;
  readonly piece?: Piece;
}

export interface PlayedCard {
  readonly seat: Seat;
  readonly card: Card;
}

/**
 * A fixed, believable snapshot for the table shell. This is presentation data,
 * not game state: ticket #3 replaces it with the engine's seat-scoped view.
 */
export interface SampleTable {
  readonly handNumber: number;
  readonly stake: number;
  readonly scores: Record<Team, number>;
  readonly vira: Card;
  readonly baza: number;
  readonly hand: readonly HandCard[];
  readonly played: readonly PlayedCard[];
  readonly manoSeat: Seat;
  readonly pieSeat: Seat;
  readonly turnSeat: Seat;
  readonly speechSeat: Seat;
}

export const SAMPLE_TABLE: SampleTable = {
  handNumber: 3,
  stake: 3,
  scores: { nosotros: 7, ellos: 5 },
  vira: { rank: 11, suit: 'basto' },
  baza: 1,
  hand: [
    { card: { rank: 12, suit: 'basto' }, piece: 'perico' },
    { card: { rank: 3, suit: 'oro' } },
    { card: { rank: 7, suit: 'espada' } },
  ],
  played: [
    { seat: 2, card: { rank: 2, suit: 'basto' } },
    { seat: 3, card: { rank: 5, suit: 'copa' } },
  ],
  manoSeat: 2,
  pieSeat: 1,
  turnSeat: 0,
  speechSeat: 1,
};
