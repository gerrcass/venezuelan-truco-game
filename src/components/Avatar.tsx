import { useLocale } from '../content/locale-context';
import type { PersonaKey } from '../domain/seats';

interface AvatarProps {
  readonly persona: PersonaKey;
}

function Pattern() {
  return (
    <g className="avatar__pattern" aria-hidden="true">
      <path d="M4 14l7-7 7 7-7 7-7-7Z" />
      <path d="M46 50l6-6 6 6-6 6-6-6Z" />
      <path d="M48 8l4-4 4 4-4 4-4-4Z" />
    </g>
  );
}

function PanaAvatar() {
  return (
    <>
      <circle className="av-bg" cx="32" cy="32" r="32" />
      <Pattern />
      <path className="av-shirt" d="M5.5 65c0-10 9.2-16.2 26.5-16.2S58.5 55 58.5 65h-53Z" />
      <path className="av-shirt-line" d="M20 54v11M32 51.5V65M44 54v11" />
      <path className="av-shirt-line" d="M18.5 58h6v4.6h-6zM39.5 58h6v4.6h-6z" />
      <path className="av-shirt-line" d="M18.5 58l6 1.4M39.5 58l6 1.4" />
      <circle className="av-button" cx="32" cy="56" r="0.8" />
      <circle className="av-button" cx="32" cy="60" r="0.8" />
      <path className="av-skin-shade" d="M26.7 42.5h10.6v9.3c0 3.5-10.6 3.5-10.6 0v-9.3Z" />
      <ellipse className="av-skin" cx="32" cy="31.7" rx="12.7" ry="14.4" />
      <ellipse className="av-skin-shade" cx="19.7" cy="34" rx="2.4" ry="3" />
      <ellipse className="av-skin-shade" cx="44.3" cy="34" rx="2.4" ry="3" />
      <path
        className="av-hair"
        d="M19.1 30.6c-1-8.4 4.1-14.8 12.9-14.8s13.9 6.4 12.9 14.8c-1.5-4.4-4.5-7-8.6-7.8-2.5 1.5-6.1 1.6-8.6.1-4.1.8-7.1 3.4-8.6 7.7Z"
      />
      <path
        className="av-hair"
        d="M20.2 29.2c.6-2 1.5-3.5 2.7-4.6l1.2 4.9-3.9-.3ZM43.8 29.2c-.6-2-1.5-3.5-2.7-4.6l-1.2 4.9 3.9-.3Z"
      />
      <path
        className="av-line"
        strokeWidth="1.9"
        d="M23 27.4c2.2-1.5 4.9-1.4 6.9.2M34.1 27.6c2-1.6 4.7-1.7 6.9-.2"
      />
      <ellipse className="av-eye" cx="26.4" cy="31.2" rx="1.55" ry="1.7" />
      <ellipse className="av-eye" cx="37.6" cy="31.2" rx="1.55" ry="1.7" />
      <circle className="av-glint" cx="26.9" cy="30.7" r="0.5" />
      <circle className="av-glint" cx="38.1" cy="30.7" r="0.5" />
      <path className="av-line" strokeWidth="1.2" d="M32 30.6v4.7c0 1 .7 1.6 1.8 1.6" />
      <path
        className="av-hair"
        d="M22.2 36.2c2.9-1.8 6.1-1.9 9.8-.4 3.7-1.5 6.9-1.4 9.8.4-2.3 3.3-5.6 4.4-9.8 2.6-4.2 1.8-7.5.7-9.8-2.6Z"
      />
      <path className="av-line" strokeWidth="1.3" d="M27.3 42.1c3 2.1 6.4 2.1 9.4 0" />
      <path className="av-skin-shade" d="M29.4 44.2c1.7 1 3.5 1 5.2 0" opacity="0.5" />
    </>
  );
}

