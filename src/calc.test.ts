import { describe, expect, it } from 'vitest'
import { deriveCycle, stats, suggestion, tradesCsv, type Trade } from './calc'

const c = { id: 'c1', ticker: 'AAPL', created: '2026-01-01' }
const T = (p: Partial<Trade> & Pick<Trade, 'type' | 'date'>): Trade => ({ id: Math.random().toString(36), cycleId: 'c1', contracts: 1, premium: 0, fees: 0, ...p })

describe('wheel calcs', () => {
  const full = [
    T({ type: 'csp_sell', date: '2026-01-01', strike: 100, expiry: '2026-01-31', premium: 2, fees: 0.65 }),
    T({ type: 'assignment', date: '2026-01-31', strike: 100, stockPrice: 97 }),
    T({ type: 'cc_sell', date: '2026-02-01', strike: 102, expiry: '2026-02-28', premium: 1.5, fees: 0.65 }),
    T({ type: 'called_away', date: '2026-03-02', strike: 102 }),
  ]
  it('basis = assignment strike minus net premium per share', () => {
    const v = deriveCycle(c, full.slice(0, 3), '2026-02-10')
    expect(v.premium).toBeCloseTo(350 - 1.3)
    expect(v.basis).toBeCloseTo(100 - 348.7 / 100)
    expect(v.stage).toBe(2)
    expect(v.open).toMatchObject({ kind: 'call', strike: 102, dte: 18 })
    expect(suggestion(v)).toContain('above basis')
  })
  it('realized P/L and annualized return on completion', () => {
    const v = deriveCycle(c, full, '2026-06-01')
    expect(v.complete).toBe(true)
    expect(v.realized).toBeCloseTo(200 + 348.7)
    expect(v.collateral).toBe(10000)
    expect(v.days).toBe(60)
    expect(v.annualized).toBeCloseTo((548.7 / 10000) * (365 / 60))
    expect(v.stage).toBe(3)
  })
  it('buy-to-close and rolls adjust net premium; stage after assignment suggests CC above basis', () => {
    const v = deriveCycle(c, [
      T({ type: 'csp_sell', date: '2026-01-01', strike: 50, expiry: '2026-01-15', premium: 1, contracts: 2 }),
      T({ type: 'roll', date: '2026-01-14', strike: 48, expiry: '2026-02-15', premium: 0.4, contracts: 2 }),
      T({ type: 'assignment', date: '2026-02-15', strike: 48, contracts: 2 }),
    ], '2026-02-16')
    expect(v.premium).toBe(280)
    expect(v.basis).toBeCloseTo(48 - 1.4)
    expect(v.collateral).toBe(10000)
    expect(suggestion(v)).toBe('Sell a covered call above your basis $46.60.')
    const b = deriveCycle(c, [T({ type: 'csp_sell', date: '2026-01-01', strike: 50, premium: 1 }), T({ type: 'csp_btc', date: '2026-01-05', premium: 0.3, fees: 1 })])
    expect(b.premium).toBe(69); expect(b.open).toBeNull(); expect(b.stage).toBe(0)
  })
  it('stats: win rate and averages', () => {
    const lose = { id: 'c2', ticker: 'X', created: '2026-01-01' }
    const views = [deriveCycle(c, full), deriveCycle(lose, [
      { id: 'a', cycleId: 'c2', type: 'csp_sell', date: '2026-01-01', strike: 20, contracts: 1, premium: 0.5, fees: 0 },
      { id: 'b', cycleId: 'c2', type: 'assignment', date: '2026-01-10', strike: 20, contracts: 1, premium: 0, fees: 0 },
      { id: 'd', cycleId: 'c2', type: 'called_away', date: '2026-01-20', strike: 18, contracts: 1, premium: 0, fees: 0 },
    ])]
    const s = stats(views)
    expect(views[1].realized).toBe(-150)
    expect(s.winRate).toBe(0.5); expect(s.completed).toBe(2)
    expect(s.totalPremium).toBeCloseTo(398.7)
  })
  it('csv escapes', () => {
    expect(tradesCsv({ cycles: [c], trades: [T({ type: 'csp_sell', date: '2026-01-01', note: 'a, "b"' })] })).toContain('"a, ""b"""')
  })
})
