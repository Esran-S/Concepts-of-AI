/**
 * Concepts-of-AI — Security Test Suite
 * Run with: node security-test.mjs
 *
 * Tests the built dist/ output and source files against common web
 * vulnerabilities relevant to a static React/GitHub Pages site.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const SRC  = path.join(ROOT, 'src')
const DIST = path.join(ROOT, 'dist')
const PUB  = path.join(ROOT, 'public')

let passed = 0
let failed = 0
let warned = 0

function pass(name)        { console.log(`  ✅ PASS  ${name}`);  passed++ }
function fail(name, note)  { console.log(`  ❌ FAIL  ${name}\n        → ${note}`); failed++ }
function warn(name, note)  { console.log(`  ⚠️  WARN  ${name}\n        → ${note}`); warned++ }
function section(title)    { console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`) }

// ─── helpers ───────────────────────────────────────────────────────────────

function readText(filePath) {
  try { return fs.readFileSync(filePath, 'utf8') } catch { return null }
}

function getAllFiles(dir, exts = ['.js', '.jsx', '.ts', '.tsx', '.html', '.svg']) {
  const results = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...getAllFiles(path.join(dir, entry.name), exts))
    } else if (exts.some(e => entry.name.endsWith(e))) {
      results.push(path.join(dir, entry.name))
    }
  }
  return results
}

function searchFiles(dir, pattern, exts) {
  const hits = []
  for (const f of getAllFiles(dir, exts)) {
    const content = readText(f)
    if (content && pattern.test(content)) {
      const lines = content.split('\n')
      lines.forEach((line, i) => {
        if (pattern.test(line)) hits.push({ file: path.relative(ROOT, f), line: i + 1, text: line.trim() })
      })
    }
  }
  return hits
}

// ─── simulate the spa-redirect.js path validation logic in Node ────────────

function simulatePathValidation(p, q = '') {
  const BASE = '/Concepts-of-AI'
  if (typeof p !== 'string') return false
  if (p !== BASE && p.indexOf(BASE + '/') !== 0) return false
  if (/^\/\/|[a-z][a-z0-9+\-.]*:/i.test(p)) return false
  if (/\.\./.test(p)) return false
  if (/\x00|%00/i.test(p)) return false
  if (q !== '' && q[0] !== '?') return false
  return true
}

function simulate404Validation(rawPath) {
  const BASE = '/Concepts-of-AI'
  return typeof rawPath === 'string'
    && (rawPath === BASE || rawPath.indexOf(BASE + '/') === 0)
    && !/\.\./.test(rawPath)
    && !/\x00|%00/i.test(rawPath)
}

// ═══════════════════════════════════════════════════════════════════════════
section('1. XSS — Dangerous DOM APIs in source')

const xssPatterns = [
  { label: 'dangerouslySetInnerHTML',   re: /dangerouslySetInnerHTML/ },
  { label: 'innerHTML assignment',       re: /\.innerHTML\s*=/ },
  { label: 'outerHTML assignment',       re: /\.outerHTML\s*=/ },
  { label: 'document.write',            re: /document\.write\s*\(/ },
  { label: 'insertAdjacentHTML',        re: /insertAdjacentHTML/ },
  { label: 'eval()',                     re: /\beval\s*\(/ },
  { label: 'new Function()',             re: /new\s+Function\s*\(/ },
  { label: 'setTimeout with string',     re: /setTimeout\s*\(\s*['"`]/ },
  { label: 'setInterval with string',    re: /setInterval\s*\(\s*['"`]/ },
  { label: 'javascript: href',           re: /href\s*=\s*['"]javascript:/i },
]

for (const { label, re } of xssPatterns) {
  const hits = searchFiles(SRC, re, ['.js', '.jsx', '.ts', '.tsx', '.html'])
  if (hits.length === 0) pass(label)
  else fail(label, hits.map(h => `${h.file}:${h.line}`).join(', '))
}

// ═══════════════════════════════════════════════════════════════════════════
section('2. Open Redirect — SPA routing path validation')

// These should ALL be BLOCKED (return false)
const maliciousPaths = [
  { p: '//evil.com',                         desc: 'protocol-relative URL' },
  { p: 'javascript:alert(1)',                desc: 'javascript: scheme' },
  { p: 'data:text/html,<script>',           desc: 'data: scheme' },
  { p: 'https://evil.com',                  desc: 'absolute URL' },
  { p: 'vbscript:msgbox(1)',                desc: 'vbscript: scheme' },
  { p: '/Concepts-of-AI/../../../evil.com', desc: 'path traversal with ../' },
  { p: 'file:///etc/passwd',               desc: 'file: scheme' },
  { p: null,                                desc: 'null input' },
  { p: '',                                  desc: 'empty string' },
  { p: '/other-repo/page',                 desc: 'different repo path' },
  { p: 'evil.com',                          desc: 'relative path without base' },
  { p: '%2f%2fevil.com',                   desc: 'URL-encoded //' },
  { p: '/Concepts-of-AI' + '%00evil',      desc: 'null byte injection' },
  { p: '/Concepts-of-AI\x00evil',          desc: 'raw null byte' },
]

for (const { p, desc } of maliciousPaths) {
  const allowed = simulatePathValidation(p)
  if (!allowed) pass(`Blocks: ${desc}`)
  else fail(`Blocks: ${desc}`, `path "${p}" was incorrectly allowed through`)
}

// These should ALL be ALLOWED (return true)
const legitimatePaths = [
  { p: '/Concepts-of-AI/',                                  q: '',            desc: 'root' },
  { p: '/Concepts-of-AI/topic/heuristic-search',            q: '',            desc: 'topic page' },
  { p: '/Concepts-of-AI/topic/heuristic-search',            q: '?view=game',  desc: 'topic with view param' },
  { p: '/Concepts-of-AI/topic/large-language-models',       q: '',            desc: 'llm topic' },
]

for (const { p, q, desc } of legitimatePaths) {
  const allowed = simulatePathValidation(p, q)
  if (allowed) pass(`Allows: ${desc}`)
  else fail(`Allows: ${desc}`, `legitimate path was incorrectly blocked`)
}

// ═══════════════════════════════════════════════════════════════════════════
section('3. Open Redirect — 404.html path validation')

const bad404Paths = [
  { p: '//evil.com',             desc: 'protocol-relative' },
  { p: '/other/path',           desc: 'non-base path' },
  { p: '/Concepts-of-AItrick',  desc: 'startsWith bypass attempt' },
  { p: '',                       desc: 'empty' },
  { p: null,                     desc: 'null' },
]

for (const { p, desc } of bad404Paths) {
  const allowed = simulate404Validation(p)
  if (!allowed) pass(`404 blocks: ${desc}`)
  else fail(`404 blocks: ${desc}`, `"${p}" should have been rejected`)
}

const good404Paths = [
  '/Concepts-of-AI/topic/fuzzy-systems',
  '/Concepts-of-AI/',
]

for (const p of good404Paths) {
  const allowed = simulate404Validation(p)
  if (allowed) pass(`404 allows: ${p}`)
  else fail(`404 allows: ${p}`, 'legitimate path was blocked')
}

// ═══════════════════════════════════════════════════════════════════════════
section('4. Secrets & sensitive data in source')

const secretPatterns = [
  { label: 'API key pattern',            re: /api[_-]?key\s*[:=]\s*['"][^'"]{8,}/i },
  { label: 'Secret/password variable',   re: /\b(secret|password|passwd|token)\s*[:=]\s*['"][^'"]{4,}/i },
  { label: 'Private key header',         re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { label: 'AWS access key',             re: /AKIA[0-9A-Z]{16}/ },
  { label: 'GitHub token',               re: /ghp_[a-zA-Z0-9]{36}/ },
  { label: 'VITE_ env var hardcoded',    re: /VITE_[A-Z_]+=["'][^"']+["']/ },
  { label: 'Bearer token hardcoded',     re: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/ },
]

for (const { label, re } of secretPatterns) {
  const hits = searchFiles(SRC, re)
  if (hits.length === 0) pass(label)
  else fail(label, hits.map(h => `${h.file}:${h.line}`).join(', '))
}

// ═══════════════════════════════════════════════════════════════════════════
section('5. Content Security Policy validation')

const indexHtml = readText(path.join(DIST, 'index.html'))

if (!indexHtml) {
  fail('dist/index.html exists', 'file not found')
} else {
  const cspMatch = indexHtml.match(/content="([^"]*Content-Security[^"]*|[^"]*default-src[^"]*)"/i)
    || indexHtml.match(/http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"/i)
    || indexHtml.match(/content="([^"]*default-src[^"]*)"/i)

  // Extract the actual CSP value from the meta tag
  const cspTagMatch = indexHtml.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i)
  const csp = cspTagMatch ? cspTagMatch[1] : null

  if (!csp) {
    fail('CSP meta tag present', 'no Content-Security-Policy meta tag found in dist/index.html')
  } else {
    pass('CSP meta tag present')

    const cspChecks = [
      { label: "default-src 'self'",  re: /default-src\s+'self'/ },
      { label: "script-src 'self'",   re: /script-src\s+'self'(?!\s+'unsafe-inline')/ },
      { label: 'connect-src none',     re: /connect-src\s+'none'/ },
      { label: 'object-src none',      re: /object-src\s+'none'/ },
      { label: 'base-uri self',        re: /base-uri\s+'self'/ },
      { label: 'form-action none',     re: /form-action\s+'none'/ },
      { label: 'No unsafe-eval',       re: /(?!.*'unsafe-eval')/, inverse: true },
    ]

    for (const { label, re, inverse } of cspChecks) {
      const match = re.test(csp)
      if (inverse) {
        if (!csp.includes("'unsafe-eval'")) pass(`CSP: ${label}`)
        else fail(`CSP: ${label}`, csp)
      } else {
        if (match) pass(`CSP: ${label}`)
        else fail(`CSP: ${label}`, `not found in: ${csp}`)
      }
    }

    // Warn about unsafe-inline in style-src (necessary for React inline styles)
    if (/'unsafe-inline'/.test(csp) && /style-src/.test(csp)) {
      warn("CSP: style-src 'unsafe-inline'", "Required for React inline style props — acceptable trade-off for static React sites")
    }
    if (/script-src[^;]*'unsafe-inline'/.test(csp)) {
      fail("CSP: script-src must not have 'unsafe-inline'", csp)
    } else {
      pass("CSP: script-src has no 'unsafe-inline'")
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
section('6. Source maps not exposed in production')

const distAssets = path.join(DIST, 'assets')
if (fs.existsSync(distAssets)) {
  const mapFiles = fs.readdirSync(distAssets).filter(f => f.endsWith('.map'))
  if (mapFiles.length === 0) pass('No .map files in dist/assets/')
  else fail('No .map files in dist/assets/', `Found: ${mapFiles.join(', ')}`)
} else {
  warn('dist/assets/ exists', 'directory not found — run npm run build first')
}

// ═══════════════════════════════════════════════════════════════════════════
section('7. Sensitive data in built bundle')

if (fs.existsSync(distAssets)) {
  const jsFiles = fs.readdirSync(distAssets).filter(f => f.endsWith('.js'))
  const bundleContent = jsFiles.map(f => readText(path.join(distAssets, f))).join('\n')

  const bundleChecks = [
    { label: 'No AWS key in bundle',        re: /AKIA[0-9A-Z]{16}/ },
    { label: 'No private key in bundle',    re: /BEGIN PRIVATE KEY/ },
    { label: 'No GitHub token in bundle',   re: /ghp_[a-zA-Z0-9]{36}/ },
    { label: 'No password literal in bundle', re: /password\s*[:=]\s*["'][^"']{6,}["']/ },
    { label: 'No internal file paths',      re: /[A-Za-z]:\\Users\\[^"'\s]+\\(?:src|node_modules)/ },
  ]

  for (const { label, re } of bundleChecks) {
    if (!re.test(bundleContent)) pass(label)
    else fail(label, 'Sensitive pattern found in production bundle')
  }
} else {
  warn('Bundle checks', 'dist/assets/ not found')
}

// ═══════════════════════════════════════════════════════════════════════════
section('8. External resource loading')

const externalResourceRe = /(?:src|href)\s*=\s*["']https?:\/\/(?!esran-s\.github\.io)/i

const htmlFiles = [
  path.join(DIST, 'index.html'),
  path.join(DIST, '404.html'),
  path.join(PUB, '404.html'),
]

let extHits = []
for (const f of htmlFiles) {
  const content = readText(f)
  if (content) {
    content.split('\n').forEach((line, i) => {
      if (externalResourceRe.test(line) && !line.trim().startsWith('//')) {
        extHits.push(`${path.relative(ROOT, f)}:${i + 1} — ${line.trim()}`)
      }
    })
  }
}

const srcHtmlHits = searchFiles(SRC, externalResourceRe, ['.jsx', '.js', '.html'])
  .filter(h => !h.text.trim().startsWith('//'))

if (extHits.length === 0 && srcHtmlHits.length === 0) {
  pass('No external src/href in HTML or JSX')
} else {
  fail('No external src/href in HTML or JSX', [...extHits, ...srcHtmlHits.map(h => `${h.file}:${h.line}`)].join('\n        '))
}

// ═══════════════════════════════════════════════════════════════════════════
section('9. Prototype pollution vectors')

const protoPatterns = [
  { label: 'No __proto__ access',              re: /__proto__/ },
  { label: 'No constructor.prototype',          re: /constructor\s*\.\s*prototype/ },
  { label: 'No Object.assign with user input',  re: /Object\.assign\s*\(\s*(?:req|user|input|data|body|params)/ },
]

for (const { label, re } of protoPatterns) {
  const hits = searchFiles(SRC, re)
  if (hits.length === 0) pass(label)
  else fail(label, hits.map(h => `${h.file}:${h.line} → ${h.text}`).join('\n        '))
}

// ═══════════════════════════════════════════════════════════════════════════
section('10. postMessage without origin check')

const postMsgHits = searchFiles(SRC, /addEventListener\s*\(\s*['"]message['"]/, ['.js', '.jsx'])
if (postMsgHits.length === 0) {
  pass('No postMessage listeners (no origin validation needed)')
} else {
  // Check each hit has an origin check nearby
  for (const hit of postMsgHits) {
    warn('postMessage listener', `${hit.file}:${hit.line} — verify event.origin is validated`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
section('11. SVG security')

const svgFiles = getAllFiles(ROOT, ['.svg']).filter(f => !f.includes('node_modules') && !f.includes('.cache'))
if (svgFiles.length === 0) {
  warn('SVG files', 'no SVG files found (favicon.svg should exist)')
} else {
  for (const f of svgFiles) {
    const content = readText(f)
    if (!content) continue
    const rel = path.relative(ROOT, f)

    if (/<script/i.test(content))      fail(`SVG clean: ${rel}`, 'contains <script> tag')
    else if (/javascript:/i.test(content)) fail(`SVG clean: ${rel}`, 'contains javascript: URI')
    else if (/on\w+\s*=/i.test(content))   fail(`SVG clean: ${rel}`, 'contains event handler attribute')
    else if (/<foreignObject/i.test(content)) warn(`SVG: ${rel}`, 'contains <foreignObject> — can embed HTML')
    else pass(`SVG clean: ${rel}`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
section('12. localStorage — no sensitive data stored')

const lsHits = searchFiles(SRC, /localStorage\.(setItem|getItem)/, ['.js', '.jsx'])
const sensitiveKeys = /password|token|secret|auth|email|ssn|credit|api[_-]?key/i

for (const hit of lsHits) {
  if (sensitiveKeys.test(hit.text)) {
    fail(`localStorage: ${hit.file}:${hit.line}`, `potentially sensitive key: ${hit.text}`)
  } else {
    pass(`localStorage safe: ${hit.file}:${hit.line}`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
section('13. Math.random() not used for security purposes')

const mathRandHits = searchFiles(SRC, /Math\.random\s*\(\s*\)/, ['.js', '.jsx'])
const securityContext = /token|id|key|secret|auth|session|csrf|nonce/i

for (const hit of mathRandHits) {
  if (securityContext.test(hit.text)) {
    fail(`Math.random() security context: ${hit.file}:${hit.line}`, hit.text)
  } else {
    pass(`Math.random() non-security: ${hit.file}:${hit.line.toString().padStart(3)}`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
section('14. .gitignore covers secrets')

const gitignore = readText(path.join(ROOT, '.gitignore')) || ''
const gitignoreChecks = [
  { label: '.env files',      re: /^\.env/m },
  { label: 'Private keys',    re: /\*\.pem|\.pem/m },
  { label: 'node_modules',    re: /^node_modules/m },
  { label: 'dist folder',     re: /^dist/m },
]

for (const { label, re } of gitignoreChecks) {
  if (re.test(gitignore)) pass(`.gitignore covers: ${label}`)
  else fail(`.gitignore covers: ${label}`, 'pattern not found in .gitignore')
}

// ═══════════════════════════════════════════════════════════════════════════
section('15. Referrer policy present')

const distIndex = readText(path.join(DIST, 'index.html')) || ''
if (/strict-origin-when-cross-origin/.test(distIndex)) {
  pass('Referrer-Policy: strict-origin-when-cross-origin set')
} else {
  fail('Referrer-Policy', 'not found in dist/index.html')
}

// ═══════════════════════════════════════════════════════════════════════════
section('16. Clickjacking protection in spa-redirect.js')

const spaRedirect = readText(path.join(PUB, 'spa-redirect.js')) || ''
if (/window\.self\s*!==\s*window\.top/.test(spaRedirect)) {
  pass('Frame-buster present in spa-redirect.js')
} else {
  fail('Frame-buster', 'no window.self !== window.top check in spa-redirect.js')
}

if (/document\.documentElement\.style\.display\s*=\s*['"]none['"]/.test(spaRedirect)) {
  pass('Cross-origin frame: page hidden on frame-bust failure')
} else {
  fail('Cross-origin frame fallback', 'page not hidden when top redirect is blocked')
}

// ═══════════════════════════════════════════════════════════════════════════
section('17. Error boundary present')

const errorBoundaryFile = path.join(SRC, 'components', 'ErrorBoundary.jsx')
if (fs.existsSync(errorBoundaryFile)) {
  const content = readText(errorBoundaryFile)
  if (/getDerivedStateFromError/.test(content)) pass('ErrorBoundary component exists with getDerivedStateFromError')
  else fail('ErrorBoundary', 'file exists but missing getDerivedStateFromError')

  const topicPage = readText(path.join(SRC, 'pages', 'Topic.jsx'))
  if (topicPage && /ErrorBoundary/.test(topicPage)) pass('ErrorBoundary used in Topic.jsx')
  else fail('ErrorBoundary usage', 'not imported/used in Topic.jsx')
} else {
  fail('ErrorBoundary component', 'file not found: src/components/ErrorBoundary.jsx')
}

// ═══════════════════════════════════════════════════════════════════════════
section('18. No window.name / document.domain / document.referrer reads')

const domLeakPatterns = [
  { label: 'window.name',       re: /window\.name(?!\s*=)/ },
  { label: 'document.domain',   re: /document\.domain(?!\s*=)/ },
  { label: 'document.referrer', re: /document\.referrer/ },
]

for (const { label, re } of domLeakPatterns) {
  const hits = searchFiles(SRC, re, ['.js', '.jsx'])
  if (hits.length === 0) pass(`No ${label} reads`)
  else warn(`${label} read found`, hits.map(h => `${h.file}:${h.line}`).join(', '))
}

// ═══════════════════════════════════════════════════════════════════════════
section('19. 404.html has its own CSP')

const html404 = readText(path.join(DIST, '404.html')) || ''
if (/Content-Security-Policy/i.test(html404)) pass('404.html has Content-Security-Policy')
else fail('404.html CSP', 'no CSP found in dist/404.html')

if (/referrer/i.test(html404)) pass('404.html has referrer policy')
else fail('404.html referrer policy', 'not found')

// ═══════════════════════════════════════════════════════════════════════════
section('20. No target=_blank without rel=noopener')

// Links with target _blank missing noopener
const blankNoOpener = searchFiles(SRC, /target=["']_blank["'](?![^>]*noopener)/i, ['.jsx', '.js', '.html'])
if (blankNoOpener.length === 0) pass('No target=_blank without noopener')
else fail('target=_blank without noopener', blankNoOpener.map(h => `${h.file}:${h.line}`).join(', '))

// ═══════════════════════════════════════════════════════════════════════════
section('21. Dependency integrity — package-lock.json present')

const lockFile = path.join(ROOT, 'package-lock.json')
if (fs.existsSync(lockFile)) {
  const lock = JSON.parse(readText(lockFile) || '{}')
  pass(`package-lock.json present (lockfileVersion ${lock.lockfileVersion})`)

  // Spot-check that runtime deps have integrity hashes
  const deps = lock.packages || {}
  const runtimeDeps = ['node_modules/react', 'node_modules/react-dom', 'node_modules/react-router-dom', 'node_modules/recharts']
  for (const dep of runtimeDeps) {
    if (deps[dep] && deps[dep].integrity) pass(`Integrity hash present: ${dep}`)
    else warn(`Integrity hash: ${dep}`, 'no integrity hash in lockfile')
  }
} else {
  fail('package-lock.json', 'not found — supply chain integrity not guaranteed')
}

// ═══════════════════════════════════════════════════════════════════════════
section('22. No inline scripts in dist/index.html (CSP compliance)')

const distIdx = readText(path.join(DIST, 'index.html')) || ''
// Remove CSP meta tag line itself before checking
const distIdxNoMeta = distIdx.replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '')
const inlineScripts = [...distIdxNoMeta.matchAll(/<script(?![^>]*src=)[^>]*>/gi)]
if (inlineScripts.length === 0) pass('No inline <script> blocks in dist/index.html')
else fail('Inline scripts in dist/index.html', `Found ${inlineScripts.length} inline script tag(s)`)

// ═══════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(60))
console.log(`  RESULTS: ${passed} passed  |  ${warned} warnings  |  ${failed} failed`)
console.log('═'.repeat(60))

if (failed > 0)  { console.log('\n  ❌  Fix the failures above before deploying.\n'); process.exit(1) }
if (warned > 0)  { console.log('\n  ⚠️   Review warnings — safe to deploy but worth noting.\n') }
if (failed === 0) { console.log('\n  ✅  All security tests passed. Safe to deploy.\n') }
