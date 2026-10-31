import { cardKey, type Card } from '../domain/cards';
import { TEAM_BY_SEAT, type Seat } from '../domain/seats';

import { cardPower } from '../engine/cards';
import type { GameAction, GameView } from '../engine/types';

/** The hand-strength lines the simple bots use. Card powers add up. */
export const BOT_STRENGTH = {
  /** Below this the hand is weak enough to decline a truco. */
  accept: 140,
  /** At or above this a bot opens or raises the truco on its own turn. */
  call: 190,
  /** At or above this a bot answers a call with a raise. */
  raise: 230,
} as const;

function compareKeys(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
}

/**
 * A rough strength score for one hand: pieces and matas dominate, 3s and 2s
 * are solid, court cards are cheap. It only sees the cards in that seat's hand
 * and the public vira.
 */
export function handStrength(hand: readonly Card[], vira: Card): number {
  return hand.reduce((total, card) => total + cardPower(card, vira), 0);
}

function chooseCard(view: GameView): GameAction {
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

function chooseResponse(view: GameView): GameAction {
  const pending = view.pending;

  if (!pending || pending.kind !== 'truco') {
    throw new Error(`Seat ${view.seat} has no truco call to answer.`);
  }

  if (pending.respondingTeam !== TEAM_BY_SEAT[view.seat]) {
    throw new Error(`Seat ${view.seat} does not answer for team ${pending.respondingTeam}.`);
  }

  const strength = handStrength(view.hand, view.vira);

  if (view.legal.canRaiseTruco && strength >= BOT_STRENGTH.raise) {
    return { type: 'respondTruco', seat: view.seat, response: 'raise' };
  }

  return {
    type: 'respondTruco',
    seat: view.seat,
    response: strength >= BOT_STRENGTH.accept ? 'accept' : 'decline',
  };
}

/**
 * A deliberately simple, deterministic table player. It only ever looks at the
 * seat's own view: its hand, the table and the public call. It answers a call
 * for its own team, opens the truco with a strong hand, and otherwise plays the
 * lowest card that beats the table while ducking when its partner is winning.
 */
export function chooseSimpleAction(view: GameView): GameAction {
  if (view.phase !== 'playing') {
    throw new Error(`Seat ${view.seat} has no action while the reparto is ${view.phase}.`);
  }

  if (view.pending !== null) {
    return chooseResponse(view);
  }

  if (
    view.legal.canCallTruco &&
    view.legal.trucoLevel !== null &&
    handStrength(view.hand, view.vira) >= BOT_STRENGTH.call
  ) {
    return { type: 'callTruco', seat: view.seat };
  }

  return chooseCard(view);
}
