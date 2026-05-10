import { useState } from 'react'

const COLOR = '#F43F5E'

// Triangular membership function
function triMF(x, a, b, c) {
  if (x <= a || x >= c) return 0
  if (x <= b) return (x - a) / (b - a)
  return (c - x) / (c - b)
}

// Membership functions: Food quality [0,10]
const FOOD_MF = {
  Bad:     x => triMF(x, -1, 0, 5),
  Average: x => triMF(x, 0, 5, 10),
  Good:    x => triMF(x, 5, 10, 11),
}
// Membership functions: Service quality [0,10]
const SERVICE_MF = {
  Bad:     x => triMF(x, -1, 0, 5),
  Average: x => triMF(x, 0, 5, 10),
  Good:    x => triMF(x, 5, 10, 11),
}
// Membership functions: Tip [0,30]
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

const MF_COLOR = { Bad: '#F43F5E', Average: '#F59E0B', Good: '#10B981' }
const TIP_COLOR = { Low: '#F43F5E', Medium: '#F59E0B', High: '#10B981' }

function computeFIS(food, service) {
  const fd = Object.fromEntries(Object.entries(FOOD_MF).map(([k, fn]) => [k, fn(food)]))
  const sd = Object.fromEntries(Object.entries(SERVICE_MF).map(([k, fn]) => [k, fn(service)]))
  const ruleActs = RULES.map(r => ({ ...r, strength: Math.min(fd[r.food], sd[r.service]) }))
  const tipAct = { Low: 0, Medium: 0, High: 0 }
  for (const r of ruleActs) tipAct[r.tip] = Math.max(tipAct[r.tip], r.strength)
  // Centroid defuzzification
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
  return { fd, sd, ruleActs, tipAct, crispTip: den < 1e-6 ? 15 : num / den }
}

function MFBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium w-14 shrink-0" style={{ color }}>{label}</span>
      <div className="flex-1 h-3 bg-card rounded-full overflow-hidden border border-border">
        <div className="h-full rounded-full transition-all duration-100"
          style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono text-muted w-8 text-right">{value.toFixed(2)}</span>
    </div>
  )
}

export default function Game() {
  const [food, setFood] = useState(7)
  const [service, setService] = useState(6)

  const { fd, sd, ruleActs, tipAct, crispTip } = computeFIS(food, service)

  return (
    <div className="mt-6 space-y-5">
      <p className="text-sm text-secondary leading-relaxed">
        A Mamdani fuzzy inference system calculates a restaurant tip from food and
        service quality. Adjust the sliders and watch the membership activations,
        rule firings, and defuzzified output update live.
      </p>

      {/* Input sliders */}
      <div className="bg-surface rounded-xl p-5 space-y-5">
        {[
          { label: 'Food quality', val: food, set: setFood, deg: fd },
          { label: 'Service quality', val: service, set: setService, deg: sd },
        ].map(({ label, val, set, deg }) => (
          <div key={label} className="space-y-2">
            <div className="flex justify-between text-xs text-muted">
              <span>{label}</span><span className="font-mono font-bold text-primary">{val.toFixed(1)} / 10</span>
            </div>
            <input type="range" min="0" max="10" step="0.1" value={val}
              onChange={e => set(Number(e.target.value))} className="w-full" />
            <div className="space-y-1.5 pt-1">
              {Object.entries(deg).map(([k, v]) => (
                <MFBar key={k} label={k} value={v} color={MF_COLOR[k]} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Rules */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted mb-2">Rule activations</p>
        <div className="rounded-xl border border-border overflow-hidden">
          {ruleActs.map((r, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 text-xs ${i > 0 ? 'border-t border-border' : ''}`}
              style={{ opacity: r.strength > 0.01 ? 1 : 0.35 }}>
              <span className="text-muted w-4 shrink-0">{i+1}.</span>
              <span className="flex-1 text-secondary">
                IF food <span className="font-medium" style={{ color: MF_COLOR[r.food] }}>{r.food}</span>
                {' '}AND service <span className="font-medium" style={{ color: MF_COLOR[r.service] }}>{r.service}</span>
                {' '}→ tip <span className="font-medium" style={{ color: TIP_COLOR[r.tip] }}>{r.tip}</span>
              </span>
              <div className="w-16 h-2 bg-surface rounded-full overflow-hidden border border-border">
                <div className="h-full rounded-full" style={{ width: `${r.strength * 100}%`, backgroundColor: TIP_COLOR[r.tip] }} />
              </div>
              <span className="font-mono text-primary w-8 text-right">{r.strength.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Output */}
      <div className="bg-surface rounded-xl p-5 space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted">Aggregated output</p>
        <div className="space-y-1.5">
          {Object.entries(tipAct).map(([k, v]) => (
            <MFBar key={k} label={k} value={v} color={TIP_COLOR[k]} />
          ))}
        </div>
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Defuzzified tip (centroid)</p>
            <p className="text-3xl font-bold" style={{ color: COLOR }}>{crispTip.toFixed(1)}%</p>
          </div>
          <div className="flex-1 mx-4 h-3 bg-card rounded-full overflow-hidden border border-border relative">
            <div className="absolute h-full w-0.5 bg-primary opacity-40 top-0"
              style={{ left: `${(crispTip / 30) * 100}%` }} />
            <div className="h-full rounded-full" style={{ width: `${(crispTip / 30) * 100}%`, backgroundColor: COLOR + '60' }} />
          </div>
          <span className="text-xs text-muted">30%</span>
        </div>
      </div>
    </div>
  )
}
