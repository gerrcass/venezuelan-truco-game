import { cardKey, SPANISH_DECK, type Card } from '../domain/cards';
import { TEAM_BY_SEAT, type Seat, type Team } from '../domain/seats';

import { cardPower, envidoTanto } from './cards';
import { hashSeed, shuffle } from './rng';
import type {
  GameAction,
  GameEvent,
  GameLogEntry,
  GameState,
  GameView,
  HandResult,
  LegalActions,
  PlayedCardView,
  TrickRecord,
  TrickView,
} from './types';

/** Seats are counterclockwise: 0 → 1 → 2 → 3. */
export function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

/** A seat's partner sits opposite. */
export function partnerOf(seat: Seat): Seat {
  return ((seat + 2) % 4) as Seat;
}

export interface CreateGameOptions {
  readonly seed: string | number;
  readonly target?: number;
  readonly dealer?: Seat;
}

const BAZAS_PER_HAND = 3;
const CARDS_PER_HAND = 3;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type GameLogDraft = DistributiveOmit<GameLogEntry, 'id'>;

function appendLog(
  state: Pick<GameState, 'log' | 'nextLogId'>,
  draft: GameLogDraft,
): Pick<GameState, 'log' | 'nextLogId'> {
  return {
    log: [...state.log, { ...draft, id: state.nextLogId } as GameLogEntry],
    nextLogId: state.nextLogId + 1,
  };
}

function dealRound(
  seed: number,
  mano: Seat,
): {
  hands: Record<Seat, readonly Card[]>;
  vira: Card;
  rngState: number;
} {
  const { items: deck, rngState } = shuffle(SPANISH_DECK, seed);
  const hands: Record<Seat, Card[]> = { 0: [], 1: [], 2: [], 3: [] };
  let cursor = 0;

  for (let round = 0; round < CARDS_PER_HAND; round += 1) {
    for (let offset = 0; offset < 4; offset += 1) {
      const seat = ((mano + offset) % 4) as Seat;
      const card = deck[cursor];

      if (!card) {
        throw new Error('The deck ran out during the deal.');
      }

      hands[seat].push(card);
      cursor += 1;
    }
  }

  const vira = deck[cursor];

  if (!vira) {
    throw new Error('The deck has no vira to turn.');
  }

  return { hands, vira, rngState };
}

interface HandSetup {
  readonly seed: number;
  readonly target: number;
  readonly dealer: Seat;
  readonly handNumber: number;
  readonly scores: Record<Team, number>;
  readonly log: readonly GameLogEntry[];
  readonly nextLogId: number;
}

function beginHand(setup: HandSetup): GameState {
  const mano = nextSeat(setup.dealer);
  const { hands, vira, rngState } = dealRound(setup.seed, mano);

  const base: GameState = {
    seed: setup.seed,
    rngState,
    target: setup.target,
    scores: setup.scores,
    dealer: setup.dealer,
    mano,
    handNumber: setup.handNumber,
    phase: 'playing',
    vira,
    hands,
    dealtHands: hands,
    turn: mano,
    lead: mano,
    trickIndex: 1,
    currentTrick: [],
    tricks: [],
    bazaWins: { nosotros: 0, ellos: 0 },
    lastTrick: null,
    result: null,
    matchWinner: null,
    playedThisHand: { 0: 0, 1: 0, 2: 0, 3: 0 },
    truco: { level: 0, acceptedByTeam: null },
    envido: { status: 'none', acceptedByTeam: null },
    flor: { declarations: [] },
    prive: { called: false },
    pending: null,
    log: setup.log,
    nextLogId: setup.nextLogId,
    event: null,
  };

  const withDeal = {
    ...base,
    ...appendLog(base, {
      kind: 'deal',
      handNumber: setup.handNumber,
      dealer: setup.dealer,
      mano,
      vira,
    }),
  };

  const withTurn = {
    ...withDeal,
    ...appendLog(withDeal, { kind: 'turn', seat: mano, baza: 1 }),
  };

  return {
    ...withTurn,
    event: { type: 'handDealt', handNumber: setup.handNumber } satisfies GameEvent,
  };
}

/**
 * Create the first reparto of a partida. The default first pie is La Comadre
 * (seat 3), so the human at seat 0 is mano, as the mesa rules require.
 */
export function createGame({ seed, target = 24, dealer = 3 }: CreateGameOptions): GameState {
  return beginHand({
    seed: hashSeed(seed),
    target,
    dealer,
    handNumber: 1,
    scores: { nosotros: 0, ellos: 0 },
    log: [],
    nextLogId: 0,
  });
}

