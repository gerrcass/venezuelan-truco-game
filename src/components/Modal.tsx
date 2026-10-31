import { useEffect, useRef, type MouseEvent, type PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';

import { CloseIcon } from './icons';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Open dialogs in mount order. Only the newest one traps Tab and Escape, so a
 * rules or settings dialog opened over the hand summary does not fight the
 * summary for focus.
 */
const openModals: HTMLElement[] = [];

interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly labelledBy: string;
  readonly closeLabel: string;
  readonly variant?: 'center' | 'drawer';
  readonly panelClassName?: string;
  readonly dismissible?: boolean;
  /** Optional selector for the element that should receive focus when the dialog opens. */
  readonly initialFocus?: string;
}

export function Modal({
  open,
  onClose,
  labelledBy,
  closeLabel,
  variant = 'center',
  panelClassName,
  dismissible = true,
  initialFocus,
  children,
}: PropsWithChildren<ModalProps>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    openModals.push(panel);

    const focusable = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.getAttribute('aria-hidden') !== 'true',
      );

    const preferred = initialFocus ? panel.querySelector<HTMLElement>(initialFocus) : null;

    (preferred ?? focusable()[0] ?? panel).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (openModals[openModals.length - 1] !== panel) {
        return;
      }

      if (event.key === 'Escape') {
        if (dismissible) {
          event.preventDefault();
          onCloseRef.current();
        }

        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const items = focusable();

      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const index = openModals.lastIndexOf(panel);

      if (index >= 0) {
        openModals.splice(index, 1);
      }

      previousFocusRef.current?.focus();
    };
  }, [dismissible, initialFocus, open]);

  if (!open) {
    return null;
  }

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (dismissible && event.target === event.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className={`modal modal--${variant}`} role="presentation" onMouseDown={closeFromBackdrop}>
      <div
        className={`modal__panel${panelClassName ? ` ${panelClassName}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        ref={panelRef}
        tabIndex={-1}
      >
        {dismissible && (
          <button type="button" className="modal__close" onClick={onClose} aria-label={closeLabel}>
            <CloseIcon className="modal__close-icon" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
