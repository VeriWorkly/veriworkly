import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A sideways-scrolling box clips an absolutely positioned child (an `sr-only` label, say) only
 * when the box is its positioning parent. Without `relative` the label escapes, and phones widen
 * the whole page to fit it: /pricing rendered 782px wide on a 390px screen.
 */

const root = join(__dirname, "..", "..");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return name.endsWith(".tsx") ? [full] : [];
  });

describe("horizontal scroll boxes contain their positioned children", () => {
  it("every overflow-x-auto box is relative", () => {
    const offenders = ["app", "features", "components"]
      .flatMap((dir) => files(join(root, dir)))
      .flatMap((file) =>
        [
          ...readFileSync(file, "utf8").matchAll(
            /className=(["`])([^"`]*\boverflow-x-auto\b[^"`]*)\1/g,
          ),
        ]
          .filter(([, , classes]) => !/(^|\s)relative(\s|$)/.test(classes!))
          .map(() => relative(root, file)),
      );

    expect(offenders).toEqual([]);
  });
});
