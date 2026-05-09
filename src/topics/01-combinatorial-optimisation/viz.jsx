import { useEffect, useRef, useState, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const COLOR = '#3B82F6'
const MARGIN = 50

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function totalDist(cities, route) {
  let d = 0
  for (let i = 0; i < route.length; i++) {
    d += dist(cities[route[i]], cities[route[(i + 1) % route.length]])
  }
  return d
}

function generateCities(count, w, h) {
  const cities = []
  for (let i = 0; i < count; i++) {
    cities.push({
      x: MARGIN + Math.random() * (w - MARGIN * 2),
      y: MARGIN + Math.random() * (h - MARGIN * 2),
    })
  }
  return cities
}

function nearestNeighbourSteps(cities) {
  const n = cities.length
  const visited = new Array(n).fill(false)
  const route = [0]
  visited[0] = true
  const steps = []

  for (let step = 0; step < n - 1; step++) {
    const current = route[route.length - 1]
    let nearest = -1
    let nearestDist = Infinity
    for (let j = 0; j < n; j++) {
      if (!visited[j]) {
        const d = dist(cities[current], cities[j])
        if (d < nearestDist) { nearestDist = d; nearest = j }
      }
    }
    visited[nearest] = true
    route.push(nearest)
    steps.push({ type: 'nn', route: route.slice() })
  }
  steps.push({ type: 'nn', route: route.slice() }) // close tour
  return steps
}

function twoOptSteps(cities, initRoute) {
  const n = initRoute.length
  let route = initRoute.slice()
  const steps = []
  let improved = true

  while (improved) {
    improved = false
    outer: for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue
        const a = route[i], b = route[i + 1]
        const c = route[j], d = route[(j + 1) % n]
        const before = dist(cities[a], cities[b]) + dist(cities[c], cities[d])
        const after  = dist(cities[a], cities[c]) + dist(cities[b], cities[d])
        if (after < before - 0.001) {
          // reverse segment i+1..j
          route = [
            ...route.slice(0, i + 1),
            ...route.slice(i + 1, j + 1).reverse(),
            ...route.slice(j + 1),
          ]
          steps.push({ type: '2opt', route: route.slice() })
          improved = true
          break outer
        }
      }
    }
  }
  return steps
}

