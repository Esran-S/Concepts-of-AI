import React, { Suspense } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { TOPICS } from '../topics/meta'
import TabBar from '../components/TabBar'
import NotFound from './NotFound'

const FOLDER_MAP = {
  'combinatorial-optimisation':  '01-combinatorial-optimisation',
  'heuristic-search':            '02-heuristic-search',
  'metaheuristics':              '03-metaheuristics',
  'move-acceptance':             '04-move-acceptance',
  'evolutionary-algorithms-1':   '05-evolutionary-algorithms-1',
  'evolutionary-algorithms-2':   '06-evolutionary-algorithms-2',
  'hyper-heuristics-1':          '07-hyper-heuristics-1',
  'hyper-heuristics-2':          '08-hyper-heuristics-2',
  'fuzzy-systems':               '09-fuzzy-systems',
  'agent-based-modelling':       '10-agent-based-modelling',
  'large-language-models':       '11-large-language-models',
}

function LoadingSkeleton() {
  return (
    <div className="mt-6 space-y-3 animate-pulse">
      <div className="h-4 bg-surface rounded w-3/4" />
      <div className="h-4 bg-surface rounded w-1/2" />
      <div className="h-4 bg-surface rounded w-2/3" />
    </div>
  )
}

export default function Topic() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') || 'info'

  const topic = TOPICS.find(t => t.slug === slug)
  if (!topic) return <NotFound />

  const folder = FOLDER_MAP[slug]

  const Info = React.lazy(() => import(`../topics/${folder}/info.jsx`))
  const Game = React.lazy(() => import(`../topics/${folder}/game.jsx`))
  const Viz  = React.lazy(() => import(`../topics/${folder}/viz.jsx`))

  let ActiveView
  if (view === 'game') ActiveView = Game
  else if (view === 'viz') ActiveView = Viz
  else ActiveView = Info

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary transition-colors mb-6"
      >
        ← All topics
      </Link>

      <div className="mb-6">
        <p
          className="text-xs uppercase tracking-widest mb-1"
          style={{ color: topic.color }}
        >
          {topic.group}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-primary mb-1">
          {topic.title}
        </h1>
        <p className="text-sm text-secondary leading-relaxed">{topic.subtitle}</p>
      </div>

      <TabBar slug={slug} accentColor={topic.color} />

      <Suspense fallback={<LoadingSkeleton />}>
        <ActiveView />
      </Suspense>
    </div>
  )
}
