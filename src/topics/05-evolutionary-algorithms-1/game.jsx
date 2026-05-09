import { useState, useRef, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLOR = '#10B981'
const GENS = 50
const OPT = 0        // f(0) = 0, maximise -(x^2)
const RANGE = [-10, 10]

function fitness(x) { return -(x * x) }  // max at x=0, value=0

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

function randn(rng) {
  const u1 = rng(), u2 = rng()
  return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2)
}

function clamp(x) { return Math.max(RANGE[0], Math.min(RANGE[1], x)) }

function tournament(pop, fits, k, rng) {
  let best = null, bestF = -Infinity
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(rng() * pop.length)
    if (fits[idx] > bestF) { bestF = fits[idx]; best = pop[idx] }
  }
  return best
}

function roulette(pop, fits, rng) {
  const min = Math.min(...fits)
  const shifted = fits.map(f => f - min + 1e-6)
  const total = shifted.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < pop.length; i++) {
    r -= shifted[i]
    if (r <= 0) return pop[i]
  }
  return pop[pop.length - 1]
}

function rankSel(pop, fits, rng) {
  const sorted = [...pop].map((x, i) => ({ x, f: fits[i] })).sort((a, b) => a.f - b.f)
  const n = sorted.length
  const weights = sorted.map((_, i) => i + 1)
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < n; i++) { r -= weights[i]; if (r <= 0) return sorted[i].x }
  return sorted[n - 1].x
}

function select(pop, fits, method, rng) {
  if (method === 'Tournament') return tournament(pop, fits, 3, rng)
  if (method === 'Roulette') return roulette(pop, fits, rng)
  return rankSel(pop, fits, rng)
}

function hillClimb(x, steps, rng) {
  let cur = x
  for (let i = 0; i < steps; i++) {
    const nx = clamp(cur + randn(rng) * 0.5)
    if (fitness(nx) > fitness(cur)) cur = nx
  }
  return cur
}

function runGA({ popSize, crossRate, mutRate, selMethod, memetic }, seed) {
  const rng = makeLcg(seed)
  let pop = Array.from({ length: popSize }, () => clamp(rng() * 20 - 10))

  const history = []

  for (let gen = 0; gen < GENS; gen++) {
    const fits = pop.map(fitness)
    const best = Math.max(...fits)
    const avg = fits.reduce((a, b) => a + b, 0) / fits.length
    const diversity = Math.sqrt(pop.reduce((s, x) => {
      const m = pop.reduce((a, b) => a + b, 0) / pop.length
      return s + (x - m) ** 2
    }, 0) / pop.length)
    history.push({ gen, best: Math.round(best * 1000) / 1000, avg: Math.round(avg * 1000) / 1000, diversity })

    const next = []
    while (next.length < popSize) {
      const p1 = select(pop, fits, selMethod, rng)
      const p2 = select(pop, fits, selMethod, rng)
      let child = rng() < crossRate ? (p1 + p2) / 2 : p1
      if (rng() < mutRate) child = clamp(child + randn(rng) * 1.5)
      if (memetic) child = hillClimb(child, 5, rng)
      next.push(child)
    }
    pop = next
  }
  return { history, bestFitness: Math.max(...pop.map(fitness)) }
}

// Default GA for comparison
const DEFAULT_RESULT = runGA({ popSize: 30, crossRate: 0.8, mutRate: 0.05, selMethod: 'Tournament', memetic: false }, 1)
// Random search: best of 50*50 samples
const RANDOM_BEST = (() => {
  const rng = makeLcg(7)
  let best = -Infinity
  for (let i = 0; i < 2500; i++) { const x = rng() * 20 - 10; best = Math.max(best, fitness(x)) }
  return best
})()

