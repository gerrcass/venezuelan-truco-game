import { en, es } from '..';
import { pickTaunt, type TauntEvent, type TauntPersona } from '../taunts';

const PERSONAS: readonly TauntPersona[] = ['pana', 'comadre', 'catire'];
const EVENTS: readonly TauntEvent[] = [
  'deal',
  'turn',
  'call',
  'accept',
  'decline',
  'flor',
  'prive',
  'trickWin',
  'trickLose',
  'handWin',
  'handLose',
  'matchWin',
  'matchLose',
  'burn',
];

describe('the taunt bank', () => {
  it('has three to five distinct lines for every persona and beat in both languages', () => {
    for (const bank of [es.taunts, en.taunts]) {
      for (const persona of PERSONAS) {
        for (const event of EVENTS) {
          const lines = bank[persona][event];

          expect(lines.length).toBeGreaterThanOrEqual(3);
          expect(lines.length).toBeLessThanOrEqual(5);
          expect(new Set(lines).size).toBe(lines.length);
        }
      }
    }
  });

  it('never repeats the last line back to back', () => {
    for (const bank of [es.taunts, en.taunts]) {
      for (const persona of PERSONAS) {
        for (const event of EVENTS) {
          const first = pickTaunt(persona, event, 7, null, bank);
          const second = pickTaunt(persona, event, 8, first, bank);

          expect(second).not.toBe(first);
        }
      }
    }
  });

  it('is deterministic for the same persona, beat and seed', () => {
    expect(pickTaunt('catire', 'trickWin', 19, 'otra línea', es.taunts)).toBe(
      pickTaunt('catire', 'trickWin', 19, 'otra línea', es.taunts),
    );
  });

  it('speaks Spanish and English', () => {
    expect(es.taunts.pana.deal).not.toEqual(en.taunts.pana.deal);
    expect(es.taunts.comadre.handWin.join(' ')).toMatch(/reparto|novela|comadre/i);
    expect(en.taunts.catire.trickLose.join(' ')).toMatch(/trick|chamo|nojoda/i);
  });
});
