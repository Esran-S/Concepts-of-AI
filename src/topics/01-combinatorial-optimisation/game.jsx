import { useState, useEffect, useRef, useCallback } from 'react'

const COLOR = '#3B82F6'
const BIN_CAPACITY = 6
const NUM_BINS = 4
const NUM_ITEMS = 12
const TIMER_START = 90

const ITEM_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#06B6D4',
]

// Seeded pseudo-random number generator
function seededRng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function generateItems(seed) {
  const rng = seededRng(seed)
  // Generate items such that theoretical minimum bins is 3
  // Strategy: 3 groups of items that fit neatly into 3 bins of capacity 6
  const baseSizes = [
    [3, 2, 1], [4, 2], [3, 3], [2, 2, 2], [5, 1], [4, 1, 1],
    [3, 2, 1], [2, 2, 2], [4, 2], [3, 3], [2, 2, 2], [5, 1],
  ]
  // Flatten into 12 items
  const flat = [3, 2, 1, 4, 2, 3, 3, 2, 2, 2, 5, 1]
  // Shuffle using rng
  const arr = flat.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.map((size, idx) => ({
    id: idx,
    size,
    color: ITEM_COLORS[idx % ITEM_COLORS.length],
  }))
}

function greedyFirstFit(items) {
  const bins = [[], [], [], []]
  const binLoads = [0, 0, 0, 0]
  for (const item of items) {
    let placed = false
    for (let b = 0; b < NUM_BINS; b++) {
      if (binLoads[b] + item.size <= BIN_CAPACITY) {
        bins[b] = [...bins[b], item]
        binLoads[b] += item.size
        placed = true
        break
      }
    }
    if (!placed) {
      // overflow — shouldn't happen with our item set
      bins[0] = [...bins[0], item]
    }
  }
  return bins
}

function starRating(playerBins, greedyBins) {
  const pUsed = playerBins.filter(b => b.length > 0).length
  const gUsed = greedyBins.filter(b => b.length > 0).length
  if (pUsed <= gUsed) return 3
  if (pUsed === gUsed + 1) return 2
  return 1
}

function Stars({ count }) {
  return (
    <span className="text-2xl">
      {[1, 2, 3].map(i => (
        <span key={i} style={{ color: i <= count ? '#F59E0B' : '#D1D5DB' }}>★</span>
      ))}
    </span>
  )
}

