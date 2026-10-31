import { useLocale } from '../content/locale-context';
import { LogIcon } from './icons';

interface HintStripProps {
  readonly onOpenRules: () => void;
  readonly onOpenLog: () => void;
  readonly logOpen: boolean;
}

export function HintStrip({ onOpenRules, onOpenLog, logOpen }: HintStripProps) {
  const { content } = useLocale();
  const hints = content.hints;

  return (
    <footer className="hintbar">
      <div className="hintbar__shortcuts">
        <span className="hintbar__label">{hints.label}</span>
        <span className="shortcut">
          <kbd>1</kbd>
          <kbd>2</kbd>
          <kbd>3</kbd>
          <span>{hints.cards}</span>
        </span>
        <span className="shortcut">
          <kbd>B</kbd>
          <span>{hints.burn}</span>
        </span>
        <span className="shortcut shortcut--rules">
          <kbd>R</kbd>
          <span>{hints.rules}</span>
        </span>
        <span className="shortcut shortcut--close">
          <kbd>Esc</kbd>
          <span>{hints.close}</span>
        </span>
      </div>

      <div className="hintbar__actions">
        <button
          type="button"
          className="hintbar__log"
          onClick={onOpenLog}
          aria-haspopup="dialog"
          aria-expanded={logOpen}
          aria-label={hints.logOpenAria}
        >
          <LogIcon className="hintbar__log-icon" />
          {hints.logOpen}
        </button>
        <button type="button" className="hintbar__link" onClick={onOpenRules}>
          {hints.rulesLink}
        </button>
      </div>
    </footer>
  );
}
