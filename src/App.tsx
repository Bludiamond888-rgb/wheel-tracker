import { useEffect, useMemo, useState } from 'react'
import { deriveCycle, stats, suggestion, todayStr, tradesCsv, STAGES, STAGE_SHORT, TYPE_LABEL, type CycleView, type Data, type Trade, type TradeType } from './calc'
import { load, save, sampleData, sampleOn, setSampleOn, uid, validate } from './store'
import { Wheel, COLORS } from './Wheel'

const $ = (n: number, d = 2) => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const pct = (n: number) => (n * 100).toFixed(1) + '%'
const fmtDate = (s?: string) => s ? new Date(s + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
const useHash = () => { const [h, setH] = useState(location.hash || '#/'); useEffect(() => { const f = () => setH(location.hash || '#/'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, []); return h }
const go = (h: string) => { location.hash = h }
function download(name: string, text: string, type: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export default function App() {
  const hash = useHash()
  const [sample, setSample] = useState(sampleOn())
  const [real, setReal] = useState<Data>(load)
  const [demo, setDemo] = useState<Data>(sampleData)
  const data = sample ? demo : real
  const setData = (d: Data) => { if (sample) setDemo(d); else { setReal(d); save(d) } }
  const today = todayStr()
  const views = useMemo(() => data.cycles.map((c) => deriveCycle(c, data.trades, today)), [data, today])
  const parts = hash.slice(2).split('/')
  const route = parts[0] || 'home'
  const toggleSample = (on: boolean) => { setSampleOn(on); setSample(on); if (on) setDemo(sampleData()) }

  let page
  if (route === 'c') {
    const v = views.find((x) => x.cycle.id === parts[1])
    page = v ? <Detail key={v.cycle.id} v={v} adding={parts[2] === 'add'} data={data} setData={setData} /> : <Empty />
  } else if (route === 'new') page = <NewCycle data={data} setData={setData} />
  else if (route === 'stats') page = <Stats views={views} />
  else if (route === 'more') page = <More sample={sample} toggleSample={toggleSample} data={data} setData={setData} />
  else page = <Home views={views} />

  return (
    <div className="app">
      {sample && <div className="sample-banner" role="status">🧪 SAMPLE DATA — fictional demo trades, not real. <button onClick={() => toggleSample(false)}>Turn off</button></div>}
      <main>{page}</main>
      <nav className="tabs">
        {[['home', '🎡', 'Wheels'], ['stats', '📊', 'Stats'], ['more', '⚙️', 'Settings']].map(([r, i, l]) => (
          <a key={r} href={`#/${r}`} className={route === r || (r === 'home' && ['c', 'new'].includes(route)) ? 'on' : ''}><span>{i}</span>{l}</a>
        ))}
      </nav>
    </div>
  )
}

const Empty = () => <div className="card center">Not found. <a href="#/">Back</a></div>

function Home({ views }: { views: CycleView[] }) {
  const active = views.filter((v) => !v.complete)
  const s = stats(views)
  const atWork = active.reduce((a, v) => a + (v.shares ? (v.assignStrike ?? 0) * v.shares : v.open ? v.collateral : 0), 0)
  const opens = active.filter((v) => v.open).sort((a, b) => a.open!.dte - b.open!.dte)
  return (
    <>
      <header className="top"><div><div className="hello">Good to see you, Chairman</div><h1>Wheel Tracker</h1></div>
        <a className="btn primary round" href="#/new" aria-label="New wheel">＋</a></header>
      <section className="summary">
        <div className="tile t1"><b>{$(s.totalPremium, 0)}</b><span>Total premium</span></div>
        <div className="tile t2"><b>{$(atWork, 0)}</b><span>Capital at work</span></div>
        <div className="tile t3"><b>{active.length}</b><span>Active wheels</span></div>
        <div className="tile t4"><b>{$(s.realized, 0)}</b><span>Realized P/L</span></div>
      </section>
      {active.length === 0 ? (
        <div className="card center empty">
          <div style={{ fontSize: 48 }}>🎡</div><h2>No active wheels yet</h2>
          <p>Start one by logging your first cash-secured put.</p>
          <a className="btn primary" href="#/new">Start a wheel</a>
        </div>
      ) : (
        <>
          <h2 className="sec">Your wheels <small>swipe →</small></h2>
          <div className="carousel" data-testid="carousel">
            {active.map((v) => (
              <a key={v.cycle.id} className="wcard" href={`#/c/${v.cycle.id}`} style={{ ['--c' as string]: COLORS[v.stage] }}>
                <Wheel stage={v.stage} premium={v.premium} ticker={v.cycle.ticker} size={250} />
                <div className="wmeta">
                  <span className="pill" style={{ background: COLORS[v.stage] }}>{v.stage + 1}. {STAGE_SHORT[v.stage]}</span>
                  {v.open && <span className={'dte' + (v.open.dte <= 7 ? ' hot' : '')}>{v.open.kind.toUpperCase()} ${v.open.strike} · {v.open.dte} DTE</span>}
                </div>
                <p className="next">👉 {suggestion(v)}</p>
              </a>
            ))}
          </div>
          {opens.length > 0 && <>
            <h2 className="sec">Open positions</h2>
            <div className="card list">{opens.map((v) => (
              <a key={v.cycle.id} className="row" href={`#/c/${v.cycle.id}`}>
                <span className="tk" style={{ background: COLORS[v.stage] }}>{v.cycle.ticker}</span>
                <span className="grow">{v.open!.contracts}× {v.open!.kind} ${v.open!.strike}<small>exp {fmtDate(v.open!.expiry)}</small></span>
                <span className={'dtebig' + (v.open!.dte <= 7 ? ' hot' : '')}>{Math.max(0, v.open!.dte)}<small>DTE</small></span>
              </a>))}</div>
          </>}
        </>
      )}
      <p className="note">ℹ️ No live market data — everything is entered manually by you.</p>
    </>
  )
}

function Detail({ v, adding, data, setData }: { v: CycleView; adding: boolean; data: Data; setData: (d: Data) => void }) {
  const [sel, setSel] = useState<number | null>(null)
  const shown = sel === null ? v.trades : v.trades.filter((t) => v.stageOf[t.id] === sel)
  const del = (t: Trade) => { if (confirm(`Delete ${TYPE_LABEL[t.type]} on ${t.date}?`)) setData({ ...data, trades: data.trades.filter((x) => x.id !== t.id) }) }
  const endCycle = () => { if (confirm('End this cycle (flat, no shares)?')) setData({ ...data, cycles: data.cycles.map((c) => c.id === v.cycle.id ? { ...c, closedDate: todayStr() } : c) }) }
  const delCycle = () => { if (confirm(`Delete the whole ${v.cycle.ticker} wheel and its trades?`)) { setData({ cycles: data.cycles.filter((c) => c.id !== v.cycle.id), trades: data.trades.filter((t) => t.cycleId !== v.cycle.id) }); go('#/') } }
  return (
    <>
      <header className="top"><a className="btn ghost" href="#/">‹ Wheels</a><h1>{v.cycle.ticker}</h1><span style={{ width: 70 }} /></header>
      <div className="wheelwrap"><Wheel stage={v.stage} premium={v.premium} ticker={v.cycle.ticker} selected={sel} onSelect={(i) => setSel(sel === i ? null : i)} size={320} complete={v.complete} /></div>
      <p className="hint">Tap a stage to see its trades</p>
      <div className="card next-card" style={{ ['--c' as string]: COLORS[v.stage] }}>
        <div className="eyebrow">Stage {v.stage + 1} · {STAGES[v.stage]}</div>
        <div className="nexttxt">{suggestion(v)}</div>
        {v.complete ? <a className="btn primary big" href="#/new">🎡 Start a new wheel</a> : <a className="btn primary big" href={`#/c/${v.cycle.id}/add`} data-testid="add-trade">＋ Log trade</a>}
      </div>
      <section className="metrics">
        <M l="Net premium" val={$(v.premium)} c="green" />
        <M l="Adj. basis / sh" val={v.basis !== undefined ? $(v.basis) : '—'} c="blue" />
        <M l={v.complete ? 'Realized P/L' : 'P/L to date'} val={$(v.pl)} c={v.pl >= 0 ? 'green' : 'red'} />
        <M l="Annualized" val={v.collateral ? pct(v.annualized) : '—'} c="purple" />
        <M l="Collateral" val={$(v.collateral, 0)} c="amber" />
        <M l="Days in cycle" val={String(v.days)} c="pink" />
        {v.assignStrike !== undefined && <M l="Assigned at" val={`$${v.assignStrike}${v.assignPrice ? ` (stock $${v.assignPrice})` : ''}`} c="blue" />}
        {v.open && <M l="Open DTE" val={`${v.open.dte} d`} c={v.open.dte <= 7 ? 'red' : 'amber'} />}
      </section>
      <h2 className="sec">{sel === null ? 'All trades' : `Stage ${sel + 1}: ${STAGES[sel]}`} {sel !== null && <button className="link" onClick={() => setSel(null)}>show all</button>}</h2>
      <div className="card list">
        {shown.length === 0 && <div className="row muted">No trades in this stage yet.</div>}
        {[...shown].reverse().map((t) => (
          <div key={t.id} className="row trade">
            <span className="dot" style={{ background: COLORS[v.stageOf[t.id] ?? 0] }} />
            <span className="grow"><b>{TYPE_LABEL[t.type]}</b>{t.strike !== undefined && ` $${t.strike}`}{t.contracts > 1 && ` ×${t.contracts}`}
              <small>{fmtDate(t.date)}{t.expiry && ` · exp ${fmtDate(t.expiry)}`}{t.stockPrice ? ` · stock $${t.stockPrice}` : ''}{t.fees ? ` · fees $${t.fees}` : ''}{t.note ? ` · ${t.note}` : ''}</small></span>
            {t.premium !== 0 && <span className={'amt ' + ((t.type.endsWith('btc') ? -1 : 1) * t.premium >= 0 ? 'pos' : 'neg')}>{t.type.endsWith('btc') ? '−' : '+'}{$(Math.abs(t.premium * 100 * t.contracts))}</span>}
            <button className="x" aria-label="Delete trade" onClick={() => del(t)}>×</button>
          </div>
        ))}
      </div>
      <div className="actions">
        {!v.complete && !v.shares && !v.open && v.trades.length > 0 && <button className="btn" onClick={endCycle}>End cycle (flat)</button>}
        <button className="btn danger" onClick={delCycle}>Delete wheel</button>
      </div>
      {adding && <TradeForm v={v} data={data} setData={setData} />}
    </>
  )
}
const M = ({ l, val, c }: { l: string; val: string; c: string }) => <div className={'metric ' + c}><span>{l}</span><b>{val}</b></div>

function allowed(v: CycleView): TradeType[] {
  if (v.open?.kind === 'put') return ['expired', 'assignment', 'roll', 'csp_btc']
  if (v.open?.kind === 'call') return ['called_away', 'expired', 'roll', 'cc_btc']
  if (v.shares) return ['cc_sell', 'called_away']
  return ['csp_sell', 'assignment']
}

function TradeForm({ v, data, setData }: { v: CycleView; data: Data; setData: (d: Data) => void }) {
  const opts = allowed(v)
  const [type, setTypeRaw] = useState<TradeType>(opts[0])
  const noFee = (x: TradeType) => ['assignment', 'called_away', 'expired'].includes(x)
  const setType = (x: TradeType) => { setTypeRaw(x); setF((g) => ({ ...g, fees: noFee(x) ? '0' : g.fees === '0' ? '0.65' : g.fees })) }
  const lastContracts = v.open?.contracts ?? (v.shares ? v.shares / 100 : 1)
  const [f, setF] = useState({ date: todayStr(), strike: v.open ? String(v.open.strike) : '', expiry: '', contracts: String(lastContracts), premium: '', fees: noFee(opts[0]) ? '0' : '0.65', stockPrice: '', note: '' })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  const needs = {
    strike: type !== 'expired', expiry: ['csp_sell', 'cc_sell', 'roll'].includes(type),
    premium: ['csp_sell', 'cc_sell', 'roll', 'csp_btc', 'cc_btc'].includes(type), stock: type === 'assignment',
  }
  const close = () => go(`#/c/${v.cycle.id}`)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = (s: string) => (s.trim() === '' ? undefined : Number(s))
    const t: Trade = {
      id: uid(), cycleId: v.cycle.id, type, date: f.date, contracts: Math.max(1, Math.round(Number(f.contracts) || 1)),
      strike: needs.strike ? n(f.strike) : undefined, expiry: needs.expiry && f.expiry ? f.expiry : undefined,
      premium: needs.premium ? Number(f.premium) || 0 : 0, fees: Number(f.fees) || 0, stockPrice: needs.stock ? n(f.stockPrice) : undefined, note: f.note.trim() || undefined,
    }
    setData({ ...data, trades: [...data.trades, t] }); close()
  }
  const plabel = type === 'roll' ? 'Net credit / share (negative = debit)' : type.endsWith('btc') ? 'Cost / share' : 'Premium / share'
  return (
    <div className="sheet-bg" onClick={close}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit} data-testid="trade-form">
        <div className="grab" />
        <h2>Log trade · {v.cycle.ticker}</h2>
        <div className="chips">{opts.map((o) => <button type="button" key={o} className={'chip' + (o === type ? ' on' : '')} onClick={() => setType(o)}>{TYPE_LABEL[o]}</button>)}</div>
        <div className="grid2">
          <L t="Date"><input type="date" required value={f.date} onChange={set('date')} /></L>
          <L t="Contracts"><input inputMode="numeric" required value={f.contracts} onChange={set('contracts')} /></L>
          {needs.strike && <L t={type === 'roll' ? 'New strike' : 'Strike'}><input inputMode="decimal" required placeholder="0.00" value={f.strike} onChange={set('strike')} /></L>}
          {needs.expiry && <L t={type === 'roll' ? 'New expiry' : 'Expiry'}><input type="date" required value={f.expiry} onChange={set('expiry')} /></L>}
          {needs.premium && <L t={plabel}><input inputMode="decimal" required placeholder="0.00" value={f.premium} onChange={set('premium')} /></L>}
          {needs.stock && <L t="Stock price at assignment"><input inputMode="decimal" placeholder="0.00" value={f.stockPrice} onChange={set('stockPrice')} /></L>}
          <L t="Fees (total)"><input inputMode="decimal" value={f.fees} onChange={set('fees')} /></L>
        </div>
        <L t="Note"><input value={f.note} onChange={set('note')} placeholder="optional" /></L>
        {needs.premium && Number(f.premium) > 0 && <div className="preview">{type.endsWith('btc') ? 'Debit' : 'Credit'}: {$(Number(f.premium) * 100 * (Number(f.contracts) || 1))}</div>}
        <div className="row2"><button type="button" className="btn" onClick={close}>Cancel</button><button className="btn primary">Save trade</button></div>
      </form>
    </div>
  )
}
const L = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="fld"><span>{t}</span>{children}</label>

function NewCycle({ data, setData }: { data: Data; setData: (d: Data) => void }) {
  const [tk, setTk] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); const c = { id: uid(), ticker: tk.trim().toUpperCase(), created: todayStr() }
    setData({ ...data, cycles: [...data.cycles, c] }); go(`#/c/${c.id}/add`)
  }
  return (
    <form className="card pad" onSubmit={submit}>
      <h1>New wheel</h1><p className="muted">One wheel = one cycle on a ticker: put → shares → call → cash.</p>
      <L t="Ticker"><input autoFocus required maxLength={8} value={tk} onChange={(e) => setTk(e.target.value)} placeholder="AAPL" style={{ textTransform: 'uppercase', fontSize: 28, fontWeight: 800 }} /></L>
      <button className="btn primary big">Start &amp; log first trade</button>
    </form>
  )
}

