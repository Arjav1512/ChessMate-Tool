interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  const handleClick = () => {
    onChange(!checked);
  };

  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      padding: '7px 0',
      userSelect: 'none',
    }}>
      <span style={{
        fontSize: '13px',
        color: 'var(--cm-text-secondary)',
        fontWeight: 400,
      }}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClick();
        }}
        style={{
          position: 'relative',
          width: '36px',
          height: '20px',
          borderRadius: '10px',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
          backgroundColor: checked ? 'var(--cm-accent)' : 'var(--cm-border-strong)',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '18px' : '2px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: checked ? 'var(--cm-text-inverse)' : 'var(--cm-text-primary)',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }} />
      </button>
    </label>
  );
}
