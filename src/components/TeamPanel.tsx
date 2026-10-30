import { PIEDRAS_TO_WIN } from '../domain/match';
import type { Team } from '../domain/seats';
import { StonePips } from './StonePips';

export interface TeamStatus {
  readonly kind: 'mano' | 'pie';
  readonly label: string;
}

interface TeamPanelProps {
  readonly team: Team;
  readonly name: string;
  readonly members: string;
  readonly score: number;
  readonly piedrasLabel: string;
  readonly status: TeamStatus | null;
}

export function TeamPanel({ team, name, members, score, piedrasLabel, status }: TeamPanelProps) {
  const titleId = `team-${team}-title`;

  return (
    <section
      className={`team team--${team}${status?.kind === 'mano' ? ' team--active' : ''}`}
      aria-labelledby={titleId}
    >
      <div className="team__head">
        <h3 className="team__name" id={titleId}>
          {name}
        </h3>
        {status && (
          <span className={`team__status team__status--${status.kind}`}>
            <span className="team__status-dot" aria-hidden="true" />
            {status.label}
          </span>
        )}
      </div>
      <p className="team__members">{members}</p>
      <div className="team__body">
        <p className="team__score">
          <span className="team__score-value">{score}</span>
          <span className="team__score-total" aria-hidden="true">
            /{PIEDRAS_TO_WIN}
          </span>
        </p>
        <StonePips score={score} team={team} label={piedrasLabel} />
      </div>
    </section>
  );
}
