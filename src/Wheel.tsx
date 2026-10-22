import { useEffect, useRef, useState } from 'react'
import { STAGE_SHORT } from './calc'

export const COLORS = ['#3d6fd6', '#1f9c8c', '#c9962c', '#8a4fa0']
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
        <radialGradient id="hub" cx="50%" cy="30%" r="75%"><stop offset="0" stopColor="#1c2b57" /><stop offset="1" stopColor="#0b1430" /></radialGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f0cf6b" /><stop offset=".55" stopColor="#d4af37" /><stop offset="1" stopColor="#a8862a" /></linearGradient>
        <filter id="gglow" x="-80%" y="-80%" width="260%" height="260%"><feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f0cf6b" floodOpacity=".9" /></filter>
        {COLORS.map((c, i) => <linearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c} stopOpacity=".78" /><stop offset="1" stopColor={c} /></linearGradient>)}
      </defs>
      <circle cx={C} cy={C} r={R2 + 10} fill="#0d1838" stroke="url(#gold)" strokeOpacity=".55" strokeWidth="1.5" />
      <g className="rotor" style={{ transform: `rotate(${rot}deg)` }}>
        {[0, 1, 2, 3].map((i) => {
          const a0 = (i * 90 - 45) * Math.PI / 180 + gap, a1 = (i * 90 + 45) * Math.PI / 180 - gap, mid = i * 90 * Math.PI / 180
          const lx = C + 101 * Math.sin(mid), ly = C - 101 * Math.cos(mid)
          const active = i === stage, sel = selected === i
          return (
            <g key={i} className={'seg' + (active ? ' active' : '')} onClick={() => onSelect?.(i)} style={{ cursor: onSelect ? 'pointer' : undefined }}>
              <path d={arc(C, C, R1, active ? R2 + 6 : R2, a0, a1)} fill={`url(#g${i})`} opacity={active || sel ? 1 : 0.42}
                stroke={sel ? '#f0cf6b' : '#0d1838'} strokeWidth={sel ? 3 : 2} filter={active ? 'url(#glow)' : undefined} />
              <g transform={`translate(${lx} ${ly})`}>
                <g className="counter" style={{ transform: `rotate(${-rot}deg)` }}>
                  <text y="-10" textAnchor="middle" fontSize="20">{ICONS[i]}</text>
                  {LABELS[i].map((w, k) => <text key={k} y={9 + k * 12} textAnchor="middle" fontSize="11" fontWeight="800" fill={active ? '#fbf7ea' : '#c7cfe0'} stroke={active ? 'rgba(11,20,48,.55)' : 'none'} strokeWidth="2.5" paintOrder="stroke">{k === 0 ? `${i + 1} · ${w}` : w}</text>)}
                </g>
              </g>
            </g>
          )
        })}
        {/* direction arrows between stages */}
        {[0, 1, 2, 3].map((i) => { const a = (i * 90 + 45) * Math.PI / 180; return <circle key={i} cx={C + (R1 + R2) / 2 * Math.sin(a)} cy={C - (R1 + R2) / 2 * Math.cos(a)} r="2.5" fill="#d4af37" opacity=".6" /> })}
      </g>
      {/* fixed glowing marker at the top */}
      <g filter="url(#gglow)" className="marker">
        <path d={`M${C - 13} 2 L${C + 13} 2 L${C} 22 Z`} fill="url(#gold)" stroke="#fff3c4" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
      <circle cx={C} cy={C} r={R1 - 6} fill="url(#hub)" stroke="url(#gold)" strokeWidth="3.5" />
      <circle cx={C} cy={C} r={R1 - 11} fill="none" stroke="#d4af37" strokeOpacity=".3" strokeWidth="1" />
      <text x={C} y={C - 22} textAnchor="middle" fontSize="15" fontWeight="900" fill="#f0cf6b" letterSpacing="2">{ticker}</text>
      <text x={C} y={C + 6} textAnchor="middle" fontSize={Math.abs(premium) >= 10000 ? 19 : 23} fontWeight="900" fill={premium >= 0 ? '#7fd1a8' : '#e58a8a'}>{money0(premium)}</text>
      <text x={C} y={C + 24} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#8d98b3" letterSpacing="1.2">{complete ? 'CYCLE DONE' : 'PREMIUM'}</text>
    </svg>
  )
}
