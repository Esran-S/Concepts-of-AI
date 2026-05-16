import { useState } from 'react'

const COLOR = '#F43F5E'

function triMF(x, a, b, c) {
  if (x <= a || x >= c) return 0
  if (x <= b) return (x - a) / (b - a)
  return (c - x) / (c - b)
}

const FOOD_MF = {
  Bad:     x => triMF(x, -1, 0, 5),
  Average: x => triMF(x, 0, 5, 10),
  Good:    x => triMF(x, 5, 10, 11),
}
const SERVICE_MF = {
  Bad:     x => triMF(x, -1, 0, 5),
  Average: x => triMF(x, 0, 5, 10),
  Good:    x => triMF(x, 5, 10, 11),
}
const TIP_MF = {
  Low:    t => triMF(t, -1, 0, 15),
  Medium: t => triMF(t, 0, 15, 30),
  High:   t => triMF(t, 15, 30, 31),
}

const RULES = [
  { food: 'Bad',     service: 'Bad',     tip: 'Low' },
  { food: 'Bad',     service: 'Average', tip: 'Low' },
  { food: 'Bad',     service: 'Good',    tip: 'Medium' },
  { food: 'Average', service: 'Bad',     tip: 'Low' },
  { food: 'Average', service: 'Average', tip: 'Medium' },
  { food: 'Average', service: 'Good',    tip: 'High' },
  { food: 'Good',    service: 'Bad',     tip: 'Medium' },
  { food: 'Good',    service: 'Average', tip: 'High' },
  { food: 'Good',    service: 'Good',    tip: 'High' },
]

function computeFIS(food, service) {
  const fd = Object.fromEntries(Object.entries(FOOD_MF).map(([k, fn]) => [k, fn(food)]))
  const sd = Object.fromEntries(Object.entries(SERVICE_MF).map(([k, fn]) => [k, fn(service)]))
  const ruleActs = RULES.map(r => ({ ...r, strength: Math.min(fd[r.food], sd[r.service]) }))
  const tipAct = { Low: 0, Medium: 0, High: 0 }
  for (const r of ruleActs) tipAct[r.tip] = Math.max(tipAct[r.tip], r.strength)
  const N = 150
  let num = 0, den = 0
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * 30
    const agg = Math.max(
      Math.min(tipAct.Low, TIP_MF.Low(t)),
      Math.min(tipAct.Medium, TIP_MF.Medium(t)),
      Math.min(tipAct.High, TIP_MF.High(t))
    )
    num += t * agg; den += agg
  }
  const crispTip = den < 1e-6 ? 15 : num / den
  const dominantRule = ruleActs.reduce((best, r) => r.strength > best.strength ? r : best, ruleActs[0])
  return { crispTip, dominantRule, tipAct }
}

const TIP_COLOR = { Low: '#F43F5E', Medium: '#F59E0B', High: '#10B981' }

const SCENARIOS = [
  { food: 9.0, service: 9.0, emoji: '🌟', desc: 'Perfect evening — flawless food, attentive staff' },
  { food: 1.5, service: 1.0, emoji: '😤', desc: 'Cold soup, rude waiter, order completely wrong' },
  { food: 8.5, service: 2.5, emoji: '😕', desc: 'Incredible food — but waited 45 min and wrong drinks' },
  { food: 2.0, service: 9.0, emoji: '🙃', desc: 'Awful meal, but the most charming, helpful service' },
  { food: 5.0, service: 5.0, emoji: '😐', desc: 'Completely average in every single way' },
  { food: 7.5, service: 7.0, emoji: '😊', desc: 'Good food, solid service — a pleasant night out' },
  { food: 9.5, service: 3.5, emoji: '🍽️', desc: 'Gourmet quality food, but waiter forgot your drink twice' },
  { food: 1.0, service: 8.5, emoji: '🤷', desc: 'Inedible food, but the staff tried everything to fix it' },
]

