import { useState, useRef, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLOR = '#8B5CF6'
const STEPS = 200
const X_RANGE = [0, 40]

function f(x) {
  return Math.sin(x) * 0.5 + Math.sin(2.3 * x) * 0.4 + Math.sin(3.7 * x) * 0.3
}

function findGlobalMax() {
  let best = { x: 0, y: -Infinity }
  for (let i = 0; i <= 1000; i++) {
    const x = X_RANGE[0] + (i / 1000) * (X_RANGE[1] - X_RANGE[0])
    const y = f(x)
    if (y > best.y) best = { x, y }
  }
  return best
}
const GLOBAL_MAX = findGlobalMax()

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

function runSolver({ acceptance, stepSize, memory }, seed) {
  const rng = makeLcg(seed)
  let x = X_RANGE[0] + rng() * (X_RANGE[1] - X_RANGE[0])
  const history = [x]
  const tabu = []
  let best = f(x)

  for (let i = 0; i < STEPS; i++) {
    const nx = Math.max(X_RANGE[0], Math.min(X_RANGE[1],
      x + (rng() * 2 - 1) * stepSize))

    // Tabu check
    const isTabu = tabu.some(tx => Math.abs(tx - nx) < 0.5)
    if (isTabu && rng() > 0.1) { history.push(x); continue }

    const delta = f(nx) - f(x)
    const accept = delta > 0 || rng() < acceptance
    if (accept) { x = nx; tabu.push(x); if (tabu.length > memory) tabu.shift() }
    best = Math.max(best, f(x))
    history.push(x)
  }
  return { history, bestFitness: best }
}

const PRESETS = [
  { name: 'Aggressive', color: '#F43F5E', acceptance: 0.8, stepSize: 8,  memory: 3,  desc: 'explores widely, often overshoots' },
  { name: 'Conservative', color: '#10B981', acceptance: 0.1, stepSize: 2, memory: 15, desc: 'refines carefully, gets stuck' },
  { name: 'Balanced',   color: '#F59E0B', acceptance: 0.35, stepSize: 5, memory: 8,  desc: 'middle ground' },
]

const SVG_W = 560, SVG_H = 160, PAD_X = 28, PAD_Y = 14

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

function Stars({ count }) {
  return <span className="text-xl">{[1,2,3].map(i =>
    <span key={i} style={{ color: i <= count ? '#F59E0B' : '#D1D5DB' }}>★</span>)}</span>
}

export default function Game() {
  const [acceptance, setAcceptance] = useState(0.35)
  const [stepSize, setStepSize] = useState(5)
  const [memory, setMemory] = useState(8)
  const [phase, setPhase] = useState('config') // config | racing | result
  const [preview, setPreview] = useState(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const [allHistories, setAllHistories] = useState(null)
  const [chartData, setChartData] = useState([])
  const [results, setResults] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handlePreview() {
    const { history } = runSolver({ acceptance, stepSize, memory }, 99)
    const deltas = history.slice(1).map((x, i) => f(x) - f(history[i]))
    const uphillPct = deltas.filter(d => d > 0).length / deltas.length
    let tendency
    if (acceptance > 0.6) tendency = 'explore very widely — be careful of overshooting'
    else if (acceptance < 0.15) tendency = 'stay close to good solutions — may get stuck early'
    else if (uphillPct > 0.5) tendency = 'climb efficiently with occasional bold moves'
    else tendency = 'balance exploration and exploitation well'
    setPreview(`With these settings your solver tends to: ${tendency}.`)
  }

  function handleRace() {
    const SEED = 77
    const allSolvers = [
      { name: 'You', color: COLOR, ...runSolver({ acceptance, stepSize, memory }, SEED) },
      ...PRESETS.map(p => ({ ...p, ...runSolver(p, SEED) })),
    ]
    setAllHistories(allSolvers)
    setPhase('racing')
    setFrameIdx(0)
    setChartData([])

    let idx = 0
    function tick() {
      if (idx >= STEPS) {
        setResults(allSolvers)
        setPhase('result')
        return
      }
      const row = { step: idx }
      allSolvers.forEach(s => { row[s.name] = Math.round(f(s.history[idx]) * 1000) / 1000 })
      setChartData(prev => [...prev, row])
      setFrameIdx(idx)
      idx++
      timerRef.current = setTimeout(tick, 18)
    }
    tick()
  }

  function handleRetry() {
    clearTimeout(timerRef.current)
    setPhase('config')
    setPreview(null)
    setResults(null)
    setChartData([])
    setAllHistories(null)
    setFrameIdx(0)
  }

  // Sorted results
  const ranked = results
    ? [...results].sort((a, b) => b.bestFitness - a.bestFitness)
    : null
  const userRank = ranked ? ranked.findIndex(r => r.name === 'You') + 1 : 0
  const stars = userRank <= 2 ? 3 : userRank === 3 ? 2 : 1

  return (
    <div className="mt-6 space-y-5">
      {/* Config panel */}
      {phase === 'config' && (
        <div className="space-y-5">
          <p className="text-sm text-secondary leading-relaxed">
            Configure your solver's parameters, then race it against three preset
            strategies over 200 steps on the same landscape.
          </p>

          <div className="bg-surface rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-primary">Your solver</h3>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-muted">
                <span>Acceptance probability</span><span>{acceptance.toFixed(2)}</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" value={acceptance}
                onChange={e => setAcceptance(Number(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-muted"><span>Never worse</span><span>Always accept</span></div>
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-muted">
                <span>Step size</span><span>{stepSize}</span>
              </div>
              <input type="range" min="1" max="10" value={stepSize}
                onChange={e => setStepSize(Number(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-muted"><span>Tiny</span><span>Large</span></div>
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-muted">
                <span>Memory length (tabu)</span><span>{memory}</span>
              </div>
              <input type="range" min="0" max="20" value={memory}
                onChange={e => setMemory(Number(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-muted"><span>No memory</span><span>Long memory</span></div>
            </label>

            {preview && (
              <p className="text-xs text-secondary bg-card border border-border rounded-lg p-3">{preview}</p>
            )}

            <div className="flex gap-2">
              <button onClick={handlePreview}
                className="px-4 py-2 rounded-lg text-sm border border-border text-secondary hover:bg-card transition-colors">
                Preview
              </button>
              <button onClick={handleRace}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white flex-1"
                style={{ backgroundColor: COLOR }}>
                Start Race
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {PRESETS.map(p => (
              <div key={p.name} className="bg-surface rounded-xl p-3 border-l-4"
                style={{ borderLeftColor: p.color }}>
                <p className="text-sm font-semibold text-primary mb-1">{p.name}</p>
                <p className="text-xs text-muted">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Racing / result */}
      {(phase === 'racing' || phase === 'result') && allHistories && (
        <div className="space-y-4">
          {/* Landscape with dots */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full"
              role="img" aria-label="Racing landscape">
              <path d={CURVE_D} fill="none" stroke="var(--border)" strokeWidth="1.5" />
              <text x={toSvgX(GLOBAL_MAX.x)} y={toSvgY(GLOBAL_MAX.y) - 5}
                textAnchor="middle" fontSize="12">⭐</text>
              {allHistories.map(s => {
                const x = s.history[Math.min(frameIdx, s.history.length - 1)]
                return (
                  <circle key={s.name}
                    cx={toSvgX(x)} cy={toSvgY(f(x))} r="6"
                    fill={s.color} stroke="#fff" strokeWidth="1.5" />
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
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {allHistories.map(s => (
                    <Line key={s.name} type="monotone" dataKey={s.name}
                      stroke={s.color} dot={false} strokeWidth={2} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Podium */}
          {phase === 'result' && ranked && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary">Final ranking</h3>
                <Stars count={stars} />
              </div>
              {ranked.map((s, i) => (
                <div key={s.name}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${s.name === 'You' ? 'border-2' : 'border'}`}
                  style={{ borderColor: s.name === 'You' ? COLOR : 'var(--border)' }}>
                  <span className="text-lg font-bold text-muted w-6 shrink-0">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '4'}
                  </span>
                  <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary">{s.name}</p>
                    {s.desc && <p className="text-xs text-muted truncate">{s.desc}</p>}
                  </div>
                  <span className="text-sm font-mono text-primary shrink-0">
                    {s.bestFitness.toFixed(3)}
                  </span>
                </div>
              ))}
              {ranked[0].name !== 'You' && (
                <p className="text-xs text-secondary">
                  Winner used: acceptance {ranked[0].acceptance?.toFixed(2)}, step {ranked[0].stepSize}, memory {ranked[0].memory}
                </p>
              )}
              <button onClick={handleRetry}
                className="w-full py-2.5 rounded-xl text-sm font-medium border border-border text-secondary hover:bg-surface transition-colors">
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