function ComadreAvatar() {
  return (
    <>
      <circle className="av-bg" cx="32" cy="32" r="32" />
      <Pattern />
      <path className="av-shirt" d="M6 65c0-9.4 8.7-15.4 26-15.4S58 55.6 58 65H6Z" />
      <path className="av-shirt-line" d="M22 52.8c2.5 3.2 6.2 4.8 10 4.8s7.5-1.6 10-4.8" />
      <path className="av-skin-shade" d="M27 42.5h10v9.2c0 3.3-10 3.3-10 0v-9.2Z" />
      <ellipse className="av-skin" cx="32" cy="31.6" rx="12.5" ry="14.2" />
      <ellipse className="av-skin-shade" cx="19.8" cy="34.5" rx="2.3" ry="2.9" />
      <ellipse className="av-skin-shade" cx="44.2" cy="34.5" rx="2.3" ry="2.9" />
      <path
        className="av-hair"
        d="M19.3 31.8c-1.2-8.7 4.2-15.6 12.7-15.6s13.9 6.9 12.7 15.6c-.8-2.4-1.2-4.5-3.3-6.2-2.8 1.7-6.3 1.8-9.4.2-2.9 1.5-6.1 1.5-8.9-.2-2.1 1.7-2.5 3.8-3.8 6.2Z"
      />
      <g className="av-rollers">
        <rect
          x="22.1"
          y="17.7"
          width="5.4"
          height="7.6"
          rx="2.7"
          transform="rotate(-9 24.8 21.5)"
        />
        <rect x="29.3" y="16.2" width="5.4" height="7.6" rx="2.7" transform="rotate(3 32 20)" />
        <rect
          x="36.5"
          y="17.7"
          width="5.4"
          height="7.6"
          rx="2.7"
          transform="rotate(10 39.2 21.5)"
        />
      </g>
      <path
        className="av-scarf"
        d="M18.2 28.2c0-8.7 5.8-14.4 13.8-14.4s14.2 5.7 14.2 14.4l-5-1.5c-1.3-2.4-2.2-3.9-3.4-5.4-2.1 1.5-4.2 1.5-6.2.2-2.1 1.3-4.4 1.2-6.4-.2-1.4 1.6-2.5 3.3-3.7 5.5l-3.3 1.4Z"
      />
      <path className="av-scarf-line" d="M22.4 18.4c5.9-4.7 13.5-4.9 19.4-.3" />
      <path
        className="av-scarf"
        d="M45.2 25.2c2.4-1.7 5.7-1.1 7.2 1.4 1.4 2.4.4 5.5-2 6.7l-2 .9-3.2-9Z"
      />
      <path
        className="av-scarf"
        d="M47.1 31.7c2.5 1 4.2 3 4.6 5.6l-2.7 1.5c-1.5-2-2.2-4.2-1.9-7.1Z"
      />
      <circle className="av-scarf-dot" cx="27.3" cy="22.1" r="0.8" />
      <circle className="av-scarf-dot" cx="35.4" cy="21.2" r="0.8" />
      <circle className="av-scarf-dot" cx="23.4" cy="25.2" r="0.7" />
      <circle className="av-gold" cx="18.4" cy="37.5" r="2.1" />
      <circle className="av-gold-hole" cx="18.4" cy="37.5" r="1.1" />
      <circle className="av-gold" cx="45.6" cy="37.5" r="2.1" />
      <circle className="av-gold-hole" cx="45.6" cy="37.5" r="1.1" />
      <path
        className="av-line"
        strokeWidth="1.9"
        d="M22.8 27.1c2.2-1.4 4.6-1.2 6.3.3M34.9 27.4c1.8-1.5 4.3-1.6 6.4-.2"
      />
      <ellipse className="av-eye" cx="26.4" cy="31.4" rx="1.45" ry="1.65" />
      <ellipse className="av-eye" cx="37.6" cy="31.4" rx="1.45" ry="1.65" />
      <circle className="av-glint" cx="26.9" cy="30.9" r="0.45" />
      <circle className="av-glint" cx="38.1" cy="30.9" r="0.45" />
      <g className="av-glasses">
        <circle cx="26.5" cy="31.7" r="4.5" />
        <circle cx="37.5" cy="31.7" r="4.5" />
        <path d="M31 31.7h2M22 31.2l-2.3-.4M42 31.2l2.3-.4" />
      </g>
      <path className="av-line" strokeWidth="1.1" d="M32 30.9v4c0 .8.6 1.3 1.5 1.3" />
      <path
        className="av-lip"
        d="M26.3 39.2c1.8-1 3.8-1 5.7 0 1.9-1 3.9-1 5.7 0-1 2.8-3.1 4.4-5.7 4.4s-4.7-1.6-5.7-4.4Z"
      />
      <path
        className="av-teeth"
        d="M28.5 39.9c2.3-.6 4.7-.6 7 0-.9.9-2.1 1.3-3.5 1.3s-2.6-.4-3.5-1.3Z"
      />
      <path className="av-lip-line" d="M29.1 41.9c1.9.8 3.9.8 5.8 0" />
    </>
  );
}

