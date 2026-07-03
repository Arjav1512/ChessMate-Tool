export interface BoardControlsProps {
  atStart: boolean;
  atEnd: boolean;
  onStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEnd: () => void;
  onFlip: () => void;
  /** Material balance from the user's POV, e.g. "+1" / "−2" / "even". */
  material?: string;
  /** Full-width primary Next (mobile, §8). */
  mobile?: boolean;
}

/**
 * Board controls (§8): ⏮ ‹ › ⏭ (38px), the forward "next" step is the Primary
 * action; Flip; material indicator. Conventional navigation (§14.6).
 */
export function BoardControls({ atStart, atEnd, onStart, onPrev, onNext, onEnd, onFlip, material, mobile = false }: BoardControlsProps) {
  return (
    <div className={`iv-controls ${mobile ? 'iv-controls--mobile' : ''}`}>
      <button className="iv-controls__btn" onClick={onStart} disabled={atStart} aria-label="Go to start">⏮</button>
      <button className="iv-controls__btn" onClick={onPrev} disabled={atStart} aria-label="Previous move">‹</button>
      <button className="iv-controls__btn iv-controls__btn--primary" onClick={onNext} disabled={atEnd} aria-label="Next move">
        {mobile ? 'Next ›' : '›'}
      </button>
      <button className="iv-controls__btn" onClick={onEnd} disabled={atEnd} aria-label="Go to end">⏭</button>
      <div className="iv-controls__spacer" />
      <button className="iv-controls__btn iv-controls__btn--ghost" onClick={onFlip} aria-label="Flip board (f)">⇅ Flip</button>
      {material && <span className="iv-controls__material" aria-label={`Material ${material}`}>{material}</span>}
    </div>
  );
}
