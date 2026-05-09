import { useEffect, useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLOR = '#10B981'
const CW = 300, CH = 220
const RANGE = [-5, 5]
const GENS = 80
const POP = 30

const BM = {
  Sphere:     { fn: (x,y) => x*x + y*y,                                                                                                                 min: 0, max: 50,   color: '#3B82F6' },
  Rastrigin:  { fn: (x,y) => 20 + x*x - 10*Math.cos(2*Math.PI*x) + y*y - 10*Math.cos(2*Math.PI*y),                                                     min: 0, max: 80,   color: '#10B981' },
  Ackley:     { fn: (x,y) => -20*Math.exp(-0.2*Math.sqrt(0.5*(x*x+y*y))) - Math.exp(0.5*(Math.cos(2*Math.PI*x)+Math.cos(2*Math.PI*y))) + Math.E + 20,  min: 0, max: 22,   color: '#F59E0B' },
  Rosenbrock: { fn: (x,y) => 100*(y-x*x)**2 + (1-x)**2,                                                                                                 min: 0, max: 2500, color: '#F43F5E' },
}
const BM_KEYS = ['Sphere', 'Rastrigin', 'Ackley', 'Rosenbrock']

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}
function randn(rng) { return Math.sqrt(-2 * Math.log(rng() + 1e-10)) * Math.cos(2 * Math.PI * rng()) }
function clamp(v) { return Math.max(RANGE[0], Math.min(RANGE[1], v)) }

function hillClimb(cx, cy, fn, steps, rng) {
  for (let i = 0; i < steps; i++) {
    const nx = clamp(cx + randn(rng) * 0.3), ny = clamp(cy + randn(rng) * 0.3)
    if (fn(nx, ny) < fn(cx, cy)) { cx = nx; cy = ny }
  }
  return { x: cx, y: cy }
}

function runGA(fn, memetic, seed) {
  const rng = makeLcg(seed)
  let pop = Array.from({ length: POP }, () => ({ x: clamp(rng()*10-5), y: clamp(rng()*10-5) }))
  const history = []
  for (let gen = 0; gen < GENS; gen++) {
    const fits = pop.map(p => -fn(p.x, p.y))
    history.push(Math.round(Math.min(...pop.map(p => fn(p.x, p.y))) * 100) / 100)
    const next = []
    while (next.length < POP) {
      const idxA = [0,1,2].map(() => Math.floor(rng()*POP)).reduce((a,b) => fits[a]>fits[b]?a:b)
      const idxB = [0,1,2].map(() => Math.floor(rng()*POP)).reduce((a,b) => fits[a]>fits[b]?a:b)
      const t = rng()
      let child = { x: t*pop[idxA].x+(1-t)*pop[idxB].x, y: t*pop[idxA].y+(1-t)*pop[idxB].y }
      if (rng() < 0.08) child.x = clamp(child.x + randn(rng)*0.5)
      if (rng() < 0.08) child.y = clamp(child.y + randn(rng)*0.5)
      if (memetic) child = hillClimb(child.x, child.y, fn, 10, rng)
      next.push(child)
    }
    pop = next
  }
  return { history, final: Math.round(Math.min(...pop.map(p => fn(p.x,p.y)))*100)/100 }
}

function runRandom(fn, seed) {
  const rng = makeLcg(seed)
  let best = Infinity
  const history = []
  for (let gen = 0; gen < GENS; gen++) {
    for (let i = 0; i < POP; i++) {
      const v = fn(clamp(rng()*10-5), clamp(rng()*10-5))
      if (v < best) best = v
    }
    history.push(Math.round(best * 100) / 100)
  }
  return { history, final: Math.round(best*100)/100 }
}

function buildHeatmap(ctx, fn, fmin, fmax) {
  const img = ctx.createImageData(CW, CH)
  for (let row = 0; row < CH; row++) {
    for (let col = 0; col < CW; col++) {
      const x = RANGE[0] + (col/CW)*(RANGE[1]-RANGE[0])
      const y = RANGE[0] + (1-row/CH)*(RANGE[1]-RANGE[0])
      const t = 1 - Math.min(1, Math.max(0, (fn(x,y)-fmin)/(fmax-fmin)))
      const idx = (row*CW+col)*4
      img.data[idx]   = Math.round(t*255)
      img.data[idx+1] = Math.round(t*200+(1-t)*20)
      img.data[idx+2] = Math.round(t*50+(1-t)*100)
      img.data[idx+3] = 255
    }
  }
  return img
}

