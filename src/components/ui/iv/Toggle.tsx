export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible label for the switch (required — icon/visual not enough). */
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

/** Switch toggle (System Design §6) — role="switch", keyboard operable. */
export function Toggle({ checked, onChange, ariaLabel, disabled = false, className = '' }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`iv-toggle ${className}`}
      onClick={() => onChange(!checked)}
    >
      <span className="iv-toggle__knob" aria-hidden />
    </button>
  );
}