function toTrickView(trick: TrickRecord): TrickView {
  return {
    baza: trick.baza,
    leadSeat: trick.leadSeat,
    plays: trick.plays.map((play): PlayedCardView => ({
      seat: play.seat,
      card: play.burned ? null : play.card,
      burned: play.burned,
    })),
    winnerTeam: trick.winnerTeam,
    winnerSeat: trick.winnerSeat,
    parda: trick.parda,
  };
}

/** Resolve the hand once no team can improve on the bazas already played. */
export function handWinner(
  bazaWins: Record<Team, number>,
  tricks: readonly TrickRecord[],
  mano: Seat,
): Team {
  if (bazaWins.nosotros >= 2) {
    return 'nosotros';
  }

  if (bazaWins.ellos >= 2) {
    return 'ellos';
  }

  const firstWinner = tricks.find((trick) => trick.winnerTeam !== null)?.winnerTeam;

  return firstWinner ?? TEAM_BY_SEAT[mano];
}

function resolveTrick(state: GameState): GameState {
  let bestPower = Number.NEGATIVE_INFINITY;
  let bestSeat: Seat | null = null;
  let bestCount = 0;

  for (const play of state.currentTrick) {
    const power = cardPower(play.card, state.vira, play.burned);

    if (power > bestPower) {
      bestPower = power;
      bestSeat = play.seat;
      bestCount = 1;
    } else if (power === bestPower) {
      bestCount += 1;
    }
  }

  const parda = bestCount > 1;
  const winnerSeat = parda ? null : bestSeat;
  const winnerTeam = winnerSeat === null ? null : TEAM_BY_SEAT[winnerSeat];

  const record: TrickRecord = {
    baza: state.trickIndex,
    leadSeat: state.lead,
    plays: state.currentTrick,
    winnerTeam,
    winnerSeat,
    parda,
  };

  const bazaWins: Record<Team, number> = winnerTeam
    ? { ...state.bazaWins, [winnerTeam]: state.bazaWins[winnerTeam] + 1 }
    : state.bazaWins;
  const tricks = [...state.tricks, record];

  const resolved: GameState = {
    ...state,
    currentTrick: [],
    lastTrick: record,
    bazaWins,
    tricks,
    event: {
      type: 'trickResolved',
      baza: record.baza,
      winnerTeam,
      parda,
    },
  };

  const withTrickLog = {
    ...resolved,
    ...appendLog(resolved, {
      kind: 'trick',
      baza: record.baza,
      winnerSeat,
      winnerTeam,
      parda,
    }),
  };

  const handDone =
    bazaWins.nosotros >= 2 || bazaWins.ellos >= 2 || tricks.length === BAZAS_PER_HAND;

  if (!handDone) {
    const nextLead = winnerSeat ?? record.leadSeat;
    const nextTrickIndex = state.trickIndex + 1;

    return {
      ...withTrickLog,
      turn: nextLead,
      lead: nextLead,
      trickIndex: nextTrickIndex,
      ...appendLog(withTrickLog, { kind: 'turn', seat: nextLead, baza: nextTrickIndex }),
    };
  }

  const winner = handWinner(bazaWins, tricks, state.mano);
  const score = state.scores[winner] + 1;
  const scores: Record<Team, number> = { ...state.scores, [winner]: score };
  const result: HandResult = {
    winnerTeam: winner,
    points: 1,
    reason: 'bazas',
    bazaWins,
    bazas: tricks,
    hands: state.dealtHands,
    vira: state.vira,
  };
  const matchWinner = score >= state.target ? winner : null;
  const phase = matchWinner ? 'matchOver' : 'handOver';

  const scored: GameState = {
    ...withTrickLog,
    phase,
    scores,
    result,
    matchWinner,
    event: matchWinner
      ? { type: 'matchEnded', winnerTeam: winner }
      : { type: 'handEnded', winnerTeam: winner, points: 1 },
  };

  const withPoints = {
    ...scored,
    ...appendLog(scored, { kind: 'points', team: winner, points: 1, reason: 'bazas' }),
  };

  const withHandOver = {
    ...withPoints,
    ...appendLog(withPoints, { kind: 'handOver', winnerTeam: winner, points: 1 }),
  };

  return matchWinner
    ? {
        ...withHandOver,
        ...appendLog(withHandOver, { kind: 'matchOver', winnerTeam: winner }),
      }
    : withHandOver;
}

