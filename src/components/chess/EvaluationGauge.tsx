interface EvaluationGaugeProps {
  evaluation: string;
  isMate: boolean;
  moveNumber?: number;
  /** Height in pixels — defaults to 480 (matches 8×60 board). Pass squareSize*8 for responsive boards. */
  height?: number;
}

export function EvaluationGauge({ evaluation, isMate, moveNumber, height = 480 }: EvaluationGaugeProps) {
  const getEvalPercentage = (): number => {
    if (isMate) {
      const mateIn = parseInt(evaluation.replace('M', ''));
      return mateIn > 0 ? 100 : 0;
    }

    const evalNum = parseFloat(evaluation);
    const clampedEval = Math.max(-10, Math.min(10, evalNum));
    return 50 + (clampedEval / 10) * 50;
  };

  const percentage = getEvalPercentage();
  const evalNum = isMate ? 0 : parseFloat(evaluation);
  const displayEval = isMate ? evaluation : Math.abs(evalNum).toFixed(1);

  const gaugeHeight = height;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
    }}>
      <div style={{
        width: '28px',
        height: `${gaugeHeight}px`,
        background: 'var(--cm-bg-elevated)',
        borderRadius: '4px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid var(--cm-border-default)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        {/* White area (top) */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${100 - percentage}%`,
          background: 'linear-gradient(to bottom, #FAFAFA, #E8E8E8)',
          transition: 'height 0.35s ease',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '5px',
        }}>
          {percentage < 48 && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#1A1A1A',
              fontFamily: 'var(--font-family-mono)',
              lineHeight: 1,
            }}>
              {displayEval}
            </span>
          )}
        </div>

        {/* Black area (bottom) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${percentage}%`,
          background: 'linear-gradient(to top, #0C0C0C, #1A1A1A)',
          transition: 'height 0.35s ease',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: '5px',
        }}>
          {percentage > 52 && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#FFFAF0',
              fontFamily: 'var(--font-family-mono)',
              lineHeight: 1,
            }}>
              {displayEval}
            </span>
          )}
        </div>

        {/* Centred label for near-equal positions (48–52%) — shown on the centre line */}
        {percentage >= 48 && percentage <= 52 && (
          <span style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            transform: 'translateY(-50%)',
            fontSize: '9px',
            fontWeight: 700,
            color: 'var(--cm-text-muted)',
            fontFamily: 'var(--font-family-mono)',
            textAlign: 'center',
            lineHeight: 1,
            zIndex: 3,
            pointerEvents: 'none',
          }}>
            {displayEval}
          </span>
        )}

        {/* Center line */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '1px',
          background: 'var(--cm-border-strong)',
          transform: 'translateY(-50%)',
          zIndex: 2,
        }} />

        {/* Move number indicator */}
        {moveNumber && moveNumber > 0 && (
          <div style={{
            position: 'absolute',
            left: '-30px',
            top: `${100 - percentage}%`,
            transform: 'translateY(-50%)',
            fontSize: '10px',
            color: 'var(--cm-text-muted)',
            fontWeight: 600,
            fontFamily: 'var(--font-family-mono)',
            background: 'var(--cm-bg-base)',
            padding: '1px 3px',
            borderRadius: '3px',
            whiteSpace: 'nowrap',
          }}>
            {moveNumber}
          </div>
        )}
      </div>

      <div style={{
        fontSize: '10px',
        color: 'var(--cm-text-muted)',
        textAlign: 'center',
        fontFamily: 'var(--font-family-mono)',
        lineHeight: 1.3,
      }}>
        <div style={{ fontWeight: 600 }}>
          {percentage > 55 ? 'Black' : percentage < 45 ? 'White' : 'Eq'}
        </div>
        {isMate && (
          <div style={{ fontSize: '9px', marginTop: '2px', color: 'var(--cm-warning)' }}>
            M{Math.abs(parseInt(evaluation.replace('M', '')))}
          </div>
        )}
      </div>
    </div>
  );
}
