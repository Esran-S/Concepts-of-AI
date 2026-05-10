import { useEffect, useRef, useState, useCallback } from 'react'

const COLOR = '#F43F5E'
const N = 80
const MAX_SPEED = 2.5
const MAX_FORCE = 0.15

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

function initBoids(W, H, seed) {
  const rng = makeLcg(seed)
  return Array.from({ length: N }, () => {
    const angle = rng() * Math.PI * 2
    return {
      x: rng() * W, y: rng() * H,
      vx: Math.cos(angle) * MAX_SPEED * 0.5,
      vy: Math.sin(angle) * MAX_SPEED * 0.5,
    }
  })
}

function limit(vx, vy, max) {
  const spd = Math.sqrt(vx * vx + vy * vy)
  if (spd > max) return [vx / spd * max, vy / spd * max]
  return [vx, vy]
}

function stepBoids(boids, W, H, params) {
  const { sepW, aliW, cohW, sepR, aliR, cohR } = params
  return boids.map((b, i) => {
    let sx = 0, sy = 0, sepN = 0
    let ax = 0, ay = 0, aliN = 0
    let cx = 0, cy = 0, cohN = 0

    for (let j = 0; j < boids.length; j++) {
      if (i === j) continue
      const o = boids[j]
      const dx = b.x - o.x, dy = b.y - o.y
      const d2 = dx * dx + dy * dy
      const d = Math.sqrt(d2)
      if (d < sepR && d > 0) { sx += dx / d / d; sy += dy / d / d; sepN++ }
      if (d < aliR) { ax += o.vx; ay += o.vy; aliN++ }
      if (d < cohR) { cx += o.x; cy += o.y; cohN++ }
    }

    let fsx = 0, fsy = 0
    if (sepN > 0) { const [x, y] = limit(sx, sy, MAX_FORCE); fsx = x * sepW; fsy = y * sepW }

    let fax = 0, fay = 0
    if (aliN > 0) {
      const [ax2, ay2] = limit(ax / aliN - b.vx, ay / aliN - b.vy, MAX_FORCE)
      fax = ax2 * aliW; fay = ay2 * aliW
    }

    let fcx = 0, fcy = 0
    if (cohN > 0) {
      const [cx2, cy2] = limit(cx / cohN - b.x, cy / cohN - b.y, MAX_FORCE)
      fcx = cx2 * cohW; fcy = cy2 * cohW
    }

    let [nvx, nvy] = limit(b.vx + fsx + fax + fcx, b.vy + fsy + fay + fcy, MAX_SPEED)
    if (Math.sqrt(nvx * nvx + nvy * nvy) < 0.5) {
      const spd = MAX_SPEED * 0.5, angle = Math.atan2(nvy, nvx)
      nvx = Math.cos(angle) * spd; nvy = Math.sin(angle) * spd
    }

    let nx = (b.x + nvx + W) % W
    let ny = (b.y + nvy + H) % H
    return { x: nx, y: ny, vx: nvx, vy: nvy }
  })
}

function drawBoids(ctx, boids, W, H) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#0f0f0f'
  ctx.fillRect(0, 0, W, H)

  boids.forEach(b => {
    const angle = Math.atan2(b.vy, b.vx)
    const size = 6
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(angle)
    // Hue based on angle for visual variety
    const hue = ((angle + Math.PI) / (Math.PI * 2) * 60 + 340) % 360
    ctx.fillStyle = `hsl(${hue}, 80%, 65%)`
    ctx.beginPath()
    ctx.moveTo(size, 0)
    ctx.lineTo(-size * 0.6, -size * 0.4)
    ctx.lineTo(-size * 0.6, size * 0.4)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  })
}

export default function Viz() {
  const canvasRef = useRef(null)
  const boidsRef = useRef(null)
  const rafRef = useRef(null)
  const paramsRef = useRef({ sepW: 1.5, aliW: 1.0, cohW: 0.8, sepR: 30, aliR: 60, cohR: 80 })
  const [status, setStatus] = useState('idle')
  const [params, setParams] = useState(paramsRef.current)

  const getWH = () => {
    const canvas = canvasRef.current
    return canvas ? [canvas.width, canvas.height] : [500, 360]
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.offsetWidth || 500
    canvas.width = W; canvas.height = 360
    boidsRef.current = initBoids(W, 360, 77)
    const ctx = canvas.getContext('2d')
    drawBoids(ctx, boidsRef.current, W, 360)
  }, [])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  function handleStart() {
    setStatus('running')
    const [W, H] = getWH()
    if (!boidsRef.current) boidsRef.current = initBoids(W, H, Date.now() & 0xffff)
    function tick() {
      boidsRef.current = stepBoids(boidsRef.current, W, H, paramsRef.current)
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) drawBoids(ctx, boidsRef.current, W, H)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function handlePause() {
    cancelAnimationFrame(rafRef.current)
    setStatus('paused')
  }

  function handleReset() {
    cancelAnimationFrame(rafRef.current)
    const [W, H] = getWH()
    boidsRef.current = initBoids(W, H, Date.now() & 0xffff)
    setStatus('idle')
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) drawBoids(ctx, boidsRef.current, W, H)
  }

  function updateParam(key, val) {
    const next = { ...paramsRef.current, [key]: val }
    paramsRef.current = next
    setParams(next)
  }

  const sliders = [
    { key: 'sepW', label: 'Separation', min: 0, max: 3, step: 0.1, desc: 'Avoid crowding' },
    { key: 'aliW', label: 'Alignment',  min: 0, max: 3, step: 0.1, desc: 'Match neighbour heading' },
    { key: 'cohW', label: 'Cohesion',   min: 0, max: 3, step: 0.1, desc: 'Steer toward group centre' },
  ]

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-secondary leading-relaxed">
        Boids: three local rules produce emergent flocking. Each agent steers to
        avoid crowding (separation), match neighbours' headings (alignment), and
        move toward the group centre (cohesion). Adjust the weights and watch the
        flock behaviour change in real time.
      </p>

      {/* Canvas */}
      <canvas ref={canvasRef}
        className="rounded-xl border border-border w-full block"
        role="img" aria-label="Boids flocking simulation" />

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        {status !== 'running' && (
          <button onClick={handleStart}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: COLOR }}>
            {status === 'idle' ? 'Start' : 'Resume'}
          </button>
        )}
        {status === 'running' && (
          <button onClick={handlePause}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-secondary hover:bg-surface">
            Pause
          </button>
        )}
        <button onClick={handleReset}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-secondary hover:bg-surface">
          Reset
        </button>
      </div>

      {/* Sliders */}
      <div className="bg-surface rounded-xl p-5 space-y-4">
        <p className="text-xs uppercase tracking-widest text-muted">Rule weights</p>
        {sliders.map(({ key, label, min, max, step, desc }) => (
          <label key={key} className="block space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-secondary font-medium">{label}<span className="text-muted font-normal ml-1">— {desc}</span></span>
              <span className="font-mono text-primary">{params[key].toFixed(1)}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={params[key]}
              onChange={e => updateParam(key, Number(e.target.value))} className="w-full" />
          </label>
        ))}
      </div>

      <div className="rounded-xl bg-surface p-4 text-xs text-muted leading-relaxed">
        <strong className="text-primary">Try this:</strong> set Separation to 0 and watch the flock
        collapse into a dense cluster. Set Alignment to 0 and the flock loses direction cohesion.
        Set Cohesion to 0 and agents drift apart, unable to reform groups.
        None of these behaviours is explicitly programmed — they emerge from the rule interactions.
      </div>
    </div>
  )
}
