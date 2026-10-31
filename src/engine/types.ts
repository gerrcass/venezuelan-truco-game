import type { Card } from '../domain/cards';
import type { Seat, Team } from '../domain/seats';

/** The three phases of a partida. */
export type Phase = 'playing' | 'handOver' | 'matchOver';

/** Why a reparto was awarded. Later tickets add truco, envido, flor, prive and fold. */
export type HandReason = 'bazas';

/** The accepted truco level. Inert in ticket #3. */
export type TrucoLevel = 0 | 1 | 2 | 3 | 4;

/** The state of the envido call. Inert in ticket #3. */
export type EnvidoStatus = 'none' | 'called' | 'accepted' | 'declined';

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

/** Forward-looking truco state. Ticket #4 fills it in. */
export interface TrucoState {
  readonly level: TrucoLevel;
  readonly acceptedByTeam: Team | null;
}

/** Forward-looking envido state. Ticket #5 fills it in. */
export interface EnvidoState {
  readonly status: EnvidoStatus;
  readonly acceptedByTeam: Team | null;
}

/** A flor declaration. Ticket #5 fills it in. */
export interface FlorDeclaration {
  readonly seat: Seat;
  readonly reservada: boolean;
}

/** Forward-looking flor state. Ticket #5 fills it in. */
export interface FlorState {
  readonly declarations: readonly FlorDeclaration[];
}

/** Forward-looking prive state. Ticket #5 fills it in. */
export interface PriveState {
  readonly called: boolean;
}

/** A call waiting for a team response. Ticket #4 fills it in. */
export type PendingCall =
  | { readonly kind: 'truco'; readonly callerTeam: Team; readonly level: TrucoLevel }
  | { readonly kind: 'envido'; readonly callerTeam: Team };

/** The hand summary: enough to render the overlay without reading hidden state. */
export interface HandResult {
  readonly winnerTeam: Team;
  readonly points: number;
  readonly reason: HandReason;
  readonly bazaWins: Record<Team, number>;
  readonly bazas: readonly TrickRecord[];
  readonly hands: Record<Seat, readonly Card[]>;
  readonly vira: Card;
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
  readonly team: Team;
  readonly points: number;
  readonly reason: HandReason;
}

export interface HandOverLogEntry extends LogEntryBase {
  readonly kind: 'handOver';
  readonly winnerTeam: Team;
  readonly points: number;
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

export type GameLogEntry =
  | DealLogEntry
  | PlayLogEntry
  | TrickLogEntry
  | PointsLogEntry
  | HandOverLogEntry
  | MatchOverLogEntry
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
  | { readonly type: 'handEnded'; readonly winnerTeam: Team; readonly points: number }
  | { readonly type: 'matchEnded'; readonly winnerTeam: Team };

/** What a seat may do right now. The UI and the AI both read this. */
export interface LegalActions {
  readonly playableCardKeys: readonly string[];
  readonly canBurn: boolean;
  readonly canNextHand: boolean;
  readonly canRematch: boolean;
  readonly canCallTruco: boolean;
  readonly canRespondTruco: boolean;
  readonly canCallEnvido: boolean;
  readonly canRespondEnvido: boolean;
  readonly canCallFlor: boolean;
  readonly canCallPrive: boolean;
  readonly canFold: boolean;
  readonly trucoLevel: TrucoLevel | null;
  readonly envidoLevel: number | null;
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
  readonly stake: number;
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
  readonly ownFlor: number | null;
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
  readonly pending: PendingCall | null;
  readonly log: readonly GameLogEntry[];
  readonly nextLogId: number;
  readonly event: GameEvent | null;
}

/** Actions the table can send. The call/fold kinds are typed now and inert until #4–#6. */
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
