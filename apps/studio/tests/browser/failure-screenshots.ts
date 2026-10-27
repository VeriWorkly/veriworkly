import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { beforeEach } from "vitest";

import type { Page } from "playwright";

/** Where a failed browser test leaves a screenshot of its page. The nightly CI job uploads it. */
const FAILURE_SHOTS_DIR = join(process.cwd(), "tests", "browser", ".failures");

/**
 * Screenshots the page a test was driving when it fails, so a nightly failure can be read
 * without re-running it. `page` is a getter because suites replace their page between tests.
 */
export function screenshotFailures(page: () => Page | undefined) {
  beforeEach(({ task, onTestFailed }) => {
    onTestFailed(async () => {
      const current = page();
      if (!current || current.isClosed()) return;

      mkdirSync(FAILURE_SHOTS_DIR, { recursive: true });
      const file = `${task.file.name.split(/[\\/]/).at(-1)}--${task.name}`
        .replace(/[^\w.-]+/g, "-")
        .slice(0, 150);

      await current.screenshot({ path: join(FAILURE_SHOTS_DIR, `${file}.png`), fullPage: true });
    });
  });
}
