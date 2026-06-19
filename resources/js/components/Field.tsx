import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

/**
 * Field — labeled wrapper for form inputs in Settings.
 *
 * Renders a label + optional hint above the children.
 * Mirrors the prototype's Field component.
 */
export function Field({ label, hint, children }: FieldProps) {
  return (
    <div>
      <div className="toggle-label" style={{ marginBottom: 9 }}>
        <div className="tl-name">{label}</div>
        {hint && <div className="tl-hint">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
