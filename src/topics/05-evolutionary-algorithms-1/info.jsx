import { Link } from 'react-router-dom'
import DefinitionCard from '../../components/DefinitionCard'
import FactCard from '../../components/FactCard'
import ConceptChip from '../../components/ConceptChip'

const COLOR = '#10B981'

const OPERATORS = [
  {
    title: 'Selection',
    body: 'Decide which individuals reproduce. Tournament selection: randomly pick a small group, the best one wins. Roulette selection: each individual\'s chance is proportional to its fitness — better individuals get a bigger slice of the wheel.',
  },
  {
    title: 'Crossover',
    body: 'Combine two parent solutions to produce a child. One-point crossover: take the first segment of parent A and the remainder of parent B. The child inherits building blocks from both parents.',
  },
  {
    title: 'Mutation',
    body: 'Randomly alter part of an individual after crossover. Prevents the population from becoming too similar. Without mutation, once useful variation is lost from the population, it cannot be recovered.',
  },
]

const CHIPS = [
  'Population', 'Chromosome', 'Fitness', 'Generation',
  'Selection pressure', 'Crossover', 'Mutation rate',
  'Premature convergence', 'Diversity', 'Memetic algorithm',
]

export default function Info() {
  return (
    <div className="space-y-8 mt-6">
      <DefinitionCard color={COLOR}>
        Evolutionary algorithms are population-based methods inspired by biological
        evolution. Rather than improving a single solution, they maintain a
        population of candidates and improve it generation by generation through
        selection, crossover, and mutation.
      </DefinitionCard>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          The biological analogy
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          Each candidate solution is an individual. Its encoded representation —
          the values that define it — is its{' '}
          <span className="font-medium text-primary">chromosome</span>. Individuals
          that perform better are more likely to reproduce, passing their traits on.
          Over successive generations, the population drifts toward better regions
          of the search space. Variation comes from{' '}
          <span className="font-medium text-primary">crossover</span> (combining
          two parents) and{' '}
          <span className="font-medium text-primary">mutation</span> (randomly
          altering an individual).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Three core operators
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {OPERATORS.map(({ title, body }) => (
            <div key={title} className="bg-surface rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-2" style={{ color: COLOR }}>{title}</h3>
              <p className="text-sm leading-relaxed text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Adding local search: Memetic Algorithms
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          A memetic algorithm adds a local search step after crossover and mutation.
          Each new individual is locally refined before entering the population.
          The name references "memes" — units of cultural information that
          propagate and evolve, analogous to genes but in social rather than
          biological systems. Memetic algorithms often dramatically outperform pure
          genetic algorithms because each individual entering the competition has
          already been polished.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Key concepts
        </h2>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map(label => <ConceptChip key={label} label={label} />)}
        </div>
      </section>

      <FactCard color={COLOR}>
        Genetic algorithms were described by John Holland in 1975. The field has
        since produced techniques applied to jet engine design, drug discovery,
        scheduling air traffic, and evolving the controllers of soft robots.
      </FactCard>

      <div className="rounded-xl bg-surface p-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-secondary">
          Next: permutations, self-adaptation, and benchmark functions
        </p>
        <Link to="/topic/evolutionary-algorithms-2"
          className="text-sm font-medium shrink-0" style={{ color: COLOR }}>
          Evolutionary Algorithms II →
        </Link>
      </div>
    </div>
  )
}
