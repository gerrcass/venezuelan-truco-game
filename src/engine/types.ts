import type { Card } from '../domain/cards';
import type { Seat, Team } from '../domain/seats';

import type { FlorScore } from './cards';

/** The three phases of a partida. */
export type Phase = 'playing' | 'handOver' | 'matchOver';

/** Why a reparto was awarded. */
export type HandReason = 'bazas' | 'decline' | 'fold' | 'envido' | 'flor' | 'prive';

/**
 * The truco ladder. 0 means no call has been accepted, 1–3 are truco,
 * retruco and vale nueve, and 4 is vale juego (the reparto decides the partida).
 */
export type TrucoLevel = 0 | 1 | 2 | 3 | 4;

/** A level that can actually be called or raised to. */
export type TrucoCallLevel = Exclude<TrucoLevel, 0>;

/** The envido ladder: Envido, Quiero y envido, 5 piedras más, la falta. */
export type EnvidoLevel = 1 | 2 | 3 | 4;

/** The state of the envido call. */
export type EnvidoStatus = 'none' | 'pending' | 'accepted' | 'declined' | 'cancelled';

/** Every point source in a reparto. */
export type SettlementKind = 'flor' | 'prive' | 'envido' | 'truco';

/** How a settlement was reached, for the itemized ledger. */
export type SettlementDetail = 'accepted' | 'declined' | 'reservada' | 'match' | 'bazas' | 'fold';

/** One row of the hand ledger. Every piedra paid is one of these. */
export interface Settlement {
  readonly kind: SettlementKind;
  readonly team: Team;
  readonly points: number;
  readonly detail?: SettlementDetail;
  readonly tantos?: Record<Team, number>;
  readonly level?: EnvidoLevel | TrucoLevel;
}

/** A card as it was played in a baza. The reducer knows the card; the view hides burned ones. */
export interface TrickPlay {
  readonly seat: Seat;
  readonly card: Card;
  readonly burned: boolean;
}

/** A completed baza. */
export interface TrickRecord {
  readonly baza: number;
  readonly leadSeat: Seat;
  readonly plays: readonly TrickPlay[];
  readonly winnerTeam: Team | null;
  readonly winnerSeat: Seat | null;
  readonly parda: boolean;
}

/** Forward-looking truco state: the last accepted level and who accepted it. */
export interface TrucoState {
  readonly level: TrucoLevel;
  readonly acceptedByTeam: Team | null;
}

/** Forward-looking envido state. `stake` is what settles at hand end. */
export interface EnvidoState {
  readonly status: EnvidoStatus;
  readonly level: EnvidoLevel | null;
  readonly stake: number | null;
  readonly callerTeam: Team | null;
  readonly acceptedByTeam: Team | null;
  readonly tantos: Record<Team, number> | null;
}

/** A flor declaration. The value is the numeric flor or the reservada's 5. */
export interface FlorDeclaration {
  readonly seat: Seat;
  readonly team: Team;
  readonly kind: 'flor' | 'reservada';
  readonly value: number;
}

/** Forward-looking flor state. Flors settle when the first baza closes. */
export interface FlorState {
  readonly declarations: readonly FlorDeclaration[];
  readonly settled: boolean;
  readonly winnerTeam: Team | null;
  readonly winnerSeat: Seat | null;
  readonly points: number;
}

/** Forward-looking prive state. It pays immediately and replaces envido. */
export interface PriveState {
  readonly called: boolean;
  readonly callerTeam: Team | null;
  readonly winnerTeam: Team | null;
  readonly points: number;
  readonly tantos: Record<Team, number> | null;
}

/** A call waiting for a team response. */
export interface PendingTrucoCall {
  readonly kind: 'truco';
  readonly level: TrucoCallLevel;
  readonly callerSeat: Seat;
  readonly callerTeam: Team;
  readonly respondingTeam: Team;
  /** The seat whose play turn is paused by the call; it resumes after an accept. */
  readonly returnSeat: Seat;
}

