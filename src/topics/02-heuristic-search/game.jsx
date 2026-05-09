import { useState, useEffect, useCallback, useRef } from 'react'

const COLOR = '#3B82F6'
const GRID = 12
const MAX_RESTARTS = 5

// Smooth noise: fill grid randomly then average neighbours twice
function generateGrid(seed) {
  let s = seed
  const lcg = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }

  const raw = Array.from({ length: GRID }, () =>
    Array.from({ length: GRID }, () => Math.floor(lcg() * 101))
  )

  function smooth(g) {
    return g.map((row, r) =>
      row.map((_, c) => {
        const vals = []
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc
            if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) vals.push(g[nr][nc])
          }
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      })
    )
  }

  const smoothed = smooth(smooth(raw))

  // find global max
  let maxVal = 0, maxR = 0, maxC = 0
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (smoothed[r][c] > maxVal) { maxVal = smoothed[r][c]; maxR = r; maxC = c }

  return { grid: smoothed, optimum: { r: maxR, c: maxC, val: maxVal } }
}

function randomInterior(seed, excludeSet) {
  let s = seed
  const lcg = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
  let r, c, key
  do {
    r = 1 + Math.floor(lcg() * (GRID - 2))
    c = 1 + Math.floor(lcg() * (GRID - 2))
    key = `${r},${c}`
  } while (excludeSet && excludeSet.has(key))
  return { r, c }
}

function reveal(visible, r, c) {
  const next = visible.map(row => [...row])
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) next[nr][nc] = true
    }
  return next
}

function fitnessColor(val) {
  // low = cool blue (#3B82F6 at low opacity), high = warm amber (#F59E0B)
  const t = val / 100
  const r = Math.round(59 + t * (245 - 59))
  const g = Math.round(130 + t * (158 - 130))
  const b = Math.round(246 + t * (11 - 246))
  return `rgb(${r},${g},${b})`
}

function Stars({ count }) {
  return (
    <span className="text-xl">
      {[1, 2, 3].map(i => (
        <span key={i} style={{ color: i <= count ? '#F59E0B' : '#D1D5DB' }}>★</span>
      ))}
    </span>
  )
}