function Stats({ views }: { views: CycleView[] }) {
  const s = stats(views)
  const done = views.filter((v) => v.complete).sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''))
  return (
    <>
      <header className="top"><h1>Stats</h1></header>
      <section className="summary">
        <div className="tile t1"><b>{$(s.totalPremium, 0)}</b><span>Total premium</span></div>
        <div className="tile t2"><b>{pct(s.winRate)}</b><span>Win rate</span></div>
        <div className="tile t3"><b>{pct(s.avgAnnualized)}</b><span>Avg annualized</span></div>
        <div className="tile t4"><b>{$(s.realized, 0)}</b><span>Realized P/L</span></div>
      </section>
      <h2 className="sec">Completed cycles ({s.completed})</h2>
      <div className="card list">
        {done.length === 0 && <div className="row muted">No completed cycles yet.</div>}
        {done.map((v) => (
          <a key={v.cycle.id} className="row" href={`#/c/${v.cycle.id}`}>
            <span className="tk" style={{ background: (v.realized ?? 0) > 0 ? '#10b981' : '#ef4444' }}>{v.cycle.ticker}</span>
            <span className="grow">{fmtDate(v.startDate)} → {fmtDate(v.endDate)}<small>{v.days} days · premium {$(v.premium, 0)}</small></span>
            <span className="right"><b className={(v.realized ?? 0) >= 0 ? 'pos' : 'neg'}>{$(v.realized ?? 0, 0)}</b><small>{pct(v.annualized)}/yr</small></span>
          </a>))}
      </div>
      <p className="note">Annualized = P/L ÷ collateral (strike × 100 × contracts) × 365 ÷ days.</p>
    </>
  )
}

