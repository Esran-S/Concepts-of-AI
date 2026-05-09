import { useEffect, useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const COLOR = '#10B981'
const CW = 500, CH = 320
const RANGE = [-5, 5]
const GENS = 60
const POP = 30

function rastrigin(x, y) {
  return 20 + x * x - 10 * Math.cos(2 * Math.PI * x)
       + y * y - 10 * Math.cos(2 * Math.PI * y)
}
const RAST_MAX = rastrigin(RANGE[0], RANGE[0])  // corner, ≈ worst

function toCanvasX(x) { return ((x - RANGE[0]) / (RANGE[1] - RANGE[0])) * CW }
function toCanvasY(y) { return CH - ((y - RANGE[0]) / (RANGE[1] - RANGE[0])) * CH }

function buildHeatmap(ctx) {
  const img = ctx.createImageData(CW, CH)
  for (let row = 0; row < CH; row++) {
    for (let col = 0; col < CW; col++) {
      const x = RANGE[0] + (col / CW) * (RANGE[1] - RANGE[0])
      const y = RANGE[0] + (1 - row / CH) * (RANGE[1] - RANGE[0])
      const v = rastrigin(x, y)
      // low rastrigin = bright (best = 0)
      const t = 1 - Math.min(1, v / RAST_MAX)
      const r = Math.round(t * 255)
      const g = Math.round(t * 200 + (1 - t) * 20)
      const b = Math.round(t * 50 + (1 - t) * 100)
      const idx = (row * CW + col) * 4
      img.data[idx] = r; img.data[idx + 1] = g
      img.data[idx + 2] = b; img.data[idx + 3] = 255
    }
  }
  return img
}

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}
function randn(rng) {
  const u1 = rng(), u2 = rng()
  return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2)
}
function clamp2D(v) { return Math.max(RANGE[0], Math.min(RANGE[1], v)) }

function runEA(seed) {
  const rng = makeLcg(seed)
  let pop = Array.from({ length: POP }, () => ({
    x: clamp2D(rng() * 10 - 5), y: clamp2D(rng() * 10 - 5)
  }))

  const generations = []

  for (let gen = 0; gen < GENS; gen++) {
    const fits = pop.map(p => -rastrigin(p.x, p.y))  // negate so higher = better
    const avgFit = fits.reduce((a, b) => a + b, 0) / POP
    const best = pop[fits.indexOf(Math.max(...fits))]
    generations.push({ pop: pop.map(p => ({ ...p })), fits: [...fits], best: { ...best }, avgFit })

    // Tournament selection + crossover + mutation
    const next = []
    while (next.length < POP) {
      // Tournament select two parents
      const idxA = [0,1,2].map(() => Math.floor(rng() * POP)).reduce((a, b) => fits[a] > fits[b] ? a : b)
      const idxB = [0,1,2].map(() => Math.floor(rng() * POP)).reduce((a, b) => fits[a] > fits[b] ? a : b)
      const pA = pop[idxA], pB = pop[idxB]
      // Arithmetic crossover
      const t = rng()
      let child = { x: t * pA.x + (1 - t) * pB.x, y: t * pA.y + (1 - t) * pB.y }
      // Mutation
      if (rng() < 0.08) child.x = clamp2D(child.x + randn(rng) * 0.5)
      if (rng() < 0.08) child.y = clamp2D(child.y + randn(rng) * 0.5)
      next.push(child)
    }
    pop = next
  }
  return generations
}

