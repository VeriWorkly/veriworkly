"use client";

import { Search } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

const ChangelogSearch = () => {
  const router = useRouter();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlSearch = searchParams.get("search") ?? "";

  const [value, setValue] = useState(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);

  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setValue(urlSearch);
  }

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSearch = useCallback(
    (nextValue: string) => {
      setValue(nextValue);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        const trimmed = nextValue.trim();

        if (trimmed) params.set("search", trimmed);
        else params.delete("search");

        params.delete("page");

        const query = params.toString();
        const target = query ? `${pathname}?${query}` : pathname;

        startTransition(() => {
          router.replace(target, { scroll: false });
        });
      }, 350);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="bg-card focus-within:ring-accent/40 flex h-12 w-full min-w-0 items-center gap-3 rounded-full px-5 transition-shadow focus-within:ring-2 sm:w-80">
      <Search className="text-muted size-4 shrink-0" aria-hidden="true" />

      <input
        type="search"
        // changelogValidator caps search at 120 characters.
        maxLength={120}
        value={value}
        aria-label="Search changelog"
        placeholder="Search releases…"
        onChange={(event) => handleSearch(event.target.value)}
        className="text-foreground placeholder:text-muted w-full min-w-0 bg-transparent text-base outline-none"
      />
    </div>
  );
};

export default ChangelogSearch;
