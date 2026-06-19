import { Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface ChipsProps {
  values: string[];
  onRemove?: (value: string) => void;
  onAdd?: (value: string) => void;
  addLabel?: string;
}

export function Chips({ values, onRemove, onAdd, addLabel = 'Add key' }: ChipsProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && onAdd) {
      onAdd(trimmed);
    }
    setDraft('');
    setAdding(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      setDraft('');
      setAdding(false);
    }
  }

  return (
    <div className="chips">
      {values.map((v) => (
        <span className="chip mono" key={v}>
          {v}
          {onRemove && (
            <button type="button" onClick={() => onRemove(v)} aria-label={`Remove ${v}`}>
              <X size={12} />
            </button>
          )}
        </span>
      ))}

      {adding ? (
        <input
          ref={inputRef}
          autoFocus
          className="chip-input input mono"
          data-testid="agr-chip-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder="new key…"
          style={{ width: 120 }}
        />
      ) : (
        onAdd && (
          <button
            type="button"
            className="chip-add"
            onClick={() => setAdding(true)}
            aria-label={addLabel}
          >
            <Plus size={12} /> {addLabel}
          </button>
        )
      )}
    </div>
  );
}
