import { todayStr, type Data, type Trade } from './calc'
const KEY = 'wheel-tracker:v1', SAMPLE = 'wheel-tracker:sample'
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
export function load(): Data {
  try { const d = JSON.parse(localStorage.getItem(KEY) || ''); if (Array.isArray(d.cycles) && Array.isArray(d.trades)) return d } catch { /* empty */ }
  return { cycles: [], trades: [] }
}
export const save = (d: Data) => localStorage.setItem(KEY, JSON.stringify(d))
export const sampleOn = () => localStorage.getItem(SAMPLE) === '1'
export const setSampleOn = (on: boolean) => on ? localStorage.setItem(SAMPLE, '1') : localStorage.removeItem(SAMPLE)
export function validate(x: unknown): Data {
  const d = x as Data
  if (!d || !Array.isArray(d.cycles) || !Array.isArray(d.trades)) throw new Error('Not a Wheel Tracker backup')
  for (const t of d.trades) if (!t.id || !t.cycleId || !t.type || !t.date) throw new Error('Bad trade row')
  return { cycles: d.cycles, trades: d.trades }
}

/** FICTIONAL demo dataset, dated relative to today. Only shown while the "Sample data" toggle is on. */
export function sampleData(): Data {
  const D = (off: number) => { const d = new Date(); d.setDate(d.getDate() + off); return todayStr(d) }
  const trades: Trade[] = []
  const t = (cycleId: string, type: Trade['type'], date: number, o: Partial<Trade> = {}) =>
    trades.push({ id: uid(), cycleId, type, date: D(date), contracts: 1, premium: 0, fees: 0.65, ...o, expiry: o.expiry })
  const cycles = [
    { id: 's1', ticker: 'AAPL', created: D(-40) }, { id: 's2', ticker: 'AMD', created: D(-12) },
    { id: 's3', ticker: 'SOFI', created: D(-50) }, { id: 's4', ticker: 'KO', created: D(-120) }, { id: 's5', ticker: 'PLTR', created: D(-90) },
  ]
  t('s1', 'csp_sell', -40, { strike: 220, expiry: D(-19), premium: 3.1 })
  t('s1', 'assignment', -19, { strike: 220, stockPrice: 214.4, fees: 0 })
  t('s1', 'cc_sell', -18, { strike: 225, expiry: D(9), premium: 2.45 })
  t('s2', 'csp_sell', -12, { strike: 150, expiry: D(16), premium: 4.2 })
  t('s3', 'csp_sell', -50, { strike: 14, expiry: D(-30), premium: 0.42, contracts: 5 })
  t('s3', 'roll', -31, { strike: 13, expiry: D(-10), premium: 0.15, contracts: 5, fees: 1.3 })
  t('s3', 'assignment', -10, { strike: 13, stockPrice: 12.1, contracts: 5, fees: 0 })
  t('s4', 'csp_sell', -120, { strike: 60, expiry: D(-92), premium: 0.85, contracts: 2 })
  t('s4', 'assignment', -92, { strike: 60, stockPrice: 58.9, contracts: 2, fees: 0 })
  t('s4', 'cc_sell', -91, { strike: 61, expiry: D(-63), premium: 0.7, contracts: 2 })
  t('s4', 'called_away', -63, { strike: 61, contracts: 2, fees: 0 })
  t('s5', 'csp_sell', -90, { strike: 25, expiry: D(-62), premium: 1.1, contracts: 3 })
  t('s5', 'assignment', -62, { strike: 25, stockPrice: 23.2, contracts: 3, fees: 0 })
  t('s5', 'cc_sell', -60, { strike: 26, expiry: D(-32), premium: 0.9, contracts: 3 })
  t('s5', 'called_away', -32, { strike: 26, contracts: 3, fees: 0 })
  return { cycles, trades }
}
