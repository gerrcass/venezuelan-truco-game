import { cardKey, type Card } from '../domain/cards';
import { TEAM_BY_SEAT, type Seat } from '../domain/seats';

import { cardPower } from '../engine/cards';
import type { GameAction, GameView, PendingEnvidoCall, PendingTrucoCall } from '../engine/types';

/** The hand-strength lines the simple bots use. Card powers add up. */
export const BOT_STRENGTH = {
  /** Below this the hand is weak enough to decline a truco. */
  accept: 140,
  /** At or above this a bot opens or raises the truco on its own turn. */
  call: 190,
  /** At or above this a bot answers a call with a raise. */
  raise: 230,
} as const;

/** The tanto lines the bots use for envido and prive. */
export const BOT_ENVIDO = {
  /** Below this a bot declines an envido. */
  accept: 26,
  /** At or above this a bot opens an envido on its own turn. */
  call: 27,
  /** At or above this a bot raises an envido it can still raise. */
  raise: 33,
} as const;

/** A bot only calls prive for one piedra with a tanto this good. */
export const BOT_PRIVE = 29;

/** Burning hides a card that was never going to win this baza anyway. */
const BURN_POWER_CEILING = 20;

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

/** A bot burns at most once per reparto; the trick records are public. */
function hasBurned(view: GameView): boolean {
  const inTrick = (plays: readonly { seat: Seat; burned: boolean }[]) =>
    plays.some((play) => play.seat === view.seat && play.burned);

  return inTrick(view.currentTrick) || view.tricks.some((trick) => inTrick(trick.plays));
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

  if (partnerIsWinning) {
    return { type: 'playCard', seat: view.seat, cardKey: cardKey(sorted[0]) };
  }

  const winningCard = sorted.find((card) => cardPower(card, view.vira) > highestPower);

  if (winningCard) {
    return { type: 'playCard', seat: view.seat, cardKey: cardKey(winningCard) };
  }

  const throwaway = sorted[0];

  if (
    view.legal.canBurn &&
    highestPower > Number.NEGATIVE_INFINITY &&
    !hasBurned(view) &&
    throwaway &&
    cardPower(throwaway, view.vira) <= BURN_POWER_CEILING
  ) {
    return { type: 'playCard', seat: view.seat, cardKey: cardKey(throwaway), burned: true };
  }

  return { type: 'playCard', seat: view.seat, cardKey: cardKey(sorted[0]) };
}

function chooseTrucoResponse(view: GameView, pending: PendingTrucoCall): GameAction {
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

function chooseEnvidoResponse(view: GameView, pending: PendingEnvidoCall): GameAction {
  if (pending.respondingTeam !== TEAM_BY_SEAT[view.seat]) {
    throw new Error(`Seat ${view.seat} does not answer for team ${pending.respondingTeam}.`);
  }

  const tanto = view.ownEnvido;

  if (pending.level < 4 && tanto >= BOT_ENVIDO.raise) {
    return { type: 'respondEnvido', seat: view.seat, response: 'raise' };
  }

  return {
    type: 'respondEnvido',
    seat: view.seat,
    response: tanto >= BOT_ENVIDO.accept ? 'accept' : 'decline',
  };
}

function chooseResponse(view: GameView): GameAction {
  const pending = view.pending;

  if (!pending) {
    throw new Error(`Seat ${view.seat} has no call to answer.`);
  }

  return pending.kind === 'truco'
    ? chooseTrucoResponse(view, pending)
    : chooseEnvidoResponse(view, pending);
}

/**
 * A deliberately simple, deterministic table player. It only ever looks at the
 * seat's own view: its hand, the table and the public calls. It declares its
 * flor, opens envido and prive on its own terms, answers calls for its team,
 * plays the lowest card that beats the table, ducks for a winning partner, and
 * burns a hopeless low card once per reparto.
 */
export function chooseSimpleAction(view: GameView): GameAction {
  if (view.phase !== 'playing') {
    throw new Error(`Seat ${view.seat} has no action while the reparto is ${view.phase}.`);
  }

  if (view.pending !== null) {
    return chooseResponse(view);
  }

  if (view.legal.canCallFlor) {
    return { type: 'callFlor', seat: view.seat };
  }

  if (view.legal.canCallPrive && view.ownEnvido >= BOT_PRIVE) {
    return { type: 'callPrive', seat: view.seat };
  }

  if (view.legal.canCallEnvido && view.ownEnvido >= BOT_ENVIDO.call) {
    return { type: 'callEnvido', seat: view.seat };
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
