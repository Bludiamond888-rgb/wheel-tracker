import { useEffect, useRef, useState } from 'react'
import { STAGE_SHORT } from './calc'

/** Stage accent colors (used by cards elsewhere) and rich casino wedge colors. */
export const COLORS = ['#3d6fd6', '#1f9c8c', '#c9962c', '#8a4fa0']
const CASINO = [['#c0392b', '#7d1414'], ['#2456c9', '#0f2a78'], ['#16a061', '#0a5634'], ['#8e3fc0', '#4b1a72']]
const ICONS = ['💵', '📦', '📈', '🏁']
const WORDS = ['PUT', 'SHARES', 'CALL', 'AWAY']
const N = 12, STEP = 360 / N, BULBS = 24
const money0 = (n: number) => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
const SOUND_KEY = 'wheel-tracker-sound'
export const soundOn = () => localStorage.getItem(SOUND_KEY) === '1'
export const setSoundOn = (on: boolean) => on ? localStorage.setItem(SOUND_KEY, '1') : localStorage.removeItem(SOUND_KEY)
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

let actx: AudioContext | null = null
function tick() {
  if (!soundOn()) return
  try {
    actx ??= new AudioContext()
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime
    o.type = 'square'; o.frequency.value = 1700
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.035)
  } catch { /* audio unavailable */ }
}

function arc(cx: number, cy: number, r1: number, r2: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)].map((n) => n.toFixed(2)).join(' ')
  return `M${p(r2, a0)} A${r2} ${r2} 0 0 1 ${p(r2, a1)} L${p(r1, a1)} A${r1} ${r1} 0 0 0 ${p(r1, a0)} Z`
}
/** Ease out with a small overshoot and settle. */
const ease = (t: number) => { const c = 1.15, x = t - 1; return 1 + (c + 1) * x * x * x + c * x * x }

/**
 * Casino-style SVG wheel. 12 wedges cycle the 4 stages (wedge k = stage k % 4, centered at k*30° clockwise).
 * When `stage` changes (or `replay` increments) the rotor spins several turns and lands a wedge of the stage under the flapper.
 */