function drawGen(ctx, imgData, genData) {
  ctx.putImageData(imgData, 0, 0)
  const { pop, fits, best } = genData
  const avgFit = fits.reduce((a, b) => a + b, 0) / pop.length

  pop.forEach((p, i) => {
    const cx = toCanvasX(p.x), cy = toCanvasY(p.y)
    const isAboveAvg = fits[i] > avgFit
    ctx.beginPath()
    ctx.arc(cx, cy, isAboveAvg ? 5 : 3, 0, Math.PI * 2)
    ctx.fillStyle = isAboveAvg ? COLOR + 'CC' : '#888888AA'
    ctx.fill()
  })

  // Best individual
  const bx = toCanvasX(best.x), by = toCanvasY(best.y)
  ctx.beginPath()
  ctx.arc(bx, by, 7, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(bx, by, 5, 0, Math.PI * 2)
  ctx.fillStyle = COLOR
  ctx.fill()
}

export default function Viz() {
  const canvasRef = useRef(null)
  const imgDataRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [speed, setSpeed] = useState('Medium')
  const [popSize, setPopSize] = useState(POP)
  const [genIdx, setGenIdx] = useState(0)
  const [chartData, setChartData] = useState([])
  const [stats, setStats] = useState(null)
  const gensRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CW; canvas.height = CH
    const ctx = canvas.getContext('2d')
    imgDataRef.current = buildHeatmap(ctx)
    ctx.putImageData(imgDataRef.current, 0, 0)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handlePlay() {
    clearTimeout(timerRef.current)
    const gens = runEA(Date.now() & 0xffff)
    gensRef.current = gens
    setGenIdx(0); setChartData([]); setStats(null)
    setStatus('running')

    const delays = { Slow: 200, Medium: 80, Fast: 20 }
    let idx = 0

    function tick() {
      if (idx >= gens.length) { setStatus('done'); return }
      const g = gens[idx]
      const canvas = canvasRef.current
      if (canvas && imgDataRef.current) drawGen(canvas.getContext('2d'), imgDataRef.current, g)

      const bestFit = -rastrigin(g.best.x, g.best.y)
      setChartData(prev => [...prev, { gen: idx, best: Math.round(bestFit * 100) / 100 }])
      setGenIdx(idx + 1)
      const pop = g.pop
      const avgX = pop.reduce((s, p) => s + p.x, 0) / pop.length
      const div = Math.sqrt(pop.reduce((s, p) => s + (p.x - avgX) ** 2 + p.y ** 2, 0) / pop.length)
      setStats({ gen: idx + 1, best: bestFit, div })
      idx++
      timerRef.current = setTimeout(tick, delays[speed])
    }
    tick()
  }

  function handleStep() {
    const gens = gensRef.current
    if (!gens.length || genIdx >= gens.length) return
    const g = gens[genIdx]
    const canvas = canvasRef.current
    if (canvas && imgDataRef.current) drawGen(canvas.getContext('2d'), imgDataRef.current, g)
    const bestFit = -rastrigin(g.best.x, g.best.y)
    setChartData(prev => [...prev, { gen: genIdx, best: Math.round(bestFit * 100) / 100 }])
    const pop = g.pop
    const avgX = pop.reduce((s, p) => s + p.x, 0) / pop.length
    const div = Math.sqrt(pop.reduce((s, p) => s + (p.x - avgX) ** 2, 0) / pop.length)
    setStats({ gen: genIdx + 1, best: bestFit, div })
    setGenIdx(i => i + 1)
    if (genIdx + 1 >= gens.length) setStatus('done')
  }

  function handlePause() { clearTimeout(timerRef.current); setStatus('paused') }

  function handleReset() {
    clearTimeout(timerRef.current)
    gensRef.current = []
    setStatus('idle'); setGenIdx(0); setChartData([]); setStats(null)
    const canvas = canvasRef.current
    if (canvas && imgDataRef.current) canvas.getContext('2d').putImageData(imgDataRef.current, 0, 0)
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-secondary leading-relaxed">
        A genetic algorithm minimises the Rastrigin function — a highly multimodal
        landscape (many local minima in a regular grid). Bright cells are good
        (low value). Emerald dots are above-average individuals; grey dots are below.
        The white-ringed dot is the current best.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Speed
          <select value={speed} onChange={e => setSpeed(e.target.value)}
            disabled={status === 'running'}
            className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-primary">
            <option>Slow</option><option>Medium</option><option>Fast</option>
          </select>
        </label>
        <div className="flex gap-2 ml-auto">
          {status !== 'running' && (
            <button onClick={handlePlay}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: COLOR }}>
              {status === 'idle' ? 'Play' : status === 'paused' ? 'Resume' : 'Restart'}
            </button>
          )}
          {status === 'running' && (
            <button onClick={handlePause}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-secondary hover:bg-surface">
              Pause
            </button>
          )}
          {(status === 'paused' || status === 'done') && (
            <button onClick={handleStep}
              disabled={genIdx >= GENS}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-secondary hover:bg-surface disabled:opacity-40">
              Step
            </button>
          )}
          <button onClick={handleReset}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-secondary hover:bg-surface">
            Reset
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef}
        className="rounded-xl border border-border w-full"
        style={{ maxWidth: CW, display: 'block' }}
        role="img" aria-label="Rastrigin heatmap with population dots" />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Generation', val: `${stats.gen} / ${GENS}` },
            { label: 'Best fitness', val: stats.best.toFixed(3) },
            { label: 'Diversity', val: stats.div.toFixed(2) },
          ].map(({ label, val }) => (
            <div key={label} className="bg-surface rounded-xl p-3 text-center">
              <p className="text-xs text-muted uppercase tracking-widest mb-1">{label}</p>
              <p className="text-base font-bold text-primary">{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-surface rounded-xl p-3" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="gen" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip contentStyle={{ fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)' }} />
              <Line type="monotone" dataKey="best" stroke={COLOR}
                dot={false} strokeWidth={2} name="Best fitness" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
