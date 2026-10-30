import { useLocale } from '../content/locale-context';

export function ActionBar() {
  const { content } = useLocale();
  const actions = content.actions;
  const noteId = 'actions-note';

  return (
    <section className="actions" aria-labelledby="actions-title">
      <h2 className="sr-only" id="actions-title">
        {actions.label}
      </h2>

      <div className="actions__group" role="group" aria-label={actions.cantar}>
        <span className="actions__label">{actions.cantar}</span>
        <button
          type="button"
          className="action"
          disabled
          title={actions.soon}
          aria-describedby={noteId}
        >
          {actions.envido}
        </button>
        <button
          type="button"
          className="action"
          disabled
          title={actions.soon}
          aria-describedby={noteId}
        >
          {actions.flor}
        </button>
      </div>

      <span className="actions__divider" aria-hidden="true" />

      <button
        type="button"
        className="action action--truco"
        disabled
        title={actions.soon}
        aria-describedby={noteId}
      >
        {actions.truco}
      </button>
      <button
        type="button"
        className="action action--fold"
        disabled
        title={actions.soon}
        aria-describedby={noteId}
      >
        {actions.fold}
      </button>

      <p className="actions__note" id={noteId}>
        {actions.note}
      </p>

      <button
        type="button"
        className="action action--play"
        disabled
        title={actions.soon}
        aria-label={actions.play}
        aria-describedby={`${noteId} play-hint`}
      >
        <span className="action__play-title">{actions.play}</span>
        <span className="action__play-hint" id="play-hint">
          {actions.playHint}
        </span>
        <span className="action__soon" aria-hidden="true">
          {actions.soon}
        </span>
      </button>
    </section>
  );
}