export default function Game() {
  const [seed, setSeed] = useState(99)
  const [gridData, setGridData] = useState(null)
  const [visible, setVisible] = useState(null)
  const [player, setPlayer] = useState(null)
  const [bestVal, setBestVal] = useState(0)
  const [restartsLeft, setRestartsLeft] = useState(MAX_RESTARTS)
  const [phase, setPhase] = useState('playing') // 'playing' | 'result'
  const [lastMove, setLastMove] = useState(null) // 'up'|'down'|'flat'
  const seedRef = useRef(seed)

  const initGame = useCallback((s) => {
    const { grid, optimum } = generateGrid(s)
    const startPos = randomInterior(s + 1, null)
    const initVisible = reveal(
      Array.from({ length: GRID }, () => new Array(GRID).fill(false)),
      startPos.r, startPos.c
    )
    setGridData({ grid, optimum })
    setVisible(initVisible)
    setPlayer(startPos)
    setBestVal(grid[startPos.r][startPos.c])
    setRestartsLeft(MAX_RESTARTS)
    setPhase('playing')
    setLastMove(null)
    seedRef.current = s
  }, [])

  useEffect(() => { initGame(seed) }, [])

  // Arrow key movement
  useEffect(() => {
    if (phase !== 'playing') return
    const DIRS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    function onKey(e) {
      const d = DIRS[e.key]
      if (!d) return
      e.preventDefault()
      const nr = player.r + d[0], nc = player.c + d[1]
      if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) return
      handleMove(nr, nc)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, player, visible, gridData])

  function handleMove(nr, nc) {
    if (!gridData || !visible) return
    // If unrevealed: first click reveals, second moves
    if (!visible[nr][nc]) {
      setVisible(prev => reveal(prev, nr, nc))
      return
    }
    const newVal = gridData.grid[nr][nc]
    const oldVal = gridData.grid[player.r][player.c]
    const dir = newVal > oldVal ? 'up' : newVal < oldVal ? 'down' : 'flat'
    setLastMove(dir)
    setPlayer({ r: nr, c: nc })
    setBestVal(prev => Math.max(prev, newVal))
    setVisible(prev => reveal(prev, nr, nc))
  }

  function handleRestart() {
    if (restartsLeft <= 0 || !gridData) return
    const visited = new Set()
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (visible[r][c]) visited.add(`${r},${c}`)
    const pos = randomInterior(seedRef.current + 100 + restartsLeft, visited)
    setPlayer(pos)
    setBestVal(prev => Math.max(prev, gridData.grid[pos.r][pos.c]))
    setVisible(prev => reveal(prev, pos.r, pos.c))
    setRestartsLeft(r => r - 1)
    setLastMove(null)
  }

  function handleDone() { setPhase('result') }
  function handleNewGame() { const s = seed + 1; setSeed(s); initGame(s) }

  if (!gridData || !visible || !player) return null

  const { grid, optimum } = gridData
  const totalRevealed = visible.flat().filter(Boolean).length
  const pct = Math.round((totalRevealed / (GRID * GRID)) * 100)
  const diff = Math.abs(bestVal - optimum.val)
  const stars = diff <= 5 ? 3 : diff <= 15 ? 2 : 1

  if (phase === 'result') {
    return (
      <div className="mt-6 space-y-5">
        <div className="rounded-xl bg-surface p-6 space-y-4">
          <h2 className="text-lg font-semibold text-primary text-center">Expedition complete</h2>
          <div className="flex justify-center"><Stars count={stars} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl p-3 border border-border text-center">
              <p className="text-xs text-muted uppercase tracking-widest mb-1">Your best</p>
              <p className="text-2xl font-bold text-primary">{bestVal}</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border text-center">
              <p className="text-xs text-muted uppercase tracking-widest mb-1">Global peak</p>
              <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{optimum.val}</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border text-center">
              <p className="text-xs text-muted uppercase tracking-widest mb-1">Revealed</p>
              <p className="text-2xl font-bold text-primary">{pct}%</p>
            </div>
          </div>
          <p className="text-sm text-secondary text-center">
            {stars === 3 && 'You found a peak within 5 of the global optimum — excellent hill climbing!'}
            {stars === 2 && 'Close! Within 15 of the global optimum. More restarts might have helped.'}
            {stars === 1 && 'The global optimum was elusive. Hill climbing often gets stuck in local peaks.'}
          </p>
        </div>

        {/* Full reveal grid */}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Full landscape revealed</p>
          <div
            className="grid rounded-xl overflow-hidden border border-border"
            style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}
          >
            {grid.map((row, r) =>
              row.map((val, c) => {
                const isOpt = r === optimum.r && c === optimum.c
                return (
                  <div
                    key={`${r}-${c}`}
                    className="flex items-center justify-center text-white font-bold"
                    style={{
                      aspectRatio: '1',
                      fontSize: 8,
                      backgroundColor: isOpt ? '#F59E0B' : fitnessColor(val),
                    }}
                  >
                    {isOpt ? '★' : ''}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <button
          onClick={handleNewGame}
          className="w-full py-2.5 rounded-xl text-sm font-medium border border-border text-secondary hover:bg-surface transition-colors"
        >
          New Game
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <span className="text-sm text-secondary">
            Best found: <span className="font-bold text-primary">{bestVal}</span>
          </span>
          {lastMove && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              lastMove === 'up' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
              lastMove === 'down' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
              'bg-surface text-muted'
            }`}>
              {lastMove === 'up' ? '↑ Uphill' : lastMove === 'down' ? '↓ Downhill' : '→ Flat'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Restarts: {restartsLeft}</span>
          <button
            onClick={handleRestart}
            disabled={restartsLeft <= 0}
            className="text-xs px-3 py-1.5 rounded-lg border border-border text-secondary hover:bg-surface transition-colors disabled:opacity-40"
          >
            Restart
          </button>
          <button
            onClick={handleDone}
            className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
            style={{ backgroundColor: COLOR }}
          >
            I'm done
          </button>
        </div>
      </div>

      <p className="text-xs text-muted">
        Click adjacent cells to explore. Click once to reveal, again to move. Use arrow keys to move directly.
      </p>

      {/* Grid */}
      <div
        className="grid rounded-xl overflow-hidden border border-border select-none"
        style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}
      >
        {grid.map((row, r) =>
          row.map((val, c) => {
            const isPlayer = player.r === r && player.c === c
            const isVis = visible[r][c]
            const isAdjacent = !isPlayer && Math.abs(r - player.r) <= 1 && Math.abs(c - player.c) <= 1

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => isAdjacent && handleMove(r, c)}
                className={`flex items-center justify-center font-bold transition-colors duration-100 ${
                  isAdjacent ? 'cursor-pointer' : 'cursor-default'
                }`}
                style={{
                  aspectRatio: '1',
                  fontSize: 9,
                  backgroundColor: isPlayer
                    ? COLOR
                    : isVis
                    ? fitnessColor(val)
                    : 'var(--surface)',
                  border: isPlayer ? `2px solid ${COLOR}` : isAdjacent && !isVis ? '1px dashed var(--border)' : 'none',
                  color: isPlayer ? '#fff' : isVis ? '#fff' : 'var(--text-muted)',
                  outline: isAdjacent && isVis ? `1px solid ${COLOR}40` : 'none',
                }}
              >
                {isPlayer ? '●' : isVis ? val : '?'}
              </div>
            )
          })
        )}
      </div>

      <p className="text-xs text-muted text-right">{pct}% of landscape revealed</p>
    </div>
  )
}
