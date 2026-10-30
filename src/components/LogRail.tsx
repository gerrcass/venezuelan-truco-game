import { useLocale } from '../content/locale-context';
import { SUITS } from '../domain/cards';
import { SuitIcon } from './icons';

interface LogRailProps {
  readonly idPrefix: string;
}

export function LogRail({ idPrefix }: LogRailProps) {
  const { content } = useLocale();
  const log = content.log;
  const titleId = `${idPrefix}-title`;

  return (
    <div className="log">
      <header className="log__head">
        <div className="log__suits" aria-hidden="true">
          {SUITS.map((suit) => (
            <SuitIcon key={suit} suit={suit} className={`log__suit log__suit--${suit}`} />
          ))}
        </div>
        <p className="log__eyebrow">{log.subtitle}</p>
        <h2 className="log__title" id={titleId}>
          {log.title}
        </h2>
      </header>

      <ol
        className="log__entries"
        aria-label={log.label}
        aria-live="polite"
        aria-relevant="additions text"
      >
        {log.entries.map((entry) => (
          <li className={`log__entry log__entry--${entry.kind}`} key={entry.id}>
            <span className="log__kind">{log.kinds[entry.kind]}</span>
            <p className="log__text">{entry.text}</p>
          </li>
        ))}
      </ol>

      <div className="log__seal" aria-hidden="true">
        {log.stamp}
      </div>

      <p className="log__footer">{log.footer}</p>
    </div>
  );
}
