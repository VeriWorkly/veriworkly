"use client";

import { useEffect, useState } from "react";

import { fetchAdminAccountEmail } from "@/features/admin/services/admin-actions";
import { ApiRequestError } from "@/utils/fetchApiData";

export type AdminAccountLookup =
  | { state: "empty" }
  | { state: "loading" }
  | { state: "found"; email: string }
  | { state: "missing" }
  | { state: "error"; message: string };

const LOOKUP_DELAY_MS = 400;

/**
 * The account behind a user id an admin pasted, looked up once typing pauses, so a grant or a
 * credit adjustment can name who it acts on and refuse an id that matches nobody.
 */
export function useAdminAccount(userId: string): AdminAccountLookup {
  const id = userId.trim();
  const [lookup, setLookup] = useState<{ id: string; result: AdminAccountLookup } | null>(null);

  useEffect(() => {
    if (!id) return;

    let active = true;
    const timer = window.setTimeout(() => {
      fetchAdminAccountEmail(id)
        .then((email) => {
          if (active) setLookup({ id, result: { state: "found", email } });
        })
        .catch((error: unknown) => {
          if (!active) return;
          setLookup({
            id,
            result:
              error instanceof ApiRequestError && error.status === 404
                ? { state: "missing" }
                : {
                    state: "error",
                    message: `Could not look up this account: ${error instanceof Error ? error.message : String(error)}`,
                  },
          });
        });
    }, LOOKUP_DELAY_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [id]);

  if (!id) return { state: "empty" };
  return lookup?.id === id ? lookup.result : { state: "loading" };
}
