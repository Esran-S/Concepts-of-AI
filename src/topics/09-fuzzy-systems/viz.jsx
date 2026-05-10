import { useState, useMemo } from 'react'

const COLOR = '#F43F5E'

function triMF(x, a, b, c) {
  if (x <= a || x >= c) return 0
  if (x <= b) return (x - a) / (b - a)
  return (c - x) / (c - b)
}

// Temperature [0, 100] → Fan speed [0, 100]
const INPUT_MFS = [
  { name: 'Cold', fn: x => triMF(x, -1, 0, 50), color: '#60A5FA' },
  { name: 'Warm', fn: x => triMF(x, 10, 50, 90), color: '#F59E0B' },
  { name: 'Hot',  fn: x => triMF(x, 50, 100, 101), color: '#F43F5E' },
]
const OUTPUT_MFS = [
  { name: 'Slow',   fn: s => triMF(s, -1, 0, 50), color: '#60A5FA' },
  { name: 'Medium', fn: s => triMF(s, 10, 50, 90), color: '#F59E0B' },
  { name: 'Fast',   fn: s => triMF(s, 50, 100, 101), color: '#F43F5E' },
]
// Rule: Cold→Slow, Warm→Medium, Hot→Fast
const RULES = [
  { input: 0, output: 0 },
  { input: 1, output: 1 },
  { input: 2, output: 2 },
]

function computeFIS(temp) {
  const activations = RULES.map(r => INPUT_MFS[r.input].fn(temp))
  const N = 200
  let num = 0, den = 0
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * 100
    const agg = Math.max(...RULES.map((r, ri) =>
      Math.min(activations[ri], OUTPUT_MFS[r.output].fn(s))
    ))
    num += s * agg; den += agg
  }
  const crispSpeed = den < 1e-6 ? 50 : num / den
  return { activations, crispSpeed }
}

// Generate SVG path for a membership function
function mfPoints(fn, xMin, xMax, svgW, svgH, steps = 200) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * (xMax - xMin)
    const y = fn(x)
    const px = (i / steps) * svgW
    const py = svgH - y * svgH
    pts.push(`${px},${py}`)
  }
  return pts.join(' ')
}

function MFChart({ title, mfs, domainMin, domainMax, markerVal, markerLabel, height = 110, activations }) {
  const W = 280, H = height - 24
  return (
    <div>
      <p className="text-xs text-muted mb-1">{title}</p>
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ maxHeight: height }}>
        {/* Axes */}
        <line x1={0} y1={H} x2={W} y2={H} stroke="var(--border)" strokeWidth={1} />
        <line x1={0} y1={0} x2={0}  y2={H} stroke="var(--border)" strokeWidth={1} />
        {/* Axis labels */}
        <text x={0} y={H + 14} style={{ fontSize: 9, fill: 'var(--text-muted)' }}>{domainMin}</text>
        <text x={W - 6} y={H + 14} style={{ fontSize: 9, fill: 'var(--text-muted)' }}>{domainMax}</text>
        {/* MF lines */}
        {mfs.map((mf, i) => {
          const pts = mfPoints(mf.fn, domainMin, domainMax, W, H)
          return <polyline key={i} points={pts} fill="none" stroke={mf.color}
            strokeWidth={1.5} opacity={activations && activations[i] < 0.01 ? 0.25 : 1} />
        })}
        {/* Labels */}
        {mfs.map((mf, i) => {
          const peakX = (domainMin + domainMax) / 2
          const px = ((i === 0 ? domainMin * 0.1 : i === mfs.length - 1 ? domainMax * 0.95 : (domainMin + domainMax) / 2) - domainMin) / (domainMax - domainMin) * W
          const adjustedPx = i === 0 ? 4 : i === mfs.length - 1 ? W - 28 : W / 2 - 8
          return (
            <text key={i} x={adjustedPx} y={12} style={{ fontSize: 9, fontWeight: 600, fill: mf.color, userSelect: 'none' }}>
              {mf.name}
            </text>
          )
        })}
        {/* Marker line */}
        {markerVal !== undefined && (() => {
          const mx = ((markerVal - domainMin) / (domainMax - domainMin)) * W
          return (
            <>
              <line x1={mx} y1={0} x2={mx} y2={H} stroke="var(--text-primary)" strokeWidth={1.5} strokeDasharray="3 2" />
              <text x={Math.min(mx + 2, W - 20)} y={10} style={{ fontSize: 9, fill: 'var(--text-primary)', fontWeight: 600 }}>
                {markerLabel}
              </text>
            </>
          )
        })()}
      </svg>
    </div>
  )
}