function DiversityBar({ value }) {
  const pct = Math.min(1, value / 10) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted w-20 shrink-0">Diversity</span>
      <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-100"
          style={{ width: `${pct}%`, backgroundColor: COLOR }} />
      </div>
      <span className="text-xs text-muted w-10 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

export default function Game() {
  const [popSize, setPopSize] = useState(30)
  const [crossRate, setCrossRate] = useState(0.8)
  const [mutRate, setMutRate] = useState(0.05)
  const [selMethod, setSelMethod] = useState('Tournament')
  const [memetic, setMemetic] = useState(false)
  const [phase, setPhase] = useState('config')
  const [chartData, setChartData] = useState([])
  const [currentGen, setCurrentGen] = useState(0)
  const [currentDiv, setCurrentDiv] = useState(10)
  const [runResult, setRunResult] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handleRun() {
    const result = runGA({ popSize, crossRate, mutRate, selMethod, memetic }, Date.now() & 0xffff)
    setRunResult(result)
    setPhase('running')
    setChartData([])
    let idx = 0

    function tick() {
      if (idx >= result.history.length) { setPhase('result'); return }
      const row = result.history[idx]
      setChartData(prev => [...prev, row])
      setCurrentGen(row.gen + 1)
      setCurrentDiv(row.diversity)
      idx++
      timerRef.current = setTimeout(tick, 60)
    }
    tick()
  }

  function handleReset() {
    clearTimeout(timerRef.current)
    setPhase('config')
    setChartData([])
    setRunResult(null)
  }

  const pctOptimal = runResult ? Math.round((1 - Math.abs(runResult.bestFitness) / 100) * 100) : 0
  const defaultPct = Math.round((1 - Math.abs(DEFAULT_RESULT.bestFitness) / 100) * 100)
  const randomPct = Math.round((1 - Math.abs(RANDOM_BEST) / 100) * 100)

  return (
    <div className="mt-6 space-y-5">
      {phase === 'config' && (
        <div className="space-y-5">
          <p className="text-sm text-secondary leading-relaxed">
            Configure a genetic algorithm to maximise f(x) = −x² for x ∈ [−10, 10].
            The optimum is x = 0, f = 0. Run 50 generations and compare against a
            default GA and random search.
          </p>
          <div className="bg-surface rounded-xl p-5 space-y-4">
            <label className="block">
              <div className="flex justify-between text-xs text-muted mb-1">
                <span>Selection method</span>
              </div>
              <select value={selMethod} onChange={e => setSelMethod(e.target.value)}
                className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-primary w-full">
                <option>Tournament</option><option>Roulette</option><option>Rank-based</option>
              </select>
            </label>

            {[
              { label: 'Population size', val: popSize, set: setPopSize, min: 10, max: 100, step: 5, fmt: v => v },
              { label: 'Crossover rate', val: crossRate, set: setCrossRate, min: 0, max: 1, step: 0.05, fmt: v => v.toFixed(2) },
              { label: 'Mutation rate', val: mutRate, set: setMutRate, min: 0, max: 0.3, step: 0.01, fmt: v => v.toFixed(2) },
            ].map(({ label, val, set, min, max, step, fmt }) => (
              <label key={label} className="block space-y-1">
                <div className="flex justify-between text-xs text-muted">
                  <span>{label}</span><span>{fmt(val)}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e => set(Number(e.target.value))} className="w-full" />
              </label>
            ))}

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={memetic} onChange={e => setMemetic(e.target.checked)}
                className="w-4 h-4" />
              <div>
                <p className="text-sm text-primary font-medium">Memetic mode</p>
                <p className="text-xs text-muted">Apply 5-step hill climbing to each new individual</p>
              </div>
            </label>

            <button onClick={handleRun}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: COLOR }}>
              Run Evolution
            </button>
          </div>
        </div>
      )}

      {(phase === 'running' || phase === 'result') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-secondary">
              Generation <span className="font-bold text-primary">{currentGen}</span> / {GENS}
            </p>
            {runResult && (
              <p className="text-sm text-secondary">
                Best: <span className="font-bold text-primary">{runResult.history[Math.min(currentGen - 1, GENS - 1)]?.best.toFixed(3)}</span>
              </p>
            )}
          </div>

          <DiversityBar value={currentDiv} />

          <div className="bg-surface rounded-xl p-3" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="gen" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip contentStyle={{ fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="best" stroke={COLOR}
                  dot={false} strokeWidth={2} name="Best" isAnimationActive={false} />
                <Line type="monotone" dataKey="avg" stroke={COLOR}
                  dot={false} strokeWidth={1.5} strokeDasharray="4 2"
                  name="Average" isAnimationActive={false} opacity={0.7} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {phase === 'result' && runResult && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted">Comparison</p>
              {[
                { label: 'Your GA', pct: pctOptimal, color: COLOR },
                { label: 'Default GA', pct: defaultPct, color: '#3B82F6' },
                { label: 'Random search', pct: randomPct, color: '#A1A1AA' },
              ].sort((a, b) => b.pct - a.pct).map((item, rank) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-sm text-muted w-4">{rank + 1}.</span>
                  <span className="text-sm text-secondary w-24 shrink-0">{item.label}</span>
                  <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                  </div>
                  <span className="text-sm font-mono text-primary w-12 text-right">{item.pct}%</span>
                </div>
              ))}
              <p className="text-xs text-muted">% of optimal fitness (f = 0) achieved</p>
            </div>
          )}

          <button onClick={handleReset}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-border text-secondary hover:bg-surface transition-colors">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
