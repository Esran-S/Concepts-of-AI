import { useState } from 'react'

const COLOR = '#F43F5E'

const ROUNDS = [
  {
    context: 'The quick brown fox jumps over the lazy',
    correct: 'dog',
    choices: ['dog', 'cat', 'fence', 'field'],
    explanation: '"dog" is fixed — this is one of the oldest typesetting pangrams (1885). The LLM has seen it millions of times; its probability for "dog" approaches 1.',
    difficulty: 'Easy',
  },
  {
    context: 'She opened the door and was surprised to find a',
    correct: 'man',
    choices: ['man', 'note', 'stranger', 'gift'],
    explanation: '"man" is the single most common continuation in training data, but "stranger", "note", and "gift" are all plausible. This is genuinely uncertain — even GPT-4 assigns meaningful probability to all four.',
    difficulty: 'Hard',
  },
  {
    context: 'The gradient of the loss with respect to the weights is computed using',
    correct: 'backpropagation',
    choices: ['backpropagation', 'gradient descent', 'momentum', 'regularisation'],
    explanation: '"backpropagation" collocates strongly with "gradient of the loss". The phrase "computed using backpropagation" appears thousands of times in ML textbooks and papers in the training corpus.',
    difficulty: 'Medium',
  },
  {
    context: 'To be or not to be, that is the',
    correct: 'question',
    choices: ['question', 'answer', 'challenge', 'problem'],
    explanation: 'Shakespeare is extensively represented in training data. This phrase is so well-memorised that "question" gets nearly all the probability mass — a near-perfect recall from pre-training.',
    difficulty: 'Easy',
  },
  {
    context: 'The model achieved state-of-the-art results on the GLUE benchmark, outperforming previous approaches by a',
    correct: 'significant',
    choices: ['significant', 'large', 'narrow', 'surprising'],
    explanation: '"significant margin" is the dominant phrase in ML paper abstracts. "large margin" also appears but less frequently. The model has absorbed academic writing conventions.',
    difficulty: 'Medium',
  },
  {
    context: 'In 1969, Neil Armstrong became the first person to walk on the',
    correct: 'Moon',
    choices: ['Moon', 'surface', 'ground', 'lunar'],
    explanation: '"Moon" is the correct factual completion and also the most common token in this context. The model retrieves this fact reliably because it appears consistently across millions of sources.',
    difficulty: 'Easy',
  },
  {
    context: 'The restaurant was fully booked for Saturday night, but the manager offered us a table at',
    correct: 'the bar',
    choices: ['the bar', 'seven', 'Sunday', 'a discount'],
    explanation: '"the bar" is the most natural narrative continuation — "offered a table at the bar" is a common hospitality phrase. "seven" (7pm) is also plausible, showing that context leaves genuine ambiguity.',
    difficulty: 'Hard',
  },
  {
    context: 'Despite the rain, the picnic was',
    correct: 'a success',
    choices: ['a success', 'cancelled', 'ruined', 'delayed'],
    explanation: '"Despite X, the Y was a success" is a common narrative template signalling a positive twist. The model has learned that "Despite" followed by a hardship often precedes a positive outcome.',
    difficulty: 'Medium',
  },
]

const DIFF_COLOR = { Easy: '#10B981', Medium: '#F59E0B', Hard: '#F43F5E' }

export default function Game() {
  const [roundIdx, setRoundIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [chosen, setChosen] = useState(null)
  const [phase, setPhase] = useState('playing')  // playing | feedback | done

  const round = ROUNDS[roundIdx]

  function handleChoice(token) {
    if (chosen) return
    setChosen(token)
    if (token === round.correct) setScore(s => s + 1)
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
  }

  if (phase === 'done') {
    const pct = Math.round((score / ROUNDS.length) * 100)
    return (
      <div className="mt-6 space-y-5">
        <div className="rounded-xl bg-surface p-6 text-center space-y-2">
          <p className="text-xs text-muted uppercase tracking-widest">Final score</p>
          <p className="text-4xl font-bold text-primary">{score} / {ROUNDS.length}</p>
          <p className="text-sm text-secondary">
            {pct >= 80 ? 'Excellent — you think like a language model.' :
             pct >= 50 ? 'Solid. The hard ones are genuinely uncertain even for GPT-4.' :
             'Language models use statistical patterns humans find hard to predict.'}
          </p>
        </div>
        <button onClick={handleRestart}
          className="w-full py-2.5 rounded-xl text-sm font-medium border border-border text-secondary hover:bg-surface">
          Play again
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-5">
      <p className="text-sm text-secondary leading-relaxed">
        Predict the next token. An LLM assigns a probability to every possible
        continuation — your job is to guess which word it would rank highest.
        Round {roundIdx + 1} of {ROUNDS.length}.
      </p>

      {/* Progress + score */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden border border-border">
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${((roundIdx) / ROUNDS.length) * 100}%`, backgroundColor: COLOR }} />
        </div>
        <span className="text-xs text-muted font-mono">{score}/{roundIdx} correct</span>
      </div>

      {/* Context */}
      <div className="bg-surface rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted uppercase tracking-widest">Context</p>
          <span className="text-xs font-medium px-2 py-0.5 rounded-lg"
            style={{ color: DIFF_COLOR[round.difficulty], background: DIFF_COLOR[round.difficulty] + '20' }}>
            {round.difficulty}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-primary">
          {round.context}{' '}
          {chosen ? (
            <span className="font-bold px-1 py-0.5 rounded"
              style={{ color: chosen === round.correct ? '#10B981' : '#F43F5E',
                       background: chosen === round.correct ? '#10B98120' : '#F43F5E20' }}>
              {round.correct}
            </span>
          ) : (
            <span className="inline-block w-16 h-4 rounded bg-border align-middle" />
          )}
        </p>
      </div>

      {/* Choices */}
      <div className="grid grid-cols-2 gap-2">
        {round.choices.map(token => {
          let style = 'border border-border text-secondary hover:bg-surface'
          let bg = {}
          if (chosen) {
            if (token === round.correct) { style = 'text-white border-transparent'; bg = { backgroundColor: '#10B981' } }
            else if (token === chosen)   { style = 'text-white border-transparent'; bg = { backgroundColor: '#F43F5E' } }
            else style = 'border border-border text-muted opacity-40'
          }
          return (
            <button key={token} onClick={() => handleChoice(token)}
              disabled={!!chosen}
              className={`rounded-xl py-3 px-4 text-sm font-medium text-center transition-all ${style}`}
              style={bg}>
              {token}
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {phase === 'feedback' && (
        <div className="rounded-xl bg-surface p-4 space-y-2">
          <p className="text-sm font-semibold" style={{ color: chosen === round.correct ? '#10B981' : '#F43F5E' }}>
            {chosen === round.correct ? 'Correct!' : `Incorrect — the top token was "${round.correct}"`}
          </p>
          <p className="text-xs text-secondary leading-relaxed">{round.explanation}</p>
          <button onClick={handleNext}
            className="mt-2 px-5 py-2 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: COLOR }}>
            {roundIdx + 1 >= ROUNDS.length ? 'See results' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  )
}
