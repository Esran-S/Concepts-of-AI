import { useState } from 'react'

const COLOR = '#F43F5E'

const ROUNDS = [
  {
    context: 'The quick brown fox jumps over the lazy',
    correct: 'dog',
    choices: ['dog', 'cat', 'fence', 'field'],
    probs: [0.94, 0.03, 0.02, 0.01],
    explanation: '"dog" is fixed — this is one of the oldest typesetting pangrams (1885). The LLM has seen it millions of times; its probability for "dog" approaches 1.',
    difficulty: 'Easy',
  },
  {
    context: 'She opened the door and was surprised to find a',
    correct: 'man',
    choices: ['man', 'note', 'stranger', 'gift'],
    probs: [0.31, 0.22, 0.28, 0.19],
    explanation: '"man" is the single most common continuation in training data, but "stranger", "note", and "gift" are all plausible. This is genuinely uncertain — even GPT-4 assigns meaningful probability to all four.',
    difficulty: 'Hard',
  },
  {
    context: 'The gradient of the loss with respect to the weights is computed using',
    correct: 'backpropagation',
    choices: ['backpropagation', 'gradient descent', 'momentum', 'regularisation'],
    probs: [0.72, 0.16, 0.07, 0.05],
    explanation: '"backpropagation" collocates strongly with "gradient of the loss". The phrase "computed using backpropagation" appears thousands of times in ML textbooks and papers in the training corpus.',
    difficulty: 'Medium',
  },
  {
    context: 'To be or not to be, that is the',
    correct: 'question',
    choices: ['question', 'answer', 'challenge', 'problem'],
    probs: [0.97, 0.01, 0.01, 0.01],
    explanation: 'Shakespeare is extensively represented in training data. This phrase is so well-memorised that "question" gets nearly all the probability mass — a near-perfect recall from pre-training.',
    difficulty: 'Easy',
  },
  {
    context: 'The model achieved state-of-the-art results on the GLUE benchmark, outperforming previous approaches by a',
    correct: 'significant',
    choices: ['significant', 'large', 'narrow', 'surprising'],
    probs: [0.58, 0.24, 0.09, 0.09],
    explanation: '"significant margin" is the dominant phrase in ML paper abstracts. "large margin" also appears but less frequently. The model has absorbed academic writing conventions.',
    difficulty: 'Medium',
  },
  {
    context: 'In 1969, Neil Armstrong became the first person to walk on the',
    correct: 'Moon',
    choices: ['Moon', 'surface', 'ground', 'lunar'],
    probs: [0.88, 0.06, 0.03, 0.03],
    explanation: '"Moon" is the correct factual completion and also the most common token in this context. The model retrieves this fact reliably because it appears consistently across millions of sources.',
    difficulty: 'Easy',
  },
  {
    context: 'The restaurant was fully booked for Saturday night, but the manager offered us a table at',
    correct: 'the bar',
    choices: ['the bar', 'seven', 'Sunday', 'a discount'],
    probs: [0.44, 0.31, 0.14, 0.11],
    explanation: '"the bar" is the most natural narrative continuation — "offered a table at the bar" is a common hospitality phrase. "seven" (7pm) is also plausible, showing that context leaves genuine ambiguity.',
    difficulty: 'Hard',
  },
  {
    context: 'Despite the rain, the picnic was',
    correct: 'a success',
    choices: ['a success', 'cancelled', 'ruined', 'delayed'],
    probs: [0.51, 0.23, 0.17, 0.09],
    explanation: '"Despite X, the Y was a success" is a common narrative template signalling a positive twist. The model has learned that "Despite" followed by a hardship often precedes a positive outcome.',
    difficulty: 'Medium',
  },
]

const DIFF_COLOR = { Easy: '#10B981', Medium: '#F59E0B', Hard: '#F43F5E' }

