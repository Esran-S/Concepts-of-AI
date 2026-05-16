import { useEffect, useRef, useState, useCallback } from 'react'

const COLOR = '#F43F5E'
const N = 40
const CW = 500, CH = 360
const SPEED = 0.05
const R = 6
const SIM_STEPS = 250

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

function initAgents(seed, heroCount) {
  const rng = makeLcg(seed)
  const agents = Array.from({ length: N }, (_, i) => ({
    x: R + rng() * (CW - 2 * R),
    y: R + rng() * (CH - 2 * R),
    hero: i < heroCount,
    friend: 0,
    enemy: 0,
  }))
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
    const f = agents[a.friend], e = agents[a.enemy]
    let tx, ty
    if (a.hero) {
      tx = (f.x + e.x) / 2; ty = (f.y + e.y) / 2
    } else {
      tx = 2 * f.x - e.x; ty = 2 * f.y - e.y
    }
    const dx = tx - a.x, dy = ty - a.y
    next[i].x = Math.max(R, Math.min(CW - R, a.x + dx * SPEED))
    next[i].y = Math.max(R, Math.min(CH - R, a.y + dy * SPEED))
  }
  return next
}

function computeClusterScore(agents) {
  let sum = 0, count = 0
  for (let i = 0; i < agents.length; i++)
    for (let j = i + 1; j < agents.length; j++) {
      const dx = agents[i].x - agents[j].x, dy = agents[i].y - agents[j].y
      sum += Math.sqrt(dx * dx + dy * dy)
      count++
    }
  return sum / count
}

function runFull(seed, heroCount) {
  let agents = initAgents(seed, heroCount)
  for (let i = 0; i < SIM_STEPS; i++) agents = stepAgents(agents)
  return computeClusterScore(agents)
}

const MISSIONS = [
  { id: 0, goal: 'cluster', label: 'CLUSTER', emoji: '🎯', desc: 'Pack the agents as tightly together as possible.', hint: 'Cowards hide behind each other — they always cluster.' },
  { id: 1, goal: 'spread',  label: 'SPREAD',  emoji: '🌐', desc: 'Spread the agents across the field as widely as possible.', hint: 'Heroes move between two others — they keep more distance.' },
  { id: 2, goal: 'cluster', label: 'CLUSTER', emoji: '🎯', desc: 'Cluster them again — but now you know the secret.', hint: 'The more cowards, the tighter the cluster.' },
]

function drawAgents(canvas, agents) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const isDark = document.documentElement.classList.contains('dark')
  ctx.clearRect(0, 0, CW, CH)
  ctx.fillStyle = isDark ? '#1C1C1E' : '#F5F5F7'
  ctx.fillRect(0, 0, CW, CH)
  agents.forEach(a => {
    const f = agents[a.friend]
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(f.x, f.y)
    ctx.strokeStyle = a.hero ? '#3B82F630' : '#F43F5E30'
    ctx.lineWidth = 0.5; ctx.stroke()
  })
  agents.forEach(a => {
    ctx.beginPath(); ctx.arc(a.x, a.y, R, 0, Math.PI * 2)
    ctx.fillStyle = a.hero ? '#3B82F6' : COLOR
    ctx.fill()
    ctx.strokeStyle = a.hero ? '#93C5FD' : '#FDA4AF'
    ctx.lineWidth = 1.5; ctx.stroke()
  })
}

