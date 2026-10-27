"use client";

import { toast } from "sonner";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { signInFailureFromQuery } from "@/lib/sign-in";

/**
 * A refused account link (GitHub) comes back here with an `error` code. It is said once, in
 * fixed words, and dropped from the address so a reload does not repeat it.
 */
export function LinkErrorNotice() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const failure = signInFailureFromQuery(searchParams);
    if (!failure) return;

    toast.error(failure.message);

    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("error_description");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, [searchParams]);

  return null;
}
