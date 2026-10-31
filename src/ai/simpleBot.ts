import { cardKey } from '../domain/cards';
import { TEAM_BY_SEAT, type Seat } from '../domain/seats';

import { cardPower } from '../engine/cards';
import type { GameAction, GameView } from '../engine/types';

function compareKeys(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
}

/**
 * A deliberately simple, deterministic card player. It only ever looks at the
 * seat's own view: its hand, the table, and the public baza. It never burns.
 */
export function chooseSimpleAction(view: GameView): GameAction {
  const legalCards = view.hand.filter((card) =>
    view.legal.playableCardKeys.includes(cardKey(card)),
  );

  if (legalCards.length === 0) {
    throw new Error(`Seat ${view.seat} has no legal card to play.`);
  }

  const sorted = [...legalCards].sort((a, b) => {
    const byPower = cardPower(a, view.vira) - cardPower(b, view.vira);
    return byPower !== 0 ? byPower : compareKeys(cardKey(a), cardKey(b));
  });

  let highestPower = Number.NEGATIVE_INFINITY;
  let highestSeat: Seat | null = null;

  for (const play of view.currentTrick) {
    if (!play.card) {
      continue;
    }

    const power = cardPower(play.card, view.vira, play.burned);

    if (power > highestPower) {
      highestPower = power;
      highestSeat = play.seat;
    }
  }

  const partner = ((view.seat + 2) % 4) as Seat;
  const partnerIsWinning =
    highestSeat !== null &&
    TEAM_BY_SEAT[highestSeat] === TEAM_BY_SEAT[view.seat] &&
    highestSeat === partner;

  const choice = partnerIsWinning
    ? sorted[0]
    : (sorted.find((card) => cardPower(card, view.vira) > highestPower) ?? sorted[0]);

  return { type: 'playCard', seat: view.seat, cardKey: cardKey(choice) };
}
