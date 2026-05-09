import { Link } from 'react-router-dom'
import DefinitionCard from '../../components/DefinitionCard'
import FactCard from '../../components/FactCard'
import ConceptChip from '../../components/ConceptChip'

const COLOR = '#8B5CF6'

const APPROACHES = [
  {
    title: 'Simulated Annealing',
    body: 'Inspired by the way molten metal cools. Early in the run, worse solutions are accepted with high probability — allowing the algorithm to jump around the landscape freely. As temperature drops, it becomes increasingly selective, converging on a good solution. The name comes from the physical annealing process in metallurgy.',
  },
  {
    title: 'Tabu Search',
    body: 'Maintains a short list of recently visited solutions and forbids returning to them. This forces the algorithm to explore new territory even when staying would seem locally sensible.',
  },
  {
    title: 'Iterated Local Search',
    body: 'Run hill climbing until stuck. Apply a random perturbation (a "kick") to escape the local optimum. Hill climb again. Repeat. Simple and often highly effective.',
  },
  {
    title: 'Variable Neighbourhood Search',
    body: 'When stuck, systematically change the definition of what counts as a "neighbour" and search again. Different neighbourhood structures reveal different local optima.',
  },
]

const CHIPS = [
  'Escape mechanism', 'Acceptance criterion', 'Temperature',
  'Cooling schedule', 'Tabu list', 'Perturbation',
  'Intensification', 'Diversification',
]

export default function Info() {
  return (
    <div className="space-y-8 mt-6">
      {/* 1 — Definition */}
      <DefinitionCard color={COLOR}>
        A metaheuristic is a high-level strategy for tackling hard optimisation
        problems. Unlike a basic heuristic that always climbs upward, a
        metaheuristic has mechanisms built in for escaping local optima —
        sometimes accepting a worse solution in the short term to find something
        much better later.
      </DefinitionCard>

      {/* 2 — Core insight */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          The core insight
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          Hill climbing always gets stuck. The key realisation is that you
          sometimes need to get worse before you can get better. If you only ever
          accept improvements, you'll always stop at the first peak you find.
          Metaheuristics are frameworks for deciding <em>when</em> to accept a
          step backward — with the hope that it opens a path to something far
          better ahead.
        </p>
      </section>

      {/* 3 — Four approaches */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Four approaches
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {APPROACHES.map(({ title, body }) => (
            <div key={title} className="bg-surface rounded-xl p-5">
              <h3 className="text-sm font-semibold text-primary mb-2"
                style={{ color: COLOR }}>{title}</h3>
              <p className="text-sm leading-relaxed text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — Exploration vs exploitation */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          The fundamental tradeoff
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          Every optimisation algorithm balances two competing pressures.{' '}
          <span className="font-medium text-primary">Exploitation</span>: refine
          and improve what you have.{' '}
          <span className="font-medium text-primary">Exploration</span>: go
          somewhere new and look around. Too much exploitation and you get stuck
          in a local optimum. Too much exploration and you never converge on
          anything useful. Good metaheuristics adjust this balance dynamically —
          exploring broadly early, exploiting tightly late.
        </p>
      </section>

      {/* 5 — Key concepts */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Key concepts
        </h2>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map(label => <ConceptChip key={label} label={label} />)}
        </div>
      </section>

      {/* 6 — Did you know */}
      <FactCard color={COLOR}>
        Simulated Annealing was named after and inspired by a 1953 paper about
        statistical mechanics. The optimisation version appeared in 1983 — the
        same year in three independent papers from different research groups who
        had no idea about each other.
      </FactCard>

      {/* Next nudge */}
      <div className="rounded-xl bg-surface p-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-secondary">
          Next: how algorithms decide to accept a worse solution
        </p>
        <Link to="/topic/move-acceptance" className="text-sm font-medium shrink-0"
          style={{ color: COLOR }}>
          Move Acceptance →
        </Link>
      </div>
    </div>
  )
}
