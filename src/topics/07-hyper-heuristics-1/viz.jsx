import { useEffect, useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLOR = '#F59E0B'
const N_EXAMS = 8
const N_SLOTS = 3
const STEPS = 60

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
  const n = [...a], i = Math.floor(rng() * N_EXAMS), j = Math.floor(rng() * N_EXAMS)
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
    const t = [...a]; t[worst] = sl; const v = countClashes(t); if (v < bv) { bv = v; bs = sl }
  }
  const n = [...a]; n[worst] = bs; return n
}
function llhSwapPair(a) {
  let best = [...a], bv = countClashes(a)
  for (let i = 0; i < N_EXAMS; i++) for (let j = i + 1; j < N_EXAMS; j++) {
    const t = [...a]; const tmp = t[i]; t[i] = t[j]; t[j] = tmp
    const v = countClashes(t); if (v < bv) { bv = v; best = t }
  }
  return best
}
function llhLocalSearch(a, rng) {
  let cur = [...a], cv = countClashes(a)
  for (let i = 0; i < 8; i++) { const t = llhSwapRandom(cur, rng); const v = countClashes(t); if (v <= cv) { cur = t; cv = v } }
  return cur
}

const LLH_KEYS = ['SwapRandom', 'MoveConflict', 'SwapPair', 'LocalSearch']
const LLH_COLORS = { SwapRandom: '#3B82F6', MoveConflict: '#8B5CF6', SwapPair: '#10B981', LocalSearch: '#F43F5E' }
const LLH_LABELS = { SwapRandom: 'Swap Random', MoveConflict: 'Move Conflict', SwapPair: 'Best Swap', LocalSearch: 'Local Search' }

function applyLLH(key, a, rng) {
  if (key === 'SwapRandom')   return llhSwapRandom(a, rng)
  if (key === 'MoveConflict') return llhMoveConflict(a)
  if (key === 'SwapPair')     return llhSwapPair(a)
  return llhLocalSearch(a, rng)
}

function initialAssignment(seed) {
  const rng = makeLcg(seed)
  return Array.from({ length: N_EXAMS }, () => Math.floor(rng() * N_SLOTS))
}

function runStrategies(seed) {
  const init = initialAssignment(seed)
  const rng1 = makeLcg(seed + 11)
  const rng2 = makeLcg(seed + 22)
  const rng3 = makeLcg(seed + 33)

  // Random: pick any LLH at random each step
  let aRand = [...init]
  const histRand = [countClashes(aRand)]
  const chosenRand = []
  for (let i = 0; i < STEPS; i++) {
    const key = LLH_KEYS[Math.floor(rng1() * LLH_KEYS.length)]
    const next = applyLLH(key, aRand, rng1)
    if (countClashes(next) <= countClashes(aRand)) aRand = next
    histRand.push(countClashes(aRand)); chosenRand.push(key)
  }

  // Greedy: evaluate all LLHs, apply whichever gives the best result
  let aGreedy = [...init]
  const histGreedy = [countClashes(aGreedy)]
  const chosenGreedy = []
  for (let i = 0; i < STEPS; i++) {
    let bestNext = aGreedy, bestVal = countClashes(aGreedy), bestKey = LLH_KEYS[0]
    for (const key of LLH_KEYS) {
      const next = applyLLH(key, aGreedy, rng2)
      const v = countClashes(next); if (v < bestVal) { bestVal = v; bestNext = next; bestKey = key }
    }
    aGreedy = bestNext
    histGreedy.push(countClashes(aGreedy)); chosenGreedy.push(bestKey)
  }

  // Roulette Reward: reinforce LLHs that improve the solution
  let aRL = [...init]
  const weights = Object.fromEntries(LLH_KEYS.map(k => [k, 1]))
  const histRL = [countClashes(aRL)]
  const chosenRL = []
  for (let i = 0; i < STEPS; i++) {
    const total = LLH_KEYS.reduce((s, k) => s + weights[k], 0)
    let r = rng3() * total, key = LLH_KEYS[0]
    for (const k of LLH_KEYS) { r -= weights[k]; if (r <= 0) { key = k; break } }
    const next = applyLLH(key, aRL, rng3)
    const improved = countClashes(next) < countClashes(aRL)
    if (countClashes(next) <= countClashes(aRL)) aRL = next
    weights[key] = Math.max(0.1, weights[key] * (improved ? 1.3 : 0.85))
    histRL.push(countClashes(aRL)); chosenRL.push(key)
  }

  return { histRand, histGreedy, histRL, chosenRand, chosenGreedy, chosenRL }
}

const STRATEGY_COLOR = { Random: '#A1A1AA', Greedy: '#3B82F6', Roulette: COLOR }

