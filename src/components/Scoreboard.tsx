import { useLocale } from '../content/locale-context';
import { describeCard, shortCardName } from '../content/types';
import type { GameView } from '../engine/types';
import { TEAM_BY_SEAT, type Team } from '../domain/seats';
import { CardBack, PlayingCard } from './PlayingCard';
import { TeamPanel, type TeamStatus } from './TeamPanel';
import { StoneIcon } from './icons';

interface ScoreboardProps {
  readonly view: GameView;
}

export function Scoreboard({ view }: ScoreboardProps) {
  const { content } = useLocale();
  const scoreboard = content.scoreboard;

  const statusFor = (team: Team): TeamStatus | null => {
    if (TEAM_BY_SEAT[view.mano] === team) {
      return { kind: 'mano', label: scoreboard.statusMano };
    }

    if (TEAM_BY_SEAT[view.dealer] === team) {
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
        score={view.scores.nosotros}
        piedrasLabel={scoreboard.piedras(view.scores.nosotros)}
        status={statusFor('nosotros')}
      />

      <div className="table-meta">
        <div className="table-meta__stats">
          <div className="table-meta__stat">
            <span className="table-meta__label">{scoreboard.stakeLabel}</span>
            <span className="table-meta__value">
              <StoneIcon className="table-meta__stone" />
              {view.stake}
            </span>
          </div>
          <div className="table-meta__stat">
            <span className="table-meta__label">{scoreboard.dealWord}</span>
            <span className="table-meta__value table-meta__value--plain">{view.handNumber}</span>
          </div>
        </div>

        <div
          className="vira"
          role="group"
          aria-label={`${scoreboard.viraLabel}: ${describeCard(view.vira, content.cards)}`}
        >
          <span className="vira__tag">{scoreboard.viraLabel}</span>
          <div className="vira__stack">
            <span className="vira__deck" aria-hidden="true">
              <CardBack size="vira" />
            </span>
            <PlayingCard card={view.vira} size="vira" />
          </div>
          <span className="vira__name">{shortCardName(view.vira, content.cards)}</span>
        </div>
      </div>

      <TeamPanel
        team="ellos"
        name={scoreboard.teams.ellos.name}
        members={scoreboard.teams.ellos.members}
        score={view.scores.ellos}
        piedrasLabel={scoreboard.piedras(view.scores.ellos)}
        status={statusFor('ellos')}
      />
    </section>
  );
}
