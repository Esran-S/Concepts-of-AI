import { useState, useRef } from 'react'

const COLOR = '#10B981'
const POP_SIZE = 10
const ROUNDS = 8
const RANGE = [-10, 10]

function fitness(x) { return -(x * x) }  // max at x=0

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

function randn(rng) {
  return Math.sqrt(-2 * Math.log(rng() + 1e-10)) * Math.cos(2 * Math.PI * rng())
}
function clamp(x) { return Math.max(RANGE[0], Math.min(RANGE[1], x)) }

function initPopulation(seed) {
  const rng = makeLcg(seed)
  return Array.from({ length: POP_SIZE }, (_, i) => ({
    id: i,
    x: clamp(rng() * 20 - 10),
  }))
}

function runAutoGA(initPop, seed) {
  const rng = makeLcg(seed)
  let pop = initPop.map(p => ({ ...p }))
  let best = Math.max(...pop.map(p => fitness(p.x)))
  for (let g = 0; g < ROUNDS; g++) {
    const fits = pop.map(p => fitness(p.x))
    // Tournament selection × 2
    const sel = () => {
      const a = Math.floor(rng() * pop.length), b = Math.floor(rng() * pop.length)
      return fits[a] > fits[b] ? pop[a] : pop[b]
    }
    const p1 = sel(), p2 = sel()
    const childX = clamp((p1.x + p2.x) / 2 + randn(rng) * 0.8)
    const worstIdx = fits.indexOf(Math.min(...fits))
    if (fitness(childX) > fits[worstIdx]) {
      pop[worstIdx] = { id: pop[worstIdx].id, x: childX }
    }
    best = Math.max(best, Math.max(...pop.map(p => fitness(p.x))))
  }
  return best
}

const ITEM_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
]

function FitnessBar({ x }) {
  const fit = fitness(x)  // in [-100, 0]
  const pct = Math.max(0, (fit + 100) / 100 * 100)
  return (
    <div className="h-1.5 bg-surface rounded-full overflow-hidden border border-border">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLOR }} />
    </div>
  )
}

