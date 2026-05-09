import { Link } from 'react-router-dom'
import DefinitionCard from '../../components/DefinitionCard'
import FactCard from '../../components/FactCard'
import ConceptChip from '../../components/ConceptChip'

const COLOR = '#3B82F6'

const VARIANTS = [
  {
    title: 'Steepest Ascent',
    body: 'Evaluate all neighbours, then move to the single best one. More deliberate. Fewer wasted moves.',
  },
  {
    title: 'First Improvement',
    body: 'Move to the first neighbour that beats the current solution. Faster per iteration. Less cautious.',
  },
]

const CHIPS = [
  'Neighbourhood', 'Local optimum', 'Global optimum',
  'Restart strategy', 'Step size', 'Perturbation', 'Greedy search',
]

// Inline SVG: 1D landscape with local + global optimum, dot stuck at local
function LandscapeDiagram() {
  const W = 500, H = 150
  // Two peaks: local at x≈140,y≈55  global at x≈360,y≈25
  const points = [
    [0, 140], [30, 135], [70, 100], [100, 70], [140, 35],
    [180, 80], [220, 110], [260, 95], [300, 60], [360, 15],
    [400, 60], [440, 100], [480, 120], [500, 130],
  ]
  const poly = points.map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 20}`}
      className="w-full rounded-xl border border-border bg-surface"
      style={{ maxHeight: 160 }}
      role="img"
      aria-label="1D fitness landscape with local and global optimum"
    >
      {/* landscape fill */}
      <polyline
        points={`0,${H + 20} ${poly} ${W},${H + 20}`}
        fill="var(--surface)"
        stroke="none"
      />
      {/* curve */}
      <polyline
        points={poly}
        fill="none"
        stroke={COLOR}
        strokeWidth="2.5"
      />
      {/* stuck dot at local optimum (x=140,y=35) */}
      <circle cx="140" cy="35" r="7" fill={COLOR} />
      <text x="140" y="22" textAnchor="middle" fontSize="10" fill="var(--text-secondary)">
        Stuck here
      </text>
      {/* arrow pointing down at local optimum */}
      <line x1="140" y1="24" x2="140" y2="29" stroke="var(--text-secondary)" strokeWidth="1" />

      {/* star at global optimum (x=360,y=15) */}
      <text x="360" y="12" textAnchor="middle" fontSize="13">⭐</text>
      <text x="360" y="56" textAnchor="middle" fontSize="10" fill="var(--text-secondary)">
        Global optimum
      </text>

      {/* labels */}
      <text x="10" y="H + 15" fontSize="10" fill="var(--text-muted)">Low fitness</text>
      <text x="8" y="20" fontSize="10" fill="var(--text-muted)">High</text>
    </svg>
  )
}

export default function Info() {
  return (
    <div className="space-y-8 mt-6">
      {/* 1 — Definition */}
      <DefinitionCard color={COLOR}>
        A heuristic is a practical rule of thumb for finding a good solution without
        guaranteeing the best one. In search problems, heuristics guide us through
        enormous solution spaces by making moves that seem locally promising —
        even when we can't see the whole picture.
      </DefinitionCard>

      {/* 2 — Fitness landscape */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Imagine the search space as a landscape
        </h2>
        <p className="text-sm leading-relaxed text-secondary mb-4">
          Every possible solution maps to a point on this landscape. Its height
          represents how good it is — better solutions are higher up. The goal is
          to find the highest peak, but we can only see a small area around wherever
          we currently stand. Key concepts: <span className="text-primary font-medium">fitness</span> (solution quality),{' '}
          <span className="text-primary font-medium">neighbourhood</span> (nearby solutions reachable in one move),{' '}
          <span className="text-primary font-medium">local optimum</span> (best in the neighbourhood),{' '}
          <span className="text-primary font-medium">global optimum</span> (the best overall).
        </p>
      </section>

      {/* 3 — Hill climbing */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Hill climbing
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          Start at a random position. Look at nearby solutions (your neighbourhood).
          Move to whichever is better than where you are. Repeat until no neighbour
          improves on your current position. You've found a local optimum — but it
          might not be the highest peak.
        </p>
      </section>

      {/* 4 — Two variants */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Two variants
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VARIANTS.map(({ title, body }) => (
            <div key={title} className="bg-surface rounded-xl p-5">
              <h3 className="text-sm font-semibold text-primary mb-2">{title}</h3>
              <p className="text-sm leading-relaxed text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5 — The trap + SVG diagram */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          The problem with hill climbing
        </h2>
        <p className="text-sm leading-relaxed text-secondary mb-4">
          A local optimum looks like the summit from where you're standing. But
          there may be a much taller peak on the other side of a valley. Hill
          climbing has no mechanism to cross that valley. This is the core
          limitation that all subsequent techniques in this series are designed
          to overcome.
        </p>
        <LandscapeDiagram />
      </section>

      {/* 6 — Key concepts */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Key concepts
        </h2>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map(label => <ConceptChip key={label} label={label} />)}
        </div>
      </section>

      {/* 7 — Did you know */}
      <FactCard color={COLOR}>
        Despite its simplicity, hill climbing on the 1000-city TSP typically finds
        a solution within 20–25% of optimal in milliseconds — far better than any
        random guess, and a useful starting point for more sophisticated methods.
      </FactCard>

      {/* Next topic nudge */}
      <div className="rounded-xl bg-surface p-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-secondary">
          Next: strategies for escaping local optima
        </p>
        <Link
          to="/topic/metaheuristics"
          className="text-sm font-medium shrink-0"
          style={{ color: COLOR }}
        >
          Metaheuristics →
        </Link>
      </div>
    </div>
  )
}