function drawCanvas(ctx, cities, route, w, h) {
  ctx.clearRect(0, 0, w, h)

  // edges
  if (route.length > 1) {
    ctx.beginPath()
    ctx.strokeStyle = COLOR
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.7
    for (let i = 0; i < route.length; i++) {
      const c = cities[route[i]]
      const next = cities[route[(i + 1) % route.length]]
      if (i === 0) ctx.moveTo(c.x, c.y)
      else ctx.lineTo(c.x, c.y)
      ctx.lineTo(next.x, next.y)
      ctx.moveTo(next.x, next.y)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // cities
  cities.forEach((city, idx) => {
    ctx.beginPath()
    if (idx === 0) {
      // gold star start city
      ctx.arc(city.x, city.y, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#F59E0B'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      ctx.arc(city.x, city.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = COLOR
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  })
}

const DELAYS = { Slow: 600, Medium: 200, Fast: 60 }

export default function Viz() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const citiesRef = useRef([])
  const stepsRef = useRef([])
  const stepIdxRef = useRef(0)
  const timerRef = useRef(null)
  const routeRef = useRef([])

  const [cityCount, setCityCount] = useState(15)
  const [speed, setSpeed] = useState('Medium')
  const [algo, setAlgo] = useState('NN + 2-opt')
  const [status, setStatus] = useState('idle') // idle | running | paused | done
  const [costData, setCostData] = useState([])
  const [stats, setStats] = useState({ length: 0, saved: null, step: 0 })
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 380 })

  const initCanvas = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const w = Math.min(container.clientWidth, 600)
    const h = 380
    setCanvasSize({ w, h })
    citiesRef.current = generateCities(cityCount, w, h)
    routeRef.current = []
    stepsRef.current = []
    stepIdxRef.current = 0
    setCostData([])
    setStats({ length: 0, saved: null, step: 0 })
    setStatus('idle')

    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    drawCanvas(ctx, citiesRef.current, [], w, h)
  }, [cityCount])

  useEffect(() => {
    initCanvas()
    return () => clearTimeout(timerRef.current)
  }, [initCanvas])

  function buildSteps() {
    const nnSteps = nearestNeighbourSteps(citiesRef.current)
    const nnRoute = nnSteps[nnSteps.length - 1].route
    const optSteps = algo === 'NN + 2-opt' ? twoOptSteps(citiesRef.current, nnRoute) : []
    return [...nnSteps, ...optSteps]
  }

  function runNextStep() {
    const steps = stepsRef.current
    const idx = stepIdxRef.current
    if (idx >= steps.length) {
      setStatus('done')
      return
    }

    const step = steps[idx]
    routeRef.current = step.route
    stepIdxRef.current = idx + 1

    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      drawCanvas(ctx, citiesRef.current, step.route, canvasSize.w, canvasSize.h)
    }

    const len = totalDist(citiesRef.current, step.route)
    setCostData(prev => [...prev, { step: idx + 1, cost: Math.round(len) }])
    setStats(prev => {
      const saved = step.type === '2opt' && prev.nnLength
        ? Math.round((1 - len / prev.nnLength) * 100 * 10) / 10
        : prev.saved
      const nnLength = step.type === 'nn' && idx === steps.filter(s => s.type === 'nn').length - 1
        ? len
        : prev.nnLength
      return { length: len, saved, step: idx + 1, nnLength: nnLength ?? prev.nnLength }
    })

    const delay = DELAYS[speed]
    timerRef.current = setTimeout(runNextStep, delay)
  }

  function handlePlay() {
    if (status === 'idle') {
      stepsRef.current = buildSteps()
      stepIdxRef.current = 0
      setCostData([])
    }
    setStatus('running')
    timerRef.current = setTimeout(runNextStep, DELAYS[speed])
  }

  function handlePause() {
    clearTimeout(timerRef.current)
    setStatus('paused')
  }

  function handleReset() {
    clearTimeout(timerRef.current)
    initCanvas()
  }

  const nnCount = stepsRef.current.filter(s => s.type === 'nn').length
  const optCount = stepsRef.current.filter(s => s.type === '2opt').length

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-secondary leading-relaxed">
        Watch a Nearest Neighbour heuristic build a tour city by city, then see
        2-opt improvement swap edges to shorten it. The cost chart records every step.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Cities
          <input
            type="range" min={10} max={25} value={cityCount}
            onChange={e => setCityCount(Number(e.target.value))}
            disabled={status === 'running'}
            className="w-28"
          />
          <span>{cityCount}</span>
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted">
          Speed
          <select
            value={speed}
            onChange={e => setSpeed(e.target.value)}
            className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-primary"
          >
            <option>Slow</option>
            <option>Medium</option>
            <option>Fast</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted">
          Algorithm
          <select
            value={algo}
            onChange={e => setAlgo(e.target.value)}
            disabled={status === 'running'}
            className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-primary"
          >
            <option>Nearest Neighbour only</option>
            <option>NN + 2-opt</option>
          </select>
        </label>

        <div className="flex gap-2 ml-auto">
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

      {/* Canvas */}
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          className="rounded-xl border border-border bg-card w-full"
          style={{ maxWidth: '100%', display: 'block' }}
          role="img"
          aria-label="TSP route canvas"
        />
      </div>

      {/* Stats */}
      {stats.step > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface rounded-xl p-3 text-center">
            <p className="text-xs text-muted uppercase tracking-widest mb-1">Route length</p>
            <p className="text-lg font-bold text-primary">{Math.round(stats.length)}</p>
          </div>
          <div className="bg-surface rounded-xl p-3 text-center">
            <p className="text-xs text-muted uppercase tracking-widest mb-1">2-opt saved</p>
            <p className="text-lg font-bold text-primary">
              {stats.saved !== null ? `${stats.saved}%` : '—'}
            </p>
          </div>
          <div className="bg-surface rounded-xl p-3 text-center">
            <p className="text-xs text-muted uppercase tracking-widest mb-1">Steps</p>
            <p className="text-lg font-bold text-primary">{stats.step}</p>
          </div>
        </div>
      )}

      {/* Cost chart */}
      {costData.length > 1 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Cost over steps</p>
          <div className="bg-surface rounded-xl p-3" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={costData}>
                <XAxis dataKey="step" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={50} />
                <Tooltip
                  contentStyle={{ fontSize: 12, background: 'var(--card)', border: '1px solid var(--border)' }}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke={COLOR}
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="rounded-xl bg-surface p-4 text-center">
          <p className="text-sm font-medium text-primary">
            Complete! {nnCount} NN steps
            {optCount > 0 ? `, ${optCount} 2-opt improvements` : ''}.
          </p>
          {stats.saved !== null && (
            <p className="text-xs text-secondary mt-1">
              2-opt reduced tour length by {stats.saved}%
            </p>
          )}
        </div>
      )}
    </div>
  )
}
