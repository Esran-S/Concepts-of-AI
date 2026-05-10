import { Link } from 'react-router-dom'
import DefinitionCard from '../../components/DefinitionCard'
import FactCard from '../../components/FactCard'
import ConceptChip from '../../components/ConceptChip'

const COLOR = '#F43F5E'

const MF_SHAPES = [
  { name: 'Triangular',   desc: 'Three points: left foot, peak, right foot. Simple, fast to compute. Standard choice for linguistic labels like "medium".' },
  { name: 'Trapezoidal',  desc: 'Four points: two feet and two peaks forming a flat top. Useful when a range of values all fully belong to a set (e.g. "normal body temperature").' },
  { name: 'Gaussian',     desc: 'Bell-curve shape with mean and standard deviation. Smooth transitions; preferred in modelling and control where abrupt changes are undesirable.' },
  { name: 'Singleton',    desc: 'A spike at one exact value, membership = 1 there and 0 everywhere else. Used in Sugeno-type systems where outputs are crisp functions.' },
]

const PIPELINE = [
  { step: '1', title: 'Fuzzification',    desc: 'Convert crisp inputs (e.g. temperature = 22°C) into degrees of membership across linguistic sets (Cold: 0.3, Warm: 0.7, Hot: 0.0).' },
  { step: '2', title: 'Rule evaluation',   desc: 'Fire each IF-THEN rule. The condition is evaluated using AND (min) or OR (max) operators. Each rule produces an activation strength.' },
  { step: '3', title: 'Aggregation',       desc: 'Combine all rule outputs into a single fuzzy set for each output variable, typically using the maximum of all activations.' },
  { step: '4', title: 'Defuzzification',   desc: 'Convert the aggregated fuzzy output into a single crisp value. The centroid method computes the centre of gravity of the output set.' },
]

const CHIPS = [
  'Fuzzy set', 'Membership function', 'Linguistic variable', 'Fuzzy rule',
  'Fuzzification', 'Defuzzification', 'Centroid', 'Mamdani FIS',
  'Sugeno FIS', 'Rule base', 'Crisp output',
]

export default function Info() {
  return (
    <div className="space-y-8 mt-6">
      <DefinitionCard color={COLOR}>
        Fuzzy logic replaces the binary true/false of classical logic with degrees
        of truth in [0, 1]. A temperature can be "quite warm" (0.7) and "a little
        hot" (0.3) at the same time — these are not contradictions, just partial
        memberships in overlapping sets.
      </DefinitionCard>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Membership function shapes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MF_SHAPES.map(({ name, desc }) => (
            <div key={name} className="bg-surface rounded-xl p-4">
              <p className="text-sm font-semibold mb-1" style={{ color: COLOR }}>{name}</p>
              <p className="text-sm text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          The fuzzy inference pipeline
        </h2>
        <div className="space-y-3">
          {PIPELINE.map(({ step, title, desc }) => (
            <div key={step} className="flex gap-4 bg-surface rounded-xl p-4">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                style={{ backgroundColor: COLOR }}>{step}</div>
              <div>
                <p className="text-sm font-semibold mb-0.5 text-primary">{title}</p>
                <p className="text-sm text-secondary leading-relaxed">{desc}</p>
              </div>
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
        Lotfi Zadeh introduced fuzzy sets in 1965 at UC Berkeley. The concept was
        initially controversial — many mathematicians rejected the idea of partial truth.
        Today fuzzy logic controls washing machines, camera autofocus, subway trains,
        and medical diagnostic systems across millions of devices.
      </FactCard>

      <div className="rounded-xl bg-surface p-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-secondary">Next: emergent behaviour from simple rules</p>
        <Link to="/topic/agent-based-modelling" className="text-sm font-medium shrink-0"
          style={{ color: COLOR }}>Agent-Based Modelling →</Link>
      </div>
    </div>
  )
}
