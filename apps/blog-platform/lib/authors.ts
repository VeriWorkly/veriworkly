/**
 * Every `author` value used in post frontmatter, keyed by that exact string.
 *
 * A `team` byline is an editorial group inside VeriWorkly, not a separate legal entity, so it is
 * emitted as an Organization whose parent is VeriWorkly. A named writer is added as a `person`
 * entry; it then renders as a schema.org `Person` with its profile links.
 */
type AuthorBase = {
  name: string;
  /** The short line shown under the byline in the post sidebar. */
  role: string;
};

type TeamAuthor = AuthorBase & { type: "team" };

type PersonAuthor = AuthorBase & {
  type: "person";
  /** The author's own profile page. Used as the schema.org `url` and the `article:author` value. */
  url?: string;
  jobTitle?: string;
  /** Profiles that identify the same person (GitHub, LinkedIn, personal site). */
  sameAs?: string[];
};

export type Author = TeamAuthor | PersonAuthor;

const authors: Record<string, Author> = {
  "Gautam Raj": {
    type: "person",
    name: "Gautam Raj",
    role: "VeriWorkly",
    url: "https://gautam-raj.vercel.app",
    sameAs: ["https://github.com/Gautam25Raj", "https://x.com/noober_boy"],
  },
};

export function getAuthor(byline: string): Author {
  const author = authors[byline];

  if (!author) {
    throw new Error(`Unknown post author "${byline}": add it to lib/authors.ts.`);
  }

  return author;
}
