import { cardKey, type Card } from '../domain/cards';
import { partnerOf, TEAM_BY_SEAT, type PersonaKey, type Seat, type Team } from '../domain/seats';

import { BURNED_POWER, cardPower } from '../engine/cards';
import { createRng, hashSeed } from '../engine/rng';
import type { GameAction, GameView, PendingEnvidoCall, PendingTrucoCall } from '../engine/types';

import { PERSONA_PROFILES, type PersonaProfile } from './personas';

/** The sum of a hand's card powers. It only uses that seat's own cards and the public vira. */
export function handStrength(hand: readonly Card[], vira: Card): number {
  return hand.reduce((total, card) => total + cardPower(card, vira), 0);
}

/** A low card worth hiding face down. Higher cards are too useful to burn. */
const BURN_POWER_CEILING = 20;

/** How much more a bot wants before accepting a higher truco level. */
const TRUCO_PRESSURE: Record<1 | 2 | 3 | 4, number> = {
  1: 0,
  2: 10,
  3: 20,
  4: 35,
};

/** Envido levels get a little more expensive to answer. */
const ENVIDO_PRESSURE = 2;

function compareKeys(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
}

/**
 * The engine's seeded stream, reused as a tie-breaker in the bot's head. It is
 * seeded from the public view so the same view and seed always choose the same
 * action, and the shuffle remains the engine's only randomness authority.
 */
function decisionRng(view: GameView, aiSeed: number): () => number {
  const decision = view.log.length;
  const seed = hashSeed(`${aiSeed}:${view.handNumber}:${view.seat}:${decision}`);
  const rng = createRng(seed);

  return () => rng.next();
}

function chance(rng: () => number, probability: number): boolean {
  return rng() < probability;
}

interface TableRead {
  readonly highestPower: number;
  readonly highestSeat: Seat | null;
}

function readTable(view: GameView): TableRead {
  let highestPower = Number.NEGATIVE_INFINITY;
  let highestSeat: Seat | null = null;

  for (const play of view.currentTrick) {
    const power = play.card ? cardPower(play.card, view.vira, play.burned) : BURNED_POWER;

    if (power > highestPower) {
      highestPower = power;
      highestSeat = play.seat;
    }
  }

  return { highestPower, highestSeat };
}

function opponentOf(team: Team): Team {
  return team === 'nosotros' ? 'ellos' : 'nosotros';
}

/** A bot burns at most once per reparto; the trick records are public. */
function hasBurned(view: GameView): boolean {
  const inTrick = (plays: readonly { seat: Seat; burned: boolean }[]) =>
    plays.some((play) => play.seat === view.seat && play.burned);

  return inTrick(view.currentTrick) || view.tricks.some((trick) => inTrick(trick.plays));
}

function sortedByPower(view: GameView): readonly Card[] {
  const legalCards = view.hand.filter((card) =>
    view.legal.playableCardKeys.includes(cardKey(card)),
  );

  if (legalCards.length === 0) {
    throw new Error(`Seat ${view.seat} has no legal card to play.`);
  }

  return [...legalCards].sort((a, b) => {
    const byPower = cardPower(a, view.vira) - cardPower(b, view.vira);
    return byPower !== 0 ? byPower : compareKeys(cardKey(a), cardKey(b));
  });
}

function playCard(view: GameView, card: Card, burned = false): GameAction {
  return burned
    ? { type: 'playCard', seat: view.seat, cardKey: cardKey(card), burned: true }
    : { type: 'playCard', seat: view.seat, cardKey: cardKey(card) };
}

function chooseCard(view: GameView, profile: PersonaProfile, rng: () => number): GameAction {
  const sorted = sortedByPower(view);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];

  if (!lowest || !highest) {
    throw new Error(`Seat ${view.seat} has no legal card to play.`);
  }

  const table = readTable(view);
  const partnerWinning = table.highestSeat !== null && table.highestSeat === partnerOf(view.seat);

  if (partnerWinning) {
    return playCard(view, lowest);
  }

  if (view.currentTrick.length === 0 && chance(rng, profile.leadHighChance)) {
    return playCard(view, highest);
  }

  const winningCard = sorted.find((card) => cardPower(card, view.vira) > table.highestPower);

  if (winningCard) {
    return playCard(view, winningCard);
  }

  const hopeless =
    table.highestSeat !== null &&
    !hasBurned(view) &&
    cardPower(lowest, view.vira) <= BURN_POWER_CEILING;

  if (view.legal.canBurn && hopeless && chance(rng, profile.burnChance)) {
    return playCard(view, lowest, true);
  }

  return playCard(view, lowest);
}

/**
 * A fold only makes sense when the first baza is gone, the hand is weak, the
 * table cannot be beaten and the reparto is worth real piedras. Even then it is
 * a persona's rare choice, never the default.
 */
