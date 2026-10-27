import type { MergedPullRequest, ParsedReleaseBody } from "./types.js";

type ChangeList = "added" | "improved" | "fixed" | "breaking" | "security";
/** `auto`: a list of mixed changes ("What's Changed", unknown headers), filed per item by prefix. */
type Section = ChangeList | "skip" | "summary" | "pulls" | "auto";

const CATEGORY_KEYWORDS: Array<{ pattern: RegExp; category: Section }> = [
  { pattern: /contributor|dependency|dependencies|artifact|asset/i, category: "skip" },
  { pattern: /pull request|full changelog/i, category: "pulls" },
  { pattern: /summary|overview|highlights/i, category: "summary" },
  { pattern: /security/i, category: "security" },
  { pattern: /breaking/i, category: "breaking" },
  { pattern: /fix|bug|patch|resolved/i, category: "fixed" },
  { pattern: /improve|enhance|refactor|update|perf|polish/i, category: "improved" },
  { pattern: /what'?s changed/i, category: "auto" },
  { pattern: /feature|feat|added|addition|add\b|new\s+feature/i, category: "added" },
];

/** "**#191** — [Feature] title" or "**#221** - `[Chore] title` by @user". */
const PULL_REQUEST_LINE = /^\*{0,2}#(\d+)\*{0,2}\s+[—–-]\s+`?(.+?)`?(?:\s+by\s+@[\w-]+)?$/;

/** GitHub's generated notes: "title by @user in https://github.com/o/r/pull/123". */
const GENERATED_PR_LINE =
  /^(.+?)\s+by\s+@[\w-]+(?:\[bot\])?\s+in\s+https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/(\d+)\s*$/;

const BULLET = /^(\s*)(?:[-*+•]|\d+[.)])\s+(.*)$/;
const FENCE = /^(`{3,}|~{3,})/;
const HORIZONTAL_RULE = /^([-*_])(\s*\1){2,}$/;
/** A line that is only bold text ("**Bug fixes**"), used as a sub-header. */
const BOLD_HEADER = /^(?:\*\*|__)([^*_]+)(?:\*\*|__):?$/;
/** An image, or a linked image, alone on its line. */
const IMAGE_LINE = /^\[?!\[[^\]]*\]\([^)]*\)(?:\]\([^)]*\))?$/;
const HTML_LINE = /^<\/?[a-z][^>]*>/i;

/**
 * Where a change belongs when its section does not say: from the "[Fix]" or "fix(scope):" prefix
 * PR titles here carry. Dependency bumps are left out, as their own section is. Anything else is
 * a feature.
 */
function classifyChange(title: string): ChangeList | "skip" {
  const text = title.trim();

  if (/^bump\s/i.test(text)) return "skip";
  if (/^\[breaking\]|^\w+(?:\([^)]*\))?!:/i.test(text)) return "breaking";
  if (/^\[security\]|^security(?:\([^)]*\))?:/i.test(text)) return "security";
  if (/^\[(?:fix|bug|bugfix|hotfix)\]|^(?:fix|bugfix|hotfix)(?:\([^)]*\))?:/i.test(text))
    return "fixed";
  if (
    /^\[(?:refactor|perf|chore|docs?|style|tests?|ci|build|improvement|enhancement)\]/i.test(
      text,
    ) ||
    /^(?:refactor|perf|chore|docs?|style|test|ci|build)(?:\([^)]*\))?:/i.test(text)
  )
    return "improved";

  return "added";
}

function sectionFor(header: string): Section | null {
  return CATEGORY_KEYWORDS.find(({ pattern }) => pattern.test(header))?.category ?? null;
}

type OpenEntry = { list: ChangeList; index: number; nested: number };

/**
 * Markdown parser for GitHub release notes, line by line (V-065).
 *
 * Bullets are filed under the section their header names; under "What's Changed" or a header
 * that names no category, each is filed by its own prefix. A bullet's wrapped lines (indented, or
 * following it with no blank line between) are joined onto it, and nested bullets fold into their
 * parent ("parent: one; two"). A paragraph in a change section is an entry of its own unless it
 * introduces a list (ends with ":"). Code fences, tables, images, HTML and `<details>` blocks are
 * not prose and are dropped. Text before any change section is the summary. GitHub's generated
 * "by @user in …/pull/N" suffix is stripped and N recorded as one of the release's PRs.
 */
export function parseReleaseBody(body: string | null): ParsedReleaseBody {
  const result: ParsedReleaseBody = {
    summary: null,
    added: [],
    improved: [],
    fixed: [],
    breaking: [],
    security: [],
    pullRequests: [],
  };

  if (!body) return result;

  let section: Section | null = null;
  let isPreamble = true;
  const summaryLines: string[] = [];

  /** The entry later lines may still extend. */
  let open: OpenEntry | null = null;
  let paragraph: string[] = [];
  let previousBlank = false;
  let fence: string | null = null;
  let detailsDepth = 0;

  const listFor = (text: string): ChangeList | "skip" => {
    if (section === "auto" || section === null) return classifyChange(text);
    if (section === "summary") return "added";
    if (section === "skip" || section === "pulls") return "skip";
    return section;
  };

  const push = (list: ChangeList, text: string): OpenEntry => {
    result[list].push(text);
    return { list, index: result[list].length - 1, nested: 0 };
  };

  const flushParagraph = () => {
    if (paragraph.length === 0) return;

    const text = paragraph.join(" ");
    paragraph = [];

    const list = listFor(text);
    if (!text.endsWith(":") && list !== "skip") push(list, text);
  };

  const enterSection = (next: Section | null) => {
    flushParagraph();
    open = null;

    // A header that names no category (the release's own title) keeps the preamble going, so
    // the intro under "## v3.22.0" is still the summary; any other section ends it.
    if (next && next !== "summary") isPreamble = false;
    if (next) section = next;
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const expanded = rawLine.replace(/\t/g, "    ");
    const line = expanded.trim();

    if (fence) {
      if (line.startsWith(fence)) fence = null;
      continue;
    }

    if (detailsDepth > 0) {
      if (/^<details\b/i.test(line)) detailsDepth++;
      if (/<\/details>/i.test(line)) detailsDepth--;
      continue;
    }

    const fenceOpen = FENCE.exec(line);
    if (fenceOpen) {
      flushParagraph();
      fence = fenceOpen[1];
      continue;
    }

    // A collapsed block is supplementary detail, not a change: dropped whole.
    if (/^<details\b/i.test(line)) {
      flushParagraph();
      open = null;
      if (!/<\/details>/i.test(line)) detailsDepth = 1;
      continue;
    }

    if (!line) {
      flushParagraph();
      previousBlank = true;
      continue;
    }

    const afterBlank = previousBlank;
    previousBlank = false;

    if (HORIZONTAL_RULE.test(line)) {
      flushParagraph();
      open = null;
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      // An unknown header is a list of mixed changes, unless it is the release's title heading.
      const next = sectionFor(line.replace(/^#{1,6}\s+/, ""));
      enterSection(next ?? (isPreamble ? null : "auto"));
      continue;
    }

    // Skip metadata lines like "**Full Changelog**: https://..."
    if (/^\*\*Full Changelog\*\*:/i.test(line) || /^Full Changelog:/i.test(line)) continue;

    const bold = BOLD_HEADER.exec(line);
    if (bold) {
      // "**Bug fixes**" switches the category; "**Studio**" only groups, so it changes nothing.
      enterSection(sectionFor(bold[1]));
      continue;
    }

    if (line.startsWith("|") || IMAGE_LINE.test(line) || HTML_LINE.test(line)) {
      flushParagraph();
      continue;
    }

    const bullet = BULLET.exec(expanded);

    if (bullet) {
      flushParagraph();

      const indent = bullet[1].length;
      const item = bullet[2].trim();

      if (!item || IMAGE_LINE.test(item)) continue;

      const parent: OpenEntry | null = open;
      if (indent >= 2 && parent) {
        const text = result[parent.list][parent.index];
        const separator = parent.nested === 0 ? (text.endsWith(":") ? " " : ": ") : "; ";
        result[parent.list][parent.index] = `${text}${separator}${item}`;
        parent.nested++;
        continue;
      }

      isPreamble = false;
      open = null;

      if (section === "skip") continue;

      if (section === "pulls") {
        const pr = PULL_REQUEST_LINE.exec(item);
        if (pr) result.pullRequests.push({ number: Number(pr[1]), title: pr[2].trim() });
        continue;
      }

      const generated = GENERATED_PR_LINE.exec(item);
      const title = generated ? generated[1].trim() : item;

      if (generated) result.pullRequests.push({ number: Number(generated[2]), title });

      const list = listFor(title);
      if (list !== "skip") open = push(list, title);
      continue;
    }

    // A wrapped line of the open entry: indented, or straight after it with no blank line.
    const entry: OpenEntry | null = open;
    if (entry && (!afterBlank || /^\s{2,}/.test(expanded))) {
      result[entry.list][entry.index] += ` ${line}`;
      continue;
    }

    open = null;

    if (isPreamble || section === "summary") summaryLines.push(line);
    else paragraph.push(line);
  }

  flushParagraph();

  if (summaryLines.length > 0) {
    result.summary = summaryLines.join(" ");
  }

  return result;
}

export interface ReleasePrRef {
  number: number;
  title: string;
  url?: string;
  author?: { login: string; avatarUrl: string; htmlUrl: string } | null;
}

/** A release's listed PRs as refs; GitHub's merged-PR list fills in their authors later. */
export function listedPullRequests(
  pulls: ParsedReleaseBody["pullRequests"],
  repoUrl: string,
): ReleasePrRef[] {
  return pulls.map((pr) => ({ ...pr, url: `${repoUrl}/pull/${pr.number}`, author: null }));
}

/**
 * Two PR lists as one, newest first. Nothing is dropped, and a ref without an author is replaced
 * by the same PR from the other list when that one has the author.
 */
export function unionPullRequests(a: ReleasePrRef[], b: ReleasePrRef[]): ReleasePrRef[] {
  const byNumber = new Map<number, ReleasePrRef>();

  for (const ref of [...a, ...b]) {
    const known = byNumber.get(ref.number);
    if (!known || (!known.author && ref.author)) byNumber.set(ref.number, ref);
  }

  return [...byNumber.values()].sort((x, y) => y.number - x.number);
}

/**
 * Whether two PR lists say the same thing. Compared by content, not as JSON: Postgres jsonb
 * stores object keys in its own order, so a stored list never stringifies like a fresh one.
 */
export function samePullRequests(a: ReleasePrRef[], b: ReleasePrRef[]): boolean {
  const key = (refs: ReleasePrRef[]) =>
    refs.map((ref) => [ref.number, ref.title, ref.url ?? "", ref.author?.login ?? ""].join("|"));

  return JSON.stringify(key(a)) === JSON.stringify(key(b));
}

const DEFAULT_BRANCHES = new Set(["master", "main"]);

/**
 * Which pull requests shipped in which release. A PR a release's notes name belongs to that
 * release; every other PR merged into the default branch belongs to the first release published
 * after it merged. A PR merged into any other branch (a long-lived feature branch) is only placed
 * when notes name it (V-339): it shipped when its branch reached the default branch, which its
 * own merge date says nothing about. "Sync dev from master" PRs only move code that already
 * shipped, so they are left out.
 */
export function assignPullRequestsToReleases(
  releases: Array<{ id: string; publishedAt: string; listed: number[] }>,
  pulls: MergedPullRequest[],
): Map<string, ReleasePrRef[]> {
  const ordered = [...releases].sort(
    (a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt),
  );
  const listedBy = new Map<number, string>();
  for (const release of ordered)
    for (const number of release.listed) listedBy.set(number, release.id);

  const assigned = new Map<string, ReleasePrRef[]>(ordered.map((release) => [release.id, []]));

  for (const pr of pulls) {
    if (DEFAULT_BRANCHES.has(pr.headRef) && !DEFAULT_BRANCHES.has(pr.baseRef)) continue;

    const merged = Date.parse(pr.mergedAt);
    const id =
      listedBy.get(pr.number) ??
      (DEFAULT_BRANCHES.has(pr.baseRef)
        ? ordered.find((release) => Date.parse(release.publishedAt) >= merged)?.id
        : undefined);

    if (id)
      assigned
        .get(id)!
        .push({ number: pr.number, title: pr.title, url: pr.url, author: pr.author });
  }

  for (const refs of assigned.values()) refs.sort((x, y) => y.number - x.number);

  return assigned;
}

/**
 * A release's stored PRs without the ones another release's notes now name (V-339). Stored lists
 * are otherwise only ever unioned, so a PR the merge-date guess gave to an earlier release stayed
 * there for good once the release that shipped it listed it too. A PR this release names itself
 * stays.
 */
export function pruneReassignedPullRequests<T extends { number: number }>(
  stored: T[],
  listed: { listedHere: ReadonlySet<number>; listedElsewhere: ReadonlySet<number> },
): T[] {
  return stored.filter(
    (ref) => listed.listedHere.has(ref.number) || !listed.listedElsewhere.has(ref.number),
  );
}

type StoredReleaseFields = Pick<
  ParsedReleaseBody,
  "summary" | "added" | "improved" | "fixed" | "breaking" | "security"
> & { prRefs: ReleasePrRef[] };

/**
 * What a stored release becomes when its body is parsed again, or null when nothing changes.
 * Entries synced before the parser learned about rules, intros and PR lists are repaired this
 * way without re-fetching anything from GitHub.
 */
export function reparseStoredRelease(
  body: string | null,
  stored: StoredReleaseFields,
  repoUrl: string,
): StoredReleaseFields | null {
  const parsed = parseReleaseBody(body);

  const next: StoredReleaseFields = {
    summary: parsed.summary,
    added: parsed.added,
    improved: parsed.improved,
    fixed: parsed.fixed,
    breaking: parsed.breaking,
    security: parsed.security,
    prRefs: unionPullRequests(stored.prRefs, listedPullRequests(parsed.pullRequests, repoUrl)),
  };

  const same =
    samePullRequests(next.prRefs, stored.prRefs) &&
    (["summary", "added", "improved", "fixed", "breaking", "security"] as const).every(
      (key) => JSON.stringify(next[key]) === JSON.stringify(stored[key]),
    );

  return same ? null : next;
}
