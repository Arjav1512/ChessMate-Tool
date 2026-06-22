import axe from 'axe-core';

/**
 * Run axe-core against a rendered DOM node and return human-readable violation
 * summaries (empty array = clean). Two rules are disabled for **jsdom**:
 *  - `color-contrast` needs real layout/rendering → covered by the Playwright
 *    a11y e2e (real browser) instead.
 *  - `region` flags content outside a landmark, which is a false positive when a
 *    single component is rendered in isolation → the full-shell landmark
 *    structure is validated in e2e.
 * This keeps component tests focused on roles, names, and ARIA correctness.
 */
export async function findA11yViolations(node: Element): Promise<string[]> {
  const results = await axe.run(node, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
    resultTypes: ['violations'],
  });
  return results.violations.map((v) => `${v.id}: ${v.help} — ${v.nodes.length} node(s)`);
}
