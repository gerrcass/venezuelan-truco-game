import type { Card, CourtRank, Piece, Rank, Suit } from '../domain/cards';
import type { BotSpeed } from '../domain/preferences';
import type { PersonaKey, Team } from '../domain/seats';
import type {
  EnvidoLevel,
  HandReason,
  SenaKind,
  SettlementDetail,
  SettlementKind,
  TrucoCallLevel,
} from '../engine/types';
import type { TauntBank } from './taunts';

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

/** The one seña panel near El Pana: the gesture, what it means, and the card. */
export interface SenaCopy {
  readonly label: string;
  readonly invite: string;
  readonly hide: string;
  readonly gestureLabel: string;
  readonly gestures: Record<SenaKind, string>;
  readonly meanings: Record<SenaKind, string>;
  readonly card: (name: string) => string;
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

export type RulesSectionId =
  'mesa' | 'vira' | 'envido' | 'flor' | 'truco' | 'prive' | 'senas' | 'fuentes';

/** A three-card worked example with its answer. Cards are real deck values. */
export interface RuleExampleCopy {
  readonly title: string;
  readonly cards: readonly Card[];
  readonly result: string;
  readonly note: string;
}

export interface RuleSourceCopy {
  readonly label: string;
  readonly href: string;
  readonly note: string;
}

/** The small, typed blocks the rules school is assembled from. */
export type RuleBlock =
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'list'; readonly title?: string; readonly items: readonly string[] }
  | {
      readonly kind: 'table';
      readonly title?: string;
      readonly headers: readonly string[];
      readonly rows: readonly (readonly string[])[];
    }
  | {
      readonly kind: 'examples';
      readonly title?: string;
      readonly items: readonly RuleExampleCopy[];
    }
  | { readonly kind: 'callout'; readonly title?: string; readonly text: string }
  | { readonly kind: 'sources'; readonly items: readonly RuleSourceCopy[] };

export interface RulesSectionCopy {
  readonly id: RulesSectionId;
  readonly tab: string;
  readonly title: string;
  readonly lead: string;
  readonly blocks: readonly RuleBlock[];
}

export interface WelcomeStepCopy {
  readonly title: string;
  readonly body: string;
}

export interface WelcomeCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  readonly steps: readonly WelcomeStepCopy[];
  readonly goal: string;
  readonly play: string;
  readonly rules: string;
  readonly close: string;
}

