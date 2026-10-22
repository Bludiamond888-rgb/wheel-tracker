export type TradeType = 'csp_sell' | 'csp_btc' | 'roll' | 'assignment' | 'cc_sell' | 'cc_btc' | 'called_away' | 'expired'
export interface Trade {
  id: string; cycleId: string; type: TradeType; date: string
  strike?: number; expiry?: string; contracts: number
  premium: number // per share. Credit for sells, cost for BTC, net credit (may be negative) for rolls
  fees: number; stockPrice?: number; note?: string
}
export interface Cycle { id: string; ticker: string; created: string; closedDate?: string }
export interface Data { cycles: Cycle[]; trades: Trade[] }

export const STAGES = ['Sell cash-secured put', 'Assigned · own shares', 'Sell covered call', 'Called away · cash'] as const
export const STAGE_SHORT = ['Sell Put', 'Assigned', 'Sell Call', 'Called Away'] as const
export const TYPE_LABEL: Record<TradeType, string> = {
  csp_sell: 'Sell CSP', csp_btc: 'Buy to close put', roll: 'Roll', assignment: 'Assignment',
  cc_sell: 'Sell covered call', cc_btc: 'Buy to close call', called_away: 'Called away', expired: 'Expired worthless',
}

export interface OpenOption { kind: 'put' | 'call'; strike: number; expiry: string; contracts: number; dte: number; tradeId: string }
export interface CycleView {
  cycle: Cycle; trades: Trade[]; stageOf: Record<string, number>
  stage: number; complete: boolean; open: OpenOption | null
  shares: number; assignStrike?: number; assignPrice?: number; calledStrike?: number
  premium: number // net of buybacks & all fees
  basis?: number; collateral: number; startDate: string; endDate?: string; days: number
  pl: number; realized: number | null; annualized: number
}

const DAY = 86400000
export const parseDay = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) }
export const daysBetween = (a: string, b: string) => Math.round((parseDay(b) - parseDay(a)) / DAY)
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const r2 = (n: number) => Math.round(n * 100) / 100

export function sortTrades(t: Trade[]) { return [...t].sort((a, b) => a.date.localeCompare(b.date)) }

export function deriveCycle(cycle: Cycle, all: Trade[], today = todayStr()): CycleView {
  const trades = sortTrades(all.filter((t) => t.cycleId === cycle.id))
  const stageOf: Record<string, number> = {}
  let stage = 0, shares = 0, credits = 0, fees = 0, complete = false
  let open: Omit<OpenOption, 'dte'> | null = null
  let firstStrike: number | undefined, firstContracts = 1, assignStrike: number | undefined, assignPrice: number | undefined, calledStrike: number | undefined, endDate: string | undefined
  for (const t of trades) {
    const cash = t.premium * 100 * t.contracts
    fees += t.fees || 0
    switch (t.type) {
      case 'csp_sell':
        credits += cash; open = { kind: 'put', strike: t.strike ?? 0, expiry: t.expiry ?? t.date, contracts: t.contracts, tradeId: t.id }
        if (firstStrike === undefined) { firstStrike = t.strike; firstContracts = t.contracts }
        stage = 0; stageOf[t.id] = 0; break
      case 'cc_sell':
        credits += cash; open = { kind: 'call', strike: t.strike ?? 0, expiry: t.expiry ?? t.date, contracts: t.contracts, tradeId: t.id }
        stage = 2; stageOf[t.id] = 2; break
      case 'csp_btc': case 'cc_btc':
        credits -= cash; open = null; stageOf[t.id] = t.type === 'csp_btc' ? 0 : 2; stage = shares ? 1 : 0; break
      case 'roll': {
        credits += cash
        const cur = open as Omit<OpenOption, 'dte'> | null
        const kind: 'put' | 'call' = cur?.kind ?? (shares ? 'call' : 'put')
        open = { kind, strike: t.strike ?? cur?.strike ?? 0, expiry: t.expiry ?? cur?.expiry ?? t.date, contracts: t.contracts, tradeId: t.id }
        stageOf[t.id] = kind === 'put' ? 0 : 2; stage = stageOf[t.id]; break
      }
      case 'expired':
        stageOf[t.id] = (open?.kind ?? (shares ? 'call' : 'put')) === 'put' ? 0 : 2; open = null; stage = shares ? 1 : 0; break
      case 'assignment':
        assignStrike = t.strike ?? open?.strike; assignPrice = t.stockPrice; shares = 100 * t.contracts
        if (firstStrike === undefined) { firstStrike = assignStrike; firstContracts = t.contracts }
        open = null; stage = 1; stageOf[t.id] = 1; break
      case 'called_away':
        calledStrike = t.strike ?? open?.strike; open = null; stage = 3; stageOf[t.id] = 3; complete = true; endDate = t.date; break
    }
  }
  const sharesHeld = complete ? 100 * (trades.find((t) => t.type === 'assignment')?.contracts ?? 0) : shares
  if (cycle.closedDate && !complete && !shares) { complete = true; endDate = cycle.closedDate; stage = 3 }
  const premium = r2(credits - fees)
  const basis = assignStrike !== undefined && sharesHeld ? r2(assignStrike - premium / sharesHeld) : undefined
  const collateral = (firstStrike ?? 0) * 100 * firstContracts
  const startDate = trades[0]?.date ?? cycle.created
  const days = Math.max(1, daysBetween(startDate, endDate ?? today))
  let realized: number | null = null
  if (complete) realized = r2((calledStrike !== undefined && assignStrike !== undefined ? (calledStrike - assignStrike) * sharesHeld : 0) + premium)
  const pl = realized ?? premium
  const annualized = collateral ? (pl / collateral) * (365 / days) : 0
  return {
    cycle, trades, stageOf, stage, complete, shares: complete ? 0 : shares, assignStrike, assignPrice, calledStrike, premium, basis, collateral,
    startDate, endDate, days, pl, realized, annualized,
    open: open && !complete ? { ...open, dte: daysBetween(today, open.expiry) } : null,
  }
}

