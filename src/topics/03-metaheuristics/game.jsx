import { useState, useRef, useEffect, useCallback } from 'react'

const COLOR = '#8B5CF6'
const STEPS = 100
const X_RANGE = [0, 40]
const N_POINTS = 400
const SVG_W = 560
const LAND_H = 180
const SCHED_H = 140
const PAD_X = 28
const PAD_Y = 16

// Same multi-peak function from Topic 02
function f(x) {
  return Math.sin(x) * 0.5 + Math.sin(2.3 * x) * 0.4 + Math.sin(3.7 * x) * 0.3
}

function buildCurve() {
  return Array.from({ length: N_POINTS }, (_, i) => {
    const x = X_RANGE[0] + (i / (N_POINTS - 1)) * (X_RANGE[1] - X_RANGE[0])
    return { x, y: f(x) }
  })
}

const CURVE = buildCurve()

function findGlobalMax() {
  return CURVE.reduce((best, p) => p.y > best.y ? p : best, CURVE[0])
}
const GLOBAL_MAX = findGlobalMax()

function toSvgX(x) {
  return PAD_X + ((x - X_RANGE[0]) / (X_RANGE[1] - X_RANGE[0])) * (SVG_W - 2 * PAD_X)
}
function toLandY(y) {
  return PAD_Y + ((1.2 - y) / 2.4) * (LAND_H - 2 * PAD_Y)
}
function toSchedX(step) {
  return PAD_X + (step / STEPS) * (SVG_W - 2 * PAD_X)
}
function toSchedY(t) {
  return PAD_Y + (1 - t) * (SCHED_H - 2 * PAD_Y)
}
function fromSchedX(svgX) {
  return Math.round(((svgX - PAD_X) / (SVG_W - 2 * PAD_X)) * STEPS)
}
function fromSchedY(svgY) {
  return 1 - (svgY - PAD_Y) / (SCHED_H - 2 * PAD_Y)
}

function linearSchedule() {
  return Array.from({ length: STEPS }, (_, i) => 1 - i / STEPS)
}

function smooth5(arr) {
  return arr.map((v, i) => {
    const vals = []
    for (let d = -2; d <= 2; d++) {
      const idx = Math.max(0, Math.min(STEPS - 1, i + d))
      vals.push(arr[idx])
    }
    return Math.max(0, Math.min(1, vals.reduce((a, b) => a + b, 0) / vals.length))
  })
}

function runSA(schedule, seed) {
  let s = seed
  const lcg = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
  const randn = () => {
    const u1 = lcg(), u2 = lcg()
    return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2)
  }

  let x = X_RANGE[0] + lcg() * (X_RANGE[1] - X_RANGE[0])
  const positions = [x]
  let bestFitness = f(x)

  for (let step = 0; step < STEPS; step++) {
    const T = schedule[step]
    const nx = Math.max(X_RANGE[0], Math.min(X_RANGE[1], x + randn() * 3))
    const delta = f(nx) - f(x)
    if (delta > 0 || (T > 0.001 && Math.random() < Math.exp(delta / T))) {
      x = nx
    }
    positions.push(x)
    bestFitness = Math.max(bestFitness, f(x))
  }
  return { positions, finalX: x, finalFitness: f(x), bestFitness }
}