function More({ sample, toggleSample, data, setData }: { sample: boolean; toggleSample: (b: boolean) => void; data: Data; setData: (d: Data) => void }) {
  const [msg, setMsg] = useState('')
  const imp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    file.text().then((t) => { const d = validate(JSON.parse(t)); if (confirm(`Replace current data with ${d.cycles.length} wheels / ${d.trades.length} trades?`)) { setData(d); setMsg('Imported ✓') } })
      .catch((err) => setMsg('Import failed: ' + err.message)); e.target.value = ''
  }
  const stamp = todayStr()
  return (
    <>
      <header className="top"><h1>Settings</h1></header>
      <div className="card pad">
        <label className="toggle"><span><b>Sample data</b><small>Shows a fictional demo portfolio. Your real data is kept separately and untouched.</small></span>
          <input type="checkbox" checked={sample} onChange={(e) => toggleSample(e.target.checked)} data-testid="sample-toggle" /></label>
      </div>
      <div className="card pad stack">
        <h2>Backup {sample && <small className="muted">(sample mode — exports the demo)</small>}</h2>
        <button className="btn big" onClick={() => download(`wheel-tracker-${stamp}.json`, JSON.stringify(data, null, 2), 'application/json')}>⬇️ Export JSON backup</button>
        <label className="btn big">⬆️ Import JSON backup<input type="file" accept="application/json,.json" hidden onChange={imp} /></label>
        <button className="btn big" onClick={() => download(`wheel-trades-${stamp}.csv`, tradesCsv(data), 'text/csv')}>📄 Export trades CSV</button>
        {msg && <div className="preview">{msg}</div>}
      </div>
      <div className="card pad">
        <h2>About</h2>
        <p>No live market data is available in this app — prices, premiums and strikes are entered manually. Data lives only in this browser (localStorage); export backups regularly.</p>
        <p className="muted">Not financial advice. Suggestions are simple rule-based reminders.</p>
      </div>
    </>
  )
}