export interface PendingEnvidoCall {
  readonly kind: 'envido';
  readonly level: EnvidoLevel;
  readonly callerSeat: Seat;
  readonly callerTeam: Team;
  readonly respondingTeam: Team;
  /** The seat whose play turn is paused by the call; it resumes after an accept. */
  readonly returnSeat: Seat;
}

export type PendingCall = PendingTrucoCall | PendingEnvidoCall;

/** The envido as it was resolved, ready for the summary. */
export interface EnvidoResult {
  readonly winnerTeam: Team;
  readonly points: number;
  readonly detail: 'accepted' | 'declined';
  readonly level: EnvidoLevel;
  readonly tantos: Record<Team, number> | null;
}

/** The flor as it was resolved, ready for the summary. */
export interface FlorResult {
  readonly winnerTeam: Team;
  readonly winnerSeat: Seat | null;
  readonly kind: 'flor' | 'reservada';
  readonly points: number;
  readonly tantos: Record<Team, number>;
}

/** The prive comparison, ready for the summary. */
export interface PriveResult {
  readonly callerTeam: Team;
  readonly winnerTeam: Team;
  readonly points: number;
  readonly tantos: Record<Team, number>;
}

/** The hand summary: enough to render the overlay without reading hidden state. */
export interface HandResult {
  readonly winnerTeam: Team;
  /** The truco/hand payout; 0 when flor, envido or prive closed the partida first. */
  readonly points: number | 'match';
  readonly reason: HandReason;
  readonly trucoLevel: TrucoLevel;
  readonly bazaWins: Record<Team, number>;
  readonly bazas: readonly TrickRecord[];
  readonly hands: Record<Seat, readonly Card[]>;
  readonly vira: Card;
  readonly settlements: readonly Settlement[];
  readonly totalPoints: number;
  readonly envidoResult: EnvidoResult | null;
  readonly florResult: FlorResult | null;
  readonly priveResult: PriveResult | null;
}

/** A public, language-neutral log entry. The UI localizes it. */
interface LogEntryBase {
  readonly id: number;
}

export interface DealLogEntry extends LogEntryBase {
  readonly kind: 'deal';
  readonly handNumber: number;
  readonly dealer: Seat;
  readonly mano: Seat;
  readonly vira: Card;
}

export interface PlayLogEntry extends LogEntryBase {
  readonly kind: 'play';
  readonly seat: Seat;
  /** Null when the card was burned: the table never sees its face. */
  readonly card: Card | null;
  readonly burned: boolean;
}

export interface TrickLogEntry extends LogEntryBase {
  readonly kind: 'trick';
  readonly baza: number;
  readonly winnerSeat: Seat | null;
  readonly winnerTeam: Team | null;
  readonly parda: boolean;
}

export interface PointsLogEntry extends LogEntryBase {
  readonly kind: 'points';
  readonly settlement: Settlement;
}

export interface HandOverLogEntry extends LogEntryBase {
  readonly kind: 'handOver';
  readonly winnerTeam: Team;
  readonly points: number | 'match';
  readonly reason: HandReason;
  readonly matchOver: boolean;
}

export interface MatchOverLogEntry extends LogEntryBase {
  readonly kind: 'matchOver';
  readonly winnerTeam: Team;
}

export interface TurnLogEntry extends LogEntryBase {
  readonly kind: 'turn';
  readonly seat: Seat;
  readonly baza: number;
}

interface CallLogBase extends LogEntryBase {
  readonly kind: 'call';
  readonly seat: Seat;
  readonly team: Team;
}

export interface TrucoCallLogEntry extends CallLogBase {
  readonly call: 'truco';
  readonly level: TrucoCallLevel;
}

export interface EnvidoCallLogEntry extends CallLogBase {
  readonly call: 'envido';
  readonly level: EnvidoLevel;
}

export interface FlorCallLogEntry extends CallLogBase {
  readonly call: 'flor';
  readonly flor: 'flor' | 'reservada';
  readonly value: number;
}

export interface PriveCallLogEntry extends CallLogBase {
  readonly call: 'prive';
}

