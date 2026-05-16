import { useState, useRef } from 'react'

const COLOR = '#F59E0B'
const X_RANGE = [0, 40]
const STEPS_PER_CHECKPOINT = 8
const CHECKPOINTS = 10

function f(x) {
  return Math.sin(x) * 0.5 + Math.sin(2.3 * x) * 0.4 + Math.sin(3.7 * x) * 0.3
}

function findGlobalMax() {
  let best = { x: 0, y: -Infinity }
  for (let i = 0; i <= 1000; i++) {
    const x = X_RANGE[0] + (i / 1000) * (X_RANGE[1] - X_RANGE[0])
    const y = f(x)
    if (y > best.y) best = { x, y }
  }
  return best
}
const GLOBAL_MAX = findGlobalMax()

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

function runChunk(x, acceptance, steps, rng) {
  let cur = x
  for (let i = 0; i < steps; i++) {
    const nx = Math.max(X_RANGE[0], Math.min(X_RANGE[1], cur + (rng() * 2 - 1) * 4))
    const delta = f(nx) - f(cur)
    if (delta > 0 || rng() < acceptance) cur = nx
  }
  return cur
}

function runAutoSA(seed) {
  const rng = makeLcg(seed)
  let x = X_RANGE[0] + rng() * (X_RANGE[1] - X_RANGE[0])
  let best = f(x)
  for (let cp = 0; cp < CHECKPOINTS; cp++) {
    const T = Math.pow(0.7, cp)
    x = runChunk(x, T, STEPS_PER_CHECKPOINT, rng)
    best = Math.max(best, f(x))
  }
  return best
}

const TEMP_OPTIONS = [
  { label: 'Hot', emoji: '🔥', value: 0.9, color: '#F43F5E', desc: 'Accept almost anything — explore wildly' },
  { label: 'Warm', emoji: '🌡️', value: 0.4, color: '#F59E0B', desc: 'Accept some bad moves — balanced' },
  { label: 'Cold', emoji: '❄️', value: 0.05, color: '#3B82F6', desc: 'Only accept improvements — exploit' },
]

const SVG_W = 500, SVG_H = 100, PAD_X = 20, PAD_Y = 8

function toSvgX(x) {
  return PAD_X + ((x - X_RANGE[0]) / (X_RANGE[1] - X_RANGE[0])) * (SVG_W - 2 * PAD_X)
}
function toSvgY(y) {
  return PAD_Y + ((1.2 - y) / 2.4) * (SVG_H - 2 * PAD_Y)
}

const CURVE_D = (() => {
  const pts = []
  for (let i = 0; i <= 400; i++) {
    const x = X_RANGE[0] + (i / 400) * (X_RANGE[1] - X_RANGE[0])
    pts.push(`${i === 0 ? 'M' : 'L'}${toSvgX(x).toFixed(1)},${toSvgY(f(x)).toFixed(1)}`)
  }
  return pts.join(' ')
})()

