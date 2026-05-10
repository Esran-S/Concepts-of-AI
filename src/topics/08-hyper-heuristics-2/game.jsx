import { useState } from 'react'

const COLOR = '#F59E0B'

// 8-node graph, chromatic number 3
const NODES = [
  { id: 0, x: 200, y: 55 },
  { id: 1, x: 75,  y: 150 },
  { id: 2, x: 325, y: 150 },
  { id: 3, x: 28,  y: 280 },
  { id: 4, x: 200, y: 310 },
  { id: 5, x: 372, y: 280 },
  { id: 6, x: 95,  y: 310 },
  { id: 7, x: 305, y: 310 },
]

const EDGES = [
  [0,1], [0,2], [1,2],
  [0,3], [1,4], [2,5],
  [3,4], [4,5],
  [3,6], [5,6],
  [6,7], [4,7],
]

const PALETTE = [
  { id: 0, name: 'Red',   bg: '#F87171', border: '#EF4444', text: '#fff' },
  { id: 1, name: 'Blue',  bg: '#60A5FA', border: '#3B82F6', text: '#fff' },
  { id: 2, name: 'Green', bg: '#34D399', border: '#10B981', text: '#fff' },
]

function countConflicts(colors) {
  return EDGES.filter(([a, b]) => colors[a] !== null && colors[b] !== null && colors[a] === colors[b]).length
}

function greedySolve() {
  const degrees = NODES.map((_, i) => EDGES.filter(([a,b]) => a===i || b===i).length)
  const order = [...Array(NODES.length).keys()].sort((a, b) => degrees[b] - degrees[a])
  const colors = Array(NODES.length).fill(null)
  for (const node of order) {
    const used = new Set(
      EDGES.filter(([a,b]) => a===node || b===node)
        .map(([a,b]) => colors[a===node ? b : a])
        .filter(c => c !== null)
    )
    let c = 0; while (used.has(c)) c++
    colors[node] = c
  }
  return colors
}

const INITIAL_COLORS = Array(NODES.length).fill(null)
const GREEDY_SOLUTION = greedySolve()

export default function Game() {
  const [colors, setColors] = useState(INITIAL_COLORS)
  const [selectedColor, setSelectedColor] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [phase, setPhase] = useState('play')  // play | solved

  const displayColors = showSolution ? GREEDY_SOLUTION : colors
  const conflicts = countConflicts(displayColors)
  const colored = displayColors.filter(c => c !== null).length
  const colorsUsed = new Set(displayColors.filter(c => c !== null)).size

  function handleNodeClick(nodeId) {
    if (showSolution) return
    setColors(prev => {
      const next = [...prev]
      next[nodeId] = selectedColor
      if (countConflicts(next) === 0 && next.every(c => c !== null)) setPhase('solved')
      return next
    })
  }

  function handleReset() {
    setColors(INITIAL_COLORS)
    setShowSolution(false)
    setPhase('play')
  }

  function getNodeStyle(id) {
    const c = displayColors[id]
    if (c === null) return { fill: 'var(--surface)', stroke: 'var(--border)', strokeWidth: 2 }
    const p = PALETTE[c % PALETTE.length]
    return { fill: p.bg, stroke: p.border, strokeWidth: 2 }
  }

  function isConflictEdge([a, b]) {
    return displayColors[a] !== null && displayColors[b] !== null && displayColors[a] === displayColors[b]
  }

  return (
    <div className="mt-6 space-y-5">
      <p className="text-sm text-secondary leading-relaxed">
        Color the graph so that no two connected nodes share a color. Three colors
        are enough — can you find a valid 3-coloring? Select a color below, then
        click nodes to assign it. Press "Show heuristic solution" to see how a
        degree-based heuristic solves it automatically.
      </p>

      {/* Color picker */}
      {!showSolution && (
        <div className="flex gap-2 items-center flex-wrap">
          <p className="text-xs text-muted mr-1">Active color:</p>
          {PALETTE.map(p => (
            <button key={p.id} onClick={() => setSelectedColor(p.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: p.bg,
                color: p.text,
                outline: selectedColor === p.id ? `3px solid ${p.border}` : 'none',
                outlineOffset: 2,
              }}>
              {p.name}
            </button>
          ))}
          <button onClick={handleReset}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs text-secondary border border-border hover:bg-surface">
            Reset
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex gap-5 text-xs text-muted flex-wrap">
        <span>Colored: <strong className="text-primary">{colored}/{NODES.length}</strong></span>
        <span>Colors used: <strong className="text-primary">{colorsUsed}</strong></span>
        <span>Conflicts: <strong style={{ color: conflicts > 0 ? '#F43F5E' : '#10B981' }}>{conflicts}</strong></span>
      </div>

      {/* Graph SVG */}
      <div className="bg-surface rounded-xl overflow-hidden border border-border">
        <svg viewBox="0 0 400 370" className="w-full" style={{ maxHeight: 360 }}>
          {/* Edges */}
          {EDGES.map(([a, b], i) => (
            <line key={i}
              x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
              stroke={isConflictEdge([a,b]) ? '#F43F5E' : 'var(--border)'}
              strokeWidth={isConflictEdge([a,b]) ? 3 : 2} />
          ))}
          {/* Nodes */}
          {NODES.map(n => {
            const style = getNodeStyle(n.id)
            return (
              <g key={n.id} onClick={() => handleNodeClick(n.id)}
                style={{ cursor: showSolution ? 'default' : 'pointer' }}>
                <circle cx={n.x} cy={n.y} r={22} {...style} />
                <text x={n.x} y={n.y + 5} textAnchor="middle"
                  style={{ fontSize: 13, fontWeight: 600, fill: displayColors[n.id] !== null ? '#fff' : 'var(--text-primary)', userSelect: 'none' }}>
                  {n.id}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Outcome messages */}
      {phase === 'solved' && !showSolution && (
        <div className="rounded-xl bg-surface p-4 text-center">
          <p className="text-sm font-semibold" style={{ color: COLOR }}>Valid 3-coloring found!</p>
          <p className="text-xs text-muted mt-1">No adjacent nodes share a color — the graph is properly colored.</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        {!showSolution && (
          <button onClick={() => setShowSolution(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: COLOR }}>
            Show heuristic solution
          </button>
        )}
        {showSolution && (
          <div className="flex-1 rounded-xl bg-surface p-4">
            <p className="text-sm font-semibold mb-1" style={{ color: COLOR }}>Degree-ordering heuristic</p>
            <p className="text-xs text-muted leading-relaxed">
              Nodes are ordered by degree (highest first). Each node gets the smallest
              color index not already used by its colored neighbors. This greedy rule
              solves many graphs optimally — but not all. A GP-generated heuristic can
              learn more nuanced orderings that work better on hard instances.
            </p>
          </div>
        )}
        <button onClick={handleReset}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-secondary hover:bg-surface">
          Reset
        </button>
      </div>
    </div>
  )
}
