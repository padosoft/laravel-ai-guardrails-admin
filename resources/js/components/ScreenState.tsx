import { type ReactNode } from 'react';
import { ApiError } from '../lib/api/errors';
import { type DemoState, useDemoState } from '../lib/demoState';

export type ScreenStateValue = 'loading' | 'error' | 'empty' | 'ready';

export function resolveScreenState({
  demo,
  isLoading,
  isError,
  isEmpty,
}: {
  demo: DemoState;
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
}): ScreenStateValue {
  // The topbar demo override always wins so an operator can preview every state.
  if (demo === 'loading') return 'loading';
  if (demo === 'error') return 'error';
  if (demo === 'empty') return 'empty';
  if (isLoading) return 'loading';
  if (isError) return 'error';
  if (isEmpty) return 'empty';
  return 'ready';
}

export function ScreenState({
  testId,
  state,
  error,
  empty,
  children,
}: {
  testId: string;
  state: ScreenStateValue;
  error?: unknown;
  empty?: string;
  children: ReactNode;
}) {
  return (
    <section data-testid={testId} data-state={state} aria-busy={state === 'loading'} aria-live="polite">
      {state === 'loading' ? <div className="state-skeleton">Loading…</div> : null}
      {state === 'error' ? (
        <div className="state-error" data-testid={`${testId}-error`}>
          {error instanceof ApiError ? error.message : 'Unable to load data.'}
        </div>
      ) : null}
      {state === 'empty' ? (
        <div className="state-empty" data-testid={`${testId}-empty`}>
          {empty ?? 'No data yet.'}
        </div>
      ) : null}
      {state === 'ready' ? children : null}
    </section>
  );
}

// Convenience: derive ScreenState from a query result + the demo override.
export function useScreenState({
  isLoading,
  isError,
  isEmpty,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
}): ScreenStateValue {
  const { demo } = useDemoState();
  return resolveScreenState({ demo, isLoading, isError, isEmpty });
}
