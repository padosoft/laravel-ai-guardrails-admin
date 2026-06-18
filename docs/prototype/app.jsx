// ============== App root — Dashboard Base Surface template ==============
// Replace PageDemo with your product pages. The shell, theme, tweaks, cmd+K
// and shared components in ui.jsx + styles.css are designed to be reused.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark"
}/*EDITMODE-END*/;

// Minimal demo dataset — replace with your own.
const DEMO_DATA = [
  { id: 'itm_a3f8', name: 'Alpha record',   status: 'running',  owner: 'team@example.com',  updated: '2m ago' },
  { id: 'itm_b7c1', name: 'Bravo record',   status: 'success',  owner: 'ops@example.com',   updated: '14m ago' },
  { id: 'itm_c2e9', name: 'Charlie record', status: 'failed',   owner: 'admin@example.com', updated: '1h ago' },
  { id: 'itm_d4d0', name: 'Delta record',   status: 'paused',   owner: 'qa@example.com',    updated: '3h ago' },
  { id: 'itm_e9b2', name: 'Echo record',    status: 'success',  owner: 'team@example.com',  updated: '4h ago' },
  { id: 'itm_f1a7', name: 'Foxtrot record', status: 'success',  owner: 'ops@example.com',   updated: '6h ago' },
  { id: 'itm_g6d4', name: 'Golf record',    status: 'running',  owner: 'team@example.com',  updated: '7h ago' },
  { id: 'itm_h8c5', name: 'Hotel record',   status: 'success',  owner: 'admin@example.com', updated: '12h ago' },
];

function App() {
  const fallback = React.useState(TWEAK_DEFAULTS);
  const fallbackSetter = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' ? keyOrEdits : { [keyOrEdits]: val };
    fallback[1](prev => ({ ...prev, ...edits }));
  }, []);
  const [tweaks, setTweak] = window.useTweaks
    ? window.useTweaks(TWEAK_DEFAULTS)
    : [fallback[0], fallbackSetter];

  React.useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
  }, [tweaks.theme]);

  // Single-page template — extend with your own routes.
  const [route, setRoute] = React.useState('home');
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [lastTick, setLastTick] = React.useState(Date.now());

  React.useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => setLastTick(Date.now()), 5000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <ToastProvider>
      <div className="app">
        <Sidebar route={route} onNavigate={setRoute} counts={{}}/>
        <div className="main">
          <Topbar route={route} theme={tweaks.theme}
                  onTheme={(th) => setTweak('theme', th)}
                  autoRefresh={autoRefresh} onAutoRefresh={setAutoRefresh}
                  onOpenPalette={() => setPaletteOpen(true)}
                  lastTick={lastTick}/>
          <div className="content">
            <PageDemo data={DEMO_DATA}/>
          </div>
        </div>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)}
                        runs={DEMO_DATA.map(d => ({ ...d, flow_name: d.name, actor: d.owner, correlation_id: d.id }))}
                        onNavigate={setRoute}
                        onOpenRun={() => setPaletteOpen(false)}/>
      </div>

      <BaseTweaks tweaks={tweaks} setTweak={setTweak}/>
    </ToastProvider>
  );
}

function BaseTweaks({ tweaks, setTweak }) {
  if (!window.TweaksPanel) return null;
  const TweaksPanel = window.TweaksPanel;
  const TweakSection = window.TweakSection;
  const TweakRadio = window.TweakRadio;
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Theme">
        <TweakRadio label="Mode" value={tweaks.theme}
                    options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
                    onChange={v => setTweak('theme', v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
