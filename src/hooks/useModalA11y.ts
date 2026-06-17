import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Accessibility behavior shared by every modal/dialog:
 *  - moves focus into the dialog on open (first focusable, else the container)
 *  - traps Tab / Shift+Tab inside the dialog
 *  - closes on Escape
 *  - restores focus to the previously focused element on close
 *
 * Robust to dialogs that mount their container behind an async loading state:
 * the keydown handler reads the container lazily, and initial focus is retried
 * for a few frames until the real container appears.
 *
 * Attach the returned ref to the dialog container and spread `dialogProps`
 * onto it so assistive tech announces it as a modal dialog.
 */
export function useModalA11y(onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    let rafId = 0;

    // Move focus into the dialog as soon as its container is in the DOM.
    // Some dialogs render a loading state first, so retry across a few frames.
    let attempts = 0;
    const focusIntoDialog = () => {
      const container = containerRef.current;
      if (container) {
        const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          container.focus();
        }
        return;
      }
      if (attempts++ < 60) {
        rafId = requestAnimationFrame(focusIntoDialog);
      }
    };
    focusIntoDialog();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const items = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(el => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !container.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', handleKeyDown, true);
      // Restore focus to whatever opened the dialog.
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, []);

  return {
    containerRef,
    dialogProps: {
      role: 'dialog' as const,
      'aria-modal': true,
      tabIndex: -1,
    },
  };
}