export type CallLogEntry =
  EnvidoCallLogEntry | FlorCallLogEntry | PriveCallLogEntry | TrucoCallLogEntry;

interface RespondLogBase extends LogEntryBase {
  readonly kind: 'respond';
  readonly seat: Seat;
  readonly team: Team;
  readonly response: 'accept' | 'decline' | 'raise';
}

export interface TrucoRespondLogEntry extends RespondLogBase {
  readonly call: 'truco';
  readonly level: TrucoCallLevel;
}

export interface EnvidoRespondLogEntry extends RespondLogBase {
  readonly call: 'envido';
  readonly level: EnvidoLevel;
}

export type RespondLogEntry = EnvidoRespondLogEntry | TrucoRespondLogEntry;

export interface FoldLogEntry extends LogEntryBase {
  readonly kind: 'fold';
  readonly seat: Seat;
  readonly team: Team;
}

export type GameLogEntry =
  | CallLogEntry
  | DealLogEntry
  | FoldLogEntry
  | HandOverLogEntry
  | MatchOverLogEntry
  | PlayLogEntry
  | PointsLogEntry
  | RespondLogEntry
  | TrickLogEntry
  | TurnLogEntry;

/** Public events for animation and announcements, with no hidden card data. */
export type GameEvent =
  | { readonly type: 'handDealt'; readonly handNumber: number }
  | { readonly type: 'cardPlayed'; readonly seat: Seat; readonly burned: boolean }
  | {
      readonly type: 'trickResolved';
      readonly baza: number;
      readonly winnerTeam: Team | null;
      readonly parda: boolean;
    }
  | {
      readonly type: 'trucoCalled';
      readonly seat: Seat;
      readonly team: Team;
      readonly level: TrucoCallLevel;
    }
  | {
      readonly type: 'trucoResponded';
      readonly seat: Seat;
      readonly team: Team;
      readonly level: TrucoCallLevel;
      readonly response: 'accept' | 'decline' | 'raise';
    }
  | {
      readonly type: 'envidoCalled';
      readonly seat: Seat;
      readonly team: Team;
      readonly level: EnvidoLevel;
    }
  | {
      readonly type: 'envidoResponded';
      readonly seat: Seat;
      readonly team: Team;
      readonly level: EnvidoLevel;
      readonly response: 'accept' | 'decline' | 'raise';
    }
  | {
      readonly type: 'florCalled';
      readonly seat: Seat;
      readonly team: Team;
      readonly kind: 'flor' | 'reservada';
      readonly value: number;
    }
  | { readonly type: 'priveCalled'; readonly seat: Seat; readonly team: Team }
  | { readonly type: 'pointsAwarded'; readonly settlement: Settlement }
  | { readonly type: 'folded'; readonly seat: Seat; readonly team: Team }
  | {
      readonly type: 'handEnded';
      readonly winnerTeam: Team;
      readonly points: number | 'match';
      readonly reason: HandReason;
    }
  | { readonly type: 'matchEnded'; readonly winnerTeam: Team };

/** What a seat may do right now. The UI and the AI both read this. */
export interface LegalActions {
  readonly playableCardKeys: readonly string[];
  readonly canBurn: boolean;
  readonly canNextHand: boolean;
  readonly canRematch: boolean;
  readonly canCallTruco: boolean;
  readonly trucoLevel: TrucoCallLevel | null;
  readonly canRespondTruco: boolean;
  readonly canRaiseTruco: boolean;
  readonly trucoRaiseLevel: TrucoCallLevel | null;
  readonly canCallEnvido: boolean;
  readonly canRespondEnvido: boolean;
  readonly canCallFlor: boolean;
  readonly canCallPrive: boolean;
  readonly canFold: boolean;
  readonly envidoLevel: EnvidoLevel | null;
}

/** A face-up or face-down card as the table sees it. */
export interface PlayedCardView {
  readonly seat: Seat;
  readonly card: Card | null;
  readonly burned: boolean;
}

