import type { Card, Piece, Rank } from '../domain/cards';

/**
 * The vira promotes one court card of its palo to perico and another to perica.
 * A vira of 10 or 11 pushes the piece up to the rey; every other vira leaves
 * the caballo and sota in place.
 */
export function pieceOf(card: Card, vira: Card): Piece | null {
  if (card.suit !== vira.suit) {
    return null;
  }

  if (vira.rank === 11) {
    if (card.rank === 12) {
      return 'perico';
    }

    return card.rank === 10 ? 'perica' : null;
  }

  if (vira.rank === 10) {
    if (card.rank === 12) {
      return 'perica';
    }

    return card.rank === 11 ? 'perico' : null;
  }

  if (card.rank === 11) {
    return 'perico';
  }

  return card.rank === 10 ? 'perica' : null;
}

/** A burned card has no rank at all. */
export const BURNED_POWER = -1;

/**
 * The exact Venezuelan hierarchy. Higher is stronger; equal powers tie as parda.
 * Pieces are checked before the printed rank, because the vira can promote a rey.
 */
export function cardPower(card: Card, vira: Card, burned = false): number {
  if (burned) {
    return BURNED_POWER;
  }

  const piece = pieceOf(card, vira);

  if (piece === 'perico') {
    return 100;
  }

  if (piece === 'perica') {
    return 99;
  }

  switch (card.rank) {
    case 1:
      if (card.suit === 'espada') {
        return 90;
      }

      return card.suit === 'basto' ? 89 : 60;
    case 2:
      return 70;
    case 3:
      return 80;
    case 4:
      return 13;
    case 5:
      return 14;
    case 6:
      return 15;
    case 7:
      if (card.suit === 'espada') {
        return 88;
      }

      return card.suit === 'oro' ? 87 : 20;
    case 10:
      return 30;
    case 11:
      return 40;
    case 12:
      return 50;
  }
}

/**
 * Compare two cards for the baza. Negative means `a` is weaker, positive means
 * `a` is stronger, zero is a parda. Burned flags let the reducer compare the
 * actual plays without special-casing the baza.
 */
export function compareCards(
  a: Card,
  b: Card,
  vira: Card,
  aBurned = false,
  bBurned = false,
): -1 | 0 | 1 {
  const powerA = cardPower(a, vira, aBurned);
  const powerB = cardPower(b, vira, bBurned);

  if (powerA === powerB) {
    return 0;
  }

  return powerA > powerB ? 1 : -1;
}

const FACE_VALUE: Record<Rank, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  10: 0,
  11: 0,
  12: 0,
};

/**
 * The envido tanto of one hand. A piece counts 30/29 plus the highest of the
 * two remaining cards; otherwise the best two cards of one palo count 20 + both,
 * and with no pair the highest face value counts alone.
 */
export function envidoTanto(hand: readonly Card[], vira: Card): number {
  const perico = hand.find((card) => pieceOf(card, vira) === 'perico');

  if (perico) {
    return 30 + highestFaceValue(hand.filter((card) => card !== perico));
  }

  const perica = hand.find((card) => pieceOf(card, vira) === 'perica');

  if (perica) {
    return 29 + highestFaceValue(hand.filter((card) => card !== perica));
  }

  const bySuit = new Map<string, number[]>();

  for (const card of hand) {
    const values = bySuit.get(card.suit) ?? [];
    values.push(FACE_VALUE[card.rank]);
    bySuit.set(card.suit, values);
  }

  let bestPair = 0;
  let hasPair = false;

  for (const values of bySuit.values()) {
    if (values.length < 2) {
      continue;
    }

    hasPair = true;
    const [first = 0, second = 0] = [...values].sort((a, b) => b - a);
    bestPair = Math.max(bestPair, 20 + first + second);
  }

  return hasPair ? bestPair : highestFaceValue(hand);
}

function highestFaceValue(hand: readonly Card[]): number {
  return hand.reduce((highest, card) => Math.max(highest, FACE_VALUE[card.rank]), 0);
}