export default function Game() {
  const [roundIdx, setRoundIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [chosen, setChosen] = useState(null)
  const [phase, setPhase] = useState('playing')  // playing | feedback | done

  const round = ROUNDS[roundIdx]

  function handleChoice(token) {
    if (chosen) return
    setChosen(token)
    const correct = token === round.correct
    if (correct) {
      setScore(s => s + 1)
      const newStreak = streak + 1
      setStreak(newStreak)
      setBestStreak(b => Math.max(b, newStreak))
    } else {
      setStreak(0)
    }
    setPhase('feedback')
  }

  function handleNext() {
    if (roundIdx + 1 >= ROUNDS.length) {
      setPhase('done')
    } else {
      setRoundIdx(i => i + 1)
      setChosen(null)
      setPhase('playing')
    }
  }

  function handleRestart() {
    setRoundIdx(0); setScore(0); setChosen(null); setPhase('playing')
    setStreak(0); setBestStreak(0)
  }

  if (phase === 'done') {
    const pct = Math.round((score / ROUNDS.length) * 100)
    return (
      <div className="mt-6 space-y-5">
        <div className="rounded-2xl p-6 text-center space-y-2" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Final score</p>
          <p className="text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>{score} / {ROUNDS.length}</p>
          <div className="flex justify-center gap-4 pt-1">
            <div className="text-center">
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Best streak</p>
              <p className="text-xl font-bold" style={{ color: COLOR }}>{bestStreak} 🔥</p>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {pct >= 80 ? 'Excellent — you think like a language model.' :
             pct >= 50 ? 'Solid. The hard ones are genuinely uncertain even for GPT-4.' :
             'Language models use statistical patterns humans find hard to predict.'}
          </p>
        </div>

        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>LLM vs Human</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'You (per token)', val: '~3 s' },
              { label: 'GPT-4o (per token)', val: '20 ms', accent: true },
              { label: 'Speedup', val: '~150×', accent: true },
            ].map(({ label, val, accent }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="text-xl font-bold" style={{ color: accent ? COLOR : 'var(--text-primary)' }}>{val}</p>
              </div>
            ))}
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            A modern LLM generates 50+ tokens per second for thousands of users simultaneously,
            scoring 50,000+ vocabulary tokens at each step — not just 4 options.
          </p>
        </div>

        <button onClick={handleRestart}
          className="w-full py-2.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-75"
          style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          Play again
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-5">
      {/* Goal callout */}
      <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ background: COLOR + '12', border: `1px solid ${COLOR}30` }}>
        <span className="text-lg">🎯</span>
        <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
          Predict the next token — guess which word an LLM would rank highest.
        </p>
      </div>

      {/* Progress + score + streak */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(roundIdx / ROUNDS.length) * 100}%`, background: COLOR }} />
        </div>
        {roundIdx > 0 && (
          <span className="text-[12px] font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
            {score}/{roundIdx} correct
          </span>
        )}
        {streak >= 2 && (
          <span className="text-[12px] font-bold shrink-0" style={{ color: '#F59E0B' }}>
            {streak} 🔥
          </span>
        )}
      </div>

      {/* Context */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Round {roundIdx + 1} of {ROUNDS.length}
          </p>
          <span
            className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{ color: DIFF_COLOR[round.difficulty], background: DIFF_COLOR[round.difficulty] + '20' }}
          >
            {round.difficulty}
          </span>
        </div>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {round.context}{' '}
          {chosen ? (
            <span
              className="font-bold px-1.5 py-0.5 rounded-lg"
              style={{
                color: chosen === round.correct ? '#10B981' : '#F43F5E',
                background: chosen === round.correct ? '#10B98120' : '#F43F5E20',
              }}
            >
              {round.correct}
            </span>
          ) : (
            <span
              className="inline-block w-16 h-4 rounded-md align-middle animate-pulse"
              style={{ background: 'var(--border)' }}
            />
          )}
        </p>
      </div>

      {/* Choices */}
      <div className="grid grid-cols-2 gap-2.5">
        {round.choices.map((token, idx) => {
          let bg, textColor, borderColor
          if (chosen) {
            if (token === round.correct) { bg = '#10B981'; textColor = '#fff'; borderColor = 'transparent' }
            else if (token === chosen)   { bg = '#F43F5E'; textColor = '#fff'; borderColor = 'transparent' }
            else { bg = 'var(--surface)'; textColor = 'var(--text-muted)'; borderColor = 'var(--border)' }
          } else {
            bg = 'var(--surface)'; textColor = 'var(--text-primary)'; borderColor = 'var(--border)'
          }
          return (
            <button
              key={token}
              onClick={() => handleChoice(token)}
              disabled={!!chosen}
              className="rounded-2xl py-3 px-4 text-[14px] font-semibold text-center transition-all hover:opacity-80"
              style={{ background: bg, color: textColor, border: `1.5px solid ${borderColor}`, boxShadow: chosen ? 'none' : 'var(--shadow-sm)' }}
            >
              {token}
              {chosen && (
                <div className="mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${round.probs[idx] * 100}%`, background: 'rgba(255,255,255,0.85)' }}
                      />
                    </div>
                    <span className="text-[10px] font-mono opacity-80 shrink-0">
                      {Math.round(round.probs[idx] * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
        {chosen ? 'Bars show estimated LLM token probability' : 'Select the word a language model would most likely predict'}
      </p>

      {/* Feedback */}
      {phase === 'feedback' && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
          <p className="text-[14px] font-semibold" style={{ color: chosen === round.correct ? '#10B981' : '#F43F5E' }}>
            {chosen === round.correct
              ? `Correct!${streak >= 2 ? ` ${streak} in a row 🔥` : ''}`
              : `Incorrect — the top token was "${round.correct}"`}
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {round.explanation}
          </p>
          <button onClick={handleNext}
            className="px-5 py-2 rounded-2xl text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: COLOR }}>
            {roundIdx + 1 >= ROUNDS.length ? 'See results' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  )
}