function AggChart({ activations, crispSpeed }) {
  const W = 280, H = 100
  const steps = 200
  const aggPts = []
  for (let i = 0; i <= steps; i++) {
    const s = (i / steps) * 100
    const agg = Math.max(...RULES.map((r, ri) =>
      Math.min(activations[ri], OUTPUT_MFS[r.output].fn(s))
    ))
    const px = (i / steps) * W
    const py = H - agg * H
    aggPts.push(`${px},${py}`)
  }
  const cx = (crispSpeed / 100) * W

  return (
    <div>
      <p className="text-xs text-muted mb-1">Aggregated output (clipped MFs)</p>
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ maxHeight: H + 20 }}>
        <line x1={0} y1={H} x2={W} y2={H} stroke="var(--border)" strokeWidth={1} />
        {/* Clipped MFs */}
        {RULES.map((r, ri) => {
          const act = activations[ri]
          const mf = OUTPUT_MFS[r.output]
          const pts = []
          for (let i = 0; i <= steps; i++) {
            const s = (i / steps) * 100
            const y = Math.min(act, mf.fn(s))
            pts.push(`${(i/steps)*W},${H - y*H}`)
          }
          return (
            <g key={ri}>
              <polyline points={pts} fill={mf.color + '28'} stroke={mf.color} strokeWidth={1} />
            </g>
          )
        })}
        {/* Aggregated envelope */}
        <polyline points={aggPts.join(' ')} fill="none" stroke="var(--text-primary)" strokeWidth={1.5} opacity={0.5} strokeDasharray="4 2" />
        {/* Centroid */}
        <line x1={cx} y1={0} x2={cx} y2={H} stroke={COLOR} strokeWidth={2} />
        <text x={Math.min(cx + 3, W - 32)} y={12} style={{ fontSize: 9, fontWeight: 700, fill: COLOR }}>
          {crispSpeed.toFixed(0)}%
        </text>
        <text x={0} y={H + 14} style={{ fontSize: 9, fill: 'var(--text-muted)' }}>0%</text>
        <text x={W - 24} y={H + 14} style={{ fontSize: 9, fill: 'var(--text-muted)' }}>100%</text>
      </svg>
    </div>
  )
}

export default function Viz() {
  const [temp, setTemp] = useState(35)
  const { activations, crispSpeed } = useMemo(() => computeFIS(temp), [temp])

  return (
    <div className="mt-6 space-y-5">
      <p className="text-sm text-secondary leading-relaxed">
        A fuzzy temperature controller maps room temperature to fan speed. Drag
        the slider to see the complete FIS pipeline — fuzzification, rule
        activation, aggregation, and centroid defuzzification — update live.
      </p>

      {/* Temperature input */}
      <div className="bg-surface rounded-xl p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Temperature</span>
          <span className="font-bold text-primary">{temp}°C</span>
        </div>
        <input type="range" min="0" max="100" step="1" value={temp}
          onChange={e => setTemp(Number(e.target.value))} className="w-full" />
        <div className="flex justify-between text-xs text-muted"><span>0°C (Freezing)</span><span>100°C (Boiling)</span></div>
      </div>

      {/* Step 1: Fuzzification */}
      <div className="bg-surface rounded-xl p-4">
        <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: COLOR }}>Step 1 — Fuzzify</p>
        <p className="text-xs text-muted mb-3">How much does {temp}°C belong to each temperature set?</p>
        <MFChart
          title="Temperature membership functions"
          mfs={INPUT_MFS}
          domainMin={0} domainMax={100}
          markerVal={temp} markerLabel={`${temp}°`}
          activations={activations}
        />
        <div className="flex gap-3 mt-2 flex-wrap">
          {INPUT_MFS.map((mf, i) => (
            <div key={mf.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mf.color }} />
              <span className="text-xs text-muted">{mf.name}:</span>
              <span className="text-xs font-mono font-bold text-primary">{activations[i].toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2: Rules */}
      <div className="bg-surface rounded-xl p-4">
        <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: COLOR }}>Step 2 — Rule evaluation</p>
        <div className="space-y-2 mt-2">
          {RULES.map((r, i) => (
            <div key={i} className="flex items-center gap-3 text-xs"
              style={{ opacity: activations[i] > 0.01 ? 1 : 0.3 }}>
              <span className="text-muted w-4">{i+1}.</span>
              <span className="text-secondary">
                IF temp <span className="font-medium" style={{ color: INPUT_MFS[r.input].color }}>{INPUT_MFS[r.input].name}</span>
                {' '}→ speed <span className="font-medium" style={{ color: OUTPUT_MFS[r.output].color }}>{OUTPUT_MFS[r.output].name}</span>
              </span>
              <div className="flex-1 h-2 bg-card rounded-full overflow-hidden border border-border">
                <div className="h-full rounded-full" style={{ width: `${activations[i] * 100}%`, backgroundColor: OUTPUT_MFS[r.output].color }} />
              </div>
              <span className="font-mono text-primary w-8 text-right">{activations[i].toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 3 + 4: Aggregation + Defuzz */}
      <div className="bg-surface rounded-xl p-4">
        <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: COLOR }}>Steps 3 & 4 — Aggregate & Defuzzify</p>
        <p className="text-xs text-muted mb-3">Output MFs are clipped at their activation strengths. The centroid gives the crisp fan speed.</p>
        <AggChart activations={activations} crispSpeed={crispSpeed} />
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs text-muted">Crisp fan speed</p>
          <p className="text-2xl font-bold" style={{ color: COLOR }}>{crispSpeed.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  )
}
