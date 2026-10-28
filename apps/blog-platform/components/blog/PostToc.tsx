import type { BlogPostPage } from "@/lib/source";

/**
 * Derived from the loaded page rather than imported from fumadocs directly: the TOC
 * item type is not part of the package's public export surface, so tracking the
 * source of truth keeps this from breaking on a minor upgrade.
 */
type PostTocProps = {
  toc: BlogPostPage["toc"];
};

/**
 * Server-rendered contents list for the post sidebar. On 2,000+ word pillars it lets a
 * reader scan, and the in-page anchors give search engines section targets.
 *
 * Deliberately static: no scroll-spy, no client bundle. The interactivity is not
 * worth shipping JavaScript for on a page whose entire job is reading.
 */
export default function PostToc({ toc }: PostTocProps) {
  // h1 is the article title, already rendered in the header. Depth 4+ is too granular
  // to be useful in a narrow sidebar.
  const items = toc.filter((item) => item.depth === 2 || item.depth === 3);

  if (items.length < 3) return null;

  return (
    <nav aria-labelledby="post-toc-heading" className="space-y-4">
      <div
        id="post-toc-heading"
        className="text-muted-foreground font-mono text-[10px] font-bold tracking-widest uppercase"
      >
        Contents
      </div>

      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.url} className={item.depth === 3 ? "pl-4" : undefined}>
            <a
              href={item.url}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-foreground/40 block rounded-sm leading-snug no-underline transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