export function suggestion(v: CycleView): string {
  const $ = (n: number) => '$' + n.toFixed(2)
  if (v.complete) return 'Cycle complete — back to cash. Start a new wheel with a fresh cash-secured put.'
  if (v.open?.kind === 'put') return `Put open at ${$(v.open.strike)}, ${v.open.dte} DTE. Let it expire, roll it, or take assignment.`
  if (v.open?.kind === 'call') {
    const b = v.basis ?? 0
    return v.open.strike >= b
      ? `Call open at ${$(v.open.strike)} (above basis ${$(b)}), ${v.open.dte} DTE. If called away you lock in a gain.`
      : `Heads up: call strike ${$(v.open.strike)} is below your basis ${$(b)}. Consider rolling up and out.`
  }
  if (v.stage === 1 && v.basis !== undefined) return `Sell a covered call above your basis ${$(v.basis)}.`
  return 'Sell a cash-secured put at a strike you would be happy to own.'
}

export function stats(views: CycleView[]) {
  const done = views.filter((v) => v.complete)
  const totalPremium = r2(views.reduce((s, v) => s + v.premium, 0))
  const realized = r2(done.reduce((s, v) => s + (v.realized ?? 0), 0))
  const winRate = done.length ? done.filter((v) => (v.realized ?? 0) > 0).length / done.length : 0
  const avgAnnualized = done.length ? done.reduce((s, v) => s + v.annualized, 0) / done.length : 0
  return { totalPremium, realized, winRate, avgAnnualized, completed: done.length }
}

export function tradesCsv(data: Data) {
  const tick = Object.fromEntries(data.cycles.map((c) => [c.id, c.ticker]))
  const head = ['ticker', 'date', 'type', 'strike', 'expiry', 'contracts', 'premium_per_share', 'fees', 'stock_price', 'note']
  const esc = (s: unknown) => { const x = s === undefined || s === null ? '' : String(s); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x }
  return [head.join(','), ...sortTrades(data.trades).map((t) => [tick[t.cycleId], t.date, t.type, t.strike, t.expiry, t.contracts, t.premium, t.fees, t.stockPrice, t.note].map(esc).join(','))].join('\n')
}
