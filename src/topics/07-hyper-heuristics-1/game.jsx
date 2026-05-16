import { useState, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLOR = '#F59E0B'
const N_EXAMS = 8
const N_SLOTS = 3
const N_STEPS = 15

// 10 students, each attending 3 of the 8 exams
const STUDENTS = [
  [0, 3, 6], [1, 4, 7], [0, 2, 5], [3, 5, 7], [1, 3, 6],
  [2, 4, 6], [0, 4, 7], [1, 5, 6], [2, 3, 7], [0, 1, 4],
]

function countClashes(asgn) {
  let c = 0
  for (const st of STUDENTS) {
    const s = st.map(e => asgn[e])
    for (let i = 0; i < s.length; i++)
      for (let j = i + 1; j < s.length; j++)
        if (s[i] === s[j]) c++
  }
  return c
}

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

function llhSwapRandom(a, rng) {
  const n = [...a]
  const i = Math.floor(rng() * N_EXAMS), j = Math.floor(rng() * N_EXAMS)
  const t = n[i]; n[i] = n[j]; n[j] = t; return n
}

function llhMoveConflict(a) {
  const ec = Array(N_EXAMS).fill(0)
  for (const st of STUDENTS) {
    const s = st.map(e => a[e])
    for (let i = 0; i < s.length; i++)
      for (let j = i + 1; j < s.length; j++)
        if (s[i] === s[j]) { ec[st[i]]++; ec[st[j]]++ }
  }
  const worst = ec.indexOf(Math.max(...ec))
  let bs = a[worst], bv = Infinity
  for (let sl = 0; sl < N_SLOTS; sl++) {
    const t = [...a]; t[worst] = sl
    const v = countClashes(t); if (v < bv) { bv = v; bs = sl }
  }
  const n = [...a]; n[worst] = bs; return n
}

function llhSwapPair(a) {
  let best = [...a], bv = countClashes(a)
  for (let i = 0; i < N_EXAMS; i++)
    for (let j = i + 1; j < N_EXAMS; j++) {
      const t = [...a]; const tmp = t[i]; t[i] = t[j]; t[j] = tmp
      const v = countClashes(t); if (v < bv) { bv = v; best = t }
    }
  return best
}

function llhLocalSearch(a, rng) {
  let cur = [...a], cv = countClashes(a)
  for (let i = 0; i < 8; i++) {
    const t = llhSwapRandom(cur, rng)
    const v = countClashes(t); if (v <= cv) { cur = t; cv = v }
  }
  return cur
}

function applyLLH(key, a, rng) {
  if (key === 'SwapRandom')   return llhSwapRandom(a, rng)
  if (key === 'MoveConflict') return llhMoveConflict(a)
  if (key === 'SwapPair')     return llhSwapPair(a)
  return llhLocalSearch(a, rng)
}

const LLHS = [
  { key: 'SwapRandom',   label: 'Swap Random',     desc: 'Pick two exams at random and swap their slots',    color: '#3B82F6' },
  { key: 'MoveConflict', label: 'Move Conflicted',  desc: 'Move the most-conflicted exam to its best slot',  color: '#8B5CF6' },
  { key: 'SwapPair',     label: 'Best Swap',        desc: 'Try all pairs — apply the swap that helps most',  color: '#10B981' },
  { key: 'LocalSearch',  label: 'Local Search',     desc: 'Apply 8 random swaps, keep any improvement',      color: '#F43F5E' },
]

function runGreedyHH(initAsgn, seed) {
  const rng = makeLcg(seed)
  let a = [...initAsgn]
  const hist = [countClashes(a)]
  for (let step = 0; step < N_STEPS; step++) {
    let bestA = a, bestV = countClashes(a)
    for (const h of LLHS) {
      const cand = applyLLH(h.key, a, rng)
      const v = countClashes(cand)
      if (v < bestV) { bestV = v; bestA = cand }
    }
    a = bestA
    hist.push(countClashes(a))
  }
  return hist
}

function runRandomHH(initAsgn, seed) {
  const rng = makeLcg(seed)
  let a = [...initAsgn]
  const hist = [countClashes(a)]
  for (let step = 0; step < N_STEPS; step++) {
    const key = LLHS[Math.floor(rng() * LLHS.length)].key
    const next = applyLLH(key, a, rng)
    if (countClashes(next) <= countClashes(a)) a = next
    hist.push(countClashes(a))
  }
  return hist
}

function initialAssignment(seed) {
  const rng = makeLcg(seed)
  return Array.from({ length: N_EXAMS }, () => Math.floor(rng() * N_SLOTS))
}

const SLOT_BORDER = ['#3B82F6', '#8B5CF6', '#10B981']
const SLOT_BG     = ['#3B82F618', '#8B5CF618', '#10B98118']

export default function Game() {
  const [phase, setPhase] = useState('config')
  const [assignment, setAssignment] = useState(null)
  const [history, setHistory] = useState([])
  const [step, setStep] = useState(0)
  const [lastLLH, setLastLLH] = useState(null)
  const [randomHist, setRandomHist] = useState([])
  const [greedyHist, setGreedyHist] = useState([])
  const rngRef = useRef(null)

  function handleStart() {
    const seed = Date.now() & 0xffff
    const asgn = initialAssignment(seed)
    rngRef.current = makeLcg(seed + 99)
    setAssignment(asgn)
    setHistory([countClashes(asgn)])
    setRandomHist(runRandomHH(asgn, seed + 999))
    setGreedyHist(runGreedyHH(asgn, seed + 999))
    setStep(0)
    setLastLLH(null)
    setPhase('playing')
  }

  function handleApply(key) {
    if (step >= N_STEPS) return
    const next = applyLLH(key, assignment, rngRef.current)
    const accepted = countClashes(next) <= countClashes(assignment)
    const newAsgn = accepted ? next : assignment
    setAssignment(newAsgn)
    setHistory(prev => [...prev, countClashes(newAsgn)])
    setLastLLH({ key, accepted })
    const newStep = step + 1
    setStep(newStep)
    if (newStep >= N_STEPS) setPhase('result')
  }

  function handleReset() {
    setPhase('config'); setAssignment(null); setHistory([]); setStep(0); setLastLLH(null)
  }

  const clashes = assignment ? countClashes(assignment) : 0
  const chartData = history.map((v, i) => ({ step: i, You: v, Random: randomHist[i] ?? null, Greedy: greedyHist[i] ?? null }))
  const slotGroups = Array.from({ length: N_SLOTS }, (_, s) =>
    Array.from({ length: N_EXAMS }, (_, e) => e).filter(e => assignment && assignment[e] === s)
  )

  return (
    <div className="mt-6 space-y-5">
      {phase === 'config' && (
        <div className="space-y-4">
          <div className="rounded-2xl px-4 py-3 flex items-start gap-2" style={{ background: COLOR + '12', border: `1px solid ${COLOR}30` }}>
            <span className="text-lg mt-0.5">🎯</span>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              You're the hyper-heuristic! Each step, pick a low-level heuristic to reduce student clashes — two exams a student must attend in the same slot. Beat the random selector over {N_STEPS} steps.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LLHS.map(h => (
              <div key={h.key} className="bg-surface rounded-xl p-4 border border-border">
                <p className="text-sm font-semibold mb-1" style={{ color: h.color }}>{h.label}</p>
                <p className="text-xs text-muted leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
          <button onClick={handleStart}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: COLOR }}>
            Start
          </button>
        </div>
      )}

      {(phase === 'playing' || phase === 'result') && assignment && (
        <div className="space-y-4">
          {/* Header stats */}
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-muted">Step</p>
              <p className="text-lg font-bold text-primary">{step} / {N_STEPS}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Clashes</p>
              <p className="text-lg font-bold" style={{ color: clashes === 0 ? COLOR : '#F43F5E' }}>{clashes}</p>
            </div>
            {lastLLH && (
              <div className="ml-auto text-right">
                <p className="text-xs text-muted">Last move</p>
                <p className="text-sm font-medium" style={{ color: LLHS.find(h => h.key === lastLLH.key)?.color }}>
                  {LLHS.find(h => h.key === lastLLH.key)?.label}
                  {' '}<span className={`text-xs ${lastLLH.accepted ? 'text-green-500' : 'text-muted'}`}>
                    {lastLLH.accepted ? '✓ accepted' : '✗ rejected'}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Timetable */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted mb-2">Current timetable</p>
            <div className="grid grid-cols-3 gap-2">
              {slotGroups.map((exams, s) => (
                <div key={s} className="rounded-xl border p-3"
                  style={{ borderColor: SLOT_BORDER[s], background: SLOT_BG[s] }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: SLOT_BORDER[s] }}>Slot {s + 1}</p>
                  <div className="flex flex-wrap gap-1">
                    {exams.map(e => (
                      <span key={e} className="text-xs bg-card px-2 py-0.5 rounded-lg font-mono text-primary border border-border">
                        E{e + 1}
                      </span>
                    ))}
                    {exams.length === 0 && <span className="text-xs text-muted italic">empty</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LLH buttons */}
          {phase === 'playing' && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Choose a heuristic</p>
              <div className="grid grid-cols-2 gap-2">
                {LLHS.map(h => (
                  <button key={h.key} onClick={() => handleApply(h.key)}
                    className="rounded-xl border p-3 text-left hover:opacity-80 transition-opacity"
                    style={{ borderColor: h.color, background: h.color + '18' }}>
                    <p className="text-xs font-semibold" style={{ color: h.color }}>{h.label}</p>
                    <p className="text-xs text-muted mt-0.5">{h.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chart */}
          {history.length > 1 && (
            <div className="bg-surface rounded-xl p-3" style={{ height: 180 }}>
              <p className="text-xs text-muted mb-1">Clashes over steps (lower = better)</p>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={chartData}>
                  <XAxis dataKey="step" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="You"    stroke={COLOR}   dot={false} strokeWidth={2}   isAnimationActive={false} />
                  <Line type="monotone" dataKey="Random" stroke="#A1A1AA" dot={false} strokeWidth={1.5} strokeDasharray="4 2" isAnimationActive={false} />
                  <Line type="monotone" dataKey="Greedy" stroke="#10B981" dot={false} strokeWidth={1.5} strokeDasharray="2 2" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Result */}
          {phase === 'result' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-surface p-4 space-y-3">
                <p className="text-xs text-muted uppercase tracking-widest text-center">Final clashes</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card rounded-xl p-3 text-center border border-border">
                    <p className="text-xs text-muted mb-1">You</p>
                    <p className="text-2xl font-bold" style={{ color: clashes === 0 ? '#10B981' : '#F43F5E' }}>{clashes}</p>
                  </div>
                  <div className="bg-card rounded-xl p-3 text-center border border-border">
                    <p className="text-xs text-muted mb-1">Random HH</p>
                    <p className="text-2xl font-bold text-primary">{randomHist[N_STEPS]}</p>
                  </div>
                  <div className="bg-card rounded-xl p-3 text-center border border-border">
                    <p className="text-xs text-muted mb-1">Greedy HH</p>
                    <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{greedyHist[N_STEPS]}</p>
                  </div>
                </div>
                <p className="text-sm text-secondary text-center">
                  {clashes < randomHist[N_STEPS]
                    ? 'You beat the random selector!'
                    : clashes === randomHist[N_STEPS] ? 'Tied with random selection.' : 'The random selector won this round.'}
                </p>
              </div>
              <div className="rounded-xl bg-surface border border-border p-4 space-y-3">
                <p className="text-xs uppercase tracking-widest text-muted">Algorithm vs Human</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card rounded-xl p-3 text-center border border-border">
                    <p className="text-xs text-muted mb-1">Greedy HH speed</p>
                    <p className="text-xl font-bold" style={{ color: '#10B981' }}>&lt; 1 ms</p>
                  </div>
                  <div className="bg-card rounded-xl p-3 text-center border border-border">
                    <p className="text-xs text-muted mb-1">Human (15 steps)</p>
                    <p className="text-xl font-bold text-primary">~2 min</p>
                  </div>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  The greedy HH evaluates all 4 low-level heuristics at each step and picks the best —
                  all 15 steps in under a millisecond. A human spends seconds per decision. Automated
                  hyper-heuristics can run 100,000 steps in the time you took to play 15.
                </p>
              </div>
            </div>
          )}

          <button onClick={handleReset}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-border text-secondary hover:bg-surface transition-colors">
            {phase === 'result' ? 'Play again' : 'Reset'}
          </button>
        </div>
      )}
    </div>
  )
}
