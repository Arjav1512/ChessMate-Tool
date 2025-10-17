import { Settings } from 'lucide-react';
import { Toggle } from './Toggle';

export interface DisplayOptions {
  showAnnotations: boolean;
  showBestMoveArrow: boolean;
  showEvaluationGauge: boolean;
  showFishnetAnalysis: boolean;
  inlineNotation: boolean;
  variationOpacity: number;
}

interface DisplaySettingsProps {
  options: DisplayOptions;
  onChange: (options: DisplayOptions) => void;
}

export function DisplaySettings({ options, onChange }: DisplaySettingsProps) {
  const updateOption = (key: keyof DisplayOptions, value: boolean | number) => {
    const newOptions = { ...options, [key]: value };
    onChange(newOptions);
  };

  return (
    <div className="card" style={{ padding: 'var(--space-16)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-16)' }}>
        <Settings style={{ width: '20px', height: '20px', color: 'var(--color-text-secondary)' }} />
        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>
          Display Options
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <div style={{ paddingBottom: 'var(--space-12)', borderBottom: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-12) 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Display
          </p>

          <Toggle
            label="Inline Notation"
            checked={options.inlineNotation}
            onChange={(checked) => updateOption('inlineNotation', checked)}
          />

          <Toggle
            label="Annotations on Board"
            checked={options.showAnnotations}
            onChange={(checked) => updateOption('showAnnotations', checked)}
          />
        </div>

        <div style={{ paddingBottom: 'var(--space-12)', borderBottom: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-12) 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Computer Analysis
          </p>

          <Toggle
            label="Show Fishnet Analysis"
            checked={options.showFishnetAnalysis}
            onChange={(checked) => updateOption('showFishnetAnalysis', checked)}
          />

          <Toggle
            label="Best Move Arrow"
            checked={options.showBestMoveArrow}
            onChange={(checked) => updateOption('showBestMoveArrow', checked)}
          />

          <Toggle
            label="Evaluation Gauge"
            checked={options.showEvaluationGauge}
            onChange={(checked) => updateOption('showEvaluationGauge', checked)}
          />
        </div>

        <div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)' }}>Variation Opacity</span>
            <input
              type="range"
              min="0"
              max="100"
              value={options.variationOpacity}
              onChange={(e) => updateOption('variationOpacity', parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
              {options.variationOpacity}%
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