export default function Game() {
  const [phase, setPhase] = useState('intro')
  const [checkpoint, setCheckpoint] = useState(0)
  const [posX, setPosX] = useState(0)
  const [bestFitness, setBestFitness] = useState(-Infinity)
  const [tempChoices, setTempChoices] = useState([])
  const [autoResult, setAutoResult] = useState(null)
  const rngRef = useRef(null)
  const seedRef = useRef(0)

  function handleStart() {
    const seed = Date.now() & 0xffff
    seedRef.current = seed
    rngRef.current = makeLcg(seed)
    const startX = X_RANGE[0] + rngRef.current() * (X_RANGE[1] - X_RANGE[0])
    setPosX(startX)
    setBestFitness(f(startX))
    setCheckpoint(0)
    setTempChoices([])
    setAutoResult(null)
    setPhase('playing')
  }

  function handleTempChoice(opt) {
    const newX = runChunk(posX, opt.value, STEPS_PER_CHECKPOINT, rngRef.current)
    const newF = f(newX)
    const newBest = Math.max(bestFitness, newF)
    const newChoices = [...tempChoices, opt]
    const newCheckpoint = checkpoint + 1

    setPosX(newX)
    setBestFitness(newBest)
    setTempChoices(newChoices)
    setCheckpoint(newCheckpoint)

    if (newCheckpoint >= CHECKPOINTS) {
      setAutoResult(runAutoSA(seedRef.current))
      setPhase('result')
    }
  }

  const currentFitness = f(posX)
  const stars = autoResult
    ? (bestFitness >= autoResult - 0.05 ? 3 : bestFitness >= autoResult - 0.2 ? 2 : 1)
    : 0

  return (
    <div className="mt-6 space-y-5">
      {phase === 'intro' && (
        <div className="space-y-4">
          <div className="rounded-2xl px-4 py-3 flex items-start gap-2" style={{ background: COLOR + '12', border: `1px solid ${COLOR}30` }}>
            <span className="text-lg mt-0.5">🌡️</span>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              You control the cooling schedule! Every {STEPS_PER_CHECKPOINT} steps, choose Hot, Warm, or Cold. Beat the auto SA's best score over {CHECKPOINTS} checkpoints.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {TEMP_OPTIONS.map(opt => (
              <div key={opt.label} className="bg-surface rounded-xl p-3 border border-border text-center">
                <p className="text-2xl mb-1">{opt.emoji}</p>
                <p className="text-xs font-bold text-primary">{opt.label}</p>
                <p className="text-xs text-muted mt-0.5">{opt.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-surface rounded-xl p-4 border border-border text-xs text-secondary">
            <span className="font-semibold text-primary">Strategy:</span> Start Hot to explore the landscape, then switch Cold to lock in your best find.
          </div>

          <button onClick={handleStart}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: COLOR }}>
            Start — {CHECKPOINTS} Temperature Checkpoints
          </button>
        </div>
      )}

      {phase === 'playing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Checkpoint <strong className="text-primary">{checkpoint + 1}</strong> / {CHECKPOINTS}</span>
            <span>Best found: <strong className="text-primary">{bestFitness.toFixed(3)}</strong></span>
          </div>

          {/* Landscape */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
              <path d={CURVE_D} fill="none" stroke="var(--border)" strokeWidth="1.5" />
              <text x={toSvgX(GLOBAL_MAX.x)} y={Math.max(14, toSvgY(GLOBAL_MAX.y) - 5)}
                textAnchor="middle" fontSize="12">⭐</text>
              <circle cx={toSvgX(posX)} cy={toSvgY(currentFitness)} r="8"
                fill={COLOR} stroke="#fff" strokeWidth="2" />
            </svg>
          </div>

          {/* Current fitness meter */}
          <div>
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>Current fitness</span>
              <span className="font-mono">{currentFitness.toFixed(3)}</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden border border-border">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, (currentFitness + 1.2) / 2.4 * 100)}%`, backgroundColor: COLOR }} />
            </div>
          </div>

          {/* Temperature history */}
          {tempChoices.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {tempChoices.map((c, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: c.color }}>
                  {c.emoji}
                </span>
              ))}
            </div>
          )}

          {/* Temperature buttons */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted mb-2">
              Choose temperature for steps {checkpoint * STEPS_PER_CHECKPOINT + 1}–{(checkpoint + 1) * STEPS_PER_CHECKPOINT}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TEMP_OPTIONS.map(opt => (
                <button key={opt.label} onClick={() => handleTempChoice(opt)}
                  className="rounded-xl p-4 text-white font-semibold text-sm flex flex-col items-center gap-1 transition-opacity hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: opt.color }}>
                  <span className="text-2xl">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && autoResult !== null && (
        <div className="space-y-4">
          <div className="rounded-xl bg-surface p-6 text-center space-y-3 border border-border">
            <p className="text-5xl">{stars === 3 ? '🏆' : stars === 2 ? '🎯' : '💡'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl p-3 border border-border">
                <p className="text-xs text-muted mb-1">Your best fitness</p>
                <p className="text-2xl font-bold" style={{ color: COLOR }}>{bestFitness.toFixed(3)}</p>
              </div>
              <div className="bg-card rounded-xl p-3 border border-border">
                <p className="text-xs text-muted mb-1">Auto SA best</p>
                <p className="text-2xl font-bold text-primary">{autoResult.toFixed(3)}</p>
              </div>
            </div>
            <p className="text-sm text-muted">
              {stars === 3 ? 'You matched or beat the automated cooling schedule!' :
               stars === 2 ? 'Close! Geometric decay (0.7ⁿ) just edged you out.' :
               'Gradual cooling (Hot→Warm→Cold) consistently outperforms fixed temperature choices.'}
            </p>
          </div>

          <div className="bg-surface rounded-xl p-4 border border-border">
            <p className="text-xs text-muted mb-2">Your choices</p>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {tempChoices.map((c, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: c.color }}>
                  {i + 1}. {c.emoji} {c.label}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted">Auto SA: 🔥→🌡️→🌡️→❄️→❄️→❄️→❄️→❄️→❄️→❄️ (geometric: T × 0.7 each step)</p>
          </div>

          <div className="rounded-xl bg-surface border border-border p-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted">Algorithm vs Human</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-xs text-muted mb-1">SA (80 steps)</p>
                <p className="text-xl font-bold" style={{ color: COLOR }}>&lt; 1 ms</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-xs text-muted mb-1">Your 10 decisions</p>
                <p className="text-xl font-bold text-primary">~30 s</p>
              </div>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              Real SA computes thousands of steps per second with mathematically tuned cooling.
              Hyper-heuristics can even evolve problem-specific cooling curves that outperform
              geometric schedules on real-world scheduling and routing problems.
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
