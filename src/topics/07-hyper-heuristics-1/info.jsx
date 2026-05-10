import { Link } from 'react-router-dom'
import DefinitionCard from '../../components/DefinitionCard'
import FactCard from '../../components/FactCard'
import ConceptChip from '../../components/ConceptChip'

const COLOR = '#F59E0B'

const FAMILIES = [
  {
    title: 'Selection hyper-heuristics',
    body: 'Choose which existing low-level heuristic to apply next. The HH never touches the problem directly — it only decides which tool to use. Examples: simple random, greedy (try each, pick the best), and reinforcement-learning-based (reward LLHs that improve the solution).',
  },
  {
    title: 'Generation hyper-heuristics',
    body: 'Create new heuristics automatically, usually via genetic programming. The HH evolves programs that combine primitive operations into novel search operators. The programs generated can then be applied to instances the GP never saw during training.',
  },
]

const ACCEPTANCE = [
  { name: 'All Moves',       desc: 'Accept any move unconditionally. Explores freely but can undo good work.' },
  { name: 'Only Improving',  desc: 'Accept a move only if it improves fitness. Conservative; can get stuck.' },
  { name: 'Great Deluge',    desc: 'Accept moves that keep the solution above a rising water level.' },
  { name: 'Monte Carlo',     desc: 'Accept improving always; accept worsening with decreasing probability.' },
]

const CHIPS = [
  'Hyper-heuristic', 'Low-level heuristic', 'Selection HH',
  'Generation HH', 'Domain barrier', 'Move acceptance',
  'Reinforcement learning', 'Credit assignment', 'Generality',
]

export default function Info() {
  return (
    <div className="space-y-8 mt-6">
      <DefinitionCard color={COLOR}>
        A hyper-heuristic is a search method that operates on the space of heuristics
        rather than directly on problem solutions. The defining idea is the domain
        barrier: the hyper-heuristic never needs to know the problem details — it only
        sees performance feedback from whichever heuristic it chose.
      </DefinitionCard>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Two families
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FAMILIES.map(({ title, body }) => (
            <div key={title} className="bg-surface rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-2" style={{ color: COLOR }}>{title}</h3>
              <p className="text-sm leading-relaxed text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          The domain barrier
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          Traditional metaheuristics are general — but they still need problem-specific
          operators. A hyper-heuristic replaces the operator with a selection policy:
          given a set of low-level heuristics (LLHs) provided by a domain expert, the HH
          decides which one to call. The LLHs understand the domain; the HH is completely
          domain-independent. This means the same HH framework can be applied across
          timetabling, bin packing, vehicle routing, and more without modification.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Move acceptance at the hyper level
        </h2>
        <p className="text-sm leading-relaxed text-secondary mb-4">
          After a LLH produces a candidate solution, the HH must decide whether to
          accept it. The same strategies from metaheuristics apply here:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACCEPTANCE.map(({ name, desc }) => (
            <div key={name} className="bg-surface rounded-xl p-4">
              <p className="text-sm font-semibold mb-1" style={{ color: COLOR }}>{name}</p>
              <p className="text-sm text-secondary leading-relaxed">{desc}</p>
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
        The term "hyper-heuristic" was coined in 2000 by Cowling, Kendall, and Soubeiga
        to describe their work on automated nurse rostering. The key insight was that
        choosing which heuristic to apply is itself an optimisation problem — one that
        can be solved with a general-purpose strategy.
      </FactCard>

      <div className="rounded-xl bg-surface p-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-secondary">Next: generating heuristics with genetic programming</p>
        <Link to="/topic/hyper-heuristics-2" className="text-sm font-medium shrink-0"
          style={{ color: COLOR }}>Hyper-heuristics II →</Link>
      </div>
    </div>
  )
}
