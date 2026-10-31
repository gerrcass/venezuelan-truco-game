import { useEffect, useState } from 'react';

import { useLocale } from '../content/locale-context';
import type { CareerStats } from '../game/career';
import { usePreferences, setSoundPreference, setSpeedPreference } from '../game/preferences';
import { BOT_SPEEDS, type BotSpeed } from '../domain/preferences';
import { Modal } from './Modal';

interface SettingsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onOpenWelcome: () => void;
  readonly stats: CareerStats;
  readonly onClearStats: () => void;
}

const STAT_KEYS = ['matches', 'wins', 'losses', 'hands', 'envidos', 'flores'] as const;

export function SettingsDialog({
  open,
  onClose,
  onOpenWelcome,
  stats,
  onClearStats,
}: SettingsDialogProps) {
  const { content, locale, setLocale } = useLocale();
  const settings = content.settings;
  const preferences = usePreferences();
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  const empty = STAT_KEYS.every((key) => stats[key] === 0);

  useEffect(() => {
    if (open) {
      setConfirming(false);
      setCleared(false);
    }
  }, [open]);

  const clear = () => {
    onClearStats();
    setConfirming(false);
    setCleared(true);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="settings-dialog-title"
      closeLabel={settings.close}
      panelClassName="settings"
      initialFocus=".settings__language"
    >
      <header className="settings__head">
        <p className="eyebrow">{settings.eyebrow}</p>
        <h2 className="settings__title" id="settings-dialog-title">
          {settings.title}
        </h2>
        <p className="settings__lead">{settings.lead}</p>
      </header>

      <section className="settings__section" aria-labelledby="settings-language-title">
        <div className="settings__section-head">
          <h3 className="settings__section-title" id="settings-language-title">
            {settings.languageTitle}
          </h3>
          <p className="settings__hint">{settings.languageHint}</p>
        </div>
        <div className="settings__languages" role="group" aria-labelledby="settings-language-title">
          <button
            type="button"
            className={`settings__language${locale === 'es' ? ' settings__language--active' : ''}`}
            lang="es"
            aria-pressed={locale === 'es'}
            aria-label={content.topbar.spanishAria}
            onClick={() => setLocale('es')}
          >
            {content.topbar.spanish}
            {locale === 'es' && (
              <span className="settings__language-check" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
          <button
            type="button"
            className={`settings__language${locale === 'en' ? ' settings__language--active' : ''}`}
            lang="en"
            aria-pressed={locale === 'en'}
            aria-label={content.topbar.englishAria}
            onClick={() => setLocale('en')}
          >
            {content.topbar.english}
            {locale === 'en' && (
              <span className="settings__language-check" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        </div>
      </section>

      <section className="settings__section" aria-labelledby="settings-sound-title">
        <div className="settings__section-head">
          <h3 className="settings__section-title" id="settings-sound-title">
            {settings.soundTitle}
          </h3>
          <p className="settings__hint">{settings.soundHint}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={preferences.sound}
          className={`settings__switch${preferences.sound ? ' settings__switch--on' : ''}`}
          onClick={() => setSoundPreference(!preferences.sound)}
        >
          <span className="settings__switch-track" aria-hidden="true">
            <span className="settings__switch-thumb" />
          </span>
          <span>{preferences.sound ? settings.soundOn : settings.soundOff}</span>
        </button>
      </section>

      <section className="settings__section" aria-labelledby="settings-speed-title">
        <div className="settings__section-head">
          <h3 className="settings__section-title" id="settings-speed-title">
            {settings.speedTitle}
          </h3>
          <p className="settings__hint">{settings.speedHint}</p>
        </div>
        <div className="settings__speeds" role="radiogroup" aria-labelledby="settings-speed-title">
          {BOT_SPEEDS.map((speed: BotSpeed) => (
            <label
              className={`settings__speed${preferences.speed === speed ? ' settings__speed--active' : ''}`}
              key={speed}
            >
              <input
                type="radio"
                name="bot-speed"
                value={speed}
                checked={preferences.speed === speed}
                onChange={() => setSpeedPreference(speed)}
              />
              <span className="settings__speed-label">
                {settings.speeds[speed].label}
                {preferences.speed === speed && (
                  <span className="settings__speed-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </span>
              <span className="settings__speed-note">{settings.speeds[speed].note}</span>
            </label>
          ))}
        </div>
      </section>

      <section
        className="settings__section settings__career"
        aria-labelledby="settings-career-title"
      >
        <div className="settings__section-head">
          <h3 className="settings__section-title" id="settings-career-title">
            {settings.careerTitle}
          </h3>
          <p className="settings__hint">{settings.careerHint}</p>
        </div>

        {empty ? (
          <p className="settings__empty">{settings.careerEmpty}</p>
        ) : (
          <dl className="settings__stats">
            {STAT_KEYS.map((key) => (
              <div className="settings__stat" key={key}>
                <dt>{settings.stats[key]}</dt>
                <dd>{stats[key]}</dd>
              </div>
            ))}
          </dl>
        )}

        {confirming ? (
          <div className="settings__confirm" role="alert">
            <p>{settings.clearConfirm}</p>
            <div className="settings__confirm-actions">
              <button type="button" className="button settings__danger" onClick={clear}>
                {settings.clearYes}
              </button>
              <button
                type="button"
                className="button button--quiet"
                onClick={() => setConfirming(false)}
              >
                {settings.clearNo}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="settings__clear" onClick={() => setConfirming(true)}>
            {settings.clear}
          </button>
        )}

        {cleared && (
          <p className="settings__cleared" role="status">
            {settings.cleared}
          </p>
        )}
      </section>

      <section className="settings__section settings__tutorial">
        <button type="button" className="settings__howto" onClick={onOpenWelcome}>
          <span>{settings.howToPlay}</span>
          <span className="settings__hint">{settings.howToPlayHint}</span>
        </button>
      </section>
    </Modal>
  );
}
