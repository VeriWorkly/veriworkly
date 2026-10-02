import { expect, it } from "vitest";

import { DEFAULT_POLICY, ENGINE_VERSION, policyFingerprint, policyRubric } from "../src/index.js";
import { CATEGORY_LABELS, sortByCategoryOrder } from "../src/format/index.js";

/**
 * RUBRIC.md is generated from the community policy, so the published rubric cannot drift from the
 * rules that actually score. This fails when they differ; `npm run rubric` regenerates it.
 */
it("RUBRIC.md describes the community policy exactly", async () => {
  const entries = sortByCategoryOrder(policyRubric(DEFAULT_POLICY));
  // Evidence templates read as prose here: "{n}" becomes "n", a quoted sample an ellipsis.
  const escape = (text: string) =>
    text
      .replace(/\{(?:n|pct)\}/g, "n")
      .replace(/\{sample\}/g, "…")
      .replace(/\|/g, "\\|");
  const rows = entries.map(
    (e) =>
      `| \`${e.id}\` | ${CATEGORY_LABELS[e.category] ?? e.category} | ${e.severity} | ${escape(e.measures)} | ${e.deduction ? `−${e.points} pts` : e.points} | ${escape(e.passes)} | ${escape(e.fix)} |`,
  );

  const markdown = `# Scoring rubric

Generated from the community policy (\`DEFAULT_POLICY\`) by \`npm run rubric\`; do not edit by hand.

- Engine ${ENGINE_VERSION}, policy \`${policyFingerprint(DEFAULT_POLICY)}\`.
- **Score.** Each rule that applies can lose its weight. The readiness score is the share of the
  applicable weight kept, 0–100. A rule whose evidence is absent — page geometry for pasted
  text, a posting for the copied-posting check — is left out of both the report and the score.
- **Deductions.** Integrity rules (\`−n pts\`) are taken off the finished score in points and are
  never part of the weighing: an honest resume scores exactly as if they did not exist.
- **Determinism.** The same input, reference date (\`now\`), engine version and policy fingerprint
  always produce the same report. Every report carries \`engine.version\` and \`engine.policy\`.
- Region packs adjust a few rules by country; see LOCALES.md.

| Rule | Category | Severity | Reads | Weight | Passes when | Fix |
|---|---|---|---|---|---|---|
${rows.join("\n")}
`;

  await expect(markdown).toMatchFileSnapshot("../RUBRIC.md");
});