export interface SettingsCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  readonly close: string;
  readonly openAria: string;
  readonly languageTitle: string;
  readonly languageHint: string;
  readonly soundTitle: string;
  readonly soundOn: string;
  readonly soundOff: string;
  readonly soundHint: string;
  readonly speedTitle: string;
  readonly speedHint: string;
  readonly speeds: Record<BotSpeed, { readonly label: string; readonly note: string }>;
  readonly careerTitle: string;
  readonly careerHint: string;
  readonly careerEmpty: string;
  readonly stats: {
    readonly matches: string;
    readonly wins: string;
    readonly losses: string;
    readonly hands: string;
    readonly envidos: string;
    readonly flores: string;
  };
  readonly clear: string;
  readonly clearConfirm: string;
  readonly clearYes: string;
  readonly clearNo: string;
  readonly cleared: string;
  readonly howToPlay: string;
  readonly howToPlayHint: string;
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
    readonly settings: string;
    readonly settingsAria: string;
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
  readonly sena: SenaCopy;
  readonly taunts: TauntBank;
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
    readonly burn: string;
    readonly burnArmed: string;
    readonly burnAria: string;
    readonly burnHint: string;
  };
  readonly actions: {
    readonly label: string;
    readonly cantar: string;
    readonly envido: string;
    readonly flor: string;
    readonly prive: string;
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
  };
  readonly envido: {
    /** The canto named in a log or a dialog. Levels 1–3 are all "Envido". */
    readonly names: Record<EnvidoLevel, string>;
    /** The raise that turns a pending level into the next one. */
    readonly raises: Record<2 | 3 | 4, string>;
    readonly callAria: string;
    readonly dialogLabel: string;
    readonly calledBy: (name: string, call: string) => string;
    readonly stakeNote: (stake: number) => string;
    readonly faltaNote: (stake: number) => string;
    readonly declineNote: (points: number) => string;
    readonly answerNote: string;
    readonly accept: string;
    readonly decline: string;
    readonly acceptAria: (call: string) => string;
    readonly declineAria: (call: string) => string;
    readonly speech: {
      readonly call: (call: string) => string;
      readonly accept: string;
      readonly decline: string;
      readonly raise: (call: string) => string;
    };
  };
  readonly flor: {
    readonly name: string;
    readonly reservada: string;
    readonly points: (points: number) => string;
    readonly callAria: string;
    readonly speech: {
      readonly call: (kind: 'flor' | 'reservada') => string;
    };
  };
  readonly prive: {
    readonly name: string;
    readonly callAria: string;
    readonly note: (tantos: Record<Team, number>) => string;
    readonly speech: {
      readonly call: string;
    };
  };
  readonly lances: {
    readonly label: string;
    readonly envidoPending: (call: string) => string;
    readonly envidoAccepted: (call: string, stake: number) => string;
    readonly envidoDeclined: (call: string, points: number) => string;
    readonly flor: (kind: 'flor' | 'reservada', points: number) => string;
    readonly prive: (points: number, tantos: Record<Team, number>) => string;
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
    readonly envidoCall: (name: string, call: string) => string;
    readonly envidoCallYou: (call: string) => string;
    readonly florCall: (name: string, kind: 'flor' | 'reservada') => string;
    readonly florCallYou: (kind: 'flor' | 'reservada') => string;
    readonly priveCall: (name: string) => string;
    readonly priveCallYou: string;
    readonly respond: (name: string, response: string, call: string) => string;
    readonly respondYou: (response: string, call: string) => string;
    readonly fold: (name: string) => string;
    readonly foldYou: string;
    readonly award: (team: string, points: number, source: string, note: string) => string;
    readonly handOver: (team: string, points: number | 'match', matchOver: boolean) => string;
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
    readonly reasonLabel: string;
    readonly reasons: Record<HandReason, string>;
    readonly trucoLabel: string;
    readonly noTruco: string;
    readonly trucoAccepted: (call: string) => string;
    readonly lastHand: (points: number) => string;
    readonly careerLine: (matches: number, wins: number, hands: number) => string;
    readonly ledgerTitle: string;
    readonly ledgerSource: string;
    readonly ledgerTeam: string;
    readonly ledgerPoints: string;
    readonly sources: Record<SettlementKind, string>;
    readonly details: Record<SettlementDetail, string>;
    readonly tantos: (nosotros: number, ellos: number) => string;
    readonly florTantos: (nosotros: number, ellos: number) => string;
    readonly totalLabel: string;
    readonly settlementPoints: (points: number) => string;
    readonly matchStatsTitle: string;
    readonly matchStatsColumns: {
      readonly hands: string;
      readonly envidos: string;
      readonly flores: string;
      readonly trucos: string;
    };
    readonly rules: string;
    readonly settings: string;
    readonly bazasTitle: string;
    readonly handsTitle: string;
    readonly burnedTag: string;
    readonly baza: (baza: number) => string;
    readonly parda: string;
    readonly nextHand: string;
    readonly rematch: string;
  };
  readonly hints: {
    readonly label: string;
    readonly cards: string;
    readonly burn: string;
    readonly rules: string;
    readonly close: string;
    readonly rulesLink: string;
    readonly logOpen: string;
    readonly logOpenAria: string;
  };
  readonly rulesDialog: {
    readonly eyebrow: string;
    readonly title: string;
    readonly lead: string;
    readonly close: string;
    readonly back: string;
    readonly tabsLabel: string;
    readonly howToPlay: string;
    readonly howToPlayHint: string;
    readonly sourcesLabel: string;
    readonly sections: readonly RulesSectionCopy[];
  };
  readonly welcome: WelcomeCopy;
  readonly settings: SettingsCopy;
  readonly a11y: {
    readonly announcerLabel: string;
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
