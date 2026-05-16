import React, { Suspense } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { TOPICS } from '../topics/meta'
import TabBar from '../components/TabBar'
import NotFound from './NotFound'
import ErrorBoundary from '../components/ErrorBoundary'

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
      <div className="h-4 rounded-xl w-3/4" style={{ background: 'var(--surface)' }} />
      <div className="h-4 rounded-xl w-1/2" style={{ background: 'var(--surface)' }} />
      <div className="h-4 rounded-xl w-2/3" style={{ background: 'var(--surface)' }} />
    </div>
  )
}

export default function Topic() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') || 'info'

  const topic = TOPICS.find(t => t.slug === slug)
  if (!topic) return <NotFound />

  // Validate slug against the known whitelist before using it in a dynamic import
  const folder = FOLDER_MAP[slug]
  if (!folder) return <NotFound />

  // Explicit whitelist — unknown view values fall back to 'info'
  const VALID_VIEWS = new Set(['info', 'game', 'viz'])
  const safeView = VALID_VIEWS.has(view) ? view : 'info'

  const Info = React.lazy(() => import(`../topics/${folder}/info.jsx`))
  const Game = React.lazy(() => import(`../topics/${folder}/game.jsx`))
  const Viz  = React.lazy(() => import(`../topics/${folder}/viz.jsx`))

  let ActiveView
  if (safeView === 'game') ActiveView = Game
  else if (safeView === 'viz') ActiveView = Viz
  else ActiveView = Info

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-6 transition-opacity hover:opacity-60"
        style={{ color: 'var(--text-muted)' }}
      >
        ← All topics
      </Link>

      <div className="flex items-start gap-4 mb-7">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-[13px] font-bold shrink-0 mt-0.5"
          style={{ background: topic.color }}
        >
          {String(topic.id).padStart(2, '0')}
        </div>
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-0.5"
            style={{ color: topic.color }}
          >
            {topic.group}
          </p>
          <h1
            className="text-2xl font-bold tracking-tight mb-0.5"
            style={{ color: 'var(--text-primary)' }}
          >
            {topic.title}
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {topic.subtitle}
          </p>
        </div>
      </div>

      <TabBar slug={slug} accentColor={topic.color} />

      <ErrorBoundary>
        <Suspense fallback={<LoadingSkeleton />}>
          <ActiveView />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
