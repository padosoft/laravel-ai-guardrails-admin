interface ToggleProps {
  on: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  name: string;
  hint?: string;
}

export function Toggle({ on, onChange, disabled, name, hint }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-16 wrap">
      <div className="toggle-label">
        <div className="tl-name">{name}</div>
        {hint && <div className="tl-hint">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={name}
        className={'toggle' + (on ? ' on' : '')}
        disabled={disabled}
        onClick={() => !disabled && onChange && onChange(!on)}
      />
    </div>
  );
}
