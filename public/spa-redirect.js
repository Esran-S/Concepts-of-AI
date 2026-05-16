// ── Clickjacking protection ──────────────────────────────────────────────────
// GitHub Pages cannot set X-Frame-Options or CSP frame-ancestors as HTTP
// headers, so we use a JS frame-buster instead. If this page is loaded inside
// an iframe we either escape to the top or hide the page content entirely.
(function () {
  if (window.self !== window.top) {
    try {
      // Same-origin frame: navigate the top frame to our real URL.
      window.top.location.href = window.self.location.href;
    } catch (_) {
      // Cross-origin frame (sandboxed): we cannot redirect, so hide the page
      // to prevent UI redressing / clickjacking attacks.
      document.documentElement.style.display = 'none';
    }
  }
})();

// ── GitHub Pages SPA routing ─────────────────────────────────────────────────
// GitHub Pages serves 404.html for unknown paths. That page encodes the real
// path into ?p= so we can restore it here via replaceState.
(function () {
  var BASE = '/Concepts-of-AI';
  var params = new URLSearchParams(window.location.search);
  var p = params.get('p');
  var q = params.get('q') || '';

  // Only restore if the path is a safe same-origin sub-path:
  //   • must start with the repo base path (prevents open-redirect via crafted URLs)
  //   • must not begin with // or contain a URI scheme (javascript:, data:, etc.)
  //   • query string must start with ? or be empty
  var safePath = typeof p === 'string'
    && (p === BASE || p.indexOf(BASE + '/') === 0)
    && !/^\/\/|[a-z][a-z0-9+\-.]*:/i.test(p)
    && !/\.\./.test(p)
    && !/\x00|%00/i.test(p)
    && (q === '' || q[0] === '?');

  if (safePath) {
    window.history.replaceState(null, '', p + q);
  }
})();
