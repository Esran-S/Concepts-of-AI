import { Link } from 'react-router-dom'
import DefinitionCard from '../../components/DefinitionCard'
import FactCard from '../../components/FactCard'
import ConceptChip from '../../components/ConceptChip'

const COLOR = '#10B981'

const BENCHMARKS = [
  {
    title: 'Sphere',
    formula: 'f(x) = Σ xᵢ²',
    body: 'Smooth bowl shape, one minimum at the origin. Tests basic convergence speed — the simplest possible benchmark.',
  },
  {
    title: 'Rastrigin',
    formula: 'f(x) = 10n + Σ(xᵢ² − 10cos(2πxᵢ))',
    body: 'Highly multimodal — many local optima in a regular grid pattern. Tests ability to escape and not settle prematurely.',
  },
  {
    title: 'Ackley',
    formula: 'flat outer, deep narrow minimum',
    body: 'Flat outer region, deep narrow global minimum. Deceptive — algorithms can appear to converge while still far from the answer.',
  },
  {
    title: 'Rosenbrock',
    formula: 'f(x) = Σ [100(xᵢ₊₁−xᵢ²)² + (1−xᵢ)²]',
    body: 'A curved valley leading to the global minimum at (1,1,…). Easy to find the valley, hard to follow it all the way to the optimum.',
  },
]

const CHIPS = [
  'Permutation', 'Order crossover', 'PMX', 'Self-adaptation',
  'Meme', 'Benchmark function', 'Multimodal', 'Separable', 'COCO framework',
]

export default function Info() {
  return (
    <div className="space-y-8 mt-6">
      <DefinitionCard color={COLOR}>
        Standard evolutionary operators don't always work as intended. When the
        problem involves ordering — visiting cities in sequence, scheduling tasks
        — naive crossover produces invalid solutions. Evolutionary Algorithms II
        covers how to handle these cases and how to let algorithms adapt themselves.
      </DefinitionCard>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Permutation representation
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          In problems like TSP, a solution is an ordering of items. Standard
          crossover can produce duplicates — a child that visits city 5 twice and
          skips city 3. Two operators designed for orderings:{' '}
          <span className="font-medium text-primary">Order Crossover (OX)</span>{' '}
          copies a random segment from parent A, then fills the remaining slots
          with parent B's cities in their original order — preserving relative
          ordering without duplicates.{' '}
          <span className="font-medium text-primary">Partially Mapped Crossover (PMX)</span>{' '}
          maps conflicting positions between parents explicitly, ensuring validity.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Algorithms that choose their own local search
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          Standard memetic algorithms apply one fixed local search to every
          individual. <span className="font-medium text-primary">Multimeme MAs</span>{' '}
          encode the choice of local search method as part of the individual's
          chromosome — a "meme". Individuals evolve not just their solution but
          also the local search strategy that refines it. Over generations,
          effective meme choices propagate just like good solution values. This is
          self-adaptation: the algorithm learns what works as it runs.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Benchmark functions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BENCHMARKS.map(({ title, formula, body }) => (
            <div key={title} className="bg-surface rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-0.5" style={{ color: COLOR }}>{title}</h3>
              <p className="text-xs font-mono text-muted mb-2">{formula}</p>
              <p className="text-sm leading-relaxed text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">Key concepts</h2>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map(label => <ConceptChip key={label} label={label} />)}
        </div>
      </section>

      <FactCard color={COLOR}>
        The COCO benchmarking platform standardises evaluation of optimisation
        algorithms across 24 test functions. Before platforms like this, it was
        nearly impossible to make fair comparisons because every paper used
        different test conditions.
      </FactCard>

      <div className="rounded-xl bg-surface p-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-secondary">Next: algorithms that choose algorithms</p>
        <Link to="/topic/hyper-heuristics-1" className="text-sm font-medium shrink-0"
          style={{ color: COLOR }}>Hyper-heuristics →</Link>
      </div>
    </div>
  )
}
