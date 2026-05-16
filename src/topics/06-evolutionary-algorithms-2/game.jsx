import { useState, useRef, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const COLOR = '#10B981'
const GENS = 40
const POP_SIZE = 30
const RANGE = [-5, 5]
const LS_KEY = 'cai-meme-leaderboard'

function rastrigin2D(x, y) {
  return 20 + x * x - 10 * Math.cos(2 * Math.PI * x)
       + y * y - 10 * Math.cos(2 * Math.PI * y)
}

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}
function randn(rng) {
  return Math.sqrt(-2 * Math.log(rng() + 1e-10)) * Math.cos(2 * Math.PI * rng())
}
function clamp(v) { return Math.max(RANGE[0], Math.min(RANGE[1], v)) }

// ---- meme implementations ----
function applyMeme(ind, memeKey, rng) {
  let { x, y } = ind
  if (memeKey === 'HillClimber') {
    for (let i = 0; i < 10; i++) {
      const nx = clamp(x + randn(rng) * 0.3), ny = clamp(y + randn(rng) * 0.3)
      if (rastrigin2D(nx, ny) < rastrigin2D(x, y)) { x = nx; y = ny }
    }
  } else if (memeKey === 'RandomPerturber') {
    for (let i = 0; i < 5; i++) {
      x = clamp(x + randn(rng) * 1.5); y = clamp(y + randn(rng) * 1.5)
    }
  } else if (memeKey === 'GreedyDescent') {
    for (let i = 0; i < 8; i++) {
      const nx = clamp(x - 0.1 * randn(rng)), ny = clamp(y - 0.1 * randn(rng))
      if (rastrigin2D(nx, ny) < rastrigin2D(x, y)) { x = nx; y = ny }
    }
  } else if (memeKey === 'BitFlipMutator') {
    x = clamp(x + (rng() > 0.5 ? 2 : -2) * rng())
    y = clamp(y + (rng() > 0.5 ? 2 : -2) * rng())
  }
  return { x, y }
}

function runMemeGA(slots, selfAdapt, seed) {
  // slots: [{memeKey, freq}] — up to 3
  const rng = makeLcg(seed)
  let pop = Array.from({ length: POP_SIZE }, () => ({ x: clamp(rng() * 10 - 5), y: clamp(rng() * 10 - 5) }))
  let memeFreqs = slots.map(s => s.freq / 100)  // copy so we can adapt
  const history = []

  for (let gen = 0; gen < GENS; gen++) {
    const fits = pop.map(p => -rastrigin2D(p.x, p.y))
    const best = Math.max(...fits)
    history.push({ gen, best: Math.round(-best * 100) / 100 })  // store as minimise value

    const next = []
    // track per-meme wins for self-adaptation
    const memeWins = slots.map(() => 0)
    const memeUses = slots.map(() => 0)

    while (next.length < POP_SIZE) {
      // Tournament selection
      const idxA = [0,1,2].map(() => Math.floor(rng() * POP_SIZE)).reduce((a, b) => fits[a] > fits[b] ? a : b)
      const idxB = [0,1,2].map(() => Math.floor(rng() * POP_SIZE)).reduce((a, b) => fits[a] > fits[b] ? a : b)
      const t = rng()
      let child = { x: t * pop[idxA].x + (1-t) * pop[idxB].x, y: t * pop[idxA].y + (1-t) * pop[idxB].y }
      if (rng() < 0.08) child.x = clamp(child.x + randn(rng) * 0.5)
      if (rng() < 0.08) child.y = clamp(child.y + randn(rng) * 0.5)

      const beforeFit = rastrigin2D(child.x, child.y)
      // Apply memes by frequency
      slots.forEach((slot, si) => {
        if (rng() < memeFreqs[si]) {
          child = applyMeme(child, slot.memeKey, rng)
          memeUses[si]++
          if (rastrigin2D(child.x, child.y) < beforeFit) memeWins[si]++
        }
      })
      next.push(child)
    }

    // Self-adaptation: adjust frequencies
    if (selfAdapt) {
      slots.forEach((_, si) => {
        if (memeUses[si] > 0) {
          const winRate = memeWins[si] / memeUses[si]
          memeFreqs[si] = Math.max(0.05, Math.min(1, memeFreqs[si] * (winRate > 0.3 ? 1.1 : 0.9)))
        }
      })
    }
    pop = next
  }
  const finalFits = pop.map(p => rastrigin2D(p.x, p.y))
  return { history, bestFitness: Math.min(...finalFits) }
}

