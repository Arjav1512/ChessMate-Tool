#!/usr/bin/env node
// Post-deploy smoke test / uptime canary.
//
// Verifies a deployed ChessMate build is actually serving and hardened:
//   - the app shell responds 200 with HTML containing the React root
//   - the production security headers are present (these ship from
//     public/_headers on Netlify and are easy to lose in a config change)
//
// Usage:  node scripts/smoke-test.mjs [url]
//   url defaults to $SMOKE_URL or the production site.
// Exits non-zero (with a clear reason) on any failure so CI / a canary job
// turns red — this is the deployment-verification gate, not a unit test.

const url = process.argv[2] || process.env.SMOKE_URL || 'https://chess-mateapp.netlify.app';

const REQUIRED_HEADERS = {
  'content-security-policy': /default-src 'self'/i,
  'x-frame-options': /DENY/i,
  'x-content-type-options': /nosniff/i,
  'referrer-policy': /strict-origin/i,
  'strict-transport-security': /max-age=\d+/i,
};

const failures = [];
const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { failures.push(m); console.error(`  ✗ ${m}`); };

console.log(`Smoke test → ${url}`);

let res;
try {
  res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'chessmate-smoke-test' } });
} catch (err) {
  console.error(`✗ Request failed: ${err.message}`);
  process.exit(1);
}

// 1. Status
res.status === 200 ? ok(`HTTP ${res.status}`) : fail(`expected HTTP 200, got ${res.status}`);

// 2. HTML shell with the React root
const body = await res.text();
/text\/html/i.test(res.headers.get('content-type') || '')
  ? ok('content-type is HTML')
  : fail(`expected HTML content-type, got "${res.headers.get('content-type')}"`);
/<div id="root">/.test(body) ? ok('app shell (#root) present') : fail('app shell (#root) missing');

// 3. Security headers
for (const [name, pattern] of Object.entries(REQUIRED_HEADERS)) {
  const value = res.headers.get(name);
  if (!value) fail(`missing header: ${name}`);
  else if (!pattern.test(value)) fail(`header ${name} did not match ${pattern}: "${value}"`);
  else ok(`header ${name}`);
}

if (failures.length) {
  console.error(`\nSMOKE TEST FAILED — ${failures.length} problem(s).`);
  process.exit(1);
}
console.log('\nSMOKE TEST PASSED.');
