import { Link } from 'react-router-dom'
import DefinitionCard from '../../components/DefinitionCard'
import FactCard from '../../components/FactCard'
import ConceptChip from '../../components/ConceptChip'

const COLOR = '#F43F5E'

const MODELS = [
  {
    title: "Schelling's segregation",
    body: 'Agents on a grid tolerate some fraction of unlike neighbours. Even mild individual preferences produce strong global segregation — a striking example of micro-motives producing macro-behaviour that no agent intended.',
  },
  {
    title: 'Boids',
    body: 'Each agent follows three local rules: avoid crowding neighbours, steer toward average heading of nearby flock-mates, and move toward average position. Three rules, zero choreography — yet realistic flocking emerges.',
  },
  {
    title: "Conway's Life",
    body: 'A zero-player cellular automaton: cells live or die based on neighbour counts. Despite its simple rules it produces gliders, oscillators, and Turing-complete computation.',
  },
  {
    title: 'Heroes & Cowards',
    body: 'Each agent is randomly a hero or a coward. Heroes position between their friend and enemy; cowards hide behind their friend. The group self-organises without any agent knowing the global pattern.',
  },
]

const CHIPS = [
  'Agent', 'Emergence', 'Local rules', 'Swarm intelligence',
  'Flocking', 'Boids', 'Schelling model', 'Cellular automaton',
  'Self-organisation', 'NetLogo', 'Macro behaviour',
]

export default function Info() {
  return (
    <div className="space-y-8 mt-6">
      <DefinitionCard color={COLOR}>
        Agent-based modelling simulates a system as a collection of autonomous
        agents, each following simple local rules. Complex global behaviour —
        flocking, segregation, traffic jams, market crashes — emerges from
        interactions between agents rather than being designed top-down.
      </DefinitionCard>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Three properties of agents
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          An agent is{' '}
          <span className="font-medium text-primary">autonomous</span> — it
          makes decisions based on its own state and local observations.
          It is{' '}
          <span className="font-medium text-primary">reactive</span> — it
          responds to changes in its environment. And it is{' '}
          <span className="font-medium text-primary">social</span> — it
          interacts with other agents. No agent has a global view; no central
          coordinator directs the system. The global pattern is an emergent
          property of local interactions.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Classic models
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODELS.map(({ title, body }) => (
            <div key={title} className="bg-surface rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-2" style={{ color: COLOR }}>{title}</h3>
              <p className="text-sm leading-relaxed text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Why ABM?
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          Equation-based models work well when agents are identical and interactions
          are uniform. ABM is better when individual variation matters — different
          thresholds, strategies, or information — or when space and adjacency
          determine who interacts with whom. ABM can also capture path dependence:
          the history of interactions shapes future states in ways that aggregate
          equations cannot represent.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">Key concepts</h2>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map(label => <ConceptChip key={label} label={label} />)}
        </div>
      </section>

      <FactCard color={COLOR}>
        Boids was created by Craig Reynolds in 1986. He submitted it to SIGGRAPH
        as a computer graphics paper, not an AI paper — but its demonstration that
        three simple rules can produce lifelike flocking made it one of the most
        cited works in both fields.
      </FactCard>

      <div className="rounded-xl bg-surface p-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-secondary">Next: from next-token prediction to agentic AI</p>
        <Link to="/topic/large-language-models" className="text-sm font-medium shrink-0"
          style={{ color: COLOR }}>Large Language Models →</Link>
      </div>
    </div>
  )
}