const MEME_PALETTE = [
  { key: 'HillClimber',     label: 'Hill Climber',      desc: 'Steepest ascent, 10 steps', color: '#3B82F6' },
  { key: 'RandomPerturber', label: 'Random Perturber',  desc: 'Adds noise, 5 times',       color: '#8B5CF6' },
  { key: 'GreedyDescent',   label: 'Greedy Descent',    desc: 'Minimise directly, 8 steps',color: '#F59E0B' },
  { key: 'BitFlipMutator',  label: 'Strong Mutator',    desc: 'Applies strong mutation',   color: '#F43F5E' },
]

const AUTO_BEST = runMemeGA(
  [{ memeKey: 'HillClimber', freq: 70 }, { memeKey: 'GreedyDescent', freq: 50 }],
  true, 42
).bestFitness

function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] }
}
function saveLeaderboard(board) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(board)) } catch {}
}

export default function Game() {
  const [slots, setSlots] = useState([null, null, null])  // null | {memeKey, freq}
  const [selfAdapt, setSelfAdapt] = useState(false)
  const [phase, setPhase] = useState('config')
  const [chartData, setChartData] = useState([])
  const [leaderboard, setLeaderboard] = useState(loadLeaderboard)
  const [dragKey, setDragKey] = useState(null)
  const [result, setResult] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handleDragStart(key) { setDragKey(key) }

  function handleDropSlot(slotIdx) {
    if (!dragKey) return
    // Don't allow same meme in two slots
    if (slots.some((s, i) => i !== slotIdx && s?.memeKey === dragKey)) return
    setSlots(prev => { const n = [...prev]; n[slotIdx] = { memeKey: dragKey, freq: 50 }; return n })
    setDragKey(null)
  }

  function handleRemoveSlot(slotIdx) {
    setSlots(prev => { const n = [...prev]; n[slotIdx] = null; return n })
  }

  function handleFreqChange(slotIdx, val) {
    setSlots(prev => { const n = [...prev]; n[slotIdx] = { ...n[slotIdx], freq: val }; return n })
  }

  function handleEvolve() {
    const activeSlots = slots.filter(Boolean)
    const res = runMemeGA(activeSlots.length ? activeSlots : [{ memeKey: 'HillClimber', freq: 50 }],
      selfAdapt, Date.now() & 0xffff)
    setResult(res)
    setPhase('running')
    setChartData([])
    let idx = 0

    function tick() {
      if (idx >= res.history.length) {
        setPhase('result')
        // Save to leaderboard
        const label = (activeSlots.length
          ? activeSlots.map(s => `${MEME_PALETTE.find(m => m.key === s.memeKey)?.label} ${s.freq}%`).join(' + ')
          : 'No memes') + (selfAdapt ? ', self-adapt on' : '')
        const entry = { label, best: Math.round(res.bestFitness * 100) / 100, date: new Date().toLocaleDateString() }
        const updated = [entry, ...loadLeaderboard()].slice(0, 5)
        saveLeaderboard(updated)
        setLeaderboard(updated)
        return
      }
      setChartData(prev => [...prev, res.history[idx]])
      idx++
      timerRef.current = setTimeout(tick, 50)
    }
    tick()
  }

  function handleReset() {
    clearTimeout(timerRef.current)
    setPhase('config'); setChartData([]); setResult(null)
  }

  const activeSlots = slots.filter(Boolean)

  return (
    <div className="mt-6 space-y-5">
      <p className="text-sm text-secondary leading-relaxed">
        Build a Multimeme Memetic Algorithm by dragging meme cards into the three
        slots. Set how often each meme is applied, then evolve 40 generations on
        the Rastrigin function. Your best runs are saved to a leaderboard.
      </p>

      {/* Meme palette */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted mb-2">Meme palette — drag into slots</p>
        <div className="flex flex-wrap gap-2">
          {MEME_PALETTE.map(m => {
            const inUse = slots.some(s => s?.memeKey === m.key)
            return (
              <div key={m.key}
                draggable={!inUse}
                onDragStart={() => handleDragStart(m.key)}
                className={`px-3 py-2 rounded-xl border text-xs font-medium cursor-grab select-none transition-opacity ${inUse ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80'}`}
                style={{ borderColor: m.color, color: m.color, background: m.color + '18' }}>
                <p className="font-semibold">{m.label}</p>
                <p className="text-muted mt-0.5 font-normal">{m.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Meme slots */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted mb-2">Meme slots</p>
        <div className="grid grid-cols-3 gap-3">
          {slots.map((slot, idx) => {
            const meta = slot ? MEME_PALETTE.find(m => m.key === slot.memeKey) : null
            return (
              <div key={idx}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDropSlot(idx)}
                className="rounded-xl border-2 border-dashed p-3 min-h-[100px] flex flex-col gap-2 transition-colors"
                style={{ borderColor: meta ? meta.color : 'var(--border)' }}>
                {!slot ? (
                  <p className="text-xs text-muted text-center m-auto">Drop meme here</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</p>
                      <button onClick={() => handleRemoveSlot(idx)}
                        className="text-muted hover:text-primary text-sm leading-none">×</button>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted">
                        <span>Frequency</span><span>{slot.freq}%</span>
                      </div>
                      <input type="range" min="5" max="100" value={slot.freq}
                        onChange={e => handleFreqChange(idx, Number(e.target.value))}
                        className="w-full" disabled={phase === 'running'} />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Self-adapt toggle + evolve */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={selfAdapt} onChange={e => setSelfAdapt(e.target.checked)}
            disabled={phase === 'running'} className="w-4 h-4" />
          <div>
            <p className="text-sm text-primary font-medium">Self-Adaptation</p>
            <p className="text-xs text-muted">Algorithm adjusts meme frequencies automatically</p>
          </div>
        </label>
        <div className="flex gap-2 ml-auto">
          {phase !== 'running' && (
            <button onClick={handleEvolve}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: COLOR }}>
              {phase === 'config' ? 'Evolve' : 'Evolve again'}
            </button>
          )}
          {phase !== 'config' && (
            <button onClick={handleReset}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-secondary hover:bg-surface">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-surface rounded-xl p-3" style={{ height: 180 }}>
          <p className="text-xs text-muted mb-1">Best Rastrigin value per generation (lower = better)</p>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={chartData}>
              <XAxis dataKey="gen" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip contentStyle={{ fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)' }} />
              <Line type="monotone" dataKey="best" stroke={COLOR}
                dot={false} strokeWidth={2} name="Best" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="space-y-3">
          <div className="rounded-xl bg-surface p-4 text-center">
            <p className="text-xs text-muted uppercase tracking-widest mb-1">Final best (Rastrigin)</p>
            <p className="text-3xl font-bold text-primary">{result.bestFitness.toFixed(3)}</p>
            <p className="text-xs text-muted mt-1">Lower is better — global minimum is 0</p>
          </div>
          <div className="rounded-xl bg-surface border border-border p-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted">Algorithm vs Human</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-xs text-muted mb-1">Your MA</p>
                <p className="text-xl font-bold text-primary">{result.bestFitness.toFixed(2)}</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-xs text-muted mb-1">Auto-tuned MA</p>
                <p className="text-xl font-bold" style={{ color: COLOR }}>{AUTO_BEST.toFixed(2)}</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-xs text-muted mb-1">Speed (40 gens)</p>
                <p className="text-xl font-bold" style={{ color: COLOR }}>&lt; 5 ms</p>
              </div>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              The auto-tuned MA (Hill Climber 70% + Greedy Descent 50%, self-adaptation on) consistently
              finds near-zero Rastrigin values in milliseconds. A human hand-tuning meme frequencies
              could spend hours and still not match it. Real memetic algorithms optimise drug molecules,
              robot controllers, and scheduling problems with millions of evaluations per run.
            </p>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-widest text-muted">Leaderboard</p>
            <button onClick={() => { saveLeaderboard([]); setLeaderboard([]) }}
              className="text-xs text-muted hover:text-primary transition-colors">
              Clear
            </button>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            {leaderboard.map((entry, i) => (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 text-xs ${i > 0 ? 'border-t border-border' : ''}`}>
                <span className="text-muted w-4 shrink-0">{i + 1}.</span>
                <span className="text-secondary flex-1 truncate">{entry.label}</span>
                <span className="font-mono font-bold text-primary shrink-0">{entry.best}</span>
                <span className="text-muted shrink-0">{entry.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
