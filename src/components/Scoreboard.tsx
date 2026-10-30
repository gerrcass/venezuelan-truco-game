import { useLocale } from '../content/locale-context';
import { describeCard, shortCardName } from '../content/types';
import type { SampleTable } from '../data/sampleTable';
import { TEAM_BY_SEAT, type Team } from '../domain/seats';
import { CardBack, PlayingCard } from './PlayingCard';
import { TeamPanel, type TeamStatus } from './TeamPanel';
import { StoneIcon } from './icons';

interface ScoreboardProps {
  readonly table: SampleTable;
}

export function Scoreboard({ table }: ScoreboardProps) {
  const { content } = useLocale();
  const scoreboard = content.scoreboard;

  const statusFor = (team: Team): TeamStatus | null => {
    if (TEAM_BY_SEAT[table.manoSeat] === team) {
      return { kind: 'mano', label: scoreboard.statusMano };
    }

    if (TEAM_BY_SEAT[table.pieSeat] === team) {
      return { kind: 'pie', label: scoreboard.statusPie };
    }

    return null;
  };

  return (
    <section className="scorebar" aria-labelledby="scoreboard-heading">
      <h2 className="sr-only" id="scoreboard-heading">
        {scoreboard.label}
      </h2>
      <TeamPanel
        team="nosotros"
        name={scoreboard.teams.nosotros.name}
        members={scoreboard.teams.nosotros.members}
        score={table.scores.nosotros}
        piedrasLabel={scoreboard.piedras(table.scores.nosotros)}
        status={statusFor('nosotros')}
      />

      <div className="table-meta">
        <div className="table-meta__stats">
          <div className="table-meta__stat">
            <span className="table-meta__label">{scoreboard.stakeLabel}</span>
            <span className="table-meta__value">
              <StoneIcon className="table-meta__stone" />
              {table.stake}
            </span>
          </div>
          <div className="table-meta__stat">
            <span className="table-meta__label">{scoreboard.dealWord}</span>
            <span className="table-meta__value table-meta__value--plain">{table.handNumber}</span>
          </div>
        </div>

        <div
          className="vira"
          role="group"
          aria-label={`${scoreboard.viraLabel}: ${describeCard(table.vira, content.cards)}`}
        >
          <span className="vira__tag">{scoreboard.viraLabel}</span>
          <div className="vira__stack">
            <span className="vira__deck" aria-hidden="true">
              <CardBack size="vira" />
            </span>
            <PlayingCard card={table.vira} size="vira" />
          </div>
          <span className="vira__name">{shortCardName(table.vira, content.cards)}</span>
        </div>
      </div>

      <TeamPanel
        team="ellos"
        name={scoreboard.teams.ellos.name}
        members={scoreboard.teams.ellos.members}
        score={table.scores.ellos}
        piedrasLabel={scoreboard.piedras(table.scores.ellos)}
        status={statusFor('ellos')}
      />
    </section>
  );
}
