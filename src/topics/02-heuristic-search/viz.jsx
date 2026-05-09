import { useState, useEffect, useRef, useCallback } from 'react'

const COLOR = '#3B82F6'
const SVG_W = 600
const SVG_H = 220
const PAD_X = 30
const PAD_Y = 20
const X_RANGE = [0, 40]  // domain
const N_POINTS = 400

const STEP_SIZES = { Small: 0.5, Medium: 2, Large: 6 }
const DELAYS = { Slow: 400, Medium: 150, Fast: 40 }

function f(x, offset = 0) {
  const t = x + offset
  return Math.sin(t) * 0.5 + Math.sin(2.3 * t) * 0.4 + Math.sin(3.7 * t) * 0.3
}

function buildCurve(offset) {
  const pts = []
  for (let i = 0; i < N_POINTS; i++) {
    const x = X_RANGE[0] + (i / (N_POINTS - 1)) * (X_RANGE[1] - X_RANGE[0])
    pts.push({ x, y: f(x, offset) })
  }
  return pts
}

// Find global maximum in domain
function findGlobalMax(offset) {
  let best = { x: 0, y: -Infinity }
  for (let i = 0; i < N_POINTS; i++) {
    const x = X_RANGE[0] + (i / (N_POINTS - 1)) * (X_RANGE[1] - X_RANGE[0])
    const y = f(x, offset)
    if (y > best.y) best = { x, y }
  }
  return best
}

function toSvgX(x) {
  return PAD_X + ((x - X_RANGE[0]) / (X_RANGE[1] - X_RANGE[0])) * (SVG_W - 2 * PAD_X)
}

function toSvgY(y) {
  // y in [-1.2, 1.2] → SVG_H - PAD_Y to PAD_Y
  return PAD_Y + ((1.2 - y) / 2.4) * (SVG_H - 2 * PAD_Y)
}

