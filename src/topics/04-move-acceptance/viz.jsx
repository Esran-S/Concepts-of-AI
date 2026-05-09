import { useState, useRef, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'

const VIZ_STEPS = 200
const X_RANGE = [0, 40]
const SVG_W = 580, SVG_H = 160, PAD_X = 28, PAD_Y = 14

function f(x) {
  return Math.sin(x) * 0.5 + Math.sin(2.3 * x) * 0.4 + Math.sin(3.7 * x) * 0.3
}

function findGlobal() {
  let best = { x: 0, y: -Infinity }
  for (let i = 0; i <= 1000; i++) {
    const x = X_RANGE[0] + (i / 1000) * (X_RANGE[1] - X_RANGE[0])
    if (f(x) > best.y) best = { x, y: f(x) }
  }
  return best
}
const GLOBAL = findGlobal()

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

function toSvgX(x) { return PAD_X + ((x - X_RANGE[0]) / (X_RANGE[1] - X_RANGE[0])) * (SVG_W - 2 * PAD_X) }
function toSvgY(y) { return PAD_Y + ((1.2 - y) / 2.4) * (SVG_H - 2 * PAD_Y) }

const CURVE_D = (() => {
  const pts = []
  for (let i = 0; i <= 400; i++) {
    const x = X_RANGE[0] + (i / 400) * (X_RANGE[1] - X_RANGE[0])
    pts.push(`${i === 0 ? 'M' : 'L'}${toSvgX(x).toFixed(1)},${toSvgY(f(x)).toFixed(1)}`)
  }
  return pts.join(' ')
})()

const ALGOS = [
  { key: 'Greedy',        color: '#3B82F6', label: 'Greedy'        },
  { key: 'SA',            color: '#8B5CF6', label: 'Simulated Annealing' },
  { key: 'GreatDeluge',   color: '#F59E0B', label: 'Great Deluge'  },
  { key: 'LateAcceptance',color: '#10B981', label: 'Late Acceptance' },
]

function runAll(seed) {
  const rng = makeLcg(seed)
  const startX = X_RANGE[0] + rng() * (X_RANGE[1] - X_RANGE[0])
  const stepSize = 3.5

  function next(x) {
    return Math.max(X_RANGE[0], Math.min(X_RANGE[1],
      x + (rng() * 2 - 1) * stepSize))
  }

  // Greedy
  const greedy = { x: startX, hist: [startX], accepted: 0, log: [] }
  // SA
  const sa = { x: startX, T: 1.0, hist: [startX], accepted: 0, log: [] }
  // Great Deluge
  const gd = { x: startX, waterLevel: f(startX) - 1.2, rate: 1.2 / VIZ_STEPS, hist: [startX], accepted: 0, log: [] }
  // Late Acceptance L=10
  const la = { x: startX, L: 10, memory: new Array(10).fill(f(startX)), ptr: 0, hist: [startX], accepted: 0, log: [] }

  const logs = []

  for (let i = 0; i < VIZ_STEPS; i++) {
    const nx = next(greedy.x)
    const logParts = [`Step ${i + 1}:`]

    // Greedy
    if (f(nx) > f(greedy.x)) { greedy.x = nx; greedy.accepted++; logParts.push(`Greedy accepted (quality +${(f(nx) - f(greedy.x > nx ? nx : greedy.x)).toFixed(2)})`) }
    else logParts.push(`Greedy rejected (quality dropped ${(f(greedy.x) - f(nx)).toFixed(2)})`)
    greedy.hist.push(greedy.x)

    // SA
    const saDelta = f(nx) - f(sa.x)
    if (saDelta > 0 || Math.random() < Math.exp(saDelta / sa.T)) {
      sa.x = nx; sa.accepted++
      logParts.push(saDelta > 0 ? 'SA accepted (better)' : `SA accepted (p=${Math.exp(saDelta / sa.T).toFixed(2)})`)
    } else logParts.push('SA rejected')
    sa.T *= 0.985
    sa.hist.push(sa.x)

    // Great Deluge
    gd.waterLevel += gd.rate
    if (f(nx) >= gd.waterLevel) { gd.x = nx; gd.accepted++; logParts.push('Great Deluge accepted (above water level)') }
    else logParts.push('Great Deluge rejected (below water level)')
    gd.hist.push(gd.x)

    // Late Acceptance
    const laRef = la.memory[la.ptr]
    if (f(nx) >= laRef) { la.x = nx; la.accepted++; logParts.push(`Late Acceptance accepted (beats step ${Math.max(0, i - la.L)})`) }
    else logParts.push(`Late Acceptance rejected`)
    la.memory[la.ptr] = f(la.x)
    la.ptr = (la.ptr + 1) % la.L
    la.hist.push(la.x)

    logs.push(logParts.join(' | '))
  }

  return {
    histories: { Greedy: greedy.hist, SA: sa.hist, GreatDeluge: gd.hist, LateAcceptance: la.hist },
    accepted: { Greedy: greedy.accepted, SA: sa.accepted, GreatDeluge: gd.accepted, LateAcceptance: la.accepted },
    final: {
      Greedy: f(greedy.hist[greedy.hist.length - 1]),
      SA: f(sa.hist[sa.hist.length - 1]),
      GreatDeluge: f(gd.hist[gd.hist.length - 1]),
      LateAcceptance: f(la.hist[la.hist.length - 1]),
    },
    best: {
      Greedy: Math.max(...greedy.hist.map(f)),
      SA: Math.max(...sa.hist.map(f)),
      GreatDeluge: Math.max(...gd.hist.map(f)),
      LateAcceptance: Math.max(...la.hist.map(f)),
    },
    reachedOptimal: {
      Greedy: Math.max(...greedy.hist.map(f)) > GLOBAL.y * 0.95,
      SA: Math.max(...sa.hist.map(f)) > GLOBAL.y * 0.95,
      GreatDeluge: Math.max(...gd.hist.map(f)) > GLOBAL.y * 0.95,
      LateAcceptance: Math.max(...la.hist.map(f)) > GLOBAL.y * 0.95,
    },
    logs,
  }
}

export default function Viz() {
  const [visible, setVisible] = useState({ Greedy: true, SA: true, GreatDeluge: true, LateAcceptance: true })
  const [speed, setSpeed] = useState('Medium')
  const [status, setStatus] = useState('idle')
  const [frameIdx, setFrameIdx] = useState(0)
  const [chartData, setChartData] = useState([])
  const [logLines, setLogLines] = useState([])
  const [runData, setRunData] = useState(null)
  const timerRef = useRef(null)
  const logRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logLines])

  function handlePlay() {
    clearTimeout(timerRef.current)
    const data = runAll(Date.now() & 0xffff)
    setRunData(data)
    setFrameIdx(0); setChartData([]); setLogLines([])
    setStatus('running')

    const delays = { Slow: 80, Medium: 30, Fast: 8 }
    let idx = 0

    function tick() {
      if (idx >= VIZ_STEPS) { setStatus('done'); return }
      const row = { step: idx }
      ALGOS.forEach(a => { row[a.key] = Math.round(f(data.histories[a.key][idx]) * 1000) / 1000 })
      setChartData(prev => [...prev, row])
      setLogLines(prev => [...prev.slice(-50), data.logs[idx]])
      setFrameIdx(idx)
      idx++
      timerRef.current = setTimeout(tick, delays[speed])
    }
    tick()
  }

  function handleReset() {
    clearTimeout(timerRef.current)
    setStatus('idle'); setFrameIdx(0); setChartData([]); setLogLines([]); setRunData(null)
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-secondary leading-relaxed">
        Four acceptance strategies race across the same landscape simultaneously.
        Watch how each one behaves — Greedy gets stuck, SA jumps around, Great
        Deluge floods upward, Late Acceptance has a long memory.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-wrap gap-2">
          {ALGOS.map(a => (
            <label key={a.key} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={visible[a.key]}
                onChange={e => setVisible(v => ({ ...v, [a.key]: e.target.checked }))} />
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
              {a.label}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted ml-auto">
          Speed
          <select value={speed} onChange={e => setSpeed(e.target.value)}
            disabled={status === 'running'}
            className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-primary">
            <option>Slow</option><option>Medium</option><option>Fast</option>
          </select>
        </label>
        {status !== 'running' && (
          <button onClick={handlePlay}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#8B5CF6' }}>
            {status === 'idle' ? 'Play' : 'New landscape'}
          </button>
        )}
        {status !== 'idle' && (
          <button onClick={handleReset}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-secondary hover:bg-surface">
            Reset
          </button>
        )}
      </div>

      {/* Landscape with 4 dots */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full"
          role="img" aria-label="Four algorithms racing on landscape">
          <path d={CURVE_D} fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <text x={toSvgX(GLOBAL.x)} y={toSvgY(GLOBAL.y) - 5} textAnchor="middle" fontSize="12">⭐</text>
          {runData && ALGOS.filter(a => visible[a.key]).map(a => {
            const x = runData.histories[a.key][Math.min(frameIdx, VIZ_STEPS - 1)]
            return (
              <circle key={a.key} cx={toSvgX(x)} cy={toSvgY(f(x))} r="6"
                fill={a.color} stroke="#fff" strokeWidth="1.5" />
            )
          })}
        </svg>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-surface rounded-xl p-3" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="step" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} width={40} />
              <Tooltip contentStyle={{ fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)' }} />
              <ReferenceLine y={GLOBAL.y} stroke="#F59E0B" strokeDasharray="4 3" />
              {ALGOS.filter(a => visible[a.key]).map(a => (
                <Line key={a.key} type="monotone" dataKey={a.key}
                  stroke={a.color} dot={false} strokeWidth={2}
                  name={a.label} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-step log */}
      {logLines.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-1">Step log</p>
          <div ref={logRef}
            className="bg-surface rounded-xl p-3 text-xs font-mono text-secondary space-y-0.5 overflow-y-auto"
            style={{ maxHeight: 140 }}>
            {logLines.map((line, i) => <p key={i} className="leading-relaxed">{line}</p>)}
          </div>
        </div>
      )}

      {/* Summary table */}
      {status === 'done' && runData && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Summary</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-surface">
                <tr>
                  {['Strategy', 'Final quality', 'Best found', 'Moves accepted', 'Near optimum?'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-muted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALGOS.map((a, i) => {
                  const best = runData.best[a.key]
                  const isTopBest = best === Math.max(...ALGOS.map(x => runData.best[x.key]))
                  return (
                    <tr key={a.key} className={`border-t border-border ${isTopBest ? 'bg-surface' : ''}`}>
                      <td className="px-3 py-2 font-medium" style={{ color: a.color }}>{a.label}</td>
                      <td className="px-3 py-2 font-mono">{runData.final[a.key].toFixed(3)}</td>
                      <td className="px-3 py-2 font-mono font-bold" style={isTopBest ? { color: a.color } : {}}>
                        {best.toFixed(3)}
                      </td>
                      <td className="px-3 py-2">{runData.accepted[a.key]}</td>
                      <td className="px-3 py-2">{runData.reachedOptimal[a.key] ? '✓' : '✗'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
