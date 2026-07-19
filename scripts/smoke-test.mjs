#!/usr/bin/env node
// Post-deploy smoke test / uptime canary.
//
// Verifies that the production deployment is healthy:
//   - Homepage responds with HTTP 200
//   - HTML app shell exists
//   - Required security headers are present
//   - SPA deep-link (/dashboard) serves the React app instead of a 404
//
// Usage:
//   node scripts/smoke-test.mjs [url]
//
// URL defaults to:
//   1. CLI argument
//   2. SMOKE_URL env variable
//   3. https://chess-mate.app
//
// Exits with code 1 if any check fails.

const url =
  process.argv[2] ||
  process.env.SMOKE_URL ||
  "https://chess-mate.app";

const base = url.replace(/\/+$/, "");

const failures = [];

const ok = (msg) => console.log(`  ✓ ${msg}`);

const fail = (msg) => {
  failures.push(msg);
  console.error(`  ✗ ${msg}`);
};

const bust = () => `smoke=${Date.now()}`;

async function fetchText(target) {
  const separator = target.includes("?") ? "&" : "?";

  const res = await fetch(`${target}${separator}${bust()}`, {
    redirect: "follow",
    headers: {
      "User-Agent": "chessmate-smoke-test",
      Pragma: "no-cache",
    },
  });

  return {
    res,
    body: await res.text(),
  };
}

console.log(`Smoke test → ${base}`);

let res, body;

try {
  ({ res, body } = await fetchText(base));
} catch (err) {
  console.error(`✗ Request failed: ${err.message}`);
  process.exit(1);
}

//
// 1. HTTP Status
//

if (res.status === 200) {
  ok(`HTTP ${res.status}`);
} else {
  fail(`Expected HTTP 200, got ${res.status}`);
}

//
// 2. HTML shell
//

if (/text\/html/i.test(res.headers.get("content-type") || "")) {
  ok("content-type is HTML");
} else {
  fail(
    `Expected HTML content-type, got "${res.headers.get("content-type")}"`
  );
}

if (/<div id="root">/.test(body)) {
  ok("app shell (#root) present");
} else {
  fail("app shell (#root) missing");
}

//
// 3. Security headers
//

const REQUIRED_HEADERS = {
  "content-security-policy": /default-src 'self'/i,
  "x-frame-options": /DENY/i,
  "x-content-type-options": /nosniff/i,
  "referrer-policy": /strict-origin/i,
  "strict-transport-security": /max-age=\d+/i,
};

for (const [header, pattern] of Object.entries(REQUIRED_HEADERS)) {
  const value = res.headers.get(header);

  if (!value) {
    fail(`Missing header: ${header}`);
    continue;
  }

  if (!pattern.test(value)) {
    fail(`Header ${header} does not match expected policy.`);
    continue;
  }

  ok(`header ${header}`);
}

//
// 4. SPA Deep Link
//

try {
  const deep = await fetchText(`${base}/dashboard`);

  if (
    deep.res.status === 200 &&
    /<div id="root">/.test(deep.body)
  ) {
    ok("SPA deep link (/dashboard) serves the app shell");
  } else {
    fail(
      `SPA deep link (/dashboard) broken: HTTP ${deep.res.status}`
    );
  }
} catch (err) {
  fail(`SPA deep link request failed: ${err.message}`);
}

//
// Final Result
//

if (failures.length) {
  console.error(`\nSMOKE TEST FAILED — ${failures.length} problem(s).`);
  process.exit(1);
}

console.log("\nSMOKE TEST PASSED.");
