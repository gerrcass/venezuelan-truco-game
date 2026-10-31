import { cardKey, SPANISH_DECK, type Card } from '../domain/cards';
import { SEATS, TEAM_BY_SEAT, type Seat, type Team } from '../domain/seats';

import { cardPower, envidoTanto, florValue, scoreFlor } from './cards';
import { hashSeed, shuffle } from './rng';
import { computeSena } from './sena';
import type {
  EnvidoLevel,
  EnvidoResult,
  EnvidoState,
  FlorDeclaration,
  FlorResult,
  GameAction,
  GameEvent,
  GameLogEntry,
  GameState,
  GameView,
  HandReason,
  HandResult,
  LegalActions,
  PendingEnvidoCall,
  PendingTrucoCall,
  PlayedCardView,
  PriveResult,
  Settlement,
  SettlementDetail,
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

/** What the caller's team takes when a truco at `level` is declined. */
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
 * The accepted envido stake. La falta is fixed at acceptance time: the
 * leader's distance to 24, never less than one piedra.
 */
export function envidoStake(
  level: EnvidoLevel,
  scores: Record<Team, number>,
  target: number,
): number {
  switch (level) {
    case 1:
      return 2;
    case 2:
      return 4;
    case 3:
      return 7;
    case 4:
      return Math.max(1, target - Math.max(scores.nosotros, scores.ellos));
    default: {
      const exhaustive: never = level;
      return exhaustive;
    }
  }
}

/** What the caller takes when an envido at `level` is declined. */
export function envidoDeclinePayout(level: EnvidoLevel): number {
  switch (level) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 4;
    case 4:
      return 7;
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

/** A reservada (perico + perica) is declared automatically when the hand is dealt. */
function autoFlorDeclarations(
  hands: Record<Seat, readonly Card[]>,
  vira: Card,
): readonly FlorDeclaration[] {
  return SEATS.flatMap((seat) => {
    const score = scoreFlor(hands[seat], vira);

    if (score?.kind !== 'reservada') {
      return [];
    }

    return [
      {
        seat,
        team: TEAM_BY_SEAT[seat],
        kind: 'reservada' as const,
        value: score.value,
      },
    ];
  });
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
  const declarations = autoFlorDeclarations(hands, vira);

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
    envido: {
      status: 'none',
      level: null,
      stake: null,
      callerTeam: null,
      acceptedByTeam: null,
      tantos: null,
    },
    flor: {
      declarations,
      settled: false,
      winnerTeam: null,
      winnerSeat: null,
      points: 0,
    },
    prive: { called: false, callerTeam: null, winnerTeam: null, points: 0, tantos: null },
    settlements: [],
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

  const withFlors = declarations.reduce(
    (current, declaration) => ({
      ...current,
      ...appendLog(current, {
        kind: 'call',
        seat: declaration.seat,
        team: declaration.team,
        call: 'flor',
        flor: declaration.kind,
        value: declaration.value,
      }),
    }),
    withDeal,
  );

  const withTurn = {
    ...withFlors,
    ...appendLog(withFlors, { kind: 'turn', seat: mano, baza: 1 }),
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

/** The better tanto of each partnership, from the hands as dealt. */
export function teamTantos(hands: Record<Seat, readonly Card[]>, vira: Card): Record<Team, number> {
  return {
    nosotros: Math.max(envidoTanto(hands[0], vira), envidoTanto(hands[2], vira)),
    ellos: Math.max(envidoTanto(hands[1], vira), envidoTanto(hands[3], vira)),
  };
}

/** The better tanto wins; a tie goes to the mano's team. */
export function tantoWinner(tantos: Record<Team, number>, mano: Seat): Team {
  if (tantos.nosotros === tantos.ellos) {
    return TEAM_BY_SEAT[mano];
  }

  return tantos.nosotros > tantos.ellos ? 'nosotros' : 'ellos';
}

const SETTLEMENT_ORDER: Record<Settlement['kind'], number> = {
  flor: 0,
  prive: 1,
  envido: 2,
  truco: 3,
};

/** The ledger always reads flor → prive → envido → truco, however it was paid. */
function orderSettlements(settlements: readonly Settlement[]): readonly Settlement[] {
  return settlements
    .map((settlement, index) => ({ settlement, index }))
    .sort((a, b) => {
      const byKind = SETTLEMENT_ORDER[a.settlement.kind] - SETTLEMENT_ORDER[b.settlement.kind];
      return byKind !== 0 ? byKind : a.index - b.index;
    })
    .map((entry) => entry.settlement);
}

function reachedTarget(state: GameState): Team | null {
  if (state.scores.nosotros >= state.target) {
    return 'nosotros';
  }

  if (state.scores.ellos >= state.target) {
    return 'ellos';
  }

  return null;
}

/** The single place where piedras are added to the score, and the ledger grows. */
function award(state: GameState, settlement: Settlement): GameState {
  const scores: Record<Team, number> = {
    ...state.scores,
    [settlement.team]: Math.min(state.target, state.scores[settlement.team] + settlement.points),
  };
  const next: GameState = {
    ...state,
    scores,
    settlements: [...state.settlements, settlement],
  };
  const withLog = { ...next, ...appendLog(next, { kind: 'points', settlement }) };

  return { ...withLog, event: { type: 'pointsAwarded', settlement } };
}

/** The best flor declaration of one team, or null. */
function bestFlorFor(state: GameState, team: Team): FlorDeclaration | null {
  let best: FlorDeclaration | null = null;

  for (const declaration of state.flor.declarations) {
    if (declaration.team !== team) {
      continue;
    }

    if (!best || florValue(declaration) > florValue(best)) {
      best = declaration;
    }
  }

  return best;
}

/**
 * Pay the flors of the reparto. A reservada beats every numeric flor; a numeric
 * tie goes to the mano's team. Only the winning team is paid. Settled once.
 */
function settleFlor(state: GameState): GameState {
  if (state.flor.settled) {
    return state;
  }

  const ours = bestFlorFor(state, 'nosotros');
  const theirs = bestFlorFor(state, 'ellos');

  if (!ours && !theirs) {
    return { ...state, flor: { ...state.flor, settled: true } };
  }

  let winnerTeam: Team;

  if (!ours) {
    winnerTeam = 'ellos';
  } else if (!theirs) {
    winnerTeam = 'nosotros';
  } else {
    const oursValue = florValue(ours);
    const theirsValue = florValue(theirs);
    winnerTeam =
      oursValue === theirsValue
        ? TEAM_BY_SEAT[state.mano]
        : oursValue > theirsValue
          ? 'nosotros'
          : 'ellos';
  }

  const winner = winnerTeam === 'nosotros' ? ours : theirs;

  if (!winner) {
    return { ...state, flor: { ...state.flor, settled: true } };
  }

  const points = winner.kind === 'reservada' ? 5 : 3;
  const tantos: Record<Team, number> = {
    nosotros: ours ? florValue(ours) : 0,
    ellos: theirs ? florValue(theirs) : 0,
  };
  const settled: GameState = {
    ...state,
    flor: {
      ...state.flor,
      settled: true,
      winnerTeam,
      winnerSeat: winner.seat,
      points,
    },
  };

  return award(settled, {
    kind: 'flor',
    team: winnerTeam,
    points,
    detail: winner.kind === 'reservada' ? 'reservada' : undefined,
    tantos,
  });
}

/** Pay an accepted or declined envido. Computed from the hands as dealt. */
function settleEnvido(state: GameState): GameState {
  const envido = state.envido;

  if (envido.status !== 'accepted' && envido.status !== 'declined') {
    return state;
  }

  const level = envido.level ?? 1;

  if (envido.status === 'declined') {
    const callerTeam = envido.callerTeam ?? TEAM_BY_SEAT[state.mano];
    const points = envido.stake ?? envidoDeclinePayout(level);

    return award(state, {
      kind: 'envido',
      team: callerTeam,
      points,
      detail: 'declined',
      level,
    });
  }

  const tantos = teamTantos(state.dealtHands, state.vira);
  const winnerTeam = tantoWinner(tantos, state.mano);
  const points = envido.stake ?? envidoStake(level, state.scores, state.target);
  const resolved: EnvidoState = { ...envido, tantos };

  return award(
    { ...state, envido: resolved },
    {
      kind: 'envido',
      team: winnerTeam,
      points,
      detail: 'accepted',
      tantos,
      level,
    },
  );
}

interface HandOutcome {
  readonly winnerTeam: Team;
  readonly points: number | 'match';
  readonly reason: HandReason;
  readonly trucoLevel: TrucoLevel;
}

function envidoResultFrom(settlements: readonly Settlement[]): EnvidoResult | null {
  const row = settlements.find((settlement) => settlement.kind === 'envido');

  if (!row || (row.detail !== 'accepted' && row.detail !== 'declined')) {
    return null;
  }

  return {
    winnerTeam: row.team,
    points: row.points,
    detail: row.detail,
    level: (row.level as EnvidoLevel | undefined) ?? 1,
    tantos: row.tantos ?? null,
  };
}

function florResultFrom(state: GameState, settlements: readonly Settlement[]): FlorResult | null {
  const row = settlements.find((settlement) => settlement.kind === 'flor');

  if (!row) {
    return null;
  }

  return {
    winnerTeam: row.team,
    winnerSeat: state.flor.winnerSeat,
    kind: row.detail === 'reservada' ? 'reservada' : 'flor',
    points: row.points,
    tantos: row.tantos ?? { nosotros: 0, ellos: 0 },
  };
}

function priveResultFrom(state: GameState, settlements: readonly Settlement[]): PriveResult | null {
  const row = settlements.find((settlement) => settlement.kind === 'prive');

  if (!row || !row.tantos) {
    return null;
  }

  return {
    callerTeam: state.prive.callerTeam ?? row.team,
    winnerTeam: row.team,
    points: row.points,
    tantos: row.tantos,
  };
}

/**
 * Close the reparto: freeze the ledger into the result, clamp the scores at the
 * target, and decide whether the partida is over. The later settlements have
 * already been skipped by the caller when a team reached 24.
 */
function closeHand(state: GameState, outcome: HandOutcome): GameState {
  const reached = reachedTarget(state);
  const matchWinner = reached ?? null;
  const winnerTeam = matchWinner ?? outcome.winnerTeam;
  const phase = matchWinner ? 'matchOver' : 'handOver';
  const settlements = orderSettlements(state.settlements);
  const result: HandResult = {
    winnerTeam,
    points: outcome.points,
    reason: outcome.reason,
    trucoLevel: outcome.trucoLevel,
    bazaWins: state.bazaWins,
    bazas: state.tricks,
    hands: state.dealtHands,
    vira: state.vira,
    settlements,
    totalPoints: settlements.reduce((total, settlement) => total + settlement.points, 0),
    envidoResult: envidoResultFrom(settlements),
    florResult: florResultFrom(state, settlements),
    priveResult: priveResultFrom(state, settlements),
  };

  const resolved: GameState = {
    ...state,
    phase,
    scores: {
      nosotros: Math.min(state.target, state.scores.nosotros),
      ellos: Math.min(state.target, state.scores.ellos),
    },
    result,
    matchWinner,
    pending: null,
    event: matchWinner
      ? { type: 'matchEnded', winnerTeam }
      : {
          type: 'handEnded',
          winnerTeam,
          points: outcome.points,
          reason: outcome.reason,
        },
  };

  const withHandOver = {
    ...resolved,
    ...appendLog(resolved, {
      kind: 'handOver',
      winnerTeam,
      points: outcome.points,
      reason: outcome.reason,
      matchOver: matchWinner !== null,
    }),
  };

  return matchWinner
    ? {
        ...withHandOver,
        ...appendLog(withHandOver, { kind: 'matchOver', winnerTeam }),
      }
    : withHandOver;
}

/**
 * Settle the lances in the rules order — flor, prive (already paid), envido —
 * then the truco/hand payout. A settlement that reaches 24 stops the hand and
 * the later payouts are not made.
 */
function finishHand(state: GameState, outcome: HandOutcome): GameState {
  let current = state;

  if (!current.flor.settled) {
    current = settleFlor(current);
  }

  const florReached = reachedTarget(current);

  if (florReached) {
    return closeHand(current, {
      winnerTeam: florReached,
      points: 0,
      reason: 'flor',
      trucoLevel: current.truco.level,
    });
  }

  if (current.envido.status === 'accepted' || current.envido.status === 'declined') {
    current = settleEnvido(current);
    const envidoReached = reachedTarget(current);

    if (envidoReached) {
      return closeHand(current, {
        winnerTeam: envidoReached,
        points: 0,
        reason: 'envido',
        trucoLevel: current.truco.level,
      });
    }
  }

  const points = outcome.points;
  const settlementPoints =
    points === 'match' ? Math.max(1, current.target - current.scores[outcome.winnerTeam]) : points;
  const detail: SettlementDetail =
    points === 'match'
      ? 'match'
      : outcome.reason === 'decline'
        ? 'declined'
        : outcome.reason === 'fold'
          ? 'fold'
          : 'bazas';

  current = award(current, {
    kind: 'truco',
    team: outcome.winnerTeam,
    points: settlementPoints,
    detail,
    level: outcome.trucoLevel,
  });

  return closeHand(current, outcome);
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

  // Flors settle when the first baza closes, so both teams can still declare.
  let current: GameState = withTrickLog;

  if (!current.flor.settled) {
    current = settleFlor(current);
    const florReached = reachedTarget(current);

    if (florReached) {
      return closeHand(current, {
        winnerTeam: florReached,
        points: 0,
        reason: 'flor',
        trucoLevel: current.truco.level,
      });
    }
  }

  const handDone =
    current.bazaWins.nosotros >= 2 ||
    current.bazaWins.ellos >= 2 ||
    current.tricks.length === BAZAS_PER_HAND;

  if (!handDone) {
    const nextLead = winnerSeat ?? record.leadSeat;
    const nextTrickIndex = current.trickIndex + 1;

    return {
      ...current,
      turn: nextLead,
      lead: nextLead,
      trickIndex: nextTrickIndex,
      ...appendLog(current, { kind: 'turn', seat: nextLead, baza: nextTrickIndex }),
    };
  }

  const winner = handWinner(current.bazaWins, current.tricks, current.mano);

  return finishHand(current, {
    winnerTeam: winner,
    points: stakeForLevel(current.truco.level),
    reason: 'bazas',
    trucoLevel: current.truco.level,
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

/** Envido may be opened only before the first card, on your turn, with a clean table. */
function canOpenEnvido(state: GameState, seat: Seat): boolean {
  return (
    state.phase === 'playing' &&
    state.pending === null &&
    state.turn === seat &&
    state.currentTrick.length === 0 &&
    state.tricks.length === 0 &&
    state.envido.status === 'none' &&
    state.flor.declarations.length === 0 &&
    !state.prive.called
  );
}

function callEnvido(state: GameState, seat: Seat): GameState {
  if (!canOpenEnvido(state, seat)) {
    return state;
  }

  const team = TEAM_BY_SEAT[seat];
  const pending: PendingEnvidoCall = {
    kind: 'envido',
    level: 1,
    callerSeat: seat,
    callerTeam: team,
    respondingTeam: OTHER_TEAM[team],
    returnSeat: state.turn,
  };
  const called: GameState = {
    ...state,
    pending,
    envido: {
      status: 'pending',
      level: 1,
      stake: null,
      callerTeam: team,
      acceptedByTeam: null,
      tantos: null,
    },
    event: { type: 'envidoCalled', seat, team, level: 1 },
  };

  return {
    ...called,
    ...appendLog(called, { kind: 'call', seat, team, call: 'envido', level: 1 }),
  };
}

function respondEnvido(
  state: GameState,
  action: Extract<GameAction, { type: 'respondEnvido' }>,
): GameState {
  if (state.phase !== 'playing') {
    return state;
  }

  const pending = state.pending;

  if (!pending || pending.kind !== 'envido') {
    return state;
  }

  const team = TEAM_BY_SEAT[action.seat];

  if (team !== pending.respondingTeam) {
    return state;
  }

  if (action.response === 'raise' && pending.level === 4) {
    return state;
  }

  const responded: GameState = {
    ...state,
    event: {
      type: 'envidoResponded',
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
      call: 'envido',
      level: pending.level,
      response: action.response,
    }),
  };

  if (action.response === 'accept') {
    const stake = envidoStake(pending.level, state.scores, state.target);

    return {
      ...withLog,
      pending: null,
      turn: pending.returnSeat,
      envido: {
        status: 'accepted',
        level: pending.level,
        stake,
        callerTeam: pending.callerTeam,
        acceptedByTeam: team,
        tantos: null,
      },
    };
  }

  if (action.response === 'decline') {
    return {
      ...withLog,
      pending: null,
      turn: pending.returnSeat,
      envido: {
        status: 'declined',
        level: pending.level,
        stake: envidoDeclinePayout(pending.level),
        callerTeam: pending.callerTeam,
        acceptedByTeam: null,
        tantos: null,
      },
    };
  }

  const raisedLevel = (pending.level + 1) as EnvidoLevel;
  const raisedPending: PendingEnvidoCall = {
    kind: 'envido',
    level: raisedLevel,
    callerSeat: action.seat,
    callerTeam: team,
    respondingTeam: pending.callerTeam,
    returnSeat: pending.returnSeat,
  };

  return {
    ...withLog,
    pending: raisedPending,
    envido: {
      status: 'pending',
      level: raisedLevel,
      stake: null,
      callerTeam: team,
      acceptedByTeam: team,
      tantos: null,
    },
  };
}

/** Flor por derecho: before your first card, on your turn or while answering a canto. */
function canDeclareFlor(state: GameState, seat: Seat): boolean {
  if (state.phase !== 'playing' || state.hands[seat].length !== CARDS_PER_HAND) {
    return false;
  }

  if (state.flor.declarations.some((declaration) => declaration.seat === seat)) {
    return false;
  }

  if (scoreFlor(state.hands[seat], state.vira) === null) {
    return false;
  }

  const team = TEAM_BY_SEAT[seat];
  const isTurn = state.pending === null && state.turn === seat;
  const answersCanto = state.pending !== null && state.pending.respondingTeam === team;

  return isTurn || answersCanto;
}

function callFlor(state: GameState, seat: Seat): GameState {
  if (!canDeclareFlor(state, seat)) {
    return state;
  }

  const score = scoreFlor(state.hands[seat], state.vira);

  if (!score) {
    return state;
  }

  const team = TEAM_BY_SEAT[seat];
  const declaration: FlorDeclaration = {
    seat,
    team,
    kind: score.kind,
    value: score.value,
  };
  const pending = state.pending;
  const cancelledEnvido = state.envido.status !== 'none' && state.envido.status !== 'cancelled';
  const clearingEnvido = pending?.kind === 'envido';
  const next: GameState = {
    ...state,
    flor: { ...state.flor, declarations: [...state.flor.declarations, declaration] },
    envido: cancelledEnvido
      ? { ...state.envido, status: 'cancelled', stake: null, tantos: null }
      : state.envido,
    pending: clearingEnvido ? null : state.pending,
    turn: clearingEnvido && pending ? pending.returnSeat : state.turn,
    event: { type: 'florCalled', seat, team, kind: score.kind, value: score.value },
  };

  return {
    ...next,
    ...appendLog(next, {
      kind: 'call',
      seat,
      team,
      call: 'flor',
      flor: score.kind,
      value: score.value,
    }),
  };
}

/** Prive: the team at 23 compares tantos for one piedra, once per reparto. */
function canOpenPrive(state: GameState, seat: Seat): boolean {
  const team = TEAM_BY_SEAT[seat];

  return (
    state.phase === 'playing' &&
    state.pending === null &&
    state.turn === seat &&
    state.currentTrick.length === 0 &&
    state.tricks.length === 0 &&
    state.envido.status === 'none' &&
    state.flor.declarations.length === 0 &&
    !state.prive.called &&
    state.scores[team] === state.target - 1
  );
}

function callPrive(state: GameState, seat: Seat): GameState {
  if (!canOpenPrive(state, seat)) {
    return state;
  }

  const team = TEAM_BY_SEAT[seat];
  const tantos = teamTantos(state.dealtHands, state.vira);
  const winnerTeam = tantoWinner(tantos, state.mano);
  const called: GameState = {
    ...state,
    prive: {
      called: true,
      callerTeam: team,
      winnerTeam,
      points: 1,
      tantos,
    },
    envido: {
      ...state.envido,
      status: 'cancelled',
      stake: null,
      tantos: null,
    },
    event: { type: 'priveCalled', seat, team },
  };
  const withLog = {
    ...called,
    ...appendLog(called, { kind: 'call', seat, team, call: 'prive' }),
  };
  const paid = award(withLog, { kind: 'prive', team: winnerTeam, points: 1, tantos });
  const reached = reachedTarget(paid);

  if (reached) {
    return closeHand(paid, {
      winnerTeam: reached,
      points: 0,
      reason: 'prive',
      trucoLevel: paid.truco.level,
    });
  }

  return paid;
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
    case 'callEnvido':
      return callEnvido(state, action.seat);
    case 'respondEnvido':
      return respondEnvido(state, action);
    case 'callFlor':
      return callFlor(state, action.seat);
    case 'callPrive':
      return callPrive(state, action.seat);
    case 'fold':
      return fold(state, action.seat);
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
  const pendingEnvido = state.pending?.kind === 'envido' ? state.pending : null;
  const canRespondTruco =
    isPlaying && pendingTruco !== null && pendingTruco.respondingTeam === team;
  const canCallTruco =
    onTurn &&
    state.pending === null &&
    (state.truco.level === 0 || (state.truco.level < 4 && state.truco.acceptedByTeam === team));
  const canRaiseTruco = canRespondTruco && pendingTruco !== null && pendingTruco.level < 4;
  const trucoRaiseLevel: TrucoCallLevel | null =
    canRaiseTruco && pendingTruco !== null ? ((pendingTruco.level + 1) as TrucoCallLevel) : null;
  const canRespondEnvido =
    isPlaying && pendingEnvido !== null && pendingEnvido.respondingTeam === team;
  const cleanTable = state.currentTrick.length === 0 && state.tricks.length === 0;
  const canCallEnvido =
    onTurn &&
    state.pending === null &&
    cleanTable &&
    state.envido.status === 'none' &&
    state.flor.declarations.length === 0 &&
    !state.prive.called;
  const canCallFlor = canDeclareFlor(state, seat);
  const canCallPrive =
    onTurn &&
    state.pending === null &&
    cleanTable &&
    state.envido.status === 'none' &&
    state.flor.declarations.length === 0 &&
    !state.prive.called &&
    state.scores[team] === state.target - 1;

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
    canCallEnvido,
    canRespondEnvido,
    canCallFlor,
    canCallPrive,
    canFold: onTurn && state.pending === null,
    envidoLevel: pendingEnvido?.level ?? (canCallEnvido ? 1 : null),
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
    seed: state.seed,
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
    ownFlor: scoreFlor(state.dealtHands[seat], state.vira),
    sena: seat === 0 ? computeSena(state.dealtHands[2], state.vira) : null,
    envido: state.envido,
    flor: state.flor,
    prive: state.prive,
    settlements: state.settlements,
    event: state.event,
  };
}
