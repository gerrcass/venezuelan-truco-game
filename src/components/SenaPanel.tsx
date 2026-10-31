import { useState } from 'react';

import { useLocale } from '../content/locale-context';
import { shortCardName } from '../content/types';
import type { Sena } from '../engine/types';

interface SenaPanelProps {
  readonly sena: Sena;
  /** The public match seed plus the reparto number: one reveal per deal, never across a rematch. */
  readonly dealKey: string;
}

const PANEL_ID = 'sena-panel';

function EyeMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M2.8 12c2.7-4.4 5.8-6.5 9.2-6.5s6.5 2.1 9.2 6.5c-2.7 4.4-5.8 6.5-9.2 6.5S5.5 16.4 2.8 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="3.1" fill="currentColor" />
      <path
        d="M6.4 5.2 4.9 3.7M17.6 5.2l1.5-1.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

/**
 * El Pana's one seña per reparto. It never opens itself: the human chooses to
 * look. The revealed hand number resets the panel on the next deal.
 */
export function SenaPanel({ sena, dealKey }: SenaPanelProps) {
  const { content } = useLocale();
  const [revealedDeal, setRevealedDeal] = useState<string | null>(null);
  const revealed = revealedDeal === dealKey;

  return (
    <div className={`sena${revealed ? ' sena--open' : ''}`}>
      <button
        type="button"
        className="sena__trigger"
        aria-expanded={revealed}
        aria-controls={PANEL_ID}
        onClick={() => setRevealedDeal(revealed ? null : dealKey)}
      >
        <span className="sena__mark" aria-hidden="true">
          <EyeMark />
        </span>
        <span className="sena__trigger-body">
          <span className="sena__label">{content.sena.label}</span>
          <span className="sena__invite">{revealed ? content.sena.hide : content.sena.invite}</span>
        </span>
      </button>

      {revealed && (
        <div className="sena__panel" id={PANEL_ID} role="region" aria-label={content.sena.label}>
          <p className="sena__eyebrow">{content.sena.gestureLabel}</p>
          <p className="sena__gesture">{content.sena.gestures[sena.kind]}</p>
          <p className="sena__meaning">{content.sena.meanings[sena.kind]}</p>
          {sena.card && (
            <p className="sena__card">
              {content.sena.card(shortCardName(sena.card, content.cards))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