export function Wheel({ stage, premium, ticker, selected, onSelect, size = 300, complete, replay = 0, onSpinEnd }: {
  stage: number; premium: number; ticker: string; selected?: number | null; onSelect?: (i: number) => void; size?: number; complete?: boolean
  replay?: number; onSpinEnd?: () => void
}) {
  const rotor = useRef<SVGGElement>(null), flap = useRef<SVGGElement>(null)
  const ang = useRef(-stage * STEP)
  const prev = useRef({ stage, replay })
  const [spinning, setSpinning] = useState(false)
  const endCb = useRef(onSpinEnd); endCb.current = onSpinEnd
  const C = 150, R2 = 122, R1 = 52

  useEffect(() => {
    const p = prev.current
    if (p.stage === stage && p.replay === replay) return
    prev.current = { stage, replay }
    const choices = [0, 1, 2].map((j) => stage + 4 * j)
    const k = choices[Math.floor(Math.random() * 3)]
    const from = ang.current
    const base = -k * STEP
    // clockwise spin of at least 4 full turns
    const to = base + (Math.floor((from - base) / 360) + 5) * 360
    if (reduced()) { ang.current = to; rotor.current?.setAttribute('transform', `rotate(${to} ${C} ${C})`); endCb.current?.(); return }
    const dur = 4200, t0 = performance.now()
    let lastPeg = Math.floor((from + STEP / 2) / STEP), fl = 0, raf = 0, lastVib = 0
    setSpinning(true)
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const a = from + (to - from) * ease(t)
      ang.current = a
      rotor.current?.setAttribute('transform', `rotate(${a.toFixed(2)} ${C} ${C})`)
      const peg = Math.floor((a + STEP / 2) / STEP)
      if (peg !== lastPeg) {
        lastPeg = peg; fl = -26; tick()
        if (now - lastVib > 60 && navigator.vibrate) { try { navigator.vibrate(6) } catch { /* noop */ } lastVib = now }
      }
      fl *= 0.82
      flap.current?.setAttribute('transform', `rotate(${fl.toFixed(2)} ${C} 14)`)
      if (t < 1) raf = requestAnimationFrame(frame)
      else { ang.current = to; setSpinning(false); endCb.current?.() }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [stage, replay])

  return (
    <svg viewBox="0 0 300 300" width={size} height={size} className={'wheel casino' + (spinning ? ' spinning' : '')} role="img" aria-label={`${ticker} wheel at stage ${stage + 1}: ${STAGE_SHORT[stage]}`}>
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b0" /><stop offset=".3" stopColor="#e9c25a" /><stop offset=".55" stopColor="#a87b1e" /><stop offset=".8" stopColor="#f3d77a" /><stop offset="1" stopColor="#8a6414" /></linearGradient>
        <linearGradient id="gold2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbe7a1" /><stop offset=".5" stopColor="#c9962c" /><stop offset="1" stopColor="#7a5610" /></linearGradient>
        <radialGradient id="bulb"><stop offset="0" stopColor="#fffbe8" /><stop offset=".45" stopColor="#ffe08a" /><stop offset="1" stopColor="#e0a526" /></radialGradient>
        <radialGradient id="peg" cx="35%" cy="35%"><stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#c9ced8" /><stop offset="1" stopColor="#5d6474" /></radialGradient>
        <radialGradient id="sheen" cx="50%" cy="20%" r="70%"><stop offset="0" stopColor="#fff" stopOpacity=".22" /><stop offset=".6" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <radialGradient id="chipc" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#1d2d5c" /><stop offset="1" stopColor="#0a1330" /></radialGradient>
        {CASINO.map(([a, b], i) => <radialGradient key={i} id={`w${i}`} cx="150" cy="150" r={R2} gradientUnits="userSpaceOnUse"><stop offset=".35" stopColor={b} /><stop offset="1" stopColor={a} /></radialGradient>)}
      </defs>
      {/* outer rim */}
      <circle cx={C} cy={C} r={146} fill="#2a1d05" />
      <circle cx={C} cy={C} r={143} fill="url(#gold)" />
      <circle cx={C} cy={C} r={128} fill="#3b2a08" />
      <circle cx={C} cy={C} r={143} fill="none" stroke="#fff3c4" strokeOpacity=".6" strokeWidth=".8" />
      <g className="bulbs">
        {Array.from({ length: BULBS }, (_, i) => {
          const a = (i * 360 / BULBS) * Math.PI / 180
          return <g key={i}><circle cx={C + 135.5 * Math.sin(a)} cy={C - 135.5 * Math.cos(a)} r="4.6" fill="#5a3f0c" />
            <circle className={'bulb b' + (i % 2)} style={{ animationDelay: `${(i % 6) * -0.15}s` }} cx={C + 135.5 * Math.sin(a)} cy={C - 135.5 * Math.cos(a)} r="3.4" fill="url(#bulb)" /></g>
        })}
      </g>
      <g ref={rotor} className="rotor" transform={`rotate(${ang.current} ${C} ${C})`}>
        {Array.from({ length: N }, (_, k) => {
          const i = k % 4, a0 = (k * STEP - STEP / 2) * Math.PI / 180, a1 = (k * STEP + STEP / 2) * Math.PI / 180
          const active = i === stage, sel = selected === i
          return (
            <g key={k} className={'seg' + (active ? ' active' : '')} onClick={() => onSelect?.(i)} style={{ cursor: onSelect ? 'pointer' : undefined }}>
              <path d={arc(C, C, R1, R2 + 2, a0, a1)} fill={`url(#w${i})`} />
              {!active && <path d={arc(C, C, R1, R2 + 2, a0, a1)} fill="#050a1c" opacity={sel ? 0.15 : 0.42} />}
              {active && <path d={arc(C, C, R2 - 7, R2 + 2, a0 + 0.02, a1 - 0.02)} fill="#ffe08a" opacity=".85" className="litedge" />}
              {sel && <path d={arc(C, C, R1 + 1, R2 + 1, a0 + 0.01, a1 - 0.01)} fill="none" stroke="#fff3c4" strokeWidth="2.5" />}
              <g transform={`rotate(${k * STEP} ${C} ${C})`}>
                <text x={C} y={C - 101} textAnchor="middle" fontSize="15">{ICONS[i]}</text>
                <text transform={`translate(${C} ${C - 92}) rotate(90)`} textAnchor="start" dominantBaseline="central" fontSize={WORDS[i].length > 4 ? 7.6 : 10} fontWeight="900" letterSpacing=".6"
                  fill={active ? '#fff8dc' : '#e6e9f2'} stroke="rgba(0,0,0,.55)" strokeWidth="2.2" paintOrder="stroke">{WORDS[i]}</text>
              </g>
            </g>
          )
        })}
        {/* gold dividers + metal pegs */}
        {Array.from({ length: N }, (_, k) => {
          const a = (k * STEP + STEP / 2) * Math.PI / 180, s = Math.sin(a), c = Math.cos(a)
          return <g key={k}>
            <line x1={C + R1 * s} y1={C - R1 * c} x2={C + (R2 + 2) * s} y2={C - (R2 + 2) * c} stroke="url(#gold2)" strokeWidth="2.2" />
            <circle cx={C + (R2 - 3) * s} cy={C - (R2 - 3) * c} r="3.3" fill="url(#peg)" stroke="#2b2f3a" strokeWidth=".6" />
          </g>
        })}
        <circle cx={C} cy={C} r={R2 + 2} fill="none" stroke="url(#gold2)" strokeWidth="2.5" />
      </g>
      <circle cx={C} cy={C} r={R2} fill="url(#sheen)" pointerEvents="none" />
      {/* hub: gold casino chip */}
      <circle cx={C} cy={C} r={R1 + 3} fill="#2a1d05" opacity=".6" />
      <circle cx={C} cy={C} r={R1} fill="url(#gold)" />
      <circle cx={C} cy={C} r={R1 - 4} fill="none" stroke="#fffbe8" strokeWidth="6" strokeDasharray="7 9.4" opacity=".9" />
      <circle cx={C} cy={C} r={R1 - 8} fill="url(#chipc)" stroke="url(#gold2)" strokeWidth="2" />
      <circle cx={C} cy={C} r={R1 - 12} fill="none" stroke="#d4af37" strokeOpacity=".45" strokeWidth=".8" strokeDasharray="2 2" />
      <text x={C} y={C - 13} textAnchor="middle" fontSize={ticker.length > 4 ? 10 : 12} fontWeight="900" fill="#f0cf6b" letterSpacing="1.5">{ticker}</text>
      <text x={C} y={C + 7} textAnchor="middle" fontSize={Math.abs(premium) >= 10000 ? 13 : 16} fontWeight="900" fill={premium >= 0 ? '#7fe0ae' : '#ff9b9b'}>{money0(premium)}</text>
      <text x={C} y={C + 20} textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#b8c0d6" letterSpacing="1.2">{complete ? 'CYCLE DONE' : 'PREMIUM'}</text>
      {/* flapper pointer */}
      <g ref={flap} className="flapper">
        <path d={`M${C - 12} 2 Q${C} -3 ${C + 12} 2 L${C + 4} 30 Q${C} 36 ${C - 4} 30 Z`} fill="url(#gold)" stroke="#5a3f0c" strokeWidth="1.2" strokeLinejoin="round" />
        <path d={`M${C - 6} 4 L${C} 26 L${C - 1} 4 Z`} fill="#fff8d6" opacity=".7" />
        <circle cx={C} cy={9} r="4" fill="url(#peg)" stroke="#5a3f0c" strokeWidth=".8" />
      </g>
    </svg>
  )
}

/** Gold coin + sparkle burst overlay (pure CSS transforms). */
export function CoinBurst() {
  const n = reduced() ? 0 : 28
  return <div className="burst" aria-hidden>{Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (i % 3) * 0.2, d = 120 + (i * 37) % 110
    return <span key={i} className={i % 3 ? 'coin' : 'spark'} style={{ ['--x' as string]: `${Math.cos(a) * d}px`, ['--y' as string]: `${Math.sin(a) * d - 60}px`, animationDelay: `${(i % 5) * 0.04}s` }}>{i % 3 ? '🪙' : '✨'}</span>
  })}</div>
}
