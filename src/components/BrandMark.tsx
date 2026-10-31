interface BrandMarkProps {
  readonly className?: string;
}

/**
 * A worn playing card with a river stone resting on it: the piedra on the mesa.
 */
export function BrandMark({ className }: BrandMarkProps) {
  const classes = className ? `brand-mark ${className}` : 'brand-mark';

  return (
    <svg className={classes} viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      <g transform="rotate(-8 20 21)">
        <rect className="brand-mark__card" x="7.5" y="4" width="24" height="33" rx="3.6" />
        <rect
          className="brand-mark__card-line"
          x="10.7"
          y="7.2"
          width="17.6"
          height="26.6"
          rx="2"
        />
        <path className="brand-mark__card-pip" d="M13.2 12.8h4.6M15.5 10.5V15" />
        <path className="brand-mark__card-diamond" d="M23.4 16l3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2Z" />
      </g>
      <ellipse className="brand-mark__shadow" cx="32.7" cy="38" rx="7.3" ry="2.2" />
      <path
        className="brand-mark__stone"
        d="M23.2 27.5c2.7-2 6.8-2.3 9.6-.7 3.3 1.9 4.6 6 3 9.2-1.5 3-5 4.5-8.2 3.6-1 .4-2.1.5-3.2.3-2.9-.5-5-3.1-4.7-6 .1-2.4 1.3-4.8 3.5-6.4Z"
      />
      <path className="brand-mark__stone-line" d="M25.8 29.8c1.8-1 4-1.1 5.9-.3" />
      <path className="brand-mark__stone-mark" d="M32.2 31.4l1.9 1.9-1.9 1.9-1.9-1.9 1.9-1.9Z" />
    </svg>
  );
}