/** A baza as the table sees it. */
export interface TrickView {
  readonly baza: number;
  readonly leadSeat: Seat;
  readonly plays: readonly PlayedCardView[];
  readonly winnerTeam: Team | null;
  readonly winnerSeat: Seat | null;
  readonly parda: boolean;
}

/** The seat-scoped window into the game. Opponent hands never appear here during play. */
export interface GameView {
  readonly seat: Seat;
  readonly phase: Phase;
  readonly handNumber: number;
  readonly target: number;
  readonly scores: Record<Team, number>;
  readonly stake: number | 'match';
  readonly pending: PendingCall | null;
  readonly dealer: Seat;
  readonly mano: Seat;
  readonly vira: Card;
  readonly hand: readonly Card[];
  readonly handCounts: Record<Seat, number>;
  readonly turn: Seat;
  readonly lead: Seat;
  readonly trickIndex: number;
  readonly currentTrick: readonly PlayedCardView[];
  readonly lastTrick: TrickView | null;
  readonly tricks: readonly TrickView[];
  readonly bazaWins: Record<Team, number>;
  readonly winner: Team | null;
  readonly matchWinner: Team | null;
  readonly result: HandResult | null;
  readonly revealedHands: Record<Seat, readonly Card[]> | null;
  readonly legal: LegalActions;
  readonly log: readonly GameLogEntry[];
  readonly ownEnvido: number;
  readonly ownFlor: FlorScore | null;
  readonly envido: EnvidoState;
  readonly flor: FlorState;
  readonly prive: PriveState;
  readonly settlements: readonly Settlement[];
  readonly event: GameEvent | null;
}

/** The complete reducer state. Only the provider and the engine touch this. */
export interface GameState {
  readonly seed: number;
  readonly rngState: number;
  readonly target: number;
  readonly scores: Record<Team, number>;
  readonly dealer: Seat;
  readonly mano: Seat;
  readonly handNumber: number;
  readonly phase: Phase;
  readonly vira: Card;
  /** Cards still in each hand. Empty once they have been played. */
  readonly hands: Record<Seat, readonly Card[]>;
  /** The three cards each seat was dealt, kept for the hand summary. */
  readonly dealtHands: Record<Seat, readonly Card[]>;
  readonly turn: Seat;
  readonly lead: Seat;
  readonly trickIndex: number;
  readonly currentTrick: readonly TrickPlay[];
  readonly tricks: readonly TrickRecord[];
  readonly bazaWins: Record<Team, number>;
  readonly lastTrick: TrickRecord | null;
  readonly result: HandResult | null;
  readonly matchWinner: Team | null;
  readonly playedThisHand: Record<Seat, number>;
  readonly truco: TrucoState;
  readonly envido: EnvidoState;
  readonly flor: FlorState;
  readonly prive: PriveState;
  /** Every settlement already applied this reparto, in the order it was paid. */
  readonly settlements: readonly Settlement[];
  readonly pending: PendingCall | null;
  readonly log: readonly GameLogEntry[];
  readonly nextLogId: number;
  readonly event: GameEvent | null;
}

/** Actions the table can send. */
export type GameAction =
  | {
      readonly type: 'playCard';
      readonly seat: Seat;
      readonly cardKey: string;
      readonly burned?: boolean;
    }
  | { readonly type: 'nextHand' }
  | { readonly type: 'rematch'; readonly seed?: string | number }
  | { readonly type: 'callTruco'; readonly seat: Seat }
  | {
      readonly type: 'respondTruco';
      readonly seat: Seat;
      readonly response: 'accept' | 'decline' | 'raise';
    }
  | { readonly type: 'callEnvido'; readonly seat: Seat }
  | {
      readonly type: 'respondEnvido';
      readonly seat: Seat;
      readonly response: 'accept' | 'decline' | 'raise';
    }
  | { readonly type: 'callFlor'; readonly seat: Seat }
  | { readonly type: 'callPrive'; readonly seat: Seat }
  | { readonly type: 'fold'; readonly seat: Seat };
