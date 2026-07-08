#!/usr/bin/env node
// Post-deploy smoke test / uptime canary.
//
// Verifies a deployed ChessMate build is actually serving and hardened:
//   - the app shell responds 200 with HTML containing the React root
//   - the production security headers are present (these ship from
//     public/_headers on Netlify and are easy to lose in a config change)
//   - a client route deep link (/dashboard) serves the SPA shell, not a 404
//     (the Netlify [[redirects]] fallback is easy to lose in a config change)
//   - the RELEASE IDENTITY of the deployed bundle. Every build embeds
//     `chessmate@<version>+<commit>` (see vite.config.ts). The 2026-07-08
//     audit found production serving a build 3 PRs behind main while this
//     canary stayed green — status/header checks alone cannot see a stale
//     deploy. Pass EXPECTED_COMMIT (a git SHA; only the first 7 chars are
//     compared) to fail hard when the deployed commit doesn't match. The
//     check polls (RELEASE_POLL_ATTEMPTS × RELEASE_POLL_DELAY_MS) so the
//     post-push verification can wait out the Netlify build instead of
//     racing it.
//
// Usage:  node scripts/smoke-test.mjs [url]
//   url defaults to $SMOKE_URL or the production site.
// Env:
//   EXPECTED_COMMIT        git SHA the deploy must serve (omit to skip match)
//   RELEASE_POLL_ATTEMPTS  poll count for the release match (default 20)
//   RELEASE_POLL_DELAY_MS  delay between polls (default 30000)
//
// Exits non-zero (with a clear reason) on any failure so CI / a canary job
// turns red — this is the deployment-verification gate, not a unit test.

const url = process.argv[2] || process.env.SMOKE_URL || 'https://chess-mateapp.netlify.app';
const base = url.replace(/\/+$/, '');

const EXPECTED_COMMIT = (process.env.EXPECTED_COMMIT || '').trim().slice(0, 7);
const RELEASE_POLL_ATTEMPTS = Math.max(1, Number(process.env.RELEASE_POLL_ATTEMPTS) || (EXPECTED_COMMIT ? 20 : 1));
const RELEASE_POLL_DELAY_MS = Number(process.env.RELEASE_POLL_DELAY_MS) || 30_000;

// The release tag injected at build time: chessmate@1.2.0+9ee7a7c (the +commit
// suffix is absent only when the build host exposed no commit env).
const RELEASE_TAG_RE = /chessmate@(\d+\.\d+\.\d+)(?:\+([0-9a-f]{7}))?/;

