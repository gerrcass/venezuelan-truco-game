import { useLocale } from '../content/locale-context';
import { pickTaunt } from '../content/taunts';
import { settlementNote, settlementSource } from '../content/settlements';
import { shortCardName } from '../content/types';
import { cardKey } from '../domain/cards';
import { PERSONA_BY_SEAT, SEATS, TEAM_BY_SEAT, type Seat } from '../domain/seats';
import { pieceOf } from '../engine/cards';
import type { GameView } from '../engine/types';
import type { CareerStats } from '../game/career';
import { deriveTableBeat, tauntPersonaForSeat } from '../game/table-talk';
import { Avatar } from './Avatar';
import { Modal } from './Modal';
import { StoneIcon } from './icons';

interface HandSummaryProps {
  readonly view: GameView;
  readonly stats: CareerStats;
  readonly onNextHand: () => void;
  readonly onRematch: () => void;
}

function burnedCardsBySeat(view: GameView): Map<Seat, Set<string>> {
  const burned = new Map<Seat, Set<string>>();

  for (const baza of view.result?.bazas ?? []) {
    for (const play of baza.plays) {
      if (!play.burned) {
        continue;
      }

      const keys = burned.get(play.seat) ?? new Set<string>();
      keys.add(cardKey(play.card));
      burned.set(play.seat, keys);
    }
  }

  return burned;
}

export function HandSummary({ view, stats, onNextHand, onRematch }: HandSummaryProps) {
  const { content } = useLocale();
  const result = view.result;

  if (!result) {
    return null;
  }

  const summary = content.summary;
  const scoreboard = content.scoreboard;
  const matchOver = view.phase === 'matchOver';
  const winner = content.scoreboard.teams[result.winnerTeam].name;
  const hands = view.revealedHands ?? result.hands;
  const burned = burnedCardsBySeat(view);
  const acceptedCall =
    result.trucoLevel === 0
      ? summary.noTruco
      : summary.trucoAccepted(content.truco.names[result.trucoLevel]);
  const talkBeat = deriveTableBeat(view);
  const talkPersona = talkBeat?.kind === 'taunt' ? tauntPersonaForSeat(talkBeat.seat) : null;
  const talkLine =
    talkBeat?.kind === 'taunt' && talkPersona !== null
      ? pickTaunt(talkPersona, talkBeat.event, talkBeat.seed, null, content.taunts)
      : null;

  return (
    <Modal
      open
      onClose={() => undefined}
      labelledBy="hand-summary-title"
      closeLabel={matchOver ? summary.rematch : summary.nextHand}
      panelClassName="summary"
      dismissible={false}
    >
      <header className={`summary__head${matchOver ? ' summary__head--match' : ''}`}>
        <p className="eyebrow">{summary.eyebrow}</p>
        {matchOver && <span className="summary__badge">{summary.matchBadge}</span>}
        <h2 className="summary__title" id="hand-summary-title">
          {matchOver ? summary.matchTitle(winner) : summary.title(winner)}
        </h2>
        <p className={`summary__score${matchOver ? ' summary__score--final' : ''}`}>
          {summary.score(view.scores.nosotros, view.scores.ellos)}
        </p>
        {!matchOver && (
          <p className="summary__points">
            <StoneIcon className="summary__stone" />
            {summary.points(result.totalPoints)}
          </p>
        )}

        <div className="summary__meta">
          <span className="summary__meta-label">{summary.reasonLabel}</span>
          <span className="summary__meta-value">{summary.reasons[result.reason]}</span>
          {result.trucoLevel > 0 && <span className="summary__meta-truco">{acceptedCall}</span>}
        </div>
      </header>

      {talkPersona !== null && talkLine !== null && (
        <p className="summary__talk" aria-live="polite" aria-atomic="true">
          <span className="summary__talk-avatar">
            <Avatar persona={talkPersona} />
          </span>
          <span>
            <span className="summary__talk-name">{content.personas[talkPersona].name}</span>{' '}
            <span className="summary__talk-quote">«{talkLine}»</span>
          </span>
        </p>
      )}

      <div className={`summary__section${matchOver ? ' summary__section--match' : ''}`}>
        {matchOver && <p className="summary__last-hand">{summary.lastHand(result.totalPoints)}</p>}
        <h3 className="summary__section-title">{summary.ledgerTitle}</h3>
        <table className="summary__statement">
          <thead>
            <tr>
              <th scope="col">{summary.ledgerSource}</th>
              <th scope="col">{summary.ledgerTeam}</th>
              <th scope="col">{summary.ledgerPoints}</th>
            </tr>
          </thead>
          <tbody>
            {result.settlements.map((settlement, index) => {
              const note = settlementNote(settlement, content);

              return (
                <tr
                  className={`summary__statement-row summary__statement-row--${settlement.kind}`}
                  key={`${settlement.kind}-${settlement.team}-${index}`}
                >
                  <th scope="row">
                    <span className="summary__statement-source">
                      {settlementSource(settlement, content)}
                    </span>
                    {note && <span className="summary__statement-note">{note}</span>}
                  </th>
                  <td>{scoreboard.teams[settlement.team].name}</td>
                  <td className="summary__statement-points">
                    {summary.settlementPoints(settlement.points)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                {summary.totalLabel}
              </th>
              <td className="summary__statement-points">
                {summary.settlementPoints(result.totalPoints)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {matchOver && (
        <p className="summary__career">
          {summary.careerLine(stats.matches, stats.wins, stats.hands)}
        </p>
      )}

      {result.bazas.length > 0 && (
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
      )}

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
                  const key = cardKey(card);
                  const wasBurned = burned.get(seat)?.has(key) ?? false;

                  return (
                    <li className="summary__card" key={key}>
                      <span className="summary__card-name">
                        {shortCardName(card, content.cards)}
                      </span>
                      {wasBurned && <span className="summary__burned">{summary.burnedTag}</span>}
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
