// Parsing benchmark: field accuracy and time per resume over the labelled synthetic corpus in
// tests/fixtures (invented people only). `npm run bench`; add a resume there to grow the corpus.
import { AtsScoringService, DEFAULT_POLICY } from "../src/index.js";
import { BUILT_IN_LOCALES, withLocales } from "../src/locales/index.js";
import { fieldChecks } from "../tests/fixtures/accuracy.js";
import { LOCALE_FIXTURES } from "../tests/fixtures/locale-resumes.js";

const policy = withLocales(DEFAULT_POLICY, BUILT_IN_LOCALES);
const now = new Date("2026-10-01T00:00:00Z");
const byField = new Map<string, { ok: number; total: number }>();
const misses: string[] = [];
let resumes = 0;
let elapsed = 0;

for (const [set, fixtures] of Object.entries(LOCALE_FIXTURES))
  for (const fixture of fixtures) {
    const started = performance.now();
    const report = AtsScoringService.check(fixture.text, policy, { now });
    elapsed += performance.now() - started;
    resumes += 1;
    for (const { field, ok } of fieldChecks(report, fixture)) {
      const tally = byField.get(field) ?? { ok: 0, total: 0 };
      tally.ok += Number(ok);
      tally.total += 1;
      byField.set(field, tally);
      if (!ok) misses.push(`${set}/${fixture.id}: ${field}`);
    }
  }

const all = [...byField.values()].reduce(
  (sum, t) => ({ ok: sum.ok + t.ok, total: sum.total + t.total }),
  { ok: 0, total: 0 },
);
console.log(`${resumes} resumes, ${(elapsed / resumes).toFixed(1)} ms each`);
for (const [field, { ok, total }] of byField)
  console.log(
    `${field.padEnd(18)} ${((100 * ok) / total).toFixed(1).padStart(5)}%  (${ok}/${total})`,
  );
console.log(`${"overall".padEnd(18)} ${((100 * all.ok) / all.total).toFixed(1).padStart(5)}%`);
if (misses.length) console.log(`\nmissed:\n  ${misses.join("\n  ")}`);