export default function Game() {
  const [phase, setPhase] = useState('intro')
  const [pop, setPop] = useState(null)
  const [selected, setSelected] = useState([])
  const [round, setRound] = useState(0)
  const [lastChild, setLastChild] = useState(null)
  const [bestFitness, setBestFitness] = useState(-Infinity)
  const [autoGABest, setAutoGABest] = useState(null)
  const [initPop, setInitPop] = useState(null)
  const rngRef = useRef(null)

  function handleStart() {
    const seed = Date.now() & 0xffff
    rngRef.current = makeLcg(seed + 99)
    const p = initPopulation(seed)
    setInitPop(p)
    setPop(p)
    setSelected([])
    setRound(0)
    setLastChild(null)
    setBestFitness(Math.max(...p.map(q => fitness(q.x))))
    setAutoGABest(null)
    setPhase('playing')
  }

  function handleSelect(id) {
    if (lastChild) return  // waiting for next round confirmation
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  function handleBreed() {
    if (selected.length < 2 || lastChild) return
    const p1 = pop.find(p => p.id === selected[0])
    const p2 = pop.find(p => p.id === selected[1])
    const midX = (p1.x + p2.x) / 2
    const mutation = randn(rngRef.current) * 0.8
    const childX = clamp(midX + mutation)
    setLastChild({ x: childX, midX, mutation, p1x: p1.x, p2x: p2.x })
  }

  function handleKeepChild() {
    if (!lastChild) return
    const fits = pop.map(p => fitness(p.x))
    const worstIdx = fits.indexOf(Math.min(...fits))
    const newPop = pop.map((p, i) => i === worstIdx ? { ...p, x: lastChild.x } : p)
    const newBest = Math.max(bestFitness, fitness(lastChild.x))
    const newRound = round + 1
    setPop(newPop)
    setBestFitness(newBest)
    setSelected([])
    setLastChild(null)
    setRound(newRound)
    if (newRound >= ROUNDS) {
      setAutoGABest(runAutoGA(initPop, Date.now() & 0xffff))
      setPhase('result')
    }
  }

  function handleSkipChild() {
    setLastChild(null)
    setSelected([])
    const newRound = round + 1
    setRound(newRound)
    if (newRound >= ROUNDS) {
      setAutoGABest(runAutoGA(initPop, Date.now() & 0xffff))
      setPhase('result')
    }
  }

  const stars = autoGABest !== null
    ? (bestFitness >= autoGABest - 1 ? 3 : bestFitness >= autoGABest - 10 ? 2 : 1)
    : 0

  return (
    <div className="mt-6 space-y-5">
      {phase === 'intro' && (
        <div className="space-y-4">
          <div className="rounded-2xl px-4 py-3 flex items-start gap-2" style={{ background: COLOR + '12', border: `1px solid ${COLOR}30` }}>
            <span className="text-lg mt-0.5">🧬</span>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              You're the selector! Pick 2 parents from the population to breed. The child replaces the weakest individual. Goal: drive the population toward x = 0 (f = 0).
            </p>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-xs text-secondary space-y-1">
            <p><span className="font-semibold text-primary">Fitness: f(x) = −x²</span> — maximum at x = 0.</p>
            <p>Bar length = fitness. Longer bars = better parents. Child = midpoint ± random mutation.</p>
          </div>
          <button onClick={handleStart}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: COLOR }}>
            Start — {ROUNDS} Breeding Rounds
          </button>
        </div>
      )}

      {phase === 'playing' && pop && (
        <div className="space-y-4">
          <div className="flex justify-between text-xs text-muted">
            <span>Round <strong className="text-primary">{round + 1}</strong> / {ROUNDS}</span>
            <span>Best fitness: <strong className="text-primary">{bestFitness.toFixed(2)}</strong></span>
          </div>

          {/* Population grid */}
          <div className="bg-surface rounded-xl p-4 border border-border space-y-2">
            <p className="text-xs text-muted uppercase tracking-widest mb-3">Population — select 2 parents</p>
            {pop.map((ind, i) => {
              const isSelected = selected.includes(ind.id)
              const isWorst = fitness(ind.x) === Math.min(...pop.map(p => fitness(p.x)))
              return (
                <div key={ind.id}
                  onClick={() => !lastChild && handleSelect(ind.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                    lastChild ? 'cursor-default' : 'hover:opacity-90'
                  }`}
                  style={{
                    borderColor: isSelected ? ITEM_COLORS[i % ITEM_COLORS.length] : 'var(--border)',
                    backgroundColor: isSelected ? ITEM_COLORS[i % ITEM_COLORS.length] + '18' : 'var(--card)',
                  }}>
                  <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: ITEM_COLORS[i % ITEM_COLORS.length] }}>
                    {isSelected ? (selected.indexOf(ind.id) + 1) : ''}
                  </div>
                  <span className="text-xs font-mono text-muted w-14 shrink-0">x = {ind.x.toFixed(2)}</span>
                  <div className="flex-1">
                    <FitnessBar x={ind.x} />
                  </div>
                  <span className="text-xs font-mono text-primary w-14 text-right shrink-0">
                    f = {fitness(ind.x).toFixed(1)}
                  </span>
                  {isWorst && <span className="text-xs text-muted">↗ weakest</span>}
                </div>
              )
            })}
          </div>

          {/* Child preview / breed button */}
          {!lastChild ? (
            <button onClick={handleBreed} disabled={selected.length < 2}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: COLOR }}>
              {selected.length < 2 ? `Select ${2 - selected.length} more parent${2 - selected.length === 1 ? '' : 's'}` : 'Breed selected parents →'}
            </button>
          ) : (
            <div className="bg-surface rounded-xl p-4 border border-border space-y-3">
              <p className="text-xs text-muted uppercase tracking-widest">New child</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-card rounded-lg p-2 border border-border">
                  <p className="text-muted">Parent 1</p>
                  <p className="font-mono font-bold text-primary">{lastChild.p1x.toFixed(2)}</p>
                </div>
                <div className="bg-card rounded-lg p-2 border border-border">
                  <p className="text-muted">Parent 2</p>
                  <p className="font-mono font-bold text-primary">{lastChild.p2x.toFixed(2)}</p>
                </div>
                <div className="rounded-lg p-2 border-2 border-green-400 bg-green-50 dark:bg-green-950">
                  <p className="text-muted">Child</p>
                  <p className="font-mono font-bold text-green-600">{lastChild.x.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-xs text-muted">
                Midpoint {lastChild.midX.toFixed(2)} + mutation {lastChild.mutation > 0 ? '+' : ''}{lastChild.mutation.toFixed(2)} = {lastChild.x.toFixed(2)}
                {' '}(f = {fitness(lastChild.x).toFixed(1)})
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleSkipChild}
                  className="py-2 rounded-xl text-sm border border-border text-secondary hover:bg-surface">
                  Discard
                </button>
                <button onClick={handleKeepChild}
                  className="py-2 rounded-xl text-sm text-white font-semibold"
                  style={{ backgroundColor: COLOR }}>
                  Replace weakest
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'result' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-surface p-6 text-center space-y-2 border border-border">
            <p className="text-5xl">{stars === 3 ? '🏆' : stars === 2 ? '🎯' : '💡'}</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-card rounded-xl p-3 border border-border">
                <p className="text-xs text-muted mb-1">Your best f(x)</p>
                <p className="text-2xl font-bold" style={{ color: COLOR }}>{bestFitness.toFixed(2)}</p>
              </div>
              <div className="bg-card rounded-xl p-3 border border-border">
                <p className="text-xs text-muted mb-1">Auto GA best</p>
                <p className="text-2xl font-bold text-primary">{autoGABest?.toFixed(2) ?? '–'}</p>
              </div>
            </div>
            <p className="text-xs text-muted">(Target: 0.00 — the global optimum)</p>
            <p className="text-sm text-muted mt-1">
              {stars === 3 ? 'Outstanding selection pressure! You kept the best parents.' :
               stars === 2 ? 'Good breeding strategy — the auto GA just had more consistency.' :
               'Picking the fittest parents every round leads to better convergence.'}
            </p>
          </div>

          <div className="rounded-xl bg-surface border border-border p-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted">Algorithm vs Human</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-xs text-muted mb-1">50 generations</p>
                <p className="text-xl font-bold" style={{ color: COLOR }}>&lt; 5 ms</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-xs text-muted mb-1">1M evaluations</p>
                <p className="text-xl font-bold" style={{ color: COLOR }}>&lt; 2 s</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-xs text-muted mb-1">Human (8 rounds)</p>
                <p className="text-xl font-bold text-primary">~3 min</p>
              </div>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              Real GAs run 500+ generations with populations of 100+ in milliseconds.
              Tournament selection, crossover, and mutation applied automatically at industrial
              scale — optimising car aerodynamics, drug molecules, and robot controllers.
            </p>
          </div>

          <button onClick={handleStart}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: COLOR }}>
            Play again
          </button>
        </div>
      )}
    </div>
  )
}
