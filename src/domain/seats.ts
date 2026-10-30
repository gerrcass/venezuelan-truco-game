/** Seats are fixed: you south, El Catire east, El Pana north, La Comadre west. */
export const SEATS = [0, 1, 2, 3] as const;

/** A seat at the mesa. Play runs 0 → 1 → 2 → 3 (counterclockwise). */
export type Seat = (typeof SEATS)[number];

/** Teams are fixed partnerships: 0 + 2 play against 1 + 3. */
export type Team = 'nosotros' | 'ellos';

/** A stable persona key for content lookups. */
export type PersonaKey = 'you' | 'catire' | 'pana' | 'comadre';

export const TEAM_BY_SEAT: Record<Seat, Team> = {
  0: 'nosotros',
  1: 'ellos',
  2: 'nosotros',
  3: 'ellos',
};

export const PERSONA_BY_SEAT: Record<Seat, PersonaKey> = {
  0: 'you',
  1: 'catire',
  2: 'pana',
  3: 'comadre',
};

/** Where each seat sits on screen. */
export const SEAT_POSITION: Record<Seat, 'south' | 'east' | 'north' | 'west'> = {
  0: 'south',
  1: 'east',
  2: 'north',
  3: 'west',
};
