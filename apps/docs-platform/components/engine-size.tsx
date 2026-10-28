import sizes from "@veriworkly/ats-engine/sizes.json";

type Size = { kb: number; budget: number };
type Sizes = {
  version: string;
  subpaths: Record<string, Size>;
  imports: Record<string, Size & { subpath: string; names: string[] }>;
};

const measured = sizes as Sizes;

/**
 * A subpath's size (`of="./locales"`) or a named import's (`of="withLocales"`), minified and
 * gzipped, as the installed engine measured it for its release (`sizes.json`). An unknown name
 * fails the build, so a page cannot quote a size the engine no longer reports.
 */
function engineSize(of: string, whole = false): string {
  const size =
    measured.subpaths[of] ??
    Object.values(measured.imports).find(
      (entry) => entry.names.length === 1 && entry.names[0] === of,
    );
  if (!size) throw new Error(`The installed @veriworkly/ats-engine reports no size for "${of}".`);
  return whole ? `${Math.round(size.kb)} KB` : `${size.kb.toFixed(1)} KB`;
}

export function EngineSize({ of, whole }: { of: string; whole?: boolean }) {
  return <>{engineSize(of, whole)}</>;
}

/** The installed engine's version, which the sizes were measured for. */
export function EngineVersion() {
  return <>{measured.version}</>;
}

/** The two tags above as their text, for a page read as Markdown (`llms-full.txt`). */
export function withEngineSizes(markdown: string): string {
  return markdown
    .replace(/<EngineSize\s+of="([^"]+)"(\s+whole)?\s*\/>/g, (_, of: string, whole?: string) =>
      engineSize(of, Boolean(whole)),
    )
    .replace(/<EngineVersion\s*\/>/g, measured.version);
}
