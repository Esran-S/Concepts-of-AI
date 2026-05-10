import { Link } from 'react-router-dom'
import DefinitionCard from '../../components/DefinitionCard'
import FactCard from '../../components/FactCard'
import ConceptChip from '../../components/ConceptChip'

const COLOR = '#F59E0B'

const GP_PARTS = [
  {
    title: 'Terminal set',
    body: 'The leaf nodes of the evolved program: problem-specific values such as "number of uncolored neighbours", "degree of current node", or numeric constants. These are the primitive inputs a heuristic can inspect.',
  },
  {
    title: 'Function set',
    body: 'The internal nodes: arithmetic and logical operators (+, -, ×, max, if-then-else). The GP combines terminals with functions to build rules like "if degree > 3 then assign colour 1 else assign lowest available colour".',
  },
  {
    title: 'Subtree crossover',
    body: 'Two parent programs swap randomly chosen subtrees. Each child inherits building blocks from both parents — a mix of partial rules. The resulting program is always syntactically valid.',
  },
  {
    title: 'Subtree mutation',
    body: 'A randomly chosen subtree is replaced with a new randomly generated subtree. Introduces new structure that crossover alone could not produce. Bloat — programs growing excessively — is controlled by depth limits.',
  },
]

const CHIPS = [
  'Genetic programming', 'Expression tree', 'Terminal set', 'Function set',
  'Subtree crossover', 'Subtree mutation', 'Bloat', 'Graph colouring',
  'Program synthesis', 'Evolving heuristics',
]

export default function Info() {
  return (
    <div className="space-y-8 mt-6">
      <DefinitionCard color={COLOR}>
        Generation hyper-heuristics use genetic programming to automatically create
        new low-level heuristics. Instead of choosing which existing heuristic to
        apply, the algorithm evolves a program — a tree of operations — that is itself
        a novel heuristic for the target problem.
      </DefinitionCard>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Genetic programming essentials
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GP_PARTS.map(({ title, body }) => (
            <div key={title} className="bg-surface rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-2" style={{ color: COLOR }}>{title}</h3>
              <p className="text-sm leading-relaxed text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          GP for graph colouring
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          Graph colouring is a classic combinatorial problem: assign colours to nodes
          so that no two adjacent nodes share a colour, using as few colours as possible.
          A hand-coded heuristic might order nodes by degree — colour the busiest node
          first. GP evolves more sophisticated rules by combining properties like degree,
          saturation (number of distinct colours already used by neighbours), and
          neighbour count into decision trees. On hard instances, GP-generated heuristics
          regularly outperform manually designed ones.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          The expression tree
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          A GP individual is a tree. Internal nodes are operators from the function set;
          leaf nodes are terminals. Evaluation walks the tree bottom-up: leaves return
          their value, internal nodes apply their operator to their children's results.
          The final value at the root is the heuristic's output — for example, a priority
          score that determines which node to colour next. GP searches the space of all
          such trees, guided by fitness: how well does this heuristic colour a set of
          benchmark graphs?
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">Key concepts</h2>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map(label => <ConceptChip key={label} label={label} />)}
        </div>
      </section>

      <FactCard color={COLOR}>
        Koza introduced genetic programming in 1992. Since then, GP has been used to
        evolve antennas for NASA spacecraft, trading strategies, image feature detectors,
        and scheduling heuristics for hospital operating theatres — in each case producing
        solutions that rival or exceed expert-designed programs.
      </FactCard>

      <div className="rounded-xl bg-surface p-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-secondary">Next: logic that handles degrees of truth</p>
        <Link to="/topic/fuzzy-systems" className="text-sm font-medium shrink-0"
          style={{ color: COLOR }}>Fuzzy Systems →</Link>
      </div>
    </div>
  )
}