function Stars({ value, max = 10 }) {
  const count = Math.round((value / max) * 5)
  return (
    <span>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= count ? '#F59E0B' : '#D1D5DB', fontSize: 18 }}>★</span>
      ))}
    </span>
  )
}

function ScoreStars({ points }) {
  return (
    <span>
      {[1, 2, 3].map(i => (
        <span key={i} style={{ color: i <= points ? '#F59E0B' : '#D1D5DB', fontSize: 16 }}>★</span>
      ))}
    </span>
  )
}

export default function Game() {
  const [scIdx, setScIdx] = useState(0)
  const [guess, setGuess] = useState(15)
  const [phase, setPhase] = useState('predict')
  const [scores, setScores] = useState([])
  const [done, setDone] = useState(false)

  const sc = SCENARIOS[scIdx]
  const { crispTip, dominantRule, tipAct } = computeFIS(sc.food, sc.service)
  const error = Math.abs(guess - crispTip)
  const points = error <= 2 ? 3 : error <= 5 ? 2 : error <= 9 ? 1 : 0

  function handleReveal() {
    setPhase('revealed')
  }

  function handleNext() {
    const newScores = [...scores, points]
    setScores(newScores)
    if (scIdx + 1 >= SCENARIOS.length) {
      setDone(true)
    } else {
      setScIdx(s => s + 1)
      setGuess(15)
      setPhase('predict')
    }
  }

  if (done) {
    const total = scores.reduce((a, b) => a + b, 0)
    const max = SCENARIOS.length * 3
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-xl bg-surface p-6 text-center space-y-2 border border-border">
          <p className="text-5xl">{total >= max * 0.8 ? '🏆' : total >= max * 0.5 ? '🎯' : '💡'}</p>
          <p className="text-2xl font-bold text-primary">{total} / {max} points</p>
          <p className="text-sm text-muted">
            {total >= max * 0.8
              ? 'Fuzzy expert! You intuitively balance overlapping rule activations.'
              : total >= max * 0.5
              ? 'Good instincts — the trade-off scenarios are the tricky ones.'
              : 'Fuzzy logic blends multiple rules simultaneously — it\'s not a simple average!'}
          </p>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          {SCENARIOS.map((s, i) => {
            const { crispTip: ct } = computeFIS(s.food, s.service)
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 text-xs ${i > 0 ? 'border-t border-border' : ''}`}>
                <span className="text-base">{s.emoji}</span>
                <span className="text-muted flex-1 truncate">{s.desc}</span>
                <span className="font-mono font-bold text-primary shrink-0">{ct.toFixed(1)}%</span>
                <span className="shrink-0"><ScoreStars points={scores[i] ?? 0} /></span>
              </div>
            )
          })}
        </div>

        <div className="rounded-xl bg-surface border border-border p-4 space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted">Algorithm vs Human</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-3 text-center border border-border">
              <p className="text-xs text-muted mb-1">9 rules computed</p>
              <p className="text-xl font-bold" style={{ color: COLOR }}>&lt; 0.1 ms</p>
            </div>
            <div className="bg-card rounded-xl p-3 text-center border border-border">
              <p className="text-xs text-muted mb-1">Human guessing</p>
              <p className="text-xl font-bold text-primary">~10 s</p>
            </div>
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            The FIS evaluates all 9 rules, clips tip membership functions, aggregates them,
            then computes the centroid defuzzification in microseconds — with no subjective bias.
            Deployed in real systems, fuzzy inference handles thousands of decisions per second.
          </p>
        </div>

        <button onClick={() => { setScIdx(0); setGuess(15); setPhase('predict'); setScores([]); setDone(false) }}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ backgroundColor: COLOR }}>
          Play again
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-5">
      {/* Progress */}
      <div className="flex justify-between text-xs text-muted">
        <span>Scenario <strong className="text-primary">{scIdx + 1}</strong> / {SCENARIOS.length}</span>
        <span>Points: <strong className="text-primary">{scores.reduce((a, b) => a + b, 0)}</strong> / {scIdx * 3}</span>
      </div>

      {/* Scenario card */}
      <div className="bg-surface rounded-2xl p-5 space-y-4 border border-border">
        <div className="text-center">
          <span className="text-5xl">{sc.emoji}</span>
          <p className="text-sm text-secondary mt-2 leading-relaxed">{sc.desc}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted mb-1">Food Quality</p>
            <Stars value={sc.food} />
            <p className="text-xs text-muted mt-0.5">{sc.food}/10</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Service</p>
            <Stars value={sc.service} />
            <p className="text-xs text-muted mt-0.5">{sc.service}/10</p>
          </div>
        </div>
      </div>

      {phase === 'predict' && (
        <div className="space-y-4">
          <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ background: COLOR + '12', border: `1px solid ${COLOR}30` }}>
            <span className="text-lg">🎯</span>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              What tip % would the fuzzy system calculate for this meal?
            </p>
          </div>

          <div className="bg-surface rounded-xl p-4 border border-border space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-muted">Your prediction</span>
              <span className="text-2xl font-bold" style={{ color: COLOR }}>{guess}%</span>
            </div>
            <input type="range" min="0" max="30" value={guess}
              onChange={e => setGuess(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs text-muted">
              <span>0% (no tip)</span>
              <span>15% (standard)</span>
              <span>30% (exceptional)</span>
            </div>
          </div>

          <button onClick={handleReveal}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: COLOR }}>
            Reveal FIS Answer
          </button>
        </div>
      )}

      {phase === 'revealed' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-xl p-4 text-center border border-border">
              <p className="text-xs text-muted mb-1">Your prediction</p>
              <p className="text-2xl font-bold text-primary">{guess}%</p>
            </div>
            <div className="bg-surface rounded-xl p-4 text-center border border-border">
              <p className="text-xs text-muted mb-1">FIS answer</p>
              <p className="text-2xl font-bold" style={{ color: COLOR }}>{crispTip.toFixed(1)}%</p>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-3 text-center border border-border">
            <p className="text-xs text-muted mb-1">Your error: ±{error.toFixed(1)}%</p>
            <p className="text-lg"><ScoreStars points={points} /></p>
            <p className="text-xs text-muted mt-0.5">
              {points === 3 ? 'Perfect! (within 2%)' : points === 2 ? 'Close! (within 5%)' : points === 1 ? 'Getting there (within 9%)' : 'Miss (off by more than 9%)'}
            </p>
          </div>

          {/* Dominant rule explanation */}
          <div className="bg-surface rounded-xl p-3 border border-border">
            <p className="text-xs text-muted mb-2">Strongest rule fired:</p>
            <p className="text-xs text-secondary">
              IF food is <span className="font-semibold" style={{ color: dominantRule.food === 'Good' ? '#10B981' : dominantRule.food === 'Average' ? '#F59E0B' : '#F43F5E' }}>{dominantRule.food}</span>
              {' '}AND service is <span className="font-semibold" style={{ color: dominantRule.service === 'Good' ? '#10B981' : dominantRule.service === 'Average' ? '#F59E0B' : '#F43F5E' }}>{dominantRule.service}</span>
              {' '}→ tip is <span className="font-semibold" style={{ color: TIP_COLOR[dominantRule.tip] }}>{dominantRule.tip}</span>
            </p>
            <div className="mt-2 flex gap-2">
              {Object.entries(tipAct).map(([label, val]) => (
                <div key={label} className="flex-1 text-center">
                  <div className="h-1.5 rounded-full bg-surface border border-border overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${val * 100}%`, backgroundColor: TIP_COLOR[label] }} />
                  </div>
                  <p className="text-xs text-muted mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleNext}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: COLOR }}>
            {scIdx + 1 >= SCENARIOS.length ? 'See results' : 'Next scenario →'}
          </button>
        </div>
      )}
    </div>
  )
}