export default function Game() {
  const canvasRef = useRef(null)
  const agentsRef = useRef(null)
  const rafRef = useRef(null)
  const stepRef = useRef(0)

  const [missionIdx, setMissionIdx] = useState(0)
  const [heroCount, setHeroCount] = useState(20)
  const [phase, setPhase] = useState('config')  // config | running | result
  const [finalScore, setFinalScore] = useState(null)
  const [missionScores, setMissionScores] = useState([])
  const [done, setDone] = useState(false)

  const mission = MISSIONS[missionIdx]

  const draw = useCallback(() => {
    if (canvasRef.current && agentsRef.current) drawAgents(canvasRef.current, agentsRef.current)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CW; canvas.height = CH
    agentsRef.current = initAgents(42, heroCount)
    draw()
  }, [draw])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  function handleDeploy() {
    cancelAnimationFrame(rafRef.current)
    const seed = 42 + missionIdx * 17
    agentsRef.current = initAgents(seed, heroCount)
    stepRef.current = 0
    setPhase('running')

    function tick() {
      agentsRef.current = stepAgents(agentsRef.current)
      stepRef.current++
      draw()
      if (stepRef.current < SIM_STEPS) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        const avgDist = computeClusterScore(agentsRef.current)
        setFinalScore(avgDist)
        setPhase('result')
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function handleNext() {
    const seed = 42 + missionIdx * 17
    // Pre-compute baseline (50/50 mix) for comparison
    const baselineDist = runFull(seed, 20)
    const stars = getStars(mission.goal, finalScore, baselineDist)
    const newScores = [...missionScores, { stars, score: finalScore, baseline: baselineDist }]
    setMissionScores(newScores)

    if (missionIdx + 1 >= MISSIONS.length) {
      setDone(true)
    } else {
      setMissionIdx(m => m + 1)
      setHeroCount(20)
      setFinalScore(null)
      setPhase('config')
      // Reset canvas
      const seed2 = 42 + (missionIdx + 1) * 17
      agentsRef.current = initAgents(seed2, 20)
      draw()
    }
  }

  function getStars(goal, score, baseline) {
    if (goal === 'cluster') {
      // lower distance = better clustering
      if (score < baseline * 0.7) return 3
      if (score < baseline * 0.9) return 2
      return 1
    } else {
      // higher distance = better spreading
      if (score > baseline * 1.3) return 3
      if (score > baseline * 1.1) return 2
      return 1
    }
  }

  const seed = 42 + missionIdx * 17
  const baseline = runFull(seed, 20)
  const stars = finalScore !== null ? getStars(mission.goal, finalScore, baseline) : 0
  const totalStars = missionScores.reduce((s, m) => s + m.stars, 0)

  if (done) {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-xl bg-surface p-6 text-center space-y-2 border border-border">
          <p className="text-5xl">{totalStars >= 8 ? '🏆' : totalStars >= 5 ? '🎯' : '💡'}</p>
          <p className="text-2xl font-bold text-primary">{totalStars} / {MISSIONS.length * 3} stars</p>
          <p className="text-sm text-muted">
            {totalStars >= 8 ? 'Field Commander! You mastered hero vs coward dynamics.' :
             totalStars >= 5 ? 'Good intuition — you understand what drives clustering.' :
             'Emergence is subtle! More cowards = tighter clusters; more heroes = wider spread.'}
          </p>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          {MISSIONS.map((m, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 text-sm ${i > 0 ? 'border-t border-border' : ''}`}>
              <span>{m.emoji}</span>
              <span className="text-secondary flex-1">{m.label} mission</span>
              <span>{[1,2,3].map(s => <span key={s} style={{ color: s <= (missionScores[i]?.stars ?? 0) ? '#F59E0B' : '#D1D5DB' }}>★</span>)}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-surface border border-border p-4 space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted">Algorithm vs Human</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-3 text-center border border-border">
              <p className="text-xs text-muted mb-1">250 steps × 40 agents</p>
              <p className="text-xl font-bold" style={{ color: COLOR }}>&lt; 5 ms</p>
            </div>
            <div className="bg-card rounded-xl p-3 text-center border border-border">
              <p className="text-xs text-muted mb-1">Real simulation (1M agents)</p>
              <p className="text-xl font-bold text-primary">seconds</p>
            </div>
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            No agent knows the global pattern it helps create — each only follows two local rules.
            Real ABM systems simulate millions of agents (traffic, epidemics, crowds) where no
            central controller dictates the emergent result.
          </p>
        </div>
        <button onClick={() => { setMissionIdx(0); setHeroCount(20); setPhase('config'); setMissionScores([]); setFinalScore(null); setDone(false) }}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ backgroundColor: COLOR }}>
          Play again
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Mission header */}
      <div className="rounded-2xl px-4 py-3 flex items-start gap-2" style={{ background: COLOR + '12', border: `1px solid ${COLOR}30` }}>
        <span className="text-xl">{mission.emoji}</span>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Mission {missionIdx + 1}/{MISSIONS.length}: {mission.label}
          </p>
          <p className="text-xs text-muted mt-0.5">{mission.desc}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
          Heroes — move between friend &amp; enemy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLOR }} />
          Cowards — hide behind friend
        </span>
      </div>

      {/* Config panel */}
      {phase === 'config' && (
        <div className="bg-surface rounded-xl p-4 border border-border space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted">
              <span>Heroes vs Cowards</span>
              <span className="font-semibold text-primary">
                {heroCount} heroes · {N - heroCount} cowards
              </span>
            </div>
            <input type="range" min="0" max={N} value={heroCount}
              onChange={e => {
                const h = Number(e.target.value)
                setHeroCount(h)
                agentsRef.current = initAgents(seed, h)
                draw()
              }}
              className="w-full" />
            <div className="flex justify-between text-xs text-muted">
              <span>All cowards</span>
              <span>50/50</span>
              <span>All heroes</span>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 rounded-xl bg-card border border-border p-3 text-center">
              <span className="text-2xl">🔴</span>
              <p className="text-xs text-muted mt-1">{N - heroCount} cowards hide</p>
            </div>
            <div className="flex-1 rounded-xl bg-card border border-border p-3 text-center">
              <span className="text-2xl">🔵</span>
              <p className="text-xs text-muted mt-1">{heroCount} heroes interpose</p>
            </div>
          </div>

          <div className="text-xs text-secondary bg-card rounded-lg p-3 border border-border">
            <span className="font-medium">Hint:</span> {mission.hint}
          </div>

          <button onClick={handleDeploy}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: COLOR }}>
            Deploy — Run Simulation
          </button>
        </div>
      )}

      {/* Progress bar during simulation */}
      {phase === 'running' && (
        <div className="bg-surface rounded-xl p-3 border border-border">
          <p className="text-xs text-muted mb-2">Simulating {SIM_STEPS} steps…</p>
          <div className="h-1.5 bg-card rounded-full overflow-hidden">
            <div className="h-full rounded-full animate-pulse" style={{ width: '60%', backgroundColor: COLOR }} />
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef}
        className="rounded-xl border border-border w-full block"
        style={{ maxWidth: CW }} />

      {/* Result */}
      {phase === 'result' && finalScore !== null && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-surface rounded-xl p-3 border border-border">
              <p className="text-xs text-muted mb-1">Your avg distance</p>
              <p className="text-lg font-bold text-primary">{finalScore.toFixed(1)}</p>
            </div>
            <div className="bg-surface rounded-xl p-3 border border-border">
              <p className="text-xs text-muted mb-1">Baseline (50/50)</p>
              <p className="text-lg font-bold text-primary">{baseline.toFixed(1)}</p>
            </div>
            <div className="bg-surface rounded-xl p-3 border border-border">
              <p className="text-xs text-muted mb-1">Result</p>
              <p className="text-lg">{[1,2,3].map(s => <span key={s} style={{ color: s <= stars ? '#F59E0B' : '#D1D5DB' }}>★</span>)}</p>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-3 border border-border text-xs text-secondary">
            {mission.goal === 'cluster'
              ? finalScore < baseline
                ? `Your agents clustered ${Math.round((1 - finalScore / baseline) * 100)}% tighter than a random mix!`
                : `The 50/50 mix actually clustered better. Try using more cowards next time.`
              : finalScore > baseline
                ? `Your agents spread ${Math.round((finalScore / baseline - 1) * 100)}% wider than a random mix!`
                : `The 50/50 mix actually spread wider. Try using more heroes next time.`}
          </div>
          <button onClick={handleNext}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: COLOR }}>
            {missionIdx + 1 >= MISSIONS.length ? 'See final score' : 'Next mission →'}
          </button>
        </div>
      )}
    </div>
  )
}
