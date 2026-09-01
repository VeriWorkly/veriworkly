import Image from "next/image";
import { GitPullRequest } from "lucide-react";

import { type ChangelogPrRef } from "@/features/changelog/services/changelog-backend";

interface CardAuthorsProps {
  prRefs: ChangelogPrRef[];
}

const MAX_VISIBLE_AUTHORS = 4;

export const CardAuthors = ({ prRefs }: CardAuthorsProps) => {
  if (prRefs.length === 0) return null;

  const authors = prRefs
    .map((pr) => pr.author)
    .filter((author): author is NonNullable<typeof author> => Boolean(author))
    .filter(
      (author, index, all) => all.findIndex((other) => other.login === author.login) === index,
    )
    .slice(0, MAX_VISIBLE_AUTHORS);

  return (
    <div className="text-muted flex items-center gap-2">
      {authors.length > 0 && (
        <div className="flex -space-x-1.5">
          {authors.map((author) => (
            <Image
              width={18}
              height={18}
              key={author.login}
              alt={author.login}
              title={author.login}
              src={author.avatarUrl}
              className="ring-card rounded-full ring-2"
            />
          ))}
        </div>
      )}

      <span className="flex items-center gap-1 font-mono text-[11px] tracking-wide">
        <GitPullRequest className="h-3 w-3 shrink-0" aria-hidden="true" />
        {prRefs.length} PR{prRefs.length === 1 ? "" : "s"}
      </span>
    </div>
  );
};

export default CardAuthors;
