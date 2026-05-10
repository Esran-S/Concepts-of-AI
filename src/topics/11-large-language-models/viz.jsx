import { useState } from 'react'

const COLOR = '#F43F5E'

const TOKENS = ['The', 'cat', 'sat', 'on', 'the', 'mat', 'and', 'purred']
const N = TOKENS.length

// Pre-computed attention heads (each row sums to 1)
const HEADS = [
  {
    name: 'Local / positional',
    desc: 'This head attends mostly to the immediately preceding tokens. Common in early layers — it builds short-range context before later heads handle longer dependencies.',
    matrix: [
      [0.70, 0.20, 0.05, 0.02, 0.01, 0.01, 0.01, 0.00],
      [0.15, 0.60, 0.15, 0.05, 0.02, 0.01, 0.01, 0.01],
      [0.05, 0.15, 0.60, 0.12, 0.04, 0.02, 0.01, 0.01],
      [0.03, 0.05, 0.15, 0.55, 0.14, 0.05, 0.02, 0.01],
      [0.02, 0.03, 0.05, 0.15, 0.58, 0.12, 0.03, 0.02],
      [0.01, 0.02, 0.04, 0.08, 0.16, 0.58, 0.08, 0.03],
      [0.01, 0.02, 0.03, 0.04, 0.08, 0.14, 0.58, 0.10],
      [0.01, 0.02, 0.03, 0.04, 0.05, 0.08, 0.17, 0.60],
    ],
  },
  {
    name: 'Article → noun',
    desc: '"The" strongly attends to "cat" and "mat" — its referents. Determiners finding their nouns is a classic syntactic attention pattern. Both instances of "the" show this behaviour.',
    matrix: [
      [0.05, 0.65, 0.05, 0.03, 0.02, 0.15, 0.03, 0.02],
      [0.60, 0.10, 0.12, 0.05, 0.04, 0.04, 0.03, 0.02],
      [0.05, 0.50, 0.10, 0.08, 0.05, 0.15, 0.04, 0.03],
      [0.03, 0.08, 0.10, 0.10, 0.08, 0.50, 0.07, 0.04],
      [0.05, 0.08, 0.05, 0.03, 0.05, 0.64, 0.05, 0.05],
      [0.04, 0.08, 0.10, 0.04, 0.60, 0.05, 0.05, 0.04],
      [0.04, 0.12, 0.06, 0.04, 0.04, 0.10, 0.40, 0.20],
      [0.05, 0.50, 0.10, 0.04, 0.04, 0.10, 0.10, 0.07],
    ],
  },
  {
    name: 'Verb → subject/object',
    desc: '"sat" attends strongly to "cat" (its subject) and "mat" (its location). "purred" looks back to "cat" as the agent. This head captures predicate–argument structure.',
    matrix: [
      [0.30, 0.20, 0.10, 0.10, 0.10, 0.10, 0.05, 0.05],
      [0.10, 0.45, 0.20, 0.10, 0.05, 0.05, 0.03, 0.02],
      [0.05, 0.45, 0.10, 0.06, 0.04, 0.22, 0.05, 0.03],
      [0.04, 0.08, 0.12, 0.12, 0.08, 0.42, 0.08, 0.06],
      [0.05, 0.10, 0.08, 0.08, 0.35, 0.18, 0.10, 0.06],
      [0.04, 0.10, 0.08, 0.50, 0.12, 0.08, 0.04, 0.04],
      [0.05, 0.10, 0.05, 0.05, 0.05, 0.10, 0.40, 0.20],
      [0.05, 0.55, 0.10, 0.05, 0.04, 0.08, 0.08, 0.05],
    ],
  },
]

function cellColor(val, accent) {
  const r = parseInt(accent.slice(1, 3), 16)
  const g = parseInt(accent.slice(3, 5), 16)
  const b = parseInt(accent.slice(5, 7), 16)
  const alpha = Math.pow(val, 0.6)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function Viz() {
  const [headIdx, setHeadIdx] = useState(0)
  const head = HEADS[headIdx]

  return (
    <div className="mt-6 space-y-5">
      <p className="text-sm text-secondary leading-relaxed">
        Self-attention lets each token attend to every other token. Each attention
        head learns a different relationship pattern. The heatmap shows which tokens
        (rows) attend to which tokens (columns) — darker = higher attention weight.
      </p>

      {/* Sentence display */}
      <div className="bg-surface rounded-xl p-4">
        <p className="text-xs text-muted uppercase tracking-widest mb-2">Sentence</p>
        <div className="flex flex-wrap gap-2">
          {TOKENS.map((t, i) => (
            <span key={i} className="px-2 py-1 rounded-lg text-sm font-mono text-primary border border-border bg-card">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Head selector */}
      <div className="flex gap-2 flex-wrap">
        {HEADS.map((h, i) => (
          <button key={i} onClick={() => setHeadIdx(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${headIdx === i ? 'text-white' : 'text-secondary hover:bg-surface border border-border'}`}
            style={headIdx === i ? { backgroundColor: COLOR } : {}}>
            Head {i + 1}: {h.name}
          </button>
        ))}
      </div>

      {/* Head description */}
      <div className="bg-surface rounded-xl p-4">
        <p className="text-xs text-muted leading-relaxed">{head.desc}</p>
      </div>

      {/* Attention heatmap */}
      <div className="bg-surface rounded-xl p-4 overflow-x-auto">
        <p className="text-xs text-muted uppercase tracking-widest mb-3">
          Attention weights — rows attend to columns
        </p>
        <div className="inline-block min-w-full">
          {/* Column headers */}
          <div className="flex">
            <div className="w-14 shrink-0" />
            {TOKENS.map((t, j) => (
              <div key={j} className="w-10 text-center text-xs text-muted font-mono truncate px-0.5"
                style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', height: 52, lineHeight: '40px' }}>
                {t}
              </div>
            ))}
          </div>
          {/* Rows */}
          {TOKENS.map((rowTok, i) => (
            <div key={i} className="flex items-center">
              <div className="w-14 shrink-0 text-xs text-muted font-mono truncate pr-2 text-right">
                {rowTok}
              </div>
              {head.matrix[i].map((val, j) => (
                <div key={j} className="w-10 h-10 flex items-center justify-center rounded-sm m-0.5 text-xs font-mono transition-colors"
                  style={{ backgroundColor: cellColor(val, COLOR), color: val > 0.4 ? '#fff' : 'transparent' }}>
                  {val > 0.15 ? val.toFixed(2) : ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Scale legend */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">Low attention</span>
        <div className="flex-1 h-3 rounded-full"
          style={{ background: `linear-gradient(to right, rgba(244,63,94,0), rgba(244,63,94,1))` }} />
        <span className="text-xs text-muted">High attention</span>
      </div>

      {/* Interpretation */}
      <div className="rounded-xl bg-surface p-4 space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted">How to read this</p>
        <p className="text-xs text-secondary leading-relaxed">
          Each row is a query token asking "which other tokens should I pay attention to?"
          The colours show the softmax attention weights — they sum to 1 across each row.
          Real LLMs use dozens of heads in parallel, each specialising in different
          linguistic relationships.
        </p>
      </div>
    </div>
  )
}
