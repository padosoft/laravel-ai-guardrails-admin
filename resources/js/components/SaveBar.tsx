import { Check, Info } from 'lucide-react';

interface SaveBarProps {
  dirty: boolean;
  saving?: boolean;
  error?: string | null;
  onSave: () => void;
  onDiscard: () => void;
  message?: string;
  /** When true, the Save button is disabled even if dirty (e.g. invalid patterns). */
  saveDisabled?: boolean;
}

/**
 * Sticky save bar — reusable across Firewall, Output, Settings screens.
 *
 * Visible only when dirty=true.
 * Exposes data-testid="agr-save-bar" for test targeting.
 * Error message exposed via data-testid="agr-save-error".
 */
export function SaveBar({ dirty, saving, error, onSave, onDiscard, message, saveDisabled }: SaveBarProps) {
  if (!dirty) return null;

  return (
    <div className="sticky-save" data-testid="agr-save-bar">
      <Info size={16} />
      <span className="grow" style={{ fontSize: 13 }}>
        {message ?? 'You have unsaved changes.'}
      </span>
      {error && (
        <span className="save-error" data-testid="agr-save-error" style={{ fontSize: 12, color: 'var(--color-block)' }}>
          {error}
        </span>
      )}
      <button
        className="btn btn-sm btn-ghost"
        onClick={onDiscard}
        disabled={saving}
        type="button"
      >
        Discard
      </button>
      <button
        className="btn btn-sm btn-primary"
        onClick={onSave}
        disabled={saving || saveDisabled}
        type="button"
      >
        <Check size={14} /> Save changes
      </button>
    </div>
  );
}
