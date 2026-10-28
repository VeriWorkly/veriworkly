import fs from "node:fs";
import path from "node:path";

const trees = [
  { dir: "content/docs", base: "/docs" },
  { dir: "content/api-reference", base: "/api-reference" },
  { dir: "content/ats-engine", base: "/ats-engine" },
];

const pageFile = /\.mdx?$/;

function readPages(metaFile: string): string[] {
  if (!fs.existsSync(metaFile)) return [];

  const { pages } = JSON.parse(fs.readFileSync(metaFile, "utf8")) as { pages?: string[] };

  return (pages ?? []).filter((entry) => !entry.startsWith("---") && !entry.startsWith("["));
}

/**
 * A section folder without an `index` page has no URL of its own, yet search engines keep
 * folder URLs they once saw. Each one redirects to the section's overview, or else to its
 * first page in sidebar order.
 */
export function folderRedirects() {
  return trees.flatMap(({ dir, base }) => {
    const root = path.join(__dirname, dir);
    const rootOrder = readPages(path.join(root, "meta.json"));

    const walk = (relative: string): { source: string; destination: string }[] => {
      const folder = path.join(root, relative);
      const entries = fs.readdirSync(folder, { withFileTypes: true });
      const files = entries.filter((e) => e.isFile() && pageFile.test(e.name)).map((e) => e.name);
      const children = entries
        .filter((e) => e.isDirectory())
        .flatMap((e) => walk(path.posix.join(relative, e.name)));

      if (!relative || files.some((name) => name.replace(pageFile, "") === "index")) {
        return children;
      }

      const order = [
        ...readPages(path.join(folder, "meta.json")).map((p) => path.posix.join(relative, p)),
        ...rootOrder.filter((p) => p.startsWith(`${relative}/`)),
      ];
      const isPage = (p: string) =>
        fs.existsSync(path.join(root, `${p}.mdx`)) || fs.existsSync(path.join(root, `${p}.md`));
      const firstFile = files.sort()[0]?.replace(pageFile, "");
      const target = files.includes("overview.mdx")
        ? `${relative}/overview`
        : (order.find(isPage) ?? (firstFile && `${relative}/${firstFile}`));

      if (!target) return children;

      return [{ source: `${base}/${relative}`, destination: `${base}/${target}` }, ...children];
    };

    return walk("");
  });
}
