import { useState } from 'react'

const COLOR = '#8B5CF6'
const X_RANGE = [0, 40]
const ROUNDS = 20

function f(x) {
  return Math.sin(x) * 0.5 + Math.sin(2.3 * x) * 0.4 + Math.sin(3.7 * x) * 0.3
}

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

function generateRounds(seed) {
  const rng = makeLcg(seed)
  let x = X_RANGE[0] + rng() * (X_RANGE[1] - X_RANGE[0])
  const rounds = []
  for (let i = 0; i < ROUNDS; i++) {
    const T = Math.max(0.05, 1.0 * Math.pow(0.85, i))
    const nx = Math.max(X_RANGE[0], Math.min(X_RANGE[1], x + (rng() * 2 - 1) * 5))
    const delta = f(nx) - f(x)
    const prob = delta > 0 ? 1.0 : Math.exp(delta / T)
    const r2 = rng()
    const saWouldAccept = delta > 0 || r2 < prob
    rounds.push({ x, nx, delta, T, prob, saWouldAccept, fy: f(x), fny: f(nx) })
    if (saWouldAccept) x = nx
  }
  return rounds
}

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
  const [rounds, setRounds] = useState(null)
  const [roundIdx, setRoundIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(null)
  const [history, setHistory] = useState([])
  const [locked, setLocked] = useState(false)

  function handleStart() {
    const r = generateRounds(Date.now() & 0xffff)
    setRounds(r)
    setRoundIdx(0)
    setScore(0)
    setShowResult(null)
    setHistory([])
    setLocked(false)
    setPhase('playing')
  }

  function handleChoice(playerAccepts) {
    if (showResult || locked) return
    setLocked(true)
    const round = rounds[roundIdx]
    const correct = playerAccepts === round.saWouldAccept
    const newScore = score + (correct ? 1 : 0)
    setScore(newScore)
    setShowResult({ correct, saAccepted: round.saWouldAccept, playerAccepted: playerAccepts })
    setHistory(h => [...h, { correct, delta: round.delta }])
    setTimeout(() => {
      setShowResult(null)
      setLocked(false)
      if (roundIdx + 1 >= ROUNDS) setPhase('result')
      else setRoundIdx(r => r + 1)
    }, 1600)
  }

  const round = rounds && roundIdx < ROUNDS ? rounds[roundIdx] : null
  const finalScore = score
  const stars = finalScore >= 16 ? 3 : finalScore >= 12 ? 2 : 1

  return (
    <div className="mt-6 space-y-5">
      {phase === 'intro' && (
        <div className="space-y-4">
          <div className="rounded-2xl px-4 py-3 flex items-start gap-2" style={{ background: COLOR + '12', border: `1px solid ${COLOR}30` }}>
            <span className="text-lg mt-0.5">🌡️</span>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              You ARE the acceptance function! Each round a move is proposed on a landscape. Decide <strong>ACCEPT or REJECT</strong> — the same way simulated annealing would.
            </p>
          </div>

          <div className="bg-surface rounded-xl p-4 space-y-3 border border-border">
            <p className="text-sm font-semibold text-primary">How SA decides:</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span className="text-secondary">If the move is <strong>better</strong> (Δ &gt; 0): always accept</span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <span className="text-amber-500 font-bold mt-0.5">?</span>
                <span className="text-secondary">If the move is <strong>worse</strong> (Δ &lt; 0): accept with probability exp(Δ/T)</span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <span className="text-blue-500 font-bold mt-0.5">❄️</span>
                <span className="text-secondary">Temperature <strong>drops each round</strong> — be pickier as it cools</span>
              </div>
            </div>
          </div>

          <button onClick={handleStart}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: COLOR }}>
            Start — 20 Rounds
          </button>
        </div>
      )}

      {phase === 'playing' && round && (
        <div className="space-y-4">
          <div className="flex justify-between text-xs text-muted">
            <span>Round <strong className="text-primary">{roundIdx + 1}</strong> / {ROUNDS}</span>
            <span>Score: <strong className="text-primary">{score}</strong></span>
          </div>

          {/* Landscape */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
              <path d={CURVE_D} fill="none" stroke="var(--border)" strokeWidth="1.5" />
              <line
                x1={toSvgX(round.x)} y1={toSvgY(round.fy)}
                x2={toSvgX(round.nx)} y2={toSvgY(round.fny)}
                stroke="#A1A1AA" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx={toSvgX(round.x)} cy={toSvgY(round.fy)} r="7"
                fill={COLOR} stroke="#fff" strokeWidth="2" />
              <circle cx={toSvgX(round.nx)} cy={toSvgY(round.fny)} r="7"
                fill={round.delta > 0 ? '#10B981' : '#F59E0B'} stroke="#fff" strokeWidth="2" />
              <text x={toSvgX(round.x)} y={Math.max(16, toSvgY(round.fy) - 10)}
                textAnchor="middle" fontSize="9" fill="var(--text-muted)">HERE</text>
              <text x={toSvgX(round.nx)} y={Math.max(16, toSvgY(round.fny) - 10)}
                textAnchor="middle" fontSize="9" fill="var(--text-muted)">PROPOSED</text>
            </svg>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface rounded-xl p-3 text-center border border-border">
              <p className="text-xs text-muted mb-1">Δ (change)</p>
              <p className="text-base font-bold" style={{ color: round.delta > 0 ? '#10B981' : '#F59E0B' }}>
                {round.delta > 0 ? '+' : ''}{round.delta.toFixed(3)}
              </p>
            </div>
            <div className="bg-surface rounded-xl p-3 text-center border border-border">
              <p className="text-xs text-muted mb-1">Temperature</p>
              <p className="text-base font-bold" style={{ color: round.T > 0.4 ? '#F43F5E' : round.T > 0.15 ? '#F59E0B' : '#3B82F6' }}>
                {round.T.toFixed(3)} {round.T > 0.4 ? '🔥' : round.T > 0.15 ? '🌡️' : '❄️'}
              </p>
            </div>
            <div className="bg-surface rounded-xl p-3 text-center border border-border">
              <p className="text-xs text-muted mb-1">Accept prob</p>
              <p className="text-base font-bold text-primary">{(round.prob * 100).toFixed(0)}%</p>
            </div>
          </div>

          {/* Feedback or buttons */}
          {showResult ? (
            <div className="rounded-xl p-4 text-center border"
              style={{
                backgroundColor: showResult.correct ? '#10B98115' : '#F43F5E15',
                borderColor: showResult.correct ? '#10B98140' : '#F43F5E40',
              }}>
              <p className="text-xl font-bold mb-1" style={{ color: showResult.correct ? '#10B981' : '#F43F5E' }}>
                {showResult.correct ? '✓ Correct!' : '✗ Mismatch'}
              </p>
              <p className="text-xs text-muted">
                SA would have <strong>{showResult.saAccepted ? 'accepted' : 'rejected'}</strong> this move
                {!showResult.correct && ` — you chose to ${showResult.playerAccepted ? 'accept' : 'reject'}`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleChoice(false)}
                className="py-5 rounded-xl text-sm font-bold text-white flex flex-col items-center gap-1.5 transition-opacity hover:opacity-90 active:scale-95"
                style={{ backgroundColor: '#F43F5E' }}>
                <span className="text-3xl">✗</span>
                <span>REJECT</span>
              </button>
              <button onClick={() => handleChoice(true)}
                className="py-5 rounded-xl text-sm font-bold text-white flex flex-col items-center gap-1.5 transition-opacity hover:opacity-90 active:scale-95"
                style={{ backgroundColor: '#10B981' }}>
                <span className="text-3xl">✓</span>
                <span>ACCEPT</span>
              </button>
            </div>
          )}

          {/* History dots */}
          {history.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {history.map((h, i) => (
                <div key={i}
                  className="w-5 h-5 rounded flex items-center justify-center text-xs text-white font-bold"
                  style={{ backgroundColor: h.correct ? '#10B981' : '#F43F5E' }}>
                  {h.correct ? '✓' : '✗'}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === 'result' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-surface p-6 text-center space-y-2 border border-border">
            <p className="text-5xl">{stars === 3 ? '🏆' : stars === 2 ? '🎯' : '💡'}</p>
            <p className="text-2xl font-bold text-primary">{finalScore} / {ROUNDS}</p>
            <p className="text-sm text-muted">
              {stars === 3
                ? 'You think like SA! You matched the algorithm almost perfectly.'
                : stars === 2
                ? 'Good instincts — you understand when to accept worse moves.'
                : 'The exponential rule takes practice. Try again with the temperature in mind!'}
            </p>
          </div>

          <div className="bg-surface rounded-xl p-4 border border-border space-y-2">
            <p className="text-sm font-semibold text-primary">The formula: exp(Δ / T)</p>
            <div className="text-xs text-secondary space-y-1">
              <p>Δ = −0.1, T = 0.5 → accept prob = exp(−0.2) = <strong>82%</strong></p>
              <p>Δ = −0.1, T = 0.05 → accept prob = exp(−2.0) = <strong>14%</strong></p>
              <p>This is how SA escapes local optima — but only while it's still hot.</p>
            </div>
          </div>

          <div className="rounded-xl bg-surface border border-border p-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted">Algorithm vs Human</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-xs text-muted mb-1">200 SA decisions</p>
                <p className="text-xl font-bold" style={{ color: COLOR }}>&lt; 1 ms</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-xs text-muted mb-1">Human (20 rounds)</p>
                <p className="text-xl font-bold text-primary">~2 min</p>
              </div>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              SA evaluates exp(Δ/T) instantly for every move — no mental arithmetic needed.
              Over 200 steps it runs the full acceptance rule thousands of times per second,
              sweeping parameter landscapes that would take a human hours to manually inspect.
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
