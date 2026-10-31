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
  HandReason,
  HandResult,
  LegalActions,
  PendingTrucoCall,
  PlayedCardView,
  TrickRecord,
  TrickView,
  TrucoCallLevel,
  TrucoLevel,
} from './types';

/** Seats are counterclockwise: 0 → 1 → 2 → 3. */
export function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

/** A seat's partner sits opposite. */
export function partnerOf(seat: Seat): Seat {
  return ((seat + 2) % 4) as Seat;
}

const OTHER_TEAM: Record<Team, Team> = { nosotros: 'ellos', ellos: 'nosotros' };

/** The accepted stake for a truco level: 1, 3, 6, 9 or the partida. */
export function stakeForLevel(level: TrucoLevel): number | 'match' {
  switch (level) {
    case 0:
      return 1;
    case 1:
      return 3;
    case 2:
      return 6;
    case 3:
      return 9;
    case 4:
      return 'match';
    default: {
      const exhaustive: never = level;
      return exhaustive;
    }
  }
}

/** What the caller's team takes when a call at `level` is declined. */
export function declinePayout(level: TrucoCallLevel): number {
  switch (level) {
    case 1:
      return 1;
    case 2:
      return 3;
    case 3:
      return 6;
    case 4:
      return 9;
    default: {
      const exhaustive: never = level;
      return exhaustive;
    }
  }
}

/**
 * The seat the table is waiting on. A pending call is a team decision, so when
 * the turn seat is the caller we pick its next opponent to answer; after a
 * raise the turn seat is already on the responding team.
 */
export function actingSeat(state: GameState): Seat {
  if (state.phase !== 'playing' || state.pending === null) {
    return state.turn;
  }

  return TEAM_BY_SEAT[state.turn] === state.pending.respondingTeam
    ? state.turn
    : nextSeat(state.turn);
}

export interface CreateGameOptions {
  readonly seed: string | number;
  readonly target?: number;
  readonly dealer?: Seat;
}

export const BAZAS_PER_HAND = 3;
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

interface HandOutcome {
  readonly winnerTeam: Team;
  readonly points: number | 'match';
  readonly reason: HandReason;
  readonly trucoLevel: TrucoLevel;
}

/**
 * Close the reparto: pay the winner, clamp the score at the target, and decide
 * whether the partida is over. A vale juego payout sets the winner to 24; the
 * loser keeps their score.
 */
