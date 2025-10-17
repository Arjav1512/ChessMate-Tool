interface EvaluationGaugeProps {
  evaluation: string;
  isMate: boolean;
  moveNumber?: number;
}

export function EvaluationGauge({ evaluation, isMate, moveNumber }: EvaluationGaugeProps) {
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-8)'
    }}>
      <div style={{
        width: '48px',
        height: '512px',
        background: '#fff',
        borderRadius: 'var(--radius-base)',
        position: 'relative',
        overflow: 'hidden',
        border: '2px solid var(--color-border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {/* White's advantage (top) */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${100 - percentage}%`,
          background: 'linear-gradient(to bottom, #ffffff, #f0f0f0)',
          transition: 'height 0.3s ease',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 'var(--space-8)'
        }}>
          {percentage < 50 && (
            <span style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#000',
              transform: 'rotate(0deg)'
            }}>
              {displayEval}
            </span>
          )}
        </div>

        {/* Black's advantage (bottom) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${percentage}%`,
          background: 'linear-gradient(to top, #000000, #2a2a2a)',
          transition: 'height 0.3s ease',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 'var(--space-8)'
        }}>
          {percentage > 50 && (
            <span style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#fff',
              transform: 'rotate(0deg)'
            }}>
              {displayEval}
            </span>
          )}
        </div>

        {/* Center line marker */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '2px',
          background: 'var(--color-border)',
          transform: 'translateY(-50%)'
        }} />

        {/* Move number markers on the side */}
        {moveNumber && moveNumber > 0 && (
          <div style={{
            position: 'absolute',
            left: '-32px',
            top: `${100 - percentage}%`,
            transform: 'translateY(-50%)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-secondary)',
            fontWeight: 'var(--font-weight-semibold)',
            background: 'var(--color-bg)',
            padding: '2px 4px',
            borderRadius: 'var(--radius-sm)',
            whiteSpace: 'nowrap'
          }}>
            {moveNumber}
          </div>
        )}
      </div>

      <div style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-secondary)',
        textAlign: 'center'
      }}>
        <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>
          {percentage > 55 ? 'Black' : percentage < 45 ? 'White' : 'Equal'}
        </div>
        {isMate && (
          <div style={{ fontSize: 'var(--font-size-xs)', marginTop: '2px' }}>
            Mate in {Math.abs(parseInt(evaluation.replace('M', '')))}
          </div>
        )}
      </div>
    </div>
  );
}