export default function Game() {
  const schedSvgRef = useRef(null)
  const [schedule, setSchedule] = useState(null) // null = user hasn't drawn
  const [drawing, setDrawing] = useState(false)
  const drawBufRef = useRef([]) // raw drawn points [step, temp]
  const [showLinear, setShowLinear] = useState(true)
  const [speed, setSpeed] = useState('Medium')
  const [phase, setPhase] = useState('draw') // 'draw' | 'running' | 'result'
  const [dotX, setDotX] = useState(null)
  const [result, setResult] = useState(null)
  const timerRef = useRef(null)
  const positionsRef = useRef([])
  const stepRef = useRef(0)

  const linear = linearSchedule()
  const userSchedule = schedule || linear

  function getSvgCoords(e) {
    const svg = schedSvgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const svgX = ((clientX - rect.left) / rect.width) * SVG_W
    const svgY = ((clientY - rect.top) / rect.height) * SCHED_H
    return { svgX, svgY }
  }

  function onDrawStart(e) {
    e.preventDefault()
    drawBufRef.current = []
    setDrawing(true)
    const coords = getSvgCoords(e)
    if (coords) {
      const step = fromSchedX(coords.svgX)
      const temp = Math.max(0, Math.min(1, fromSchedY(coords.svgY)))
      drawBufRef.current.push({ step, temp })
    }
  }

  function onDrawMove(e) {
    e.preventDefault()
    if (!drawing) return
    const coords = getSvgCoords(e)
    if (!coords) return
    const step = Math.max(0, Math.min(STEPS - 1, fromSchedX(coords.svgX)))
    const temp = Math.max(0, Math.min(1, fromSchedY(coords.svgY)))
    drawBufRef.current.push({ step, temp })
  }

  function onDrawEnd(e) {
    e.preventDefault()
    setDrawing(false)
    if (drawBufRef.current.length < 2) return

    // Interpolate drawn points into STEPS-length schedule
    const buf = drawBufRef.current.slice().sort((a, b) => a.step - b.step)
    const raw = Array.from({ length: STEPS }, (_, i) => {
      const before = buf.filter(p => p.step <= i).pop()
      const after = buf.find(p => p.step >= i)
      if (!before) return after ? after.temp : 1
      if (!after) return before.temp
      const t = (i - before.step) / Math.max(1, after.step - before.step)
      return before.temp + t * (after.temp - before.temp)
    })
    setSchedule(smooth5(raw))
  }

  const handlePlay = useCallback(() => {
    clearTimeout(timerRef.current)
    const userResult = runSA(userSchedule, 12345)
    const linearResult = runSA(linear, 12345)
    positionsRef.current = userResult.positions
    stepRef.current = 0
    setPhase('running')

    const delays = { Slow: 80, Medium: 30, Fast: 8 }
    const delay = delays[speed]

    function animate() {
      const idx = stepRef.current
      if (idx >= positionsRef.current.length) {
        setPhase('result')
        setResult({ user: userResult, linear: linearResult })
        return
      }
      setDotX(positionsRef.current[idx])
      stepRef.current += 1
      timerRef.current = setTimeout(animate, delay)
    }
    animate()
  }, [userSchedule, speed])

  function handleReset() {
    clearTimeout(timerRef.current)
    setPhase('draw')
    setSchedule(null)
    setDotX(null)
    setResult(null)
    drawBufRef.current = []
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const schedPath = userSchedule.map((t, i) =>
    `${i === 0 ? 'M' : 'L'}${toSchedX(i).toFixed(1)},${toSchedY(t).toFixed(1)}`
  ).join(' ')

  const linearPath = linear.map((t, i) =>
    `${i === 0 ? 'M' : 'L'}${toSchedX(i).toFixed(1)},${toSchedY(t).toFixed(1)}`
  ).join(' ')

  const curvePath = CURVE.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${toSvgX(p.x).toFixed(1)},${toLandY(p.y).toFixed(1)}`
  ).join(' ')

  return (
    <div className="mt-6 space-y-5">
      <p className="text-sm text-secondary leading-relaxed">
        Draw a cooling schedule on the bottom panel, then watch the SA dot explore
        the landscape using your temperature curve. A good schedule explores widely
        at first and tightens gradually.
      </p>

      {/* Landscape panel */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted mb-2">Landscape</p>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <svg viewBox={`0 0 ${SVG_W} ${LAND_H}`} className="w-full"
            role="img" aria-label="Multi-peak fitness landscape">
            <path d={curvePath} fill="none" stroke="var(--border)" strokeWidth="2" />
            <text x={toSvgX(GLOBAL_MAX.x)} y={toLandY(GLOBAL_MAX.y) - 6}
              textAnchor="middle" fontSize="14">⭐</text>
            {dotX !== null && (
              <circle
                cx={toSvgX(dotX)} cy={toLandY(f(dotX))} r="7"
                fill={COLOR} stroke="#fff" strokeWidth="2"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Schedule editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-muted">
            {phase === 'draw' ? 'Draw your cooling schedule ↓' : 'Your cooling schedule'}
          </p>
          <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
            <input type="checkbox" checked={showLinear}
              onChange={e => setShowLinear(e.target.checked)} />
            Show linear reference
          </label>
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden touch-none">
          <svg
            ref={schedSvgRef}
            viewBox={`0 0 ${SVG_W} ${SCHED_H}`}
            className="w-full cursor-crosshair"
            role="img"
            aria-label="Cooling schedule editor"
            onMouseDown={onDrawStart}
            onMouseMove={onDrawMove}
            onMouseUp={onDrawEnd}
            onMouseLeave={onDrawEnd}
            onTouchStart={onDrawStart}
            onTouchMove={onDrawMove}
            onTouchEnd={onDrawEnd}
          >
            {/* Axes */}
            <line x1={PAD_X} y1={PAD_Y} x2={PAD_X} y2={SCHED_H - PAD_Y}
              stroke="var(--border)" strokeWidth="1" />
            <line x1={PAD_X} y1={SCHED_H - PAD_Y} x2={SVG_W - PAD_X} y2={SCHED_H - PAD_Y}
              stroke="var(--border)" strokeWidth="1" />
            <text x={PAD_X - 4} y={PAD_Y + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">1.0</text>
            <text x={PAD_X - 4} y={SCHED_H - PAD_Y + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">0</text>
            <text x={SVG_W - PAD_X} y={SCHED_H - PAD_Y + 12} textAnchor="end" fontSize="9" fill="var(--text-muted)">100 steps</text>

            {/* Linear reference */}
            {showLinear && (
              <path d={linearPath} fill="none" stroke="var(--text-muted)"
                strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
            )}
            {/* User / default schedule */}
            <path d={schedPath} fill="none" stroke={COLOR} strokeWidth="2.5" opacity="0.9" />

            {/* Draw hint */}
            {phase === 'draw' && !schedule && (
              <text x={SVG_W / 2} y={SCHED_H / 2} textAnchor="middle"
                fontSize="11" fill="var(--text-muted)">
                Click and drag to draw your schedule
              </text>
            )}
          </svg>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-xs text-muted">
          Speed
          <select value={speed} onChange={e => setSpeed(e.target.value)}
            disabled={phase === 'running'}
            className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-primary">
            <option>Slow</option>
            <option>Medium</option>
            <option>Fast</option>
          </select>
        </label>
        <div className="flex gap-2 ml-auto">
          {phase !== 'running' && (
            <button onClick={handlePlay}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: COLOR }}>
              {phase === 'result' ? 'Run again' : 'Play'}
            </button>
          )}
          <button onClick={handleReset}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-secondary hover:bg-surface transition-colors">
            Reset
          </button>
        </div>
      </div>

      {/* Result */}
      {phase === 'result' && result && (
        <div className="rounded-xl bg-surface p-5 space-y-4">
          <h3 className="text-sm font-semibold text-primary">Results</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <p className="text-xs text-muted uppercase tracking-widest mb-1">Your schedule</p>
              <p className="text-2xl font-bold text-primary">
                {result.user.bestFitness.toFixed(2)}
              </p>
              <p className="text-xs text-muted mt-1">best fitness found</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <p className="text-xs text-muted uppercase tracking-widest mb-1">Linear cooling</p>
              <p className="text-2xl font-bold text-primary">
                {result.linear.bestFitness.toFixed(2)}
              </p>
              <p className="text-xs text-muted mt-1">best fitness found</p>
            </div>
          </div>
          <p className="text-sm text-secondary">
            {result.user.bestFitness >= result.linear.bestFitness
              ? 'Your schedule matched or beat linear cooling. A slower early drop gives the dot more time to explore.'
              : `Linear cooling found a better result. Dropping temperature more gradually early on tends to help.`}
          </p>
          <p className="text-xs text-muted">
            Global optimum fitness: {GLOBAL_MAX.y.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  )
}
