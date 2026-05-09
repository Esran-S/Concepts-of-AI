import { useEffect, useRef, useState, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const COLOR = '#8B5CF6'
const CW = 420
const CH = 300

// 5 Gaussian peaks: [cx, cy, amplitude, spread]
const PEAKS = [
  [0.2, 0.25, 1.0, 0.07],
  [0.7, 0.2,  0.85, 0.06],
  [0.45, 0.6, 0.9, 0.08],
  [0.8,  0.75, 0.75, 0.06],
  [0.15, 0.75, 0.7, 0.07],
]

function landscape(px, py) {
  // px,py normalised 0-1
  return PEAKS.reduce((sum, [cx, cy, amp, spread]) => {
    const dx = px - cx, dy = py - cy
    return sum + amp * Math.exp(-(dx * dx + dy * dy) / (2 * spread * spread))
  }, 0)
}

function findGlobal2D() {
  let best = { x: 0, y: 0, v: -Infinity }
  const steps = 200
  for (let i = 0; i <= steps; i++)
    for (let j = 0; j <= steps; j++) {
      const px = i / steps, py = j / steps
      const v = landscape(px, py)
      if (v > best.v) best = { x: px, y: py, v }
    }
  return best
}

const GLOBAL = findGlobal2D()

function buildImageData(ctx, w, h) {
  const img = ctx.createImageData(w, h)
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const px = col / w, py = row / h
      const v = landscape(px, py) // 0..~1
      const t = Math.min(1, v / GLOBAL.v)
      // dark blue → teal → yellow → white
      let r, g, b
      if (t < 0.33) {
        const s = t / 0.33
        r = Math.round(15 + s * (32 - 15))
        g = Math.round(23 + s * (178 - 23))
        b = Math.round(90 + s * (170 - 90))
      } else if (t < 0.66) {
        const s = (t - 0.33) / 0.33
        r = Math.round(32 + s * (234 - 32))
        g = Math.round(178 + s * (179 - 178))
        b = Math.round(170 + s * (8 - 170))
      } else {
        const s = (t - 0.66) / 0.34
        r = Math.round(234 + s * (255 - 234))
        g = Math.round(179 + s * (255 - 179))
        b = Math.round(8 + s * (255 - 8))
      }
      const idx = (row * w + col) * 4
      img.data[idx] = r; img.data[idx + 1] = g
      img.data[idx + 2] = b; img.data[idx + 3] = 255
    }
  }
  return img
}

function randn(rng) {
  const u1 = rng(), u2 = rng()
  return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2)
}

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

const COOL_RATES = { Slow: 0.99, Medium: 0.97, Fast: 0.95 }
const DELAYS = { Slow: 120, Medium: 50, Fast: 15 }

