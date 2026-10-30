import { useLocale } from '../content/locale-context';
import type { SampleTable } from '../data/sampleTable';
import { PERSONA_BY_SEAT, SEAT_POSITION, SEATS, type Seat } from '../domain/seats';
import { PlayingCard } from './PlayingCard';

interface TrickAreaProps {
  readonly table: SampleTable;
}

const BAZA_LENGTH = 4;

export function TrickArea({ table }: TrickAreaProps) {
  const { content } = useLocale();
  const order = Array.from(
    { length: BAZA_LENGTH },
    (_, index) => ((table.manoSeat + index) % SEATS.length) as Seat,
  );

  return (
    <div className="trick" role="group" aria-label={content.trick.aria(table.baza)}>
      {order.map((seat) => {
        const played = table.played.find((entry) => entry.seat === seat);
        const person = content.personas[PERSONA_BY_SEAT[seat]];
        const position = SEAT_POSITION[seat];
        const isTurn = table.turnSeat === seat;

        return (
          <div
            key={seat}
            className={`trick__slot trick__slot--${position}${isTurn ? ' trick__slot--turn' : ''}`}
          >
            <span className="trick__owner">
              {isTurn && <span className="trick__owner-dot" aria-hidden="true" />}
              {person.name}
            </span>
            {played ? (
              <PlayingCard card={played.card} size="trick" />
            ) : (
              <div className="trick__empty">
                <span className="trick__empty-diamond" aria-hidden="true" />
                <span>{content.trick.empty}</span>
              </div>
            )}
          </div>
        );
      })}

      <div className="trick__center" aria-hidden="true">
        <span className="trick__center-ring" />
        <span className="trick__center-label">{content.trick.label(table.baza)}</span>
      </div>
    </div>
  );
}