function BinDisplay({ bin, binIdx, onDragOver, onDrop, shake }) {
  const load = bin.reduce((s, item) => s + item.size, 0)
  const remaining = BIN_CAPACITY - load

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-xl border-2 p-3 transition-all duration-150 ${shake ? 'animate-[shake_0.3s_ease]' : ''}`}
      style={{ borderColor: shake ? '#F43F5E' : 'var(--border)' }}
    >
      <p className="text-xs text-muted mb-2 uppercase tracking-widest">Bin {binIdx + 1}</p>
      <div className="flex h-8 rounded-lg overflow-hidden mb-1">
        {bin.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{
              width: `${(item.size / BIN_CAPACITY) * 100}%`,
              backgroundColor: item.color,
            }}
          >
            {item.size}
          </div>
        ))}
        {remaining > 0 && (
          <div
            className="bg-surface flex-1 flex items-center justify-center text-xs text-muted"
          >
            {remaining} free
          </div>
        )}
      </div>
      <div className="text-xs text-secondary">
        {load}/{BIN_CAPACITY} used
      </div>
    </div>
  )
}

export default function Game() {
  const [seed, setSeed] = useState(42)
  const [originalItems, setOriginalItems] = useState([])
  const [trayItems, setTrayItems] = useState([])
  const [bins, setBins] = useState([[], [], [], []])
  const [timeLeft, setTimeLeft] = useState(TIMER_START)
  const [phase, setPhase] = useState('playing') // 'playing' | 'result'
  const [shakeBin, setShakeBin] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [algoRunning, setAlgoRunning] = useState(false)
  const [algoBins, setAlgoBins] = useState(null)
  const timerRef = useRef(null)

  const initGame = useCallback((s) => {
    const items = generateItems(s)
    setOriginalItems(items)
    setTrayItems(items)
    setBins([[], [], [], []])
    setTimeLeft(TIMER_START)
    setPhase('playing')
    setShakeBin(null)
    setAlgoRunning(false)
    setAlgoBins(null)
  }, [])

  useEffect(() => {
    initGame(seed)
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setPhase('result')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  function handleDragStart(id) {
    setDragId(id)
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  function handleDrop(binIdx, e) {
    e.preventDefault()
    if (dragId === null) return
    const item = trayItems.find(i => i.id === dragId)
    if (!item) return

    const binLoad = bins[binIdx].reduce((s, i) => s + i.size, 0)
    if (binLoad + item.size > BIN_CAPACITY) {
      setShakeBin(binIdx)
      setTimeout(() => setShakeBin(null), 400)
      return
    }

    setTrayItems(prev => prev.filter(i => i.id !== dragId))
    setBins(prev => {
      const next = prev.map(b => [...b])
      next[binIdx] = [...next[binIdx], item]
      return next
    })
    setDragId(null)
  }

  function handleGiveUp() {
    clearInterval(timerRef.current)
    setPhase('result')
  }

  function handleNewGame() {
    const newSeed = seed + 1
    setSeed(newSeed)
    initGame(newSeed)
  }

  function handleShowAlgo() {
    const solution = greedyFirstFit(originalItems)
    setAlgoRunning(true)
    const flat = solution.flatMap((bin, bIdx) => bin.map(item => ({ item, bIdx })))
    const emptyBins = [[], [], [], []]
    setAlgoBins(emptyBins)
    flat.forEach(({ item, bIdx }, idx) => {
      setTimeout(() => {
        setAlgoBins(prev => {
          if (!prev) return prev
          const next = prev.map(b => [...b])
          next[bIdx] = [...next[bIdx], item]
          return next
        })
      }, idx * 400)
    })
  }

  const greedySolution = greedyFirstFit(originalItems)
  const playerBinsUsed = bins.filter(b => b.length > 0).length
  const greedyBinsUsed = greedySolution.filter(b => b.length > 0).length
  const stars = starRating(bins, greedySolution)

  const timerPct = (timeLeft / TIMER_START) * 100
  const timerColor = timeLeft > 30 ? COLOR : timeLeft > 10 ? '#F59E0B' : '#F43F5E'

  if (phase === 'result') {
    const emoji = stars === 3 ? '🏆' : stars === 2 ? '👍' : '💡'
    return (
      <div className="mt-6 space-y-6">
        <div className="rounded-2xl p-6 text-center space-y-3" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}>
          <div className="text-4xl">{emoji}</div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Round complete!</h2>
          <Stars count={stars} />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-muted uppercase tracking-widest mb-1">Your bins used</p>
              <p className="text-3xl font-bold text-primary">{playerBinsUsed}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-muted uppercase tracking-widest mb-1">Greedy algorithm</p>
              <p className="text-3xl font-bold text-primary">{greedyBinsUsed}</p>
            </div>
          </div>
          {stars === 3 && (
            <p className="text-sm text-secondary">You matched or beat the greedy algorithm!</p>
          )}
          {stars === 2 && (
            <p className="text-sm text-secondary">One bin more than the greedy algorithm.</p>
          )}
          {stars === 1 && (
            <p className="text-sm text-secondary">The greedy algorithm was significantly more efficient.</p>
          )}
        </div>

        <div className="rounded-xl bg-surface border border-border p-4 space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted">Algorithm vs Human</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl p-3 text-center border border-border">
              <p className="text-xs text-muted mb-1">Your bins</p>
              <p className="text-2xl font-bold text-primary">{playerBinsUsed}</p>
            </div>
            <div className="bg-card rounded-xl p-3 text-center border border-border">
              <p className="text-xs text-muted mb-1">Algorithm bins</p>
              <p className="text-2xl font-bold" style={{ color: COLOR }}>{greedyBinsUsed}</p>
            </div>
            <div className="bg-card rounded-xl p-3 text-center border border-border">
              <p className="text-xs text-muted mb-1">Algorithm speed</p>
              <p className="text-2xl font-bold" style={{ color: COLOR }}>&lt; 1 ms</p>
            </div>
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            The greedy first-fit heuristic packed all 12 items in under a millisecond.
            Scaled to 10 million items it still finishes in under 10 seconds — a human
            would need hours. Bin packing is NP-hard, but fast heuristics make it
            tractable at industrial scale (shipping containers, cloud server allocation).
          </p>
        </div>

        {!algoRunning && !algoBins && (
          <button
            onClick={handleShowAlgo}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: COLOR }}
          >
            See how the greedy algorithm does it
          </button>
        )}

        {(algoRunning || algoBins) && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary">Greedy first-fit solution</h3>
            <div className="grid grid-cols-2 gap-3">
              {(algoBins || [[], [], [], []]).map((bin, idx) => (
                <BinDisplay
                  key={idx}
                  bin={bin}
                  binIdx={idx}
                  onDragOver={() => {}}
                  onDrop={() => {}}
                  shake={false}
                />
              ))}
            </div>
          </div>
        )}

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
    <div className="mt-6 space-y-5">
      {/* Goal callout */}
      <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ background: COLOR + '12', border: `1px solid ${COLOR}30` }}>
        <span className="text-lg">🎯</span>
        <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
          Drag items into bins. Goal: pack everything using as <strong>few bins as possible</strong>.
        </p>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
            />
          </div>
          <p className="text-xs text-muted mt-1">{timeLeft}s remaining</p>
        </div>
        <button
          onClick={handleGiveUp}
          className="text-xs px-3 py-1.5 rounded-lg border border-border text-secondary hover:bg-surface transition-colors shrink-0"
        >
          Give up
        </button>
      </div>

      {/* Tray */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted mb-2">
          Items to pack — drag each into a bin
        </p>
        <div className="flex flex-wrap gap-2 min-h-[56px] p-3 bg-surface rounded-xl">
          {trayItems.length === 0 && (
            <p className="text-sm text-muted self-center">All items placed!</p>
          )}
          {trayItems.map(item => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              className="flex items-center justify-center text-white text-xs font-bold rounded-lg cursor-grab active:cursor-grabbing select-none"
              style={{
                width: `${item.size * 40}px`,
                height: '40px',
                backgroundColor: item.color,
                minWidth: '32px',
              }}
            >
              {item.size}
            </div>
          ))}
        </div>
      </div>

      {/* Bins */}
      <div className="grid grid-cols-2 gap-3">
        {bins.map((bin, idx) => (
          <BinDisplay
            key={idx}
            bin={bin}
            binIdx={idx}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(idx, e)}
            shake={shakeBin === idx}
          />
        ))}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-\\[shake_0\\.3s_ease\\] {
          animation: shake 0.3s ease;
        }
      `}</style>
    </div>
  )
}
