import type { Suit } from '../domain/cards';

interface IconProps {
  readonly className?: string;
}

interface SuitIconProps extends IconProps {
  readonly suit: Suit;
}

function OroIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle
        cx="12"
        cy="12"
        r="6.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeDasharray="1.1 1.9"
        opacity="0.75"
      />
      <path
        d="M12 5.6l1.35 4.05L17.4 12l-4.05 1.35L12 17.4l-1.35-4.05L6.6 12l4.05-2.35L12 5.6Z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

function CopaIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M7.1 4.2h9.8c0 4.7-2.1 7.5-4.9 7.5S7.1 8.9 7.1 4.2Z"
        fill="currentColor"
        opacity="0.18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 11.6v5.1M8.2 19.4c0-1.6 1.7-2.7 3.8-2.7s3.8 1.1 3.8 2.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8.8 5.4c1.7-1 3.9-.8 5.2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M12 1.6v2.2M10.9 2.7h2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <ellipse cx="10.7" cy="7" rx="1.2" ry="1.9" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function EspadaIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 1.2l2.4 4.3v7.7H9.6V5.5L12 1.2Z" fill="currentColor" />
      <path
        d="M4.1 13.5h15.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      <path
        d="M12 14.2v3.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.1"
      />
      <path d="M8.2 20.8c.2-2 1.7-3.4 3.8-3.4s3.6 1.4 3.8 3.4H8.2Z" fill="currentColor" />
      <path className="suit-icon__detail" d="M12 3.6v8.1" />
    </svg>
  );
}

function BastoIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="6.9" r="3.7" fill="currentColor" />
      <circle cx="7.7" cy="12.5" r="3.5" fill="currentColor" />
      <circle cx="16.3" cy="12.5" r="3.5" fill="currentColor" />
      <path
        d="M10.7 14.6c-.2 2.5-1.2 4.6-2.6 6.6h7.8c-1.4-2-2.4-4.1-2.6-6.6h-2.6Z"
        fill="currentColor"
      />
      <path
        d="M9.7 15.9c.9-.8 3.7-.8 4.6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.4"
      />
    </svg>
  );
}

export function SuitIcon({ suit, className }: SuitIconProps) {
  const classes = className ? `suit-icon ${className}` : 'suit-icon';

  switch (suit) {
    case 'oro':
      return <OroIcon className={classes} />;
    case 'copa':
      return <CopaIcon className={classes} />;
    case 'espada':
      return <EspadaIcon className={classes} />;
    case 'basto':
      return <BastoIcon className={classes} />;
  }
}

export function RulesIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3.5 5.3c2.9-1.1 5.6-.7 8.5 1.1v12c-2.9-1.8-5.6-2.2-8.5-1.1v-12Z" />
      <path d="M20.5 5.3c-2.9-1.1-5.6-.7-8.5 1.1v12c2.9-1.8 5.6-2.2 8.5-1.1v-12Z" />
      <path d="M12 6.4v12" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 13.6a7.7 7.7 0 0 0 0-3.2l2-1.5-2-3.4-2.4 1a7.8 7.8 0 0 0-2.8-1.6L13.8 2h-3.6l-.4 2.9A7.8 7.8 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.5a7.7 7.7 0 0 0 0 3.2l-2 1.5 2 3.4 2.4-1a7.8 7.8 0 0 0 2.8 1.6l.4 2.9h3.6l.4-2.9a7.8 7.8 0 0 0 2.8-1.6l2.4 1 2-3.4-2-1.5Z" />
    </svg>
  );
}

export function SoundOnIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 9.4h3.4L12 5.6v12.8L7.4 14.6H4V9.4Z" fill="currentColor" stroke="none" />
      <path d="M15 9c1.4 1.6 1.4 4.4 0 6M17.7 6.7c2.7 2.8 2.7 7.8 0 10.6" />
    </svg>
  );
}

export function SoundOffIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 9.4h3.4L12 5.6v12.8L7.4 14.6H4V9.4Z" fill="currentColor" stroke="none" />
      <path d="M15.5 9.6l4.8 4.8M20.3 9.6l-4.8 4.8" />
    </svg>
  );
}

export function LogIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.4 11.3c0 3.8-3.7 6.8-8.2 6.8-.9 0-1.8-.1-2.6-.3L5 20l1.2-3.4c-1.6-1.3-2.6-3.2-2.6-5.3 0-3.8 3.7-6.8 8.2-6.8s8.6 3 8.6 6.8Z" />
      <circle cx="8.4" cy="11.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="11.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function StoneIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5.2 13.4c-.5-3.4 1.9-6.6 5.3-7 2-.2 3.8.6 5.1 2 1 .2 2.2.9 2.8 2 1.2 2.2.5 4.9-1.6 6.3-1.2.8-2.6 1-3.9.7-1 .8-2.3 1.2-3.7 1-1.9-.4-3.5-2-3.9-4Z"
        fill="currentColor"
      />
      <path
        d="M8.4 9.8c1.2-.9 2.9-1.2 4.3-.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}
