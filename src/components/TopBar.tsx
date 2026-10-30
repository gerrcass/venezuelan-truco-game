import { useLocale } from '../content/locale-context';
import { BrandMark } from './BrandMark';
import { RulesIcon, SoundOffIcon, SoundOnIcon } from './icons';

interface TopBarProps {
  readonly soundOn: boolean;
  readonly onToggleSound: () => void;
  readonly onOpenRules: () => void;
}

export function TopBar({ soundOn, onToggleSound, onOpenRules }: TopBarProps) {
  const { content, locale, setLocale } = useLocale();
  const topbar = content.topbar;

  return (
    <header className="topbar">
      <div className="brand">
        <BrandMark className="brand__mark" />
        <div className="brand__text">
          <h1 className="brand__name">{content.brand.name}</h1>
          <p className="brand__tagline">{content.brand.tagline}</p>
        </div>
      </div>

      <nav className="topbar__controls" aria-label={topbar.navigationLabel}>
        <button
          type="button"
          className="control control--rules"
          onClick={onOpenRules}
          aria-label={topbar.rulesAria}
        >
          <RulesIcon className="control__icon" />
          <span className="control__label">{topbar.rules}</span>
        </button>

        <button
          type="button"
          className="control control--icon"
          onClick={onToggleSound}
          aria-label={soundOn ? topbar.soundOn : topbar.soundOff}
          title={soundOn ? topbar.soundOn : topbar.soundOff}
        >
          {soundOn ? (
            <SoundOnIcon className="control__icon" />
          ) : (
            <SoundOffIcon className="control__icon" />
          )}
        </button>

        <div className="lang" role="group" aria-label={topbar.languageLabel}>
          <button
            type="button"
            className="lang__option"
            lang="es"
            aria-pressed={locale === 'es'}
            aria-label={topbar.spanishAria}
            onClick={() => setLocale('es')}
          >
            {topbar.spanishShort}
          </button>
          <button
            type="button"
            className="lang__option"
            lang="en"
            aria-pressed={locale === 'en'}
            aria-label={topbar.englishAria}
            onClick={() => setLocale('en')}
          >
            {topbar.englishShort}
          </button>
        </div>
      </nav>
    </header>
  );
}
