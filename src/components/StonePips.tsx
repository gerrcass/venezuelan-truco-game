import { PIEDRAS_TO_WIN } from '../domain/match';
import type { Team } from '../domain/seats';

interface StonePipsProps {
  readonly score: number;
  readonly team: Team;
  readonly label: string;
}

export function StonePips({ score, team, label }: StonePipsProps) {
  return (
    <div className={`pips pips--${team}`} role="img" aria-label={label}>
      {Array.from({ length: PIEDRAS_TO_WIN }, (_, index) => (
        <span
          key={index}
          className={`pip${index < score ? ' pip--won' : ''}${
            index === score - 1 ? ' pip--fresh' : ''
          }`}
          data-stone=""
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
