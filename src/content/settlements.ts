import type { Settlement } from '../engine/types';
import type { ShellContent } from './types';

/** "reservada", "querido · tantos 31–27", "bazas": the note under a ledger row. */
export function settlementNote(settlement: Settlement, content: ShellContent): string {
  const parts: string[] = [];

  if (settlement.detail && settlement.detail !== 'reservada') {
    parts.push(content.summary.details[settlement.detail]);
  }

  if (settlement.tantos) {
    parts.push(
      settlement.kind === 'flor'
        ? content.summary.florTantos(settlement.tantos.nosotros, settlement.tantos.ellos)
        : content.summary.tantos(settlement.tantos.nosotros, settlement.tantos.ellos),
    );
  }

  return parts.join(' · ');
}

/** A reservada is named by its own row; every other source uses the plain name. */
export function settlementSource(settlement: Settlement, content: ShellContent): string {
  if (settlement.kind === 'flor' && settlement.detail === 'reservada') {
    return content.flor.reservada;
  }

  return content.summary.sources[settlement.kind];
}
