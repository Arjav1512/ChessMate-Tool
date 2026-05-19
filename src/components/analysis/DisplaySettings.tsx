import { Settings } from 'lucide-react';
import { Toggle } from '../ui/Toggle';

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

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '10px',
    color: 'var(--cm-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600,
    marginBottom: '4px',
  };

  return (
    <div style={{
      background: 'var(--cm-bg-elevated)',
      border: '1px solid var(--cm-border-subtle)',
      borderRadius: '8px',
      padding: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <Settings size={14} style={{ color: 'var(--cm-text-muted)', flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Display Options
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Display section */}
        <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--cm-border-subtle)', marginBottom: '8px' }}>
          <p style={sectionLabelStyle}>Display</p>
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

        {/* Computer Analysis section */}
        <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--cm-border-subtle)', marginBottom: '8px' }}>
          <p style={sectionLabelStyle}>Computer Analysis</p>
          <Toggle
            label="Auto Analysis"
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

        {/* Variation opacity */}
        <div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--cm-text-secondary)' }}>Variation Opacity</span>
              <span style={{ fontSize: '11px', color: 'var(--cm-text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                {options.variationOpacity}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={options.variationOpacity}
              onChange={(e) => updateOption('variationOpacity', parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--cm-accent)',
                cursor: 'pointer',
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
