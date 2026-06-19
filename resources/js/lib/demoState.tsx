import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

export type DemoState = 'data' | 'loading' | 'empty' | 'error';

interface DemoStateContextValue {
  demo: DemoState;
  setDemo: (next: DemoState) => void;
}

const DemoStateContext = createContext<DemoStateContextValue>({ demo: 'data', setDemo: () => {} });

export function DemoStateProvider({ children }: PropsWithChildren) {
  const [demo, setDemoState] = useState<DemoState>('data');
  const setDemo = useCallback((next: DemoState) => setDemoState(next), []);
  const value = useMemo(() => ({ demo, setDemo }), [demo, setDemo]);

  return <DemoStateContext.Provider value={value}>{children}</DemoStateContext.Provider>;
}

export function useDemoState(): DemoStateContextValue {
  return useContext(DemoStateContext);
}

export const DEMO_STATES: { id: DemoState; label: string }[] = [
  { id: 'data', label: 'Data' },
  { id: 'loading', label: 'Loading' },
  { id: 'empty', label: 'Empty' },
  { id: 'error', label: 'Error' },
];