function CatireAvatar() {
  return (
    <>
      <circle className="av-bg" cx="32" cy="32" r="32" />
      <Pattern />
      <path className="av-shirt" d="M6 65c0-9.7 8.7-15.7 26-15.7S58 55.3 58 65H6Z" />
      <path className="av-shirt-line" d="M24.5 50.7 32 57l7.5-6.3" />
      <path className="av-skin-shade" d="M27 42.2h10v9.1c0 3.3-10 3.3-10 0v-9.1Z" />
      <ellipse className="av-skin" cx="32" cy="31.8" rx="12.3" ry="14" />
      <ellipse className="av-skin-shade" cx="20" cy="34.4" rx="2.2" ry="2.8" />
      <ellipse className="av-skin-shade" cx="44" cy="34.4" rx="2.2" ry="2.8" />
      <path
        className="av-hair"
        d="M19.6 31c-1-8.1 4.3-14.4 12.4-14.4S45.4 22.9 44.4 31c-.7-2.4-1.5-4.3-3-6.1-2.7 2-6.1 2.2-9.4.5-3 1.5-6 1.5-8.8-.1-1.3 1.7-2.3 3.4-3.6 5.7Z"
      />
      <path
        className="av-hair"
        d="M19.8 30.2c-.8 2.2-.6 4 .4 5.7l3.5-1.4c-1.2-2-2.3-3.7-3.9-4.3ZM44.2 30.2c.8 2.2.6 4-.4 5.7l-3.5-1.4c1.2-2 2.3-3.7 3.9-4.3Z"
      />
      <path className="av-cap" d="M19.2 24.2c.7-6.9 5.6-11.4 12.8-11.4s12.1 4.5 12.8 11.4H19.2Z" />
      <path
        className="av-cap-line"
        d="M32 13.2v10.8M24 15.1c-1.7 2.5-2.7 5.5-3 9.1M40 15.1c1.7 2.5 2.7 5.5 3 9.1"
      />
      <path
        className="av-cap-brim"
        d="M17.4 24.1c3.7 2 29.5 2 29.2 0-.1-2.4-6.6-3.6-14.6-3.6s-14.5 1.2-14.6 3.6Z"
      />
      <circle className="av-gold" cx="32" cy="14.4" r="1.4" />
      <path
        className="av-line"
        strokeWidth="2"
        d="M23.2 28.3c2-1.8 4.5-2 6.6-.5M34.2 27.1c2.1-1.5 4.7-1.3 6.8.5"
      />
      <path className="av-eye" d="M24.8 31.6c1.2-1.7 3.2-1.7 4.4 0-1.2 1.4-3.2 1.4-4.4 0Z" />
      <path className="av-eye" d="M34.8 31.6c1.2-1.7 3.2-1.7 4.4 0-1.2 1.4-3.2 1.4-4.4 0Z" />
      <circle className="av-glint" cx="28.1" cy="31" r="0.45" />
      <circle className="av-glint" cx="38.1" cy="31" r="0.45" />
      <path className="av-line" strokeWidth="1.1" d="M32 31v4.3c0 .9.7 1.4 1.7 1.4" />
      <path className="av-line" strokeWidth="1.2" d="M27.9 39.3c3.1 2.4 6.4 2.6 9.7.8" />
      <path
        className="av-lip"
        d="M29.7 41.7c1.4-.7 2.9-.7 4.4-.1-.4 1.5-1.6 2.3-3 2.1-1.2-.1-1.7-1-1.4-2Z"
      />
      <path
        className="av-teeth"
        d="M31.2 41.8c.8-.2 1.5-.2 2.2 0-.3.6-.8.8-1.4.7-.4 0-.7-.3-.8-.7Z"
      />
      <path className="av-gold-stroke" d="M25 52.7c3.2 3.6 10.8 3.6 14 0" />
      <circle className="av-gold" cx="32" cy="56.1" r="1.3" />
      <path className="av-gold" d="M31 56.5h2l-1 2.2-1-2.2Z" />
    </>
  );
}

function YouAvatar({ marker }: { marker: string }) {
  return (
    <>
      <circle className="av-bg" cx="32" cy="32" r="32" />
      <g className="avatar__you-pattern">
        <path d="M32 4l28 28-28 28L4 32 32 4Z" />
        <path d="M32 12l20 20-20 20-20-20 20-20Z" />
      </g>
      <circle className="avatar__you-ring" cx="32" cy="32" r="23.5" />
      <path className="avatar__you-diamond" d="M32 17.5l7.8 14.5L32 46.5l-7.8-14.5L32 17.5Z" />
      <text
        className="avatar__you-text"
        x="32"
        y="34.4"
        textAnchor="middle"
        fontSize={marker.length > 2 ? 12.5 : 16}
      >
        {marker}
      </text>
      <path
        className="avatar__you-stone"
        d="M14.6 43.5c2-1.5 4.8-1.3 6.4.5 1.4 1.6 1.4 4.1-.2 5.5-1.4 1.2-3.5 1.3-5 .2-1.8-.1-3.2-1.6-3.2-3.4 0-1.1.7-2.1 2-2.8Z"
      />
    </>
  );
}

export function Avatar({ persona }: AvatarProps) {
  const { content } = useLocale();

  return (
    <svg
      className={`avatar avatar--${persona}`}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      {persona === 'pana' && <PanaAvatar />}
      {persona === 'comadre' && <ComadreAvatar />}
      {persona === 'catire' && <CatireAvatar />}
      {persona === 'you' && <YouAvatar marker={content.personas.you.marker} />}
    </svg>
  );
}
