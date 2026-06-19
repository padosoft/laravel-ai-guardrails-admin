// ============== Demo page — example surface to copy ==============
// Shows how to use shared components: KPI tiles, status badge, table, drawer, modal, toast.

function PageDemo({ data, onOpenItem }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const toast = useToast();

  const filtered = data.filter(d => filter === 'all' || d.status === filter);
  const counts = data.reduce((a, d) => ({ ...a, [d.status]: (a[d.status]||0)+1 }), { all: data.length });

  return (
    <div className="page" data-screen-label="Demo">
      <div className="page-head">
        <div>
          <h1 className="page-title">Demo surface</h1>
          <p className="page-sub">Replace this page with your product. The shared components below are yours to compose.</p>
        </div>
        <div className="page-actions">
          <button className="btn"><I.External size={13}/> Export</button>
          <button className="btn primary" onClick={() => setConfirmOpen(true)}>
            <I.Plus size={13}/> Primary action
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="kpi-grid">
        {[
          { label: 'Total items', value: data.length, delta: '+12%', up: true, color: 'var(--text)' },
          { label: 'Active', value: counts.running || 0, delta: '+3', up: true, color: 'var(--status-running)' },
          { label: 'Completed', value: counts.success || 0, delta: 'stable', flat: true, color: 'var(--status-success)' },
          { label: 'Issues', value: counts.failed || 0, delta: '-2', up: false, color: 'var(--status-failed)' },
        ].map((k, i) => (
          <div className="kpi" key={i}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className={`kpi-delta ${k.flat ? 'flat' : k.up ? 'up' : 'down'}`}>
              {!k.flat && (k.up ? <I.ArrowUp size={11}/> : <I.ArrowDown size={11}/>)} {k.delta}
            </div>
            <div className="kpi-spark">
              <Sparkline data={Array.from({length:12},(_,j) => Math.sin(j*0.5+i)*5+10+j)} color={k.color}/>
            </div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="filter-bar">
        {['all','running','success','failed','paused'].map(s => (
          <button key={s} className={`chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="count">{counts[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-head">
          <h3 className="card-title">Items</h3>
          <span className="badge outline">{filtered.length}</span>
        </div>
        <div className="card-body flush">
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{width:120}}>Status</th>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Owner</th>
                  <th className="num">Updated</th>
                  <th style={{width:80}}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6}><div className="empty">No items match the filter</div></td></tr>
                )}
                {filtered.map(d => (
                  <tr key={d.id} onClick={() => setDrawerOpen(d)}>
                    <td><StatusBadge status={d.status}/></td>
                    <td><b style={{fontWeight:500}}>{d.name}</b></td>
                    <td><span className="mono" style={{fontSize:11.5}}>{d.id}</span></td>
                    <td className="muted">{d.owner}</td>
                    <td className="num muted">{d.updated}</td>
                    <td>
                      <button className="btn sm ghost" onClick={(e) => { e.stopPropagation(); toast.push({title:'Action triggered', body:d.name}); }}>
                        Action
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drawer for item detail */}
      <Drawer open={!!drawerOpen} onClose={() => setDrawerOpen(false)}
              title={drawerOpen ? <>Item · <span className="mono" style={{fontSize:12,color:'var(--text-secondary)'}}>{drawerOpen.id}</span></> : ''}
              actions={drawerOpen && (
                <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(drawerOpen, null, 2)); toast.push({title:'Copied'});}}>
                  <I.Copy size={12}/> Copy
                </button>
              )}>
        {drawerOpen && (
          <div style={{padding:18}}>
            <dl className="kv" style={{marginBottom:18}}>
              <dt>Name</dt><dd style={{fontFamily:'var(--font-sans)'}}>{drawerOpen.name}</dd>
              <dt>ID</dt><dd>{drawerOpen.id}</dd>
              <dt>Status</dt><dd><StatusBadge status={drawerOpen.status}/></dd>
              <dt>Owner</dt><dd style={{fontFamily:'var(--font-sans)'}}>{drawerOpen.owner}</dd>
            </dl>
            <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-tertiary)',marginBottom:6}}>
              Raw data
            </div>
            <pre className="code-block" dangerouslySetInnerHTML={{__html: jsonHighlight(drawerOpen)}}/>
          </div>
        )}
      </Drawer>

      {/* Confirm modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}
             title="Confirm action" sub="This is an example destructive-ish flow."
             footer={<>
               <button className="btn" onClick={() => setConfirmOpen(false)}>Cancel</button>
               <button className="btn primary" onClick={() => {
                 setConfirmOpen(false);
                 toast.push({title:'Done', body:'Primary action executed'});
               }}><I.Check size={13}/> Confirm</button>
             </>}>
        <p style={{margin:0}}>Replace this with your real confirmation copy. The shell, modal chrome, and toast plumbing are reusable as-is.</p>
      </Modal>
    </div>
  );
}

window.PageDemo = PageDemo;
