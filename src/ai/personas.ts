import { PERSONA_BY_SEAT, type PersonaKey, type Seat } from '../domain/seats';

/** Personas that actually sit at the table. The human is not a bot. */
export type BotPersona = Exclude<PersonaKey, 'you'>;

export interface PersonaProfile {
  /** At or above this tanto the bot opens an envido. */
  readonly envidoCall: number;
  /** At or above this tanto the bot accepts an envido. */
  readonly envidoAccept: number;
  /** At or above this tanto the bot raises an envido it is answering. */
  readonly envidoRaise: number;
  /** At or above this tanto the bot calls prive at 23. */
  readonly prive: number;
  /** At or above this hand strength the bot opens a truco. */
  readonly trucoCall: number;
  /** At or above this hand strength the bot accepts a truco. */
  readonly trucoAccept: number;
  /** At or above this hand strength the bot raises a truco it is answering. */
  readonly trucoRaise: number;
  /** Seed chance of opening a truco without the cards to back it. */
  readonly bluffChance: number;
  /** Seed chance of burning a hopeless low card. */
  readonly burnChance: number;
  /** Seed chance of folding a clearly lost, high-stake reparto. */
  readonly foldChance: number;
  /** Seed chance of leading the highest card instead of the lowest. */
  readonly leadHighChance: number;
  /** Below this strength, a lost high-stake reparto is worth folding. */
  readonly foldStrength: number;
}

/**
 * Three different people, measured in the same units.
 *
 * El Catire bets early and often: low lines, a real bluff and a taste for
 * burning. La Comadre waits, needling, and only pays when the cards are there.
 * El Pana is the steady partner: solid lines, barely any bluff, and he would
 * rather lose a trick than fold on you.
 */
export const PERSONA_PROFILES: Record<BotPersona, PersonaProfile> = {
  pana: {
    envidoCall: 29,
    envidoAccept: 27,
    envidoRaise: 33,
    prive: 30,
    trucoCall: 195,
    trucoAccept: 150,
    trucoRaise: 240,
    bluffChance: 0.01,
    burnChance: 0.1,
    foldChance: 0.05,
    leadHighChance: 0.08,
    foldStrength: 120,
  },
  comadre: {
    envidoCall: 31,
    envidoAccept: 29,
    envidoRaise: 35,
    prive: 32,
    trucoCall: 215,
    trucoAccept: 175,
    trucoRaise: 255,
    bluffChance: 0.03,
    burnChance: 0.06,
    foldChance: 0.18,
    leadHighChance: 0.04,
    foldStrength: 135,
  },
  catire: {
    envidoCall: 25,
    envidoAccept: 23,
    envidoRaise: 29,
    prive: 27,
    trucoCall: 150,
    trucoAccept: 115,
    trucoRaise: 205,
    bluffChance: 0.22,
    burnChance: 0.22,
    foldChance: 0.02,
    leadHighChance: 0.38,
    foldStrength: 110,
  },
};

/** The persona that owns a seat. Seat 0 is the human; simulations may borrow Pana. */
export function botPersonaForSeat(seat: Seat): BotPersona {
  const persona = PERSONA_BY_SEAT[seat];

  return persona === 'you' ? 'pana' : persona;
}
