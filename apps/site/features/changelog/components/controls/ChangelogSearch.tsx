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
    <div className="border-border/30 bg-background/60 focus-within:ring-accent/30 flex min-w-0 flex-1 items-center gap-2 rounded-full border px-3.5 py-1.5 transition-shadow focus-within:ring-2 sm:flex-none sm:basis-64">
      <Search className="text-muted h-3.5 w-3.5 shrink-0" aria-hidden="true" />

      <input
        type="search"
        value={value}
        aria-label="Search changelog"
        placeholder="Search releases…"
        onChange={(event) => handleSearch(event.target.value)}
        className="text-foreground placeholder:text-muted/70 w-full min-w-0 bg-transparent font-sans text-xs font-medium outline-none"
      />
    </div>
  );
};

export default ChangelogSearch;
