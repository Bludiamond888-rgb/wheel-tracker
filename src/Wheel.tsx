import { useEffect, useRef, useState } from 'react'
import { STAGE_SHORT } from './calc'

export const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899']
const ICONS = ['💵', '📦', '📈', '🏁']
const LABELS = [['Sell', 'Put'], ['Own', 'Shares'], ['Sell', 'Call'], ['Called', 'Away']]
const money0 = (n: number) => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })

function arc(cx: number, cy: number, r1: number, r2: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)].map((n) => n.toFixed(2)).join(' ')
  return `M${p(r2, a0)} A${r2} ${r2} 0 0 1 ${p(r2, a1)} L${p(r1, a1)} A${r1} ${r1} 0 0 0 ${p(r1, a0)} Z`
}

/** SVG wheel. Stage i is centered at i*90° clockwise from top; the wheel rotates so the current stage sits under the top marker. */
export function Wheel({ stage, premium, ticker, selected, onSelect, size = 300, complete }: {
  stage: number; premium: number; ticker: string; selected?: number | null; onSelect?: (i: number) => void; size?: number; complete?: boolean
}) {
  const [rot, setRot] = useState(-stage * 90)
  const prev = useRef(stage)
  const [spin, setSpin] = useState(false)
  useEffect(() => {
    if (prev.current === stage) return
    const delta = (stage - prev.current + 4) % 4 || 4
    prev.current = stage
    setRot((r) => r - delta * 90 - 360) // a full extra turn for a satisfying spin
    setSpin(true); const t = setTimeout(() => setSpin(false), 1700); return () => clearTimeout(t)
  }, [stage])
  const C = 150, R2 = 132, R1 = 70, gap = 0.035
  return (
    <svg viewBox="0 0 300 300" width={size} height={size} className={'wheel' + (spin ? ' spinning' : '')} role="img" aria-label={`${ticker} wheel at stage ${stage + 1}: ${STAGE_SHORT[stage]}`}>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <radialGradient id="hub" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#eef2ff" /></radialGradient>
        {COLORS.map((c, i) => <linearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c} stopOpacity=".78" /><stop offset="1" stopColor={c} /></linearGradient>)}
      </defs>
      <circle cx={C} cy={C} r={R2 + 10} fill="#fff" stroke="#e5e9f6" strokeWidth="2" />
      <g className="rotor" style={{ transform: `rotate(${rot}deg)` }}>
        {[0, 1, 2, 3].map((i) => {
          const a0 = (i * 90 - 45) * Math.PI / 180 + gap, a1 = (i * 90 + 45) * Math.PI / 180 - gap, mid = i * 90 * Math.PI / 180
          const lx = C + 101 * Math.sin(mid), ly = C - 101 * Math.cos(mid)
          const active = i === stage, sel = selected === i
          return (
            <g key={i} className={'seg' + (active ? ' active' : '')} onClick={() => onSelect?.(i)} style={{ cursor: onSelect ? 'pointer' : undefined }}>
              <path d={arc(C, C, R1, active ? R2 + 6 : R2, a0, a1)} fill={`url(#g${i})`} opacity={active || sel ? 1 : 0.5}
                stroke={sel ? '#0f172a' : '#fff'} strokeWidth={sel ? 3 : 2} filter={active ? 'url(#glow)' : undefined} />
              <g transform={`translate(${lx} ${ly})`}>
                <g className="counter" style={{ transform: `rotate(${-rot}deg)` }}>
                  <text y="-10" textAnchor="middle" fontSize="20">{ICONS[i]}</text>
                  {LABELS[i].map((w, k) => <text key={k} y={9 + k * 12} textAnchor="middle" fontSize="11" fontWeight="800" fill={active ? '#fff' : '#334155'}>{k === 0 ? `${i + 1} · ${w}` : w}</text>)}
                </g>
              </g>
            </g>
          )
        })}
        {/* direction arrows between stages */}
        {[0, 1, 2, 3].map((i) => { const a = (i * 90 + 45) * Math.PI / 180; return <circle key={i} cx={C + (R1 + R2) / 2 * Math.sin(a)} cy={C - (R1 + R2) / 2 * Math.cos(a)} r="3" fill="#cbd5e1" /> })}
      </g>
      {/* fixed glowing marker at the top */}
      <g filter="url(#glow)" className="marker">
        <path d={`M${C - 13} 2 L${C + 13} 2 L${C} 22 Z`} fill={COLORS[stage]} stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
      </g>
      <circle cx={C} cy={C} r={R1 - 6} fill="url(#hub)" stroke="#e0e7ff" strokeWidth="2" />
      <text x={C} y={C - 22} textAnchor="middle" fontSize="15" fontWeight="900" fill="#0f172a" letterSpacing="1">{ticker}</text>
      <text x={C} y={C + 6} textAnchor="middle" fontSize={Math.abs(premium) >= 10000 ? 19 : 23} fontWeight="900" fill={premium >= 0 ? '#059669' : '#dc2626'}>{money0(premium)}</text>
      <text x={C} y={C + 24} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#64748b" letterSpacing=".6">{complete ? 'CYCLE DONE' : 'PREMIUM'}</text>
    </svg>
  )
}
