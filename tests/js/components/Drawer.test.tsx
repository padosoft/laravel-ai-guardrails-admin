import { describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useState } from 'react';
import { Drawer } from '../../../resources/js/components/Drawer';

function DrawerParent({ onClose }: { onClose: () => void }) {
  const [count, setCount] = useState(0);
  return (
    <>
      <button data-testid="trigger-rerender" onClick={() => setCount((c) => c + 1)}>
        Re-render ({count})
      </button>
      <input data-testid="outside-input" />
      <Drawer title="Test Drawer" onClose={onClose}>
        <button data-testid="drawer-btn">Inside</button>
      </Drawer>
    </>
  );
}

describe('Drawer focus management', () => {
  it('re-rendering parent does not re-steal focus from an input outside the drawer', async () => {
    const onClose = vi.fn();
    render(<DrawerParent onClose={onClose} />);

    // Wait for initial focus inside drawer (setTimeout 60ms)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Manually focus the outside input (simulates user interaction mid-interaction)
    const outsideInput = screen.getByTestId('outside-input');
    outsideInput.focus();
    expect(document.activeElement).toBe(outsideInput);

    // Trigger a parent re-render (equivalent to setSaving/setError in real pages)
    act(() => {
      screen.getByTestId('trigger-rerender').click();
    });

    // Give any effect re-fires time to steal focus
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Focus must NOT have been stolen back to the drawer button
    expect(document.activeElement).toBe(outsideInput);
  });
});