export default function Viz() {
  const [activeBm, setActiveBm] = useState('Rastrigin')
  const [status, setStatus] = useState('idle')
  const [chartData, setChartData] = useState([])
  const [summary, setSummary] = useState(null)
  const canvasRef = useRef(null)
  const imgCacheRef = useRef({})
  const timerRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CW; canvas.height = CH
    const ctx = canvas.getContext('2d')
    BM_KEYS.forEach(k => { imgCacheRef.current[k] = buildHeatmap(ctx, BM[k].fn, BM[k].min, BM[k].max) })
    ctx.putImageData(imgCacheRef.current['Rastrigin'], 0, 0)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handleBmChange(k) {
    if (status === 'running') return
    clearTimeout(timerRef.current)
    setActiveBm(k); setChartData([]); setSummary(null); setStatus('idle')
    const canvas = canvasRef.current
    if (canvas && imgCacheRef.current[k]) canvas.getContext('2d').putImageData(imgCacheRef.current[k], 0, 0)
  }

  function handleRun() {
    clearTimeout(timerRef.current)
    const fn = BM[activeBm].fn
    const seed = Date.now() & 0xffff
    const ga = runGA(fn, false, seed)
    const ma = runGA(fn, true, seed + 1)
    const rn = runRandom(fn, seed + 2)
    setChartData([]); setSummary(null); setStatus('running')
    let idx = 0
    function tick() {
      if (idx >= GENS) {
        setStatus('done')
        setSummary([
          { label: 'GA',     value: ga.final, color: '#3B82F6' },
          { label: 'MA',     value: ma.final, color: COLOR },
          { label: 'Random', value: rn.final, color: '#A1A1AA' },
        ].sort((a, b) => a.value - b.value))
        return
      }
      setChartData(prev => [...prev, { gen: idx, GA: ga.history[idx], MA: ma.history[idx], Random: rn.history[idx] }])
      idx++
      timerRef.current = setTimeout(tick, 40)
    }
    tick()
  }

  function handleReset() {
    clearTimeout(timerRef.current)
    setStatus('idle'); setChartData([]); setSummary(null)
    const canvas = canvasRef.current
    if (canvas && imgCacheRef.current[activeBm]) canvas.getContext('2d').putImageData(imgCacheRef.current[activeBm], 0, 0)
  }

  const worstVal = summary ? Math.max(...summary.map(s => s.value), 0.001) : 1

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-secondary leading-relaxed">
        Three algorithms race on four classic benchmark functions. Pick a function,
        run the race, and compare how a plain GA, a Memetic Algorithm (GA + hill
        climbing), and random search converge over 80 generations. Lower is better —
        global minimum is 0 for all four.
      </p>

      {/* Benchmark tabs */}
      <div className="flex gap-1 flex-wrap">
        {BM_KEYS.map(k => (
          <button key={k}
            onClick={() => handleBmChange(k)}
            disabled={status === 'running'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${activeBm === k ? 'text-white' : 'text-secondary hover:bg-surface'}`}
            style={activeBm === k ? { backgroundColor: BM[k].color } : {}}>
            {k}
          </button>
        ))}
      </div>

      {/* Canvas + chart side by side */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="shrink-0">
          <p className="text-xs text-muted mb-1">{activeBm} landscape (bright = low value)</p>
          <canvas ref={canvasRef}
            className="rounded-xl border border-border block"
            style={{ width: CW, height: CH }}
            role="img" aria-label={`${activeBm} function heatmap`} />
        </div>
        <div className="flex-1 min-w-0" style={{ minHeight: CH + 24 }}>
          {chartData.length > 1 ? (
            <div style={{ height: CH + 24 }}>
              <p className="text-xs text-muted mb-1">Best value per generation</p>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={chartData}>
                  <XAxis dataKey="gen" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={50} />
                  <Tooltip contentStyle={{ fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="GA"     stroke="#3B82F6" dot={false} strokeWidth={2}   isAnimationActive={false} />
                  <Line type="monotone" dataKey="MA"     stroke={COLOR}   dot={false} strokeWidth={2}   isAnimationActive={false} />
                  <Line type="monotone" dataKey="Random" stroke="#A1A1AA" dot={false} strokeWidth={1.5} strokeDasharray="4 2" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border flex items-center justify-center" style={{ height: CH + 24 }}>
              <p className="text-xs text-muted">Press Run to start the race</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {status !== 'running' && (
          <button onClick={handleRun}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: COLOR }}>
            {status === 'idle' ? 'Run' : 'Run again'}
          </button>
        )}
        {status !== 'idle' && (
          <button onClick={handleReset}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-secondary hover:bg-surface">
            Reset
          </button>
        )}
      </div>

      {/* Summary card */}
      {summary && (
        <div className="rounded-xl bg-surface p-4">
          <p className="text-xs uppercase tracking-widest text-muted mb-3">Final best — {activeBm} (lower = better)</p>
          <div className="space-y-2">
            {summary.map((item, i) => {
              const pct = Math.max(10, Math.round((1 - item.value / worstVal) * 90 + 10))
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-4">{i + 1}.</span>
                  <span className="text-sm font-medium w-16 shrink-0" style={{ color: item.color }}>{item.label}</span>
                  <div className="flex-1 h-2.5 bg-card rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: item.color }} />
                  </div>
                  <span className="text-sm font-mono text-primary w-16 text-right">{item.value.toFixed(3)}</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted mt-3">Global minimum = 0 for all benchmarks</p>
        </div>
      )}
    </div>
  )
}
