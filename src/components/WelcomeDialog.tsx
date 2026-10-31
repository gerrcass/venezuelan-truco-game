import { useLocale } from '../content/locale-context';
import { Modal } from './Modal';
import { PlayingCard } from './PlayingCard';

interface WelcomeDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onOpenRules: () => void;
}

const WELCOME_CARDS = [
  { rank: 1, suit: 'espada' },
  { rank: 7, suit: 'oro' },
  { rank: 3, suit: 'copa' },
] as const;

export function WelcomeDialog({ open, onClose, onOpenRules }: WelcomeDialogProps) {
  const { content } = useLocale();
  const welcome = content.welcome;

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="welcome-title"
      closeLabel={welcome.close}
      panelClassName="welcome"
      initialFocus=".welcome__play"
    >
      <div className="welcome__art" aria-hidden="true">
        {WELCOME_CARDS.map((card, index) => (
          <span
            className={`welcome__card welcome__card--${index + 1}`}
            key={`${card.rank}-${card.suit}`}
          >
            <PlayingCard card={card} size="welcome" />
          </span>
        ))}
        <span className="welcome__art-ring" />
      </div>

      <p className="eyebrow welcome__eyebrow">{welcome.eyebrow}</p>
      <h2 className="welcome__title" id="welcome-title">
        {welcome.title}
      </h2>
      <p className="welcome__lead">{welcome.lead}</p>

      <ol className="welcome__steps">
        {welcome.steps.map((step, index) => (
          <li className="welcome__step" key={step.title}>
            <span className="welcome__step-number" aria-hidden="true">
              {index + 1}
            </span>
            <span className="welcome__step-body">
              <span className="welcome__step-title">{step.title}</span>
              <span className="welcome__step-text">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <p className="welcome__goal">{welcome.goal}</p>

      <div className="welcome__actions">
        <button type="button" className="button button--primary welcome__play" onClick={onClose}>
          {welcome.play}
        </button>
        <button type="button" className="button button--quiet" onClick={onOpenRules}>
          {welcome.rules}
        </button>
      </div>
    </Modal>
  );
}