export default function Viz() {
  const [status, setStatus] = useState('idle')
  const [chartData, setChartData] = useState([])
  const [curStep, setCurStep] = useState(0)
  const [curChosen, setCurChosen] = useState(null)
  const [summary, setSummary] = useState(null)
  const timerRef = useRef(null)
  const resultsRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handleRun() {
    clearTimeout(timerRef.current)
    const res = runStrategies(Date.now() & 0xffff)
    resultsRef.current = res
    setChartData([]); setCurStep(0); setCurChosen(null); setSummary(null); setStatus('running')
    let idx = 0
    function tick() {
      if (idx > STEPS) {
        setStatus('done')
        setSummary([
          { label: 'Random',   value: res.histRand[STEPS],   color: STRATEGY_COLOR.Random },
          { label: 'Greedy',   value: res.histGreedy[STEPS], color: STRATEGY_COLOR.Greedy },
          { label: 'Roulette', value: res.histRL[STEPS],     color: STRATEGY_COLOR.Roulette },
        ].sort((a, b) => a.value - b.value))
        return
      }
      setChartData(prev => [...prev, { step: idx, Random: res.histRand[idx], Greedy: res.histGreedy[idx], Roulette: res.histRL[idx] }])
      if (idx > 0) setCurChosen({ Random: res.chosenRand[idx-1], Greedy: res.chosenGreedy[idx-1], Roulette: res.chosenRL[idx-1] })
      setCurStep(idx); idx++
      timerRef.current = setTimeout(tick, 60)
    }
    tick()
  }

  function handleReset() {
    clearTimeout(timerRef.current)
    setStatus('idle'); setChartData([]); setCurStep(0); setCurChosen(null); setSummary(null)
  }

  const strategies = [
    { key: 'Random',   label: 'Random Selection',  desc: 'Picks a LLH uniformly at random each step' },
    { key: 'Greedy',   label: 'Greedy',             desc: 'Evaluates all LLHs, applies the best outcome' },
    { key: 'Roulette', label: 'Roulette Reward',    desc: 'Reinforces LLHs that improved the solution' },
  ]

  const worstVal = summary ? Math.max(...summary.map(s => s.value), 1) : 1

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-secondary leading-relaxed">
        Three automated selection strategies compete on the same exam timetabling instance.
        Random picks any heuristic uniformly. Greedy evaluates all four and takes the best
        outcome. Roulette Reward learns — it reinforces LLHs that have improved the solution
        and reduces the weight of those that haven't.
      </p>

      {/* Strategy cards with live LLH indicator */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {strategies.map(({ key, label, desc }) => (
          <div key={key} className="bg-surface rounded-xl p-4 border-l-4"
            style={{ borderColor: STRATEGY_COLOR[key] }}>
            <p className="text-sm font-semibold mb-0.5" style={{ color: STRATEGY_COLOR[key] }}>{label}</p>
            <p className="text-xs text-muted leading-relaxed">{desc}</p>
            {curChosen && curChosen[key] && (
              <p className="text-xs mt-2 font-mono" style={{ color: LLH_COLORS[curChosen[key]] }}>
                → {LLH_LABELS[curChosen[key]]}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-surface rounded-xl p-3" style={{ height: 200 }}>
          <p className="text-xs text-muted mb-1">Clashes per step (lower = better)</p>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={chartData}>
              <XAxis dataKey="step" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Random"   stroke={STRATEGY_COLOR.Random}   dot={false} strokeWidth={1.5} strokeDasharray="4 2" isAnimationActive={false} />
              <Line type="monotone" dataKey="Greedy"   stroke={STRATEGY_COLOR.Greedy}   dot={false} strokeWidth={2}   isAnimationActive={false} />
              <Line type="monotone" dataKey="Roulette" stroke={STRATEGY_COLOR.Roulette} dot={false} strokeWidth={2}   isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {status !== 'idle' && (
        <p className="text-xs text-muted text-center">Step {curStep} / {STEPS}</p>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {status !== 'running' && (
          <button onClick={handleRun}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: COLOR }}>
            {status === 'idle' ? 'Run' : 'Run again'}
          </button>
        )}
        {status !== 'idle' && (
          <button onClick={handleReset}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-secondary hover:bg-surface">
            Reset
          </button>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="rounded-xl bg-surface p-4">
          <p className="text-xs uppercase tracking-widest text-muted mb-3">Final clashes (lower = better)</p>
          <div className="space-y-2">
            {summary.map((item, i) => {
              const pct = item.value === 0 ? 100 : Math.max(10, Math.round((1 - item.value / worstVal) * 90 + 10))
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-4">{i + 1}.</span>
                  <span className="text-sm font-medium w-20 shrink-0" style={{ color: item.color }}>{item.label}</span>
                  <div className="flex-1 h-2.5 bg-card rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: item.color }} />
                  </div>
                  <span className="text-sm font-mono text-primary w-8 text-right">{item.value}</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted mt-2">0 clashes = perfect timetable, no student conflicts</p>
        </div>
      )}
    </div>
  )
}
