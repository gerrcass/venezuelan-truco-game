import { useLocale } from '../content/locale-context';
import { SUITS } from '../domain/cards';
import { Modal } from './Modal';
import { SuitIcon } from './icons';

interface RulesDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function RulesDialog({ open, onClose }: RulesDialogProps) {
  const { content } = useLocale();
  const dialog = content.rulesDialog;

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="rules-dialog-title"
      closeLabel={dialog.close}
      panelClassName="rules-dialog"
    >
      <div className="rules-dialog__head">
        <div className="rules-dialog__kicker">
          <p className="eyebrow">{dialog.eyebrow}</p>
        </div>
        <h2 className="rules-dialog__title" id="rules-dialog-title">
          {dialog.title}
        </h2>
        <p className="rules-dialog__body">{dialog.body}</p>
      </div>

      <ul className="rules-dialog__topics">
        {dialog.topics.map((topic, index) => (
          <li className="rules-dialog__topic" key={topic}>
            <span
              className={`rules-dialog__suit rules-dialog__suit--${SUITS[index % SUITS.length]}`}
            >
              <SuitIcon suit={SUITS[index % SUITS.length]} />
            </span>
            {topic}
          </li>
        ))}
      </ul>

      <button type="button" className="button button--primary" onClick={onClose}>
        {dialog.back}
      </button>
    </Modal>
  );
}
