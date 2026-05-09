import { Link } from 'react-router-dom'
import DefinitionCard from '../../components/DefinitionCard'
import FactCard from '../../components/FactCard'
import ConceptChip from '../../components/ConceptChip'

const COLOR = '#8B5CF6'

const STRATEGIES = [
  {
    title: 'Greedy',
    body: 'Accept only if the new solution is better. Guaranteed never to get worse in a single step. Guaranteed to get stuck in a local optimum.',
  },
  {
    title: 'Random Walk',
    body: 'Accept any move regardless of quality. Pure exploration, no exploitation. Good for escaping local optima but never converges.',
  },
  {
    title: 'Simulated Annealing',
    body: 'Accept improvements always. Accept worse moves with probability that decreases as temperature drops. Balances exploration and exploitation dynamically.',
  },
  {
    title: 'Great Deluge',
    body: 'Imagine the landscape flooding. Accept any solution whose quality stays above the current water level. The water level rises steadily. Only improves, but with a soft floor rather than a hard rejection.',
  },
  {
    title: 'Late Acceptance Hill Climbing',
    body: 'Compare the current solution to where the algorithm was L steps ago. If current is at least as good, accept. Simple, effective, requires only one parameter (L), and no probability calculations.',
  },
]

const CHIPS = [
  'Acceptance criterion', 'Move quality', 'Parameter space',
  'Tuning budget', 'Racing', 'Robustness', 'Configuration',
]

export default function Info() {
  return (
    <div className="space-y-8 mt-6">
      {/* 1 — Definition */}
      <DefinitionCard color={COLOR}>
        At each step of a local search algorithm, a decision must be made: accept
        the new candidate solution or stay with the current one? This acceptance
        criterion is one of the most consequential design choices in any
        optimisation algorithm. Different strategies lead to dramatically different
        search behaviour.
      </DefinitionCard>

      {/* 2 — Five strategies */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Five acceptance strategies
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STRATEGIES.slice(0, 2).map(({ title, body }) => (
            <div key={title} className="bg-surface rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-2" style={{ color: COLOR }}>{title}</h3>
              <p className="text-sm leading-relaxed text-secondary">{body}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {STRATEGIES.slice(2).map(({ title, body }) => (
            <div key={title} className="bg-surface rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-2" style={{ color: COLOR }}>{title}</h3>
              <p className="text-sm leading-relaxed text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — Why parameters matter */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Why parameters matter
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          Most algorithms have parameters — the initial temperature in SA, the
          tenure in Tabu Search, the flood rate in Great Deluge. The values chosen
          can change results by orders of magnitude. Tuning them by hand is
          error-prone and expensive. Automated techniques like{' '}
          <span className="font-medium text-primary">racing</span> run multiple
          parameter configurations simultaneously, discard under-performers early,
          and identify strong configurations with a limited evaluation budget.
        </p>
      </section>

      {/* 4 — Key concepts */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Key concepts
        </h2>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map(label => <ConceptChip key={label} label={label} />)}
        </div>
      </section>

      {/* 5 — Did you know */}
      <FactCard color={COLOR}>
        Late Acceptance Hill Climbing was first published in 2012 and is notable
        for having essentially one parameter (the look-back window L). Despite its
        simplicity, it matches or outperforms SA on a surprisingly wide range of
        benchmark problems.
      </FactCard>

      <div className="rounded-xl bg-surface p-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-secondary">
          Next: how populations evolve toward better solutions
        </p>
        <Link to="/topic/evolutionary-algorithms-1"
          className="text-sm font-medium shrink-0" style={{ color: COLOR }}>
          Evolutionary Algorithms →
        </Link>
      </div>
    </div>
  )
}
