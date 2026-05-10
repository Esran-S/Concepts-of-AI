import { useEffect, useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLOR = '#F59E0B'
const GENS = 30
const POP_SIZE = 24

// Target: f(x) = x*x
const SAMPLES = [-3, -2, -1, 0, 1, 2, 3]
const TARGET = x => x * x

const FUNCS = ['+', '-', '*']
const TERMS = ['x', '1', '2', '-1']
const MAX_DEPTH = 4

function makeLcg(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

// Tree operations
function makeLeaf(val) { return { type: 'leaf', val } }
function makeNode(op, left, right) { return { type: 'node', op, left, right } }

function randomTree(depth, rng) {
  if (depth === 0 || (depth < MAX_DEPTH && rng() < 0.4)) {
    return makeLeaf(TERMS[Math.floor(rng() * TERMS.length)])
  }
  return makeNode(
    FUNCS[Math.floor(rng() * FUNCS.length)],
    randomTree(depth - 1, rng),
    randomTree(depth - 1, rng)
  )
}

function evalTree(tree, x) {
  if (tree.type === 'leaf') return tree.val === 'x' ? x : Number(tree.val)
  const l = evalTree(tree.left, x), r = evalTree(tree.right, x)
  if (tree.op === '+') return l + r
  if (tree.op === '-') return l - r
  return l * r  // protected mul
}

function mse(tree) {
  let err = 0
  for (const x of SAMPLES) {
    const diff = evalTree(tree, x) - TARGET(x)
    if (!isFinite(diff)) return 1e9
    err += diff * diff
  }
  return err / SAMPLES.length
}

function treeSize(tree) {
  if (tree.type === 'leaf') return 1
  return 1 + treeSize(tree.left) + treeSize(tree.right)
}

function getAt(tree, idx) {
  if (idx === 0) return tree
  if (tree.type === 'leaf') return tree
  const ls = treeSize(tree.left)
  return idx <= ls ? getAt(tree.left, idx - 1) : getAt(tree.right, idx - 1 - ls)
}

function setAt(tree, idx, rep) {
  if (idx === 0) return rep
  if (tree.type === 'leaf') return tree
  const ls = treeSize(tree.left)
  if (idx <= ls) return makeNode(tree.op, setAt(tree.left, idx - 1, rep), tree.right)
  return makeNode(tree.op, tree.left, setAt(tree.right, idx - 1 - ls, rep))
}

function crossover(a, b, rng) {
  const pa = Math.floor(rng() * treeSize(a))
  const pb = Math.floor(rng() * treeSize(b))
  return setAt(a, pa, getAt(b, pb))
}

function mutate(tree, rng) {
  const p = Math.floor(rng() * treeSize(tree))
  return setAt(tree, p, randomTree(2, rng))
}

function treeStr(tree) {
  if (tree.type === 'leaf') return tree.val
  const l = treeStr(tree.left), r = treeStr(tree.right)
  return `(${l} ${tree.op} ${r})`
}

function treeDepth(tree) {
  if (tree.type === 'leaf') return 0
  return 1 + Math.max(treeDepth(tree.left), treeDepth(tree.right))
}

function runGP(seed) {
  const rng = makeLcg(seed)
  let pop = Array.from({ length: POP_SIZE }, () => randomTree(3, rng))
  const history = []

  for (let gen = 0; gen < GENS; gen++) {
    const scores = pop.map(t => mse(t))
    const bestIdx = scores.indexOf(Math.min(...scores))
    history.push({
      gen,
      mse: Math.round(Math.min(...scores) * 100) / 100,
      expr: treeStr(pop[bestIdx]),
      tree: pop[bestIdx],
    })

    const fits = scores.map(s => 1 / (s + 1e-6))
    const next = [pop[bestIdx]]  // elitism
    while (next.length < POP_SIZE) {
      const idxA = [0,1,2].map(() => Math.floor(rng()*POP_SIZE)).reduce((a,b) => fits[a]>fits[b]?a:b)
      const idxB = [0,1,2].map(() => Math.floor(rng()*POP_SIZE)).reduce((a,b) => fits[a]>fits[b]?a:b)
      let child = rng() < 0.7 ? crossover(pop[idxA], pop[idxB], rng) : pop[idxA]
      if (rng() < 0.2) child = mutate(child, rng)
      if (treeDepth(child) > MAX_DEPTH) child = pop[idxA]
      next.push(child)
    }
    pop = next
  }
  return history
}

// Render a small SVG tree (max depth shown: 3)
function TreeSvg({ tree }) {
  const W = 280, H = 160
  const nodes = []
  const lines = []

  function layout(t, depth, leftBound, rightBound) {
    const cx = (leftBound + rightBound) / 2
    const cy = 24 + depth * 44
    const label = t.type === 'leaf' ? t.val : t.op
    nodes.push({ cx, cy, label, isLeaf: t.type === 'leaf' })
    if (t.type === 'node' && depth < 3) {
      const mid = (leftBound + rightBound) / 2
      const [lcx, lcy] = layout(t.left, depth + 1, leftBound, mid)
      const [rcx, rcy] = layout(t.right, depth + 1, mid, rightBound)
      lines.push([cx, cy, lcx, lcy])
      lines.push([cx, cy, rcx, rcy])
    }
    return [cx, cy]
  }

  layout(tree, 0, 0, W)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
      {lines.map(([x1,y1,x2,y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" strokeWidth={1.5} />
      ))}
      {nodes.map(({ cx, cy, label, isLeaf }, i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={isLeaf ? 13 : 16}
            fill={isLeaf ? 'var(--surface)' : COLOR + '30'}
            stroke={isLeaf ? 'var(--border)' : COLOR} strokeWidth={1.5} />
          <text x={cx} y={cy + 4} textAnchor="middle"
            style={{ fontSize: 10, fontWeight: 600, fill: isLeaf ? 'var(--text-primary)' : COLOR, userSelect: 'none' }}>
            {label}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function Viz() {
  const [status, setStatus] = useState('idle')
  const [chartData, setChartData] = useState([])
  const [curGen, setCurGen] = useState(0)
  const [bestExpr, setBestExpr] = useState(null)
  const [bestTree, setBestTree] = useState(null)
  const [curveData, setCurveData] = useState(null)
  const timerRef = useRef(null)
  const histRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handleRun() {
    clearTimeout(timerRef.current)
    const hist = runGP(Date.now() & 0xffff)
    histRef.current = hist
    setChartData([]); setCurGen(0); setBestExpr(null); setBestTree(null); setCurveData(null)
    setStatus('running')
    let idx = 0
    function tick() {
      if (idx >= hist.length) {
        setStatus('done')
        const finalTree = hist[hist.length - 1].tree
        const cd = SAMPLES.map(x => ({
          x,
          Target: TARGET(x),
          Evolved: Math.round(evalTree(finalTree, x) * 100) / 100,
        }))
        setCurveData(cd)
        return
      }
      const row = hist[idx]
      setChartData(prev => [...prev, { gen: row.gen, MSE: row.mse }])
      setBestExpr(row.expr)
      setBestTree(row.tree)
      setCurGen(row.gen + 1)
      idx++
      timerRef.current = setTimeout(tick, 80)
    }
    tick()
  }

  function handleReset() {
    clearTimeout(timerRef.current)
    setStatus('idle'); setChartData([]); setCurGen(0); setBestExpr(null); setBestTree(null); setCurveData(null)
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-secondary leading-relaxed">
        Genetic programming evolves expression trees to approximate f(x) = x².
        Each tree is a program built from +, −, × and the terminals x, 1, 2, −1.
        Subtree crossover and mutation produce each new generation. Watch the best
        expression evolve and the MSE drop toward zero.
      </p>

      {/* Target info */}
      <div className="bg-surface rounded-xl p-4 flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Target function</p>
          <p className="text-lg font-mono font-bold text-primary">f(x) = x²</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Terminals</p>
          <p className="text-sm font-mono text-secondary">x, 1, 2, −1</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Functions</p>
          <p className="text-sm font-mono text-secondary">+ − ×</p>
        </div>
        {status !== 'idle' && (
          <div className="ml-auto">
            <p className="text-xs text-muted uppercase tracking-widest mb-1">Generation</p>
            <p className="text-sm font-bold text-primary">{curGen} / {GENS}</p>
          </div>
        )}
      </div>

      {/* Main two-column layout */}
      {(bestTree || status === 'done') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tree visualization */}
          <div className="bg-surface rounded-xl p-4">
            <p className="text-xs text-muted uppercase tracking-widest mb-2">Best tree</p>
            {bestTree && <TreeSvg tree={bestTree} />}
            {bestExpr && (
              <p className="text-xs font-mono text-secondary mt-2 break-all leading-relaxed">
                {bestExpr}
              </p>
            )}
          </div>

          {/* MSE chart */}
          <div className="bg-surface rounded-xl p-4">
            <p className="text-xs text-muted uppercase tracking-widest mb-2">Mean squared error</p>
            {chartData.length > 1 && (
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={chartData}>
                  <XAxis dataKey="gen" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={45} />
                  <Tooltip contentStyle={{ fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)' }} />
                  <Line type="monotone" dataKey="MSE" stroke={COLOR} dot={false} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Curve comparison (post-run) */}
      {curveData && (
        <div className="bg-surface rounded-xl p-4">
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Evolved vs target on sample points</p>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={curveData}>
              <XAxis dataKey="x" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={35} />
              <Tooltip contentStyle={{ fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Target"  stroke="#A1A1AA" dot={false} strokeWidth={1.5} strokeDasharray="4 2" isAnimationActive={false} />
              <Line type="monotone" dataKey="Evolved" stroke={COLOR}   dot={true}  strokeWidth={2}   isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {status !== 'running' && (
          <button onClick={handleRun}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: COLOR }}>
            {status === 'idle' ? 'Evolve' : 'Evolve again'}
          </button>
        )}
        {status !== 'idle' && (
          <button onClick={handleReset}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-secondary hover:bg-surface">
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