function finishHand(state: GameState, outcome: HandOutcome): GameState {
  const rawScore =
    outcome.points === 'match' ? state.target : state.scores[outcome.winnerTeam] + outcome.points;
  const score = Math.min(state.target, rawScore);
  const scores: Record<Team, number> = { ...state.scores, [outcome.winnerTeam]: score };
  const matchWinner = score >= state.target ? outcome.winnerTeam : null;
  const phase = matchWinner ? 'matchOver' : 'handOver';
  const result: HandResult = {
    winnerTeam: outcome.winnerTeam,
    points: outcome.points,
    reason: outcome.reason,
    trucoLevel: outcome.trucoLevel,
    bazaWins: state.bazaWins,
    bazas: state.tricks,
    hands: state.dealtHands,
    vira: state.vira,
  };

  const resolved: GameState = {
    ...state,
    phase,
    scores,
    result,
    matchWinner,
    pending: null,
    event: matchWinner
      ? { type: 'matchEnded', winnerTeam: outcome.winnerTeam }
      : {
          type: 'handEnded',
          winnerTeam: outcome.winnerTeam,
          points: outcome.points,
          reason: outcome.reason,
        },
  };

  const withPoints = {
    ...resolved,
    ...appendLog(resolved, {
      kind: 'points',
      team: outcome.winnerTeam,
      points: outcome.points,
      reason: outcome.reason,
      level: outcome.trucoLevel,
    }),
  };

  const withHandOver = {
    ...withPoints,
    ...appendLog(withPoints, {
      kind: 'handOver',
      winnerTeam: outcome.winnerTeam,
      points: outcome.points,
      reason: outcome.reason,
    }),
  };

  return matchWinner
    ? {
        ...withHandOver,
        ...appendLog(withHandOver, { kind: 'matchOver', winnerTeam: outcome.winnerTeam }),
      }
    : withHandOver;
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

  return finishHand(withTrickLog, {
    winnerTeam: winner,
    points: stakeForLevel(state.truco.level),
    reason: 'bazas',
    trucoLevel: state.truco.level,
  });
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

function callTruco(state: GameState, seat: Seat): GameState {
  if (state.phase !== 'playing' || state.pending !== null || state.turn !== seat) {
    return state;
  }

  const team = TEAM_BY_SEAT[seat];
  const accepted = state.truco.level;
  const mayCall = accepted === 0 || (accepted < 4 && state.truco.acceptedByTeam === team);

  if (!mayCall) {
    return state;
  }

  const level = (accepted + 1) as TrucoCallLevel;
  const pending: PendingTrucoCall = {
    kind: 'truco',
    level,
    callerSeat: seat,
    callerTeam: team,
    respondingTeam: OTHER_TEAM[team],
    returnSeat: state.turn,
  };
  const called: GameState = {
    ...state,
    pending,
    event: { type: 'trucoCalled', seat, team, level },
  };

  return {
    ...called,
    ...appendLog(called, { kind: 'call', seat, team, call: 'truco', level }),
  };
}

function respondTruco(
  state: GameState,
  action: Extract<GameAction, { type: 'respondTruco' }>,
): GameState {
  if (state.phase !== 'playing') {
    return state;
  }

  const pending = state.pending;

  if (!pending || pending.kind !== 'truco') {
    return state;
  }

  const team = TEAM_BY_SEAT[action.seat];

  if (team !== pending.respondingTeam) {
    return state;
  }

  const responded: GameState = {
    ...state,
    event: {
      type: 'trucoResponded',
      seat: action.seat,
      team,
      level: pending.level,
      response: action.response,
    },
  };
  const withLog = {
    ...responded,
    ...appendLog(responded, {
      kind: 'respond',
      seat: action.seat,
      team,
      call: 'truco',
      level: pending.level,
      response: action.response,
    }),
  };

  if (action.response === 'accept') {
    return {
      ...withLog,
      truco: { level: pending.level, acceptedByTeam: team },
      pending: null,
      turn: pending.returnSeat,
    };
  }

  if (action.response === 'decline') {
    return finishHand(
      { ...withLog, pending: null },
      {
        winnerTeam: pending.callerTeam,
        points: declinePayout(pending.level),
        reason: 'decline',
        trucoLevel: (pending.level - 1) as TrucoLevel,
      },
    );
  }

  if (pending.level === 4) {
    return state;
  }

  const raisedLevel = (pending.level + 1) as TrucoCallLevel;
  const raisedPending: PendingTrucoCall = {
    kind: 'truco',
    level: raisedLevel,
    callerSeat: action.seat,
    callerTeam: team,
    respondingTeam: pending.callerTeam,
    returnSeat: pending.returnSeat,
  };

  return {
    ...withLog,
    truco: { level: pending.level, acceptedByTeam: team },
    pending: raisedPending,
  };
}

function fold(state: GameState, seat: Seat): GameState {
  if (state.phase !== 'playing' || state.pending !== null || state.turn !== seat) {
    return state;
  }

  const team = TEAM_BY_SEAT[seat];
  const folded: GameState = {
    ...state,
    event: { type: 'folded', seat, team },
  };
  const withLog = {
    ...folded,
    ...appendLog(folded, { kind: 'fold', seat, team }),
  };

  return finishHand(withLog, {
    winnerTeam: OTHER_TEAM[team],
    points: stakeForLevel(state.truco.level),
    reason: 'fold',
    trucoLevel: state.truco.level,
  });
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
    seed: hashSeed(seed ?? state.rngState + 1),
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
      return callTruco(state, action.seat);
    case 'respondTruco':
      return respondTruco(state, action);
    case 'fold':
      return fold(state, action.seat);
    case 'callEnvido':
    case 'respondEnvido':
    case 'callFlor':
    case 'callPrive':
      return state;
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

/** The single source of truth for UI and bots. Only the turn seat may play. */
export function getLegalActions(state: GameState, seat: Seat): LegalActions {
  const isPlaying = state.phase === 'playing';
  const onTurn = isPlaying && state.turn === seat;
  const canPlay =
    onTurn && state.pending === null && !state.currentTrick.some((play) => play.seat === seat);
  const playableCardKeys = canPlay ? state.hands[seat].map(cardKey) : [];
  const team = TEAM_BY_SEAT[seat];
  const pendingTruco = state.pending?.kind === 'truco' ? state.pending : null;
  const canRespondTruco =
    isPlaying && pendingTruco !== null && pendingTruco.respondingTeam === team;
  const canCallTruco =
    onTurn &&
    state.pending === null &&
    (state.truco.level === 0 || (state.truco.level < 4 && state.truco.acceptedByTeam === team));
  const canRaiseTruco = canRespondTruco && pendingTruco !== null && pendingTruco.level < 4;
  const trucoRaiseLevel: TrucoCallLevel | null =
    canRaiseTruco && pendingTruco !== null ? ((pendingTruco.level + 1) as TrucoCallLevel) : null;

  return {
    playableCardKeys,
    canBurn: playableCardKeys.length > 0,
    canNextHand: state.phase === 'handOver',
    canRematch: state.phase === 'matchOver',
    canCallTruco,
    trucoLevel: canCallTruco ? ((state.truco.level + 1) as TrucoCallLevel) : null,
    canRespondTruco,
    canRaiseTruco,
    trucoRaiseLevel,
    canCallEnvido: false,
    canRespondEnvido: false,
    canCallFlor: false,
    canCallPrive: false,
    canFold: onTurn && state.pending === null,
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
    stake: stakeForLevel(state.truco.level),
    pending: state.pending,
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
