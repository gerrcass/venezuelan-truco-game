import type { Card, CourtRank, Piece, Rank, Suit } from '../domain/cards';
import type { PersonaKey, Team } from '../domain/seats';
import type { HandReason, TrucoCallLevel } from '../engine/types';

export type Locale = 'es' | 'en';

export type LogKind =
  | 'deal'
  | 'play'
  | 'trick'
  | 'points'
  | 'handOver'
  | 'matchOver'
  | 'turn'
  | 'call'
  | 'respond'
  | 'fold';

export interface PersonaCopy {
  readonly name: string;
  readonly persona: string;
  /** Short marker used inside the "Tú" token. */
  readonly marker: string;
}

export interface CardCopy {
  readonly of: string;
  readonly suits: Record<Suit, string>;
  readonly ranks: Record<Rank, string>;
  readonly court: Record<CourtRank, string>;
  readonly piece: Record<Piece, string>;
  readonly pieceHint: Record<Piece, string>;
  readonly faceDown: string;
  readonly burned: string;
}

export interface ShellContent {
  readonly meta: {
    readonly title: string;
    readonly description: string;
  };
  readonly brand: {
    readonly name: string;
    readonly tagline: string;
  };
  readonly topbar: {
    readonly navigationLabel: string;
    readonly rules: string;
    readonly rulesAria: string;
    readonly soundOn: string;
    readonly soundOff: string;
    readonly languageLabel: string;
    readonly spanish: string;
    readonly english: string;
    readonly spanishShort: string;
    readonly englishShort: string;
    readonly spanishAria: string;
    readonly englishAria: string;
  };
  readonly scoreboard: {
    readonly label: string;
    readonly teams: Record<Team, { readonly name: string; readonly members: string }>;
    readonly piedras: (score: number) => string;
    readonly statusMano: string;
    readonly statusPie: string;
    readonly stakeLabel: string;
    readonly stakeShort: (stake: number | 'match') => string;
    readonly stakeSpoken: (stake: number | 'match') => string;
    readonly dealWord: string;
    readonly viraLabel: string;
  };
  readonly personas: Record<PersonaKey, PersonaCopy>;
  readonly seats: {
    readonly cardCount: (count: number) => string;
    readonly mano: string;
    readonly pie: string;
    readonly turn: string;
    readonly manoHint: string;
    readonly pieHint: string;
    readonly turnAria: (name: string) => string;
  };
  readonly table: {
    readonly label: string;
  };
  readonly trick: {
    readonly label: (baza: number) => string;
    readonly aria: (baza: number) => string;
    readonly empty: string;
    readonly won: (name: string) => string;
    readonly parda: string;
    readonly resultAria: (baza: number, result: string) => string;
    readonly bubbleAria: string;
    readonly bubble: string;
  };
  readonly status: {
    readonly baza: (baza: number, total: number) => string;
    readonly reparto: (handNumber: number) => string;
    readonly mano: (name: string) => string;
    readonly separator: string;
  };
  readonly hand: {
    readonly title: string;
    readonly count: (count: number) => string;
    readonly hint: string;
    readonly waiting: string;
    readonly pending: string;
    readonly closed: string;
    readonly empty: string;
    readonly aria: string;
    readonly playCard: (card: string) => string;
  };
  readonly actions: {
    readonly label: string;
    readonly cantar: string;
    readonly envido: string;
    readonly flor: string;
    readonly fold: string;
    readonly yourTurn: string;
    readonly yourTurnHint: string;
    readonly waiting: (name: string) => string;
    readonly waitingHint: string;
    readonly waitingResponse: string;
    readonly waitingResponseHint: string;
    readonly respondPrompt: (call: string) => string;
    readonly respondPromptHint: string;
    readonly handOver: string;
    readonly handOverHint: string;
    readonly matchOver: string;
    readonly matchOverHint: string;
    readonly note: string;
    readonly soon: string;
  };
  readonly truco: {
    readonly names: Record<TrucoCallLevel, string>;
    readonly dialogLabel: string;
    readonly calledBy: (name: string, call: string) => string;
    readonly stakeNote: (stake: number | 'match') => string;
    readonly answerNote: string;
    readonly callAria: (call: string) => string;
    readonly accept: string;
    readonly decline: string;
    readonly raise: (call: string) => string;
    readonly acceptAria: (call: string) => string;
    readonly declineAria: (call: string) => string;
    readonly raiseAria: (call: string) => string;
    readonly speech: {
      readonly call: (call: string) => string;
      readonly accept: string;
      readonly decline: string;
      readonly raise: (call: string) => string;
    };
  };
  readonly log: {
    readonly title: string;
    readonly subtitle: string;
    readonly label: string;
    readonly footer: string;
    readonly stamp: string;
    readonly kinds: Record<LogKind, string>;
    readonly deal: (handNumber: number, dealer: string, mano: string, vira: string) => string;
    readonly play: (name: string, card: string) => string;
    readonly playYou: (card: string) => string;
    readonly burn: (name: string) => string;
    readonly burnYou: string;
    readonly trickWin: (baza: number, name: string) => string;
    readonly trickWinYou: (baza: number) => string;
    readonly trickParda: (baza: number) => string;
    readonly call: (name: string, call: string) => string;
    readonly callYou: (call: string) => string;
    readonly respond: (name: string, response: string, call: string) => string;
    readonly respondYou: (response: string, call: string) => string;
    readonly fold: (name: string) => string;
    readonly foldYou: string;
    readonly points: (team: string, points: number | 'match', reason: string) => string;
    readonly handOver: (team: string, points: number | 'match') => string;
    readonly matchOver: (team: string) => string;
    readonly turn: (name: string, baza: number) => string;
  };
  readonly summary: {
    readonly eyebrow: string;
    readonly title: (team: string) => string;
    readonly matchTitle: (team: string) => string;
    readonly matchBadge: string;
    readonly points: (points: number | 'match') => string;
    readonly score: (nosotros: number, ellos: number) => string;
    readonly accountLabel: string;
    readonly reasonLabel: string;
    readonly reasons: Record<HandReason, string>;
    readonly trucoLabel: string;
    readonly noTruco: string;
    readonly trucoAccepted: (call: string) => string;
    readonly payoutLabel: string;
    readonly bazasTitle: string;
    readonly handsTitle: string;
    readonly baza: (baza: number) => string;
    readonly parda: string;
    readonly nextHand: string;
    readonly rematch: string;
  };
  readonly hints: {
    readonly label: string;
    readonly cards: string;
    readonly rules: string;
    readonly rulesLink: string;
    readonly logOpen: string;
    readonly logOpenAria: string;
  };
  readonly rulesDialog: {
    readonly eyebrow: string;
    readonly title: string;
    readonly body: string;
    readonly topics: readonly string[];
    readonly soon: string;
    readonly close: string;
    readonly back: string;
  };
  readonly cards: CardCopy;
}

/** "12 de basto (rey)" / "12 of clubs (king)". The accessible name of a card. */
export function describeCard(card: Card, copy: CardCopy): string {
  const rank = copy.ranks[card.rank];
  const base = `${rank} ${copy.of} ${copy.suits[card.suit]}`;

  if (card.rank === 10 || card.rank === 11 || card.rank === 12) {
    return `${base} (${copy.court[card.rank]})`;
  }

  return base;
}

/** The short caption used under the vira: "11 de basto" / "11 of clubs". */
export function shortCardName(card: Card, copy: CardCopy): string {
  return `${copy.ranks[card.rank]} ${copy.of} ${copy.suits[card.suit]}`;
}