const failures = [];
const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { failures.push(m); console.error(`  ✗ ${m}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cache-busting query param: Node's fetch has no reliable `cache` option, and
// the CDN may otherwise serve a pre-deploy copy of index.html to the canary.
const bust = () => `smoke=${Date.now()}`;

async function fetchText(target) {
  const sep = target.includes('?') ? '&' : '?';
  const res = await fetch(`${target}${sep}${bust()}`, {
    redirect: 'follow',
    headers: { 'User-Agent': 'chessmate-smoke-test', 'Pragma': 'no-cache' },
  });
  return { res, body: await res.text() };
}

/** Fetch the shell and extract { release: 'x.y.z+sha' | null } from its main bundle. */
async function fetchDeployedRelease() {
  const { res, body } = await fetchText(base);
  if (res.status !== 200) return { error: `shell returned HTTP ${res.status}` };
  const asset = body.match(/\/assets\/index-[\w-]+\.js/)?.[0];
  if (!asset) return { error: 'no /assets/index-*.js reference in the served HTML' };
  const bundle = await fetchText(`${base}${asset}`);
  if (bundle.res.status !== 200) return { error: `bundle ${asset} returned HTTP ${bundle.res.status}` };
  const m = bundle.body.match(RELEASE_TAG_RE);
  if (!m) return { error: `bundle ${asset} contains no ${String(RELEASE_TAG_RE)} release tag` };
  return { version: m[1], commit: m[2] ?? null, asset };
}

console.log(`Smoke test → ${base}`);

let res, body;
try {
  ({ res, body } = await fetchText(base));
} catch (err) {
  console.error(`✗ Request failed: ${err.message}`);
  process.exit(1);
}

// 1. Status
res.status === 200 ? ok(`HTTP ${res.status}`) : fail(`expected HTTP 200, got ${res.status}`);

// 2. HTML shell with the React root
/text\/html/i.test(res.headers.get('content-type') || '')
  ? ok('content-type is HTML')
  : fail(`expected HTML content-type, got "${res.headers.get('content-type')}"`);
/<div id="root">/.test(body) ? ok('app shell (#root) present') : fail('app shell (#root) missing');

// 3. Security headers
const REQUIRED_HEADERS = {
  'content-security-policy': /default-src 'self'/i,
  'x-frame-options': /DENY/i,
  'x-content-type-options': /nosniff/i,
  'referrer-policy': /strict-origin/i,
  'strict-transport-security': /max-age=\d+/i,
};
for (const [name, pattern] of Object.entries(REQUIRED_HEADERS)) {
  const value = res.headers.get(name);
  if (!value) fail(`missing header: ${name}`);
  else if (!pattern.test(value)) fail(`header ${name} did not match ${pattern}: "${value}"`);
  else ok(`header ${name}`);
}

// 4. SPA fallback — a client-route deep link must serve the shell, not a 404.
//    (Found broken in the 2026-07-08 audit: /dashboard returned 404 because
//    Netlify had no redirect rule; the rule now lives in netlify.toml.)
try {
  const deep = await fetchText(`${base}/dashboard`);
  deep.res.status === 200 && /<div id="root">/.test(deep.body)
    ? ok('SPA deep link (/dashboard) serves the app shell')
    : fail(`SPA deep link (/dashboard) broken: HTTP ${deep.res.status}`);
} catch (err) {
  fail(`SPA deep link request failed: ${err.message}`);
}

// 5. Release identity — poll until the deployed bundle matches EXPECTED_COMMIT
//    (or, with no expectation, just verify a release tag is present and log it
//    so a human reading the canary output can spot drift).
let release = null;
for (let attempt = 1; attempt <= RELEASE_POLL_ATTEMPTS; attempt++) {
  try {
    release = await fetchDeployedRelease();
  } catch (err) {
    release = { error: err.message };
  }
  const matches = EXPECTED_COMMIT && release.commit === EXPECTED_COMMIT;
  if ((!EXPECTED_COMMIT && !release.error) || matches) break;
  if (attempt < RELEASE_POLL_ATTEMPTS) {
    const state = release.error ?? `serving ${release.version}+${release.commit ?? '???????'}, want +${EXPECTED_COMMIT}`;
    console.log(`  … release not confirmed yet (${state}); retry ${attempt}/${RELEASE_POLL_ATTEMPTS - 1} in ${RELEASE_POLL_DELAY_MS / 1000}s`);
    await sleep(RELEASE_POLL_DELAY_MS);
  }
}

if (release?.error) {
  fail(`release identity unavailable: ${release.error}`);
} else if (EXPECTED_COMMIT) {
  release.commit === EXPECTED_COMMIT
    ? ok(`release identity chessmate@${release.version}+${release.commit} matches expected +${EXPECTED_COMMIT}`)
    : fail(`STALE DEPLOY: serving chessmate@${release.version}+${release.commit ?? '???????'}, expected commit ${EXPECTED_COMMIT}`);
} else {
  ok(`release identity: chessmate@${release.version}${release.commit ? `+${release.commit}` : ' (no commit tag)'}`);
}

if (failures.length) {
  console.error(`\nSMOKE TEST FAILED — ${failures.length} problem(s).`);
  process.exit(1);
}
console.log('\nSMOKE TEST PASSED.');
