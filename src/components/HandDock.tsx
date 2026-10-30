import { useLocale } from '../content/locale-context';
import type { SampleTable } from '../data/sampleTable';
import { cardKey } from '../domain/cards';
import { PlayingCard } from './PlayingCard';

interface HandDockProps {
  readonly table: SampleTable;
}

export function HandDock({ table }: HandDockProps) {
  const { content } = useLocale();

  return (
    <section className="hand" aria-labelledby="hand-title">
      <div className="hand__heading">
        <h2 className="hand__title" id="hand-title">
          {content.hand.title}
        </h2>
        <span className="hand__count">{content.hand.count(table.hand.length)}</span>
      </div>

      <ul className="hand__cards" aria-label={content.hand.aria}>
        {table.hand.map((entry, index) => (
          <li className="hand__slot" key={cardKey(entry.card)}>
            <span className="hand__key" aria-hidden="true">
              {index + 1}
            </span>
            <PlayingCard card={entry.card} piece={entry.piece} size="hand" />
          </li>
        ))}
      </ul>

      <p className="hand__hint">{content.hand.hint}</p>
    </section>
  );
}