export default function Viz() {
  const canvasRef = useRef(null)
  const imgDataRef = useRef(null)
  const [initTemp, setInitTemp] = useState(1.0)
  const [coolKey, setCoolKey] = useState('Medium')
  const [stepSizePx, setStepSizePx] = useState(40)
  const [speedKey, setSpeedKey] = useState('Medium')
  const [status, setStatus] = useState('idle')
  const [chartData, setChartData] = useState([])
  const [annotation, setAnnotation] = useState(null) // {text, x, y, color}

  // SA state in refs
  const saRef = useRef({ x: 0.5, y: 0.5, T: 1, trail: [], iter: 0 })
  const timerRef = useRef(null)
  const rngRef = useRef(makeLcg(42))
  const [, forceRender] = useState(0)

  // Build heatmap once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CW; canvas.height = CH
    const ctx = canvas.getContext('2d')
    imgDataRef.current = buildImageData(ctx, CW, CH)
    drawFrame(ctx, saRef.current)
  }, [])

  function drawFrame(ctx, sa) {
    if (imgDataRef.current) ctx.putImageData(imgDataRef.current, 0, 0)

    // Trail
    const trail = sa.trail
    for (let i = 1; i < trail.length; i++) {
      const alpha = Math.max(0.05, (i / trail.length) * 0.5)
      ctx.beginPath()
      ctx.strokeStyle = `rgba(139,92,246,${alpha})`
      ctx.lineWidth = 1.5
      ctx.moveTo(trail[i - 1].x * CW, trail[i - 1].y * CH)
      ctx.lineTo(trail[i].x * CW, trail[i].y * CH)
      ctx.stroke()
    }

    // Global max marker
    ctx.beginPath()
    ctx.arc(GLOBAL.x * CW, GLOBAL.y * CH, 5, 0, Math.PI * 2)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    // Current dot
    ctx.beginPath()
    ctx.arc(sa.x * CW, sa.y * CH, 8, 0, Math.PI * 2)
    ctx.fillStyle = COLOR
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  function doStep() {
    const sa = saRef.current
    const rng = rngRef.current
    const stepN = stepSizePx / CW // normalised step
    const nx = Math.max(0, Math.min(1, sa.x + randn(rng) * stepN))
    const ny = Math.max(0, Math.min(1, sa.y + randn(rng) * stepN))

    const curV = landscape(sa.x, sa.y)
    const newV = landscape(nx, ny)
    const delta = newV - curV
    let accepted = false
    let annText = ''

    if (delta > 0) {
      accepted = true; annText = '✓ Better'
    } else if (sa.T > 0.001 && Math.random() < Math.exp(delta / sa.T)) {
      accepted = true; annText = '✓ Accepted (worse)'
    } else {
      annText = '✗ Rejected'
    }

    if (accepted) { sa.x = nx; sa.y = ny }

    // Keep trail of last 20
    sa.trail = [...sa.trail.slice(-19), { x: sa.x, y: sa.y }]
    sa.T = sa.T * COOL_RATES[coolKey]
    sa.iter += 1

    const canvas = canvasRef.current
    if (canvas) drawFrame(canvas.getContext('2d'), sa)

    // Annotation
    const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 }
    setAnnotation({
      text: annText,
      sx: sa.x, sy: sa.y,
      color: annText.startsWith('✓ Better') ? '#10B981'
        : annText.startsWith('✓ Acc') ? '#F59E0B' : '#F43F5E',
    })
    setTimeout(() => setAnnotation(null), 500)

    setChartData(prev => [...prev, { iter: sa.iter, fitness: Math.round(landscape(sa.x, sa.y) * 1000) / 1000 }])
    forceRender(n => n + 1)

    timerRef.current = setTimeout(doStep, DELAYS[speedKey])
  }

  function handlePlay() {
    if (status === 'idle') {
      saRef.current = { x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.4, T: initTemp, trail: [], iter: 0 }
      rngRef.current = makeLcg(Date.now() & 0xffffffff)
      setChartData([])
    }
    setStatus('running')
    timerRef.current = setTimeout(doStep, DELAYS[speedKey])
  }

  function handlePause() { clearTimeout(timerRef.current); setStatus('paused') }

  function handleReset() {
    clearTimeout(timerRef.current)
    saRef.current = { x: 0.5, y: 0.5, T: initTemp, trail: [], iter: 0 }
    setChartData([]); setAnnotation(null); setStatus('idle')
    const canvas = canvasRef.current
    if (canvas && imgDataRef.current) {
      const ctx = canvas.getContext('2d')
      ctx.putImageData(imgDataRef.current, 0, 0)
    }
    forceRender(n => n + 1)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const sa = saRef.current
  const tempPct = Math.min(1, sa.T / initTemp)
  const tempHue = Math.round(tempPct * 0) + (1 - tempPct) * 240 // red→blue
  const tempColor = `hsl(${Math.round((1 - tempPct) * 240)},80%,55%)`

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-secondary leading-relaxed">
        Simulated Annealing searches a 2D heatmap of five Gaussian peaks. The dot
        accepts worse moves with probability e^(−δ/T), allowing it to escape local
        optima. Watch the temperature gauge cool as the run progresses.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Initial temperature
          <input type="range" min="0.5" max="2.0" step="0.1" value={initTemp}
            onChange={e => setInitTemp(Number(e.target.value))}
            disabled={status === 'running'} className="w-28" />
          <span>{initTemp.toFixed(1)}</span>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Cooling rate
          <select value={coolKey} onChange={e => setCoolKey(e.target.value)}
            disabled={status === 'running'}
            className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-primary">
            <option>Slow</option><option>Medium</option><option>Fast</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Step size
          <input type="range" min="15" max="80" value={stepSizePx}
            onChange={e => setStepSizePx(Number(e.target.value))}
            disabled={status === 'running'} className="w-24" />
          <span>{stepSizePx}px</span>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Speed
          <select value={speedKey} onChange={e => setSpeedKey(e.target.value)}
            className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-primary">
            <option>Slow</option><option>Medium</option><option>Fast</option>
          </select>
        </label>
        <div className="flex gap-2 ml-auto">
          {status !== 'running' && (
            <button onClick={handlePlay}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: COLOR }}>
              {status === 'paused' ? 'Resume' : 'Play'}
            </button>
          )}
          {status === 'running' && (
            <button onClick={handlePause}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-secondary hover:bg-surface">
              Pause
            </button>
          )}
          <button onClick={handleReset}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-secondary hover:bg-surface">
            Reset
          </button>
        </div>
      </div>

      {/* Canvas + temperature gauge */}
      <div className="flex gap-3 items-start">
        <div className="relative flex-1">
          <canvas ref={canvasRef}
            className="rounded-xl border border-border w-full"
            style={{ maxWidth: CW, display: 'block' }}
            role="img" aria-label="2D fitness heatmap with SA dot" />
          {/* Annotation */}
          {annotation && (
            <div className="absolute pointer-events-none text-xs font-bold px-2 py-0.5 rounded"
              style={{
                left: `${annotation.sx * 100}%`,
                top: `${annotation.sy * 100}%`,
                transform: 'translate(12px,-50%)',
                color: annotation.color,
                background: 'var(--card)',
                border: `1px solid ${annotation.color}`,
              }}>
              {annotation.text}
            </div>
          )}
        </div>

        {/* Temperature gauge */}
        <div className="flex flex-col items-center gap-1 shrink-0" style={{ height: CH }}>
          <span className="text-xs text-muted">T={sa.T.toFixed(2)}</span>
          <div className="flex-1 w-6 bg-surface rounded-full overflow-hidden relative border border-border">
            <div className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-200"
              style={{ height: `${tempPct * 100}%`, backgroundColor: tempColor }} />
          </div>
          <span className="text-xs text-muted">0</span>
        </div>
      </div>

      {/* Convergence chart */}
      {chartData.length > 1 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Fitness over iterations</p>
          <div className="bg-surface rounded-xl p-3" style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="iter" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} width={40} />
                <Tooltip contentStyle={{ fontSize: 12, background: 'var(--card)', border: '1px solid var(--border)' }} />
                <ReferenceLine y={GLOBAL.v} stroke="#F59E0B" strokeDasharray="4 3" />
                <Line type="monotone" dataKey="fitness" stroke={COLOR}
                  dot={false} strokeWidth={2} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted mt-1 text-right">
            Dashed line = global optimum ({GLOBAL.v.toFixed(2)})
          </p>
        </div>
      )}

      {/* Stats */}
      {sa.iter > 0 && (
        <div className="flex gap-4 flex-wrap text-sm text-secondary">
          <span>Iteration: <strong className="text-primary">{sa.iter}</strong></span>
          <span>Current fitness: <strong className="text-primary">{landscape(sa.x, sa.y).toFixed(3)}</strong></span>
          <span>Temperature: <strong className="text-primary">{sa.T.toFixed(3)}</strong></span>
        </div>
      )}
    </div>
  )
}