function shouldFold(view: GameView, profile: PersonaProfile, rng: () => number): boolean {
  if (!view.legal.canFold || view.stake === 1 || view.stake === 'match') {
    return false;
  }

  const team = TEAM_BY_SEAT[view.seat];
  const opponent = opponentOf(team);

  if (view.bazaWins[opponent] <= view.bazaWins[team] || view.tricks.length === 0) {
    return false;
  }

  if (handStrength(view.hand, view.vira) >= profile.foldStrength) {
    return false;
  }

  const table = readTable(view);

  if (table.highestSeat === null || table.highestSeat === partnerOf(view.seat)) {
    return false;
  }

  const best = Math.max(...view.hand.map((card) => cardPower(card, view.vira)));

  if (best > table.highestPower) {
    return false;
  }

  return chance(rng, profile.foldChance);
}

function chooseEnvidoResponse(
  view: GameView,
  pending: PendingEnvidoCall,
  profile: PersonaProfile,
): GameAction {
  const tanto = view.ownEnvido;
  const pressure = (pending.level - 1) * ENVIDO_PRESSURE;

  if (view.legal.canRespondEnvido && pending.level < 4 && tanto >= profile.envidoRaise + pressure) {
    return { type: 'respondEnvido', seat: view.seat, response: 'raise' };
  }

  return {
    type: 'respondEnvido',
    seat: view.seat,
    response: tanto >= profile.envidoAccept + pressure ? 'accept' : 'decline',
  };
}

function chooseTrucoResponse(
  view: GameView,
  pending: PendingTrucoCall,
  profile: PersonaProfile,
): GameAction {
  const strength = handStrength(view.hand, view.vira);
  const pressure = TRUCO_PRESSURE[pending.level];
  const team = TEAM_BY_SEAT[view.seat];
  const opponent = opponentOf(team);
  // Facing match point, declining may hand over the partida anyway: a bot is
  // more willing to take the risk and answer.
  const desperate = view.scores[opponent] >= view.target - 1;
  const acceptLine = profile.trucoAccept + pressure - (desperate ? 15 : 0);

  if (view.legal.canRaiseTruco && pending.level < 4 && strength >= profile.trucoRaise + pressure) {
    return { type: 'respondTruco', seat: view.seat, response: 'raise' };
  }

  return {
    type: 'respondTruco',
    seat: view.seat,
    response: strength >= acceptLine ? 'accept' : 'decline',
  };
}

function chooseResponse(view: GameView, profile: PersonaProfile): GameAction {
  const pending = view.pending;

  if (!pending) {
    throw new Error(`Seat ${view.seat} has no call to answer.`);
  }

  if (pending.respondingTeam !== TEAM_BY_SEAT[view.seat]) {
    throw new Error(`Seat ${view.seat} does not answer for team ${pending.respondingTeam}.`);
  }

  return pending.kind === 'truco'
    ? chooseTrucoResponse(view, pending, profile)
    : chooseEnvidoResponse(view, pending, profile);
}

/**
 * The three personas share one fair policy. It only reads the seat's `GameView`:
 * its own hand, the public table and the public calls. No other hand exists in
 * that object during play.
 *
 * Order: answer a canto, declare flor, call prive, open envido, open or raise
 * truco, consider a rare fold, then play a card. The engine remains the
 * authority on legality.
 */
export function chooseBotAction(view: GameView, persona: PersonaKey, aiSeed: number): GameAction {
  if (view.phase !== 'playing') {
    throw new Error(`Seat ${view.seat} has no action while the reparto is ${view.phase}.`);
  }

  if (persona === 'you') {
    throw new Error(`Seat ${view.seat} has no bot persona.`);
  }

  const profile = PERSONA_PROFILES[persona];
  const rng = decisionRng(view, aiSeed);

  if (view.pending !== null) {
    return chooseResponse(view, profile);
  }

  if (view.legal.canCallFlor) {
    return { type: 'callFlor', seat: view.seat };
  }

  if (view.legal.canCallPrive && view.ownEnvido >= profile.prive) {
    return { type: 'callPrive', seat: view.seat };
  }

  if (view.legal.canCallEnvido && view.ownEnvido >= profile.envidoCall) {
    return { type: 'callEnvido', seat: view.seat };
  }

  if (view.legal.canCallTruco && view.legal.trucoLevel !== null) {
    const strength = handStrength(view.hand, view.vira);
    const opening = view.stake === 1;
    const line = opening ? profile.trucoCall : profile.trucoRaise;

    if (strength >= line || (opening && chance(rng, profile.bluffChance))) {
      return { type: 'callTruco', seat: view.seat };
    }
  }

  if (shouldFold(view, profile, rng)) {
    return { type: 'fold', seat: view.seat };
  }

  return chooseCard(view, profile, rng);
}
