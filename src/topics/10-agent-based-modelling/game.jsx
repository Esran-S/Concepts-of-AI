import { useEffect, useRef, useState, useCallback } from 'react'

const COLOR = '#F43F5E'
const N = 40
const CW = 500, CH = 360
const SPEED = 0.04
const R = 7

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

function initAgents(seed) {
  const rng = makeLcg(seed)
  const agents = Array.from({ length: N }, (_, i) => ({
    x: rng() * CW,
    y: rng() * CH,
    hero: rng() < 0.5,
    friend: 0,
    enemy: 0,
  }))
  // Assign unique friend and enemy (different from self and from each other)
  for (let i = 0; i < N; i++) {
    let f, e
    do { f = Math.floor(rng() * N) } while (f === i)
    do { e = Math.floor(rng() * N) } while (e === i || e === f)
    agents[i].friend = f
    agents[i].enemy = e
  }
  return agents
}

function stepAgents(agents) {
  const next = agents.map(a => ({ ...a }))
  for (let i = 0; i < N; i++) {
    const a = agents[i]
    const f = agents[a.friend]
    const e = agents[a.enemy]
    let tx, ty
    if (a.hero) {
      // Move between friend and enemy
      tx = (f.x + e.x) / 2
      ty = (f.y + e.y) / 2
    } else {
      // Move so friend is between self and enemy
      tx = 2 * f.x - e.x
      ty = 2 * f.y - e.y
    }
    const dx = tx - a.x, dy = ty - a.y
    next[i].x = Math.max(R, Math.min(CW - R, a.x + dx * SPEED))
    next[i].y = Math.max(R, Math.min(CH - R, a.y + dy * SPEED))
  }
  return next
}

function drawFrame(canvas, agents) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)

  // Background
  ctx.fillStyle = 'var(--surface, #1a1a1a)'
  ctx.fillRect(0, 0, CW, CH)

  // Draw relationships (faint lines)
  agents.forEach((a, i) => {
    const f = agents[a.friend]
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(f.x, f.y)
    ctx.strokeStyle = a.hero ? '#3B82F640' : '#F43F5E40'
    ctx.lineWidth = 0.5; ctx.stroke()
  })

  // Draw agents
  agents.forEach(a => {
    ctx.beginPath(); ctx.arc(a.x, a.y, R, 0, Math.PI * 2)
    ctx.fillStyle = a.hero ? '#3B82F6' : COLOR
    ctx.fill()
    ctx.beginPath(); ctx.arc(a.x, a.y, R, 0, Math.PI * 2)
    ctx.strokeStyle = a.hero ? '#93C5FD' : '#FDA4AF'
    ctx.lineWidth = 1.5; ctx.stroke()
  })
}

export default function Game() {
  const canvasRef = useRef(null)
  const agentsRef = useRef(null)
  const rafRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [step, setStep] = useState(0)

  const draw = useCallback(() => {
    if (canvasRef.current && agentsRef.current) {
      drawFrame(canvasRef.current, agentsRef.current)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CW; canvas.height = CH
    agentsRef.current = initAgents(42)
    draw()
  }, [draw])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  function handleStart() {
    if (status === 'idle') {
      agentsRef.current = initAgents(Date.now() & 0xffff)
      setStep(0)
    }
    setStatus('running')
    let s = step
    function tick() {
      agentsRef.current = stepAgents(agentsRef.current)
      s++
      setStep(s)
      draw()
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
    agentsRef.current = initAgents(Date.now() & 0xffff)
    setStep(0); setStatus('idle')
    draw()
  }

  const heroes = agentsRef.current?.filter(a => a.hero).length ?? 0

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-secondary leading-relaxed">
        Each agent is randomly assigned as a hero (blue) or coward (red), along with
        a friend and an enemy. Heroes move between their friend and enemy; cowards hide
        behind their friend. Watch the group self-organise from random noise.
      </p>

      {/* Legend */}
      <div className="flex gap-5 text-xs text-muted flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-400" />
          Heroes ({heroes}) — move between friend and enemy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: COLOR }} />
          Cowards ({N - heroes}) — hide behind friend
        </span>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef}
        className="rounded-xl border border-border w-full block"
        style={{ maxWidth: CW }}
        role="img" aria-label="Heroes and Cowards simulation" />

      {/* Step counter */}
      {status !== 'idle' && (
        <p className="text-xs text-muted text-center">Step {step}</p>
      )}

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
          New scenario
        </button>
      </div>

      <div className="rounded-xl bg-surface p-4 text-xs text-muted leading-relaxed">
        <strong className="text-primary">What to notice:</strong> Heroes tend to
        spread out and maintain distance (they're drawn toward the midpoint between
        two agents). Cowards cluster tightly, all seeking the same protective cover
        behind their friends — no agent knows the global pattern it is creating.
      </div>
    </div>
  )
}
