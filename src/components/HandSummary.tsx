import { useLocale } from '../content/locale-context';
import { shortCardName } from '../content/types';
import { PERSONA_BY_SEAT, SEATS, TEAM_BY_SEAT } from '../domain/seats';
import { pieceOf } from '../engine/cards';
import type { GameView } from '../engine/types';
import { Modal } from './Modal';
import { StoneIcon } from './icons';

interface HandSummaryProps {
  readonly view: GameView;
  readonly onNextHand: () => void;
  readonly onRematch: () => void;
}

export function HandSummary({ view, onNextHand, onRematch }: HandSummaryProps) {
  const { content } = useLocale();
  const result = view.result;

  if (!result) {
    return null;
  }

  const summary = content.summary;
  const matchOver = view.phase === 'matchOver';
  const winner = content.scoreboard.teams[result.winnerTeam].name;
  const hands = view.revealedHands ?? result.hands;

  return (
    <Modal
      open
      onClose={() => undefined}
      labelledBy="hand-summary-title"
      closeLabel={matchOver ? summary.rematch : summary.nextHand}
      panelClassName="summary"
      dismissible={false}
    >
      <header className="summary__head">
        <p className="eyebrow">{summary.eyebrow}</p>
        <h2 className="summary__title" id="hand-summary-title">
          {matchOver ? summary.matchTitle(winner) : summary.title(winner)}
        </h2>
        <p className="summary__points">
          <StoneIcon className="summary__stone" />
          {summary.points(result.points)}
        </p>
        <p className="summary__score">{summary.score(view.scores.nosotros, view.scores.ellos)}</p>
      </header>

      <div className="summary__section">
        <h3 className="summary__section-title">{summary.bazasTitle}</h3>
        <ol className="summary__bazas">
          {result.bazas.map((baza) => (
            <li className="summary__baza" key={baza.baza}>
              <span className="summary__baza-label">{summary.baza(baza.baza)}</span>
              <span
                className={`summary__baza-result${baza.parda ? ' summary__baza-result--parda' : ''}`}
              >
                {baza.parda || baza.winnerSeat === null
                  ? summary.parda
                  : content.personas[PERSONA_BY_SEAT[baza.winnerSeat]].name}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="summary__section">
        <h3 className="summary__section-title">{summary.handsTitle}</h3>
        <ul className="summary__hands">
          {SEATS.map((seat) => (
            <li className={`summary__hand summary__hand--${TEAM_BY_SEAT[seat]}`} key={seat}>
              <span className="summary__hand-name">
                {content.personas[PERSONA_BY_SEAT[seat]].name}
              </span>
              <ul className="summary__cards">
                {hands[seat].map((card) => {
                  const piece = pieceOf(card, view.vira);

                  return (
                    <li className="summary__card" key={`${card.rank}-${card.suit}`}>
                      <span className="summary__card-name">
                        {shortCardName(card, content.cards)}
                      </span>
                      {piece && (
                        <span className={`summary__piece summary__piece--${piece}`}>
                          {content.cards.piece[piece]}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="button button--primary summary__action"
        onClick={matchOver ? onRematch : onNextHand}
      >
        {matchOver ? summary.rematch : summary.nextHand}
      </button>
    </Modal>
  );
}
