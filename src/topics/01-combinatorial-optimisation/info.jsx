import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import DefinitionCard from '../../components/DefinitionCard'
import FactCard from '../../components/FactCard'
import ConceptChip from '../../components/ConceptChip'

const COLOR = '#3B82F6'
const TARGET = 2432902008176640000

function AnimatedCounter() {
  const [display, setDisplay] = useState('0')
  const rafRef = useRef(null)
  const startRef = useRef(null)
  const DURATION = 3500

  useEffect(() => {
    function step(ts) {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const value = Math.floor(eased * TARGET)
      setDisplay(value.toLocaleString())
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setDisplay(TARGET.toLocaleString())
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className="my-4 p-5 bg-surface rounded-xl text-center">
      <p className="text-xs uppercase tracking-widest text-muted mb-2">
        Possible orderings of 20 cities
      </p>
      <p
        className="text-3xl font-bold font-mono tracking-tight"
        style={{ color: COLOR }}
      >
        {display}
      </p>
    </div>
  )
}

const PROBLEMS = [
  {
    title: 'Bin Packing',
    body: 'Pack items of different sizes into as few containers as possible. Used in shipping logistics, cloud computing resource allocation, and cutting sheet materials to minimise waste.',
  },
  {
    title: 'Travelling Salesman',
    body: 'Find the shortest route that visits every location exactly once and returns to the start. Used in delivery routing, circuit board manufacturing, and DNA sequencing.',
  },
  {
    title: '0/1 Knapsack',
    body: 'Given items with weights and values, fill a bag to maximise value without exceeding its weight limit. Used in financial portfolio selection, cargo loading, and project scheduling under resource constraints.',
  },
]

const CHIPS = [
  'Search space', 'Objective function', 'Constraints', 'Feasibility',
  'NP-hard', 'Exact methods', 'Heuristic methods',
]

export default function Info() {
  return (
    <div className="space-y-8 mt-6">
      {/* 1 — Definition */}
      <DefinitionCard color={COLOR}>
        A combinatorial optimisation problem asks: given a massive set of possible
        solutions, which one is best? The catch is the set is so large — often
        trillions of possibilities — that checking every option would take longer
        than the universe has existed. We need smarter approaches.
      </DefinitionCard>

      {/* 2 — Why brute force fails */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Why can't we just check everything?
        </h2>
        <p className="text-sm leading-relaxed text-secondary mb-2">
          The number of possible solutions grows exponentially with problem size.
          A 10-city route has 3.6 million possible orderings. A 20-city route has
          over 2 quadrillion — more than all the grains of sand on Earth.
          Even at a billion checks per second, solving that by brute force would
          take thousands of years.
        </p>
        <AnimatedCounter />
      </section>

      {/* 3 — Three classic problems */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Three classic problems
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROBLEMS.map(({ title, body }) => (
            <div key={title} className="bg-surface rounded-xl p-5">
              <h3 className="text-sm font-semibold text-primary mb-2">{title}</h3>
              <p className="text-sm leading-relaxed text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — Key concepts */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-primary mb-3">
          Key concepts
        </h2>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map(label => (
            <ConceptChip key={label} label={label} />
          ))}
        </div>
      </section>

      {/* 5 — Did you know */}
      <FactCard color={COLOR}>
        If you could check 1 billion TSP routes per second, solving a 30-city
        problem by brute force would take over 10 million years — longer than
        our entire species has existed.
      </FactCard>

      {/* 6 — Next topic nudge */}
      <div className="rounded-xl bg-surface p-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-secondary">
          Next: how do we actually search these spaces without checking everything?
        </p>
        <Link
          to="/topic/heuristic-search"
          className="text-sm font-medium shrink-0"
          style={{ color: COLOR }}
        >
          Heuristic Search →
        </Link>
      </div>
    </div>
  )
}
