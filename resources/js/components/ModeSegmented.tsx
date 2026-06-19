import { Eye } from 'lucide-react';
import type { ControlMode } from '../lib/api/types';

interface ModeSegmentedProps {
  mode: ControlMode;
  onChange?: (mode: ControlMode) => void;
  disabled?: boolean;
  /** If provided, buttons get data-testid="agr-mode-{testIdPrefix}-{enforce|monitor|off}" */
  testIdPrefix?: string;
}

const MODES: { id: ControlMode; label: string }[] = [
  { id: 'enforce', label: 'Enforce' },
  { id: 'monitor', label: 'Monitor' },
  { id: 'off', label: 'Off' },
];

/**
 * Three-state segmented control for control modes: enforce / monitor / off.
 *
 * Matches the prototype's ModeSegmented — used in each section label row of the Settings screen.
 */
export function ModeSegmented({ mode, onChange, disabled, testIdPrefix }: ModeSegmentedProps) {
  return (
    <div className="mode-seg" role="group" aria-label="Control mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          data-mode={m.id}
          className={mode === m.id ? 'on' : ''}
          onClick={() => !disabled && onChange && onChange(m.id)}
          disabled={disabled}
          aria-pressed={mode === m.id}
          data-testid={testIdPrefix ? `agr-mode-${testIdPrefix}-${m.id}` : undefined}
        >
          {m.id === 'monitor' && <Eye size={12} />}
          {m.label}
        </button>
      ))}
    </div>
  );
}
