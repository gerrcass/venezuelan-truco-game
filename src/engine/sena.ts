import type { Card } from '../domain/cards';

import { pieceOf, scoreFlor } from './cards';
import type { Sena } from './types';

/**
 * El Pana sends exactly one seña per reparto, and only to the human. The hand
 * is the one dealt at the start of the reparto: playing a card never erases the
 * signal, and the next deal computes a fresh one.
 *
 * Priority: reservada → flor → perico → perica → espadilla → bastillo →
 * siete de espada → siete de oro → none. A flor outranks a piece because it is
 * the bigger secret at the table.
 */
export function computeSena(hand: readonly Card[], vira: Card): Sena {
  const flor = scoreFlor(hand, vira);

  if (flor?.kind === 'reservada') {
    return { kind: 'reservada', card: null };
  }

  if (flor) {
    return { kind: 'flor', card: null };
  }

  const perico = hand.find((card) => pieceOf(card, vira) === 'perico');

  if (perico) {
    return { kind: 'perico', card: perico };
  }

  const perica = hand.find((card) => pieceOf(card, vira) === 'perica');

  if (perica) {
    return { kind: 'perica', card: perica };
  }

  const espadilla = hand.find((card) => card.rank === 1 && card.suit === 'espada');

  if (espadilla) {
    return { kind: 'espadilla', card: espadilla };
  }

  const bastillo = hand.find((card) => card.rank === 1 && card.suit === 'basto');

  if (bastillo) {
    return { kind: 'bastillo', card: bastillo };
  }

  const sieteEspada = hand.find((card) => card.rank === 7 && card.suit === 'espada');

  if (sieteEspada) {
    return { kind: 'sieteEspada', card: sieteEspada };
  }

  const sieteOro = hand.find((card) => card.rank === 7 && card.suit === 'oro');

  if (sieteOro) {
    return { kind: 'sieteOro', card: sieteOro };
  }

  return { kind: 'none', card: null };
}