function curvePath(pts) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`).join(' ')
}

export default function Viz() {
  const [offset, setOffset] = useState(0)
  const [mode, setMode] = useState('Steepest Ascent')
  const [stepSizeKey, setStepSizeKey] = useState('Medium')
  const [speedKey, setSpeedKey] = useState('Medium')
  const [maxRestarts, setMaxRestarts] = useState(5)
  const [status, setStatus] = useState('idle')

  // Animation state in refs to avoid stale closures
  const stateRef = useRef({
    currentX: 0,
    currentPath: [],
    trails: [],
    localOptima: [],
    restartsUsed: 0,
    foundGlobal: false,
    curve: [],
    globalMax: { x: 0, y: 0 },
  })
  const timerRef = useRef(null)
  const [renderKey, setRenderKey] = useState(0) // trigger re-render

  const curve = buildCurve(offset)
  const globalMax = findGlobalMax(offset)
  const pathStr = curvePath(curve)

  const forceRender = () => setRenderKey(k => k + 1)

  function randomX() {
    return X_RANGE[0] + Math.random() * (X_RANGE[1] - X_RANGE[0])
  }

  const initState = useCallback(() => {
    const c = buildCurve(offset)
    const gmax = findGlobalMax(offset)
    const startX = randomX()
    stateRef.current = {
      currentX: startX,
      currentPath: [{ x: startX, y: f(startX, offset) }],
      trails: [],
      localOptima: [],
      restartsUsed: 0,
      foundGlobal: false,
      curve: c,
      globalMax: gmax,
    }
    forceRender()
  }, [offset])

  useEffect(() => {
    clearTimeout(timerRef.current)
    setStatus('idle')
    initState()
  }, [offset])

  function doStep() {
    const st = stateRef.current
    const stepSize = STEP_SIZES[stepSizeKey]
    const xL = st.currentX - stepSize
    const xR = st.currentX + stepSize
    const yC = f(st.currentX, offset)
    const yL = xL >= X_RANGE[0] ? f(xL, offset) : -Infinity
    const yR = xR <= X_RANGE[1] ? f(xR, offset) : -Infinity

    let nextX = null
    if (mode === 'Steepest Ascent') {
      if (yL > yC && yL >= yR) nextX = xL
      else if (yR > yC) nextX = xR
    } else {
      // First improvement
      if (yL > yC) nextX = xL
      else if (yR > yC) nextX = xR
    }

    if (nextX !== null) {
      // Move
      st.currentX = nextX
      st.currentPath.push({ x: nextX, y: f(nextX, offset) })
      // Check if near global max
      if (Math.abs(nextX - st.globalMax.x) < (X_RANGE[1] - X_RANGE[0]) * 0.05) {
        st.foundGlobal = true
      }
    } else {
      // Stuck — local optimum
      st.localOptima.push({ x: st.currentX, y: yC })
      st.trails.push([...st.currentPath])

      if (st.restartsUsed >= maxRestarts - 1) {
        setStatus('done')
        forceRender()
        return
      }
      st.restartsUsed += 1
      const newX = randomX()
      st.currentX = newX
      st.currentPath = [{ x: newX, y: f(newX, offset) }]
    }

    forceRender()
    timerRef.current = setTimeout(doStep, DELAYS[speedKey])
  }

  function handlePlay() {
    if (status === 'idle') initState()
    setStatus('running')
    timerRef.current = setTimeout(doStep, DELAYS[speedKey])
  }

  function handlePause() {
    clearTimeout(timerRef.current)
    setStatus('paused')
  }

  function handleReset() {
    clearTimeout(timerRef.current)
    setStatus('idle')
    initState()
  }

  function handleRegenerate() {
    clearTimeout(timerRef.current)
    setStatus('idle')
    setOffset(o => o + 5)
  }

  const st = stateRef.current
  const dotX = toSvgX(st.currentX)
  const dotY = toSvgY(f(st.currentX, offset))

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-secondary leading-relaxed">
        A dot climbs the function landscape step by step. When stuck at a local
        optimum, it restarts from a new random position. Trails show completed runs.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Mode
          <select
            value={mode}
            onChange={e => setMode(e.target.value)}
            disabled={status === 'running'}
            className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-primary"
          >
            <option>Steepest Ascent</option>
            <option>First Improvement</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Step size
          <select
            value={stepSizeKey}
            onChange={e => setStepSizeKey(e.target.value)}
            disabled={status === 'running'}
            className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-primary"
          >
            <option>Small</option>
            <option>Medium</option>
            <option>Large</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Speed
          <select
            value={speedKey}
            onChange={e => setSpeedKey(e.target.value)}
            className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-primary"
          >
            <option>Slow</option>
            <option>Medium</option>
            <option>Fast</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Max restarts
          <select
            value={maxRestarts}
            onChange={e => setMaxRestarts(Number(e.target.value))}
            disabled={status === 'running'}
            className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-primary"
          >
            {[3, 5, 7, 10].map(n => <option key={n}>{n}</option>)}
          </select>
        </label>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleRegenerate}
            disabled={status === 'running'}
            className="px-3 py-2 rounded-lg text-xs border border-border text-secondary hover:bg-surface transition-colors disabled:opacity-40"
          >
            Regenerate
          </button>
          {status !== 'running' && status !== 'done' && (
            <button
              onClick={handlePlay}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: COLOR }}
            >
              {status === 'paused' ? 'Resume' : 'Play'}
            </button>
          )}
          {status === 'running' && (
            <button
              onClick={handlePause}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-secondary hover:bg-surface"
            >
              Pause
            </button>
          )}
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-secondary hover:bg-surface"
          >
            Reset
          </button>
        </div>
      </div>

      {/* SVG landscape */}
      <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          style={{ maxHeight: SVG_H }}
          role="img"
          aria-label="1D function landscape with climbing dot"
        >
          {/* Axes */}
          <line x1={PAD_X} y1={SVG_H - PAD_Y} x2={SVG_W - PAD_X} y2={SVG_H - PAD_Y} stroke="var(--border)" strokeWidth="1" />
          <line x1={PAD_X} y1={PAD_Y} x2={PAD_X} y2={SVG_H - PAD_Y} stroke="var(--border)" strokeWidth="1" />

          {/* Trails */}
          {st.trails.map((trail, ti) => (
            <polyline
              key={ti}
              points={trail.map(p => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={COLOR}
              strokeWidth="1.5"
              opacity="0.2"
            />
          ))}

          {/* Current path */}
          {st.currentPath.length > 1 && (
            <polyline
              points={st.currentPath.map(p => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={COLOR}
              strokeWidth="2"
              opacity="0.9"
            />
          )}

          {/* Function curve */}
          <path d={pathStr} fill="none" stroke="var(--border)" strokeWidth="2" />

          {/* Global max star */}
          <text
            x={toSvgX(globalMax.x)}
            y={toSvgY(globalMax.y) - 6}
            textAnchor="middle"
            fontSize="16"
          >
            ⭐
          </text>

          {/* Local optima markers */}
          {st.localOptima.map((lo, i) => (
            <circle key={i} cx={toSvgX(lo.x)} cy={toSvgY(lo.y)} r="5" fill="#F43F5E" opacity="0.8" />
          ))}
          {st.localOptima.map((lo, i) => (
            <text key={`t${i}`} x={toSvgX(lo.x)} y={toSvgY(lo.y) - 8} textAnchor="middle" fontSize="8" fill="#F43F5E">
              local
            </text>
          ))}

          {/* Current dot */}
          {status !== 'idle' && (
            <circle cx={dotX} cy={dotY} r="7" fill={COLOR} stroke="#fff" strokeWidth="2" />
          )}

          {/* Found global label */}
          {st.foundGlobal && (
            <text x={dotX} y={dotY - 14} textAnchor="middle" fontSize="10" fill="#10B981" fontWeight="bold">
              Found it!
            </text>
          )}
        </svg>
      </div>

      {/* Stats */}
      <div className="flex gap-4 flex-wrap text-sm text-secondary">
        <span>Restarts used: <strong className="text-primary">{st.restartsUsed}</strong> / {maxRestarts}</span>
        <span>Local optima found: <strong className="text-primary">{st.localOptima.length}</strong></span>
        {status === 'done' && (
          <span className="font-medium" style={{ color: st.foundGlobal ? '#10B981' : '#F43F5E' }}>
            {st.foundGlobal ? 'Global optimum reached!' : 'Could not find global optimum'}
          </span>
        )}
      </div>
    </div>
  )
}