function playCard(state: GameState, action: Extract<GameAction, { type: 'playCard' }>): GameState {
  if (state.phase !== 'playing' || state.pending !== null) {
    return state;
  }

  if (action.seat !== state.turn) {
    return state;
  }

  if (state.currentTrick.some((play) => play.seat === action.seat)) {
    return state;
  }

  const hand = state.hands[action.seat];
  const card = hand.find((candidate) => cardKey(candidate) === action.cardKey);

  if (!card) {
    return state;
  }

  const burned = action.burned === true;
  const hands: Record<Seat, readonly Card[]> = {
    ...state.hands,
    [action.seat]: hand.filter((candidate) => cardKey(candidate) !== action.cardKey),
  };
  const currentTrick = [...state.currentTrick, { seat: action.seat, card, burned }];
  const playedThisHand: Record<Seat, number> = {
    ...state.playedThisHand,
    [action.seat]: state.playedThisHand[action.seat] + 1,
  };

  const next: GameState = {
    ...state,
    hands,
    currentTrick,
    lastTrick: null,
    playedThisHand,
    turn: nextSeat(action.seat),
    event: { type: 'cardPlayed', seat: action.seat, burned },
  };

  const withLog = {
    ...next,
    ...appendLog(next, {
      kind: 'play',
      seat: action.seat,
      card: burned ? null : card,
      burned,
    }),
  };

  return currentTrick.length === 4 ? resolveTrick(withLog) : withLog;
}

function nextHand(state: GameState): GameState {
  if (state.phase !== 'handOver') {
    return state;
  }

  return beginHand({
    seed: state.rngState,
    target: state.target,
    dealer: nextSeat(state.dealer),
    handNumber: state.handNumber + 1,
    scores: state.scores,
    log: state.log,
    nextLogId: state.nextLogId,
  });
}

function rematch(state: GameState, seed?: string | number): GameState {
  if (state.phase !== 'matchOver') {
    return state;
  }

  return beginHand({
    seed: hashSeed(seed ?? state.rngState),
    target: state.target,
    dealer: nextSeat(state.dealer),
    handNumber: 1,
    scores: { nosotros: 0, ellos: 0 },
    log: [],
    nextLogId: 0,
  });
}

/** The pure reducer. Every illegal action returns the exact same state reference. */
export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'playCard':
      return playCard(state, action);
    case 'nextHand':
      return nextHand(state);
    case 'rematch':
      return rematch(state, action.seed);
    case 'callTruco':
    case 'respondTruco':
    case 'callEnvido':
    case 'respondEnvido':
    case 'callFlor':
    case 'callPrive':
    case 'fold':
      return state;
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

/** The single source of truth for UI and bots. Only the turn seat may play. */
export function getLegalActions(state: GameState, seat: Seat): LegalActions {
  const canPlay =
    state.phase === 'playing' &&
    state.pending === null &&
    state.turn === seat &&
    !state.currentTrick.some((play) => play.seat === seat);
  const playableCardKeys = canPlay ? state.hands[seat].map(cardKey) : [];

  return {
    playableCardKeys,
    canBurn: playableCardKeys.length > 0,
    canNextHand: state.phase === 'handOver',
    canRematch: state.phase === 'matchOver',
    canCallTruco: false,
    canRespondTruco: false,
    canCallEnvido: false,
    canRespondEnvido: false,
    canCallFlor: false,
    canCallPrive: false,
    canFold: false,
    trucoLevel: null,
    envidoLevel: null,
  };
}

/**
 * The only information boundary. During play a seat sees its own hand, hand
 * counts and public table state; the four hands appear only in the summary.
 */
export function viewFor(state: GameState, seat: Seat): GameView {
  const revealed = state.phase !== 'playing';
  const lastTrick = state.lastTrick ? toTrickView(state.lastTrick) : null;

  return {
    seat,
    phase: state.phase,
    handNumber: state.handNumber,
    target: state.target,
    scores: state.scores,
    stake: 1,
    dealer: state.dealer,
    mano: state.mano,
    vira: state.vira,
    hand: state.hands[seat],
    handCounts: {
      0: state.hands[0].length,
      1: state.hands[1].length,
      2: state.hands[2].length,
      3: state.hands[3].length,
    },
    turn: state.turn,
    lead: state.lead,
    trickIndex: state.trickIndex,
    currentTrick: state.currentTrick.map((play): PlayedCardView => ({
      seat: play.seat,
      card: play.burned ? null : play.card,
      burned: play.burned,
    })),
    lastTrick,
    tricks: state.tricks.map(toTrickView),
    bazaWins: state.bazaWins,
    winner: state.result?.winnerTeam ?? null,
    matchWinner: state.matchWinner,
    result: state.result,
    revealedHands: revealed ? state.dealtHands : null,
    legal: getLegalActions(state, seat),
    log: state.log,
    ownEnvido: envidoTanto(state.dealtHands[seat], state.vira),
    ownFlor: null,
    event: state.event,
  };
}
