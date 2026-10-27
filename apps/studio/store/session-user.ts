"use client";

import { createContext, useContext } from "react";

import type { SessionUser } from "@/features/auth/services/current-user";

import { useUserStore } from "./useUserStore";

/** The user the server rendered this page for; `null` for a guest. */
export const InitialUserContext = createContext<SessionUser | null>(null);

/**
 * The signed-in user, for rendering. Until the store has the session (in the server HTML and
 * the first client paint) this is the user the server rendered the page for, so a signed-in
 * user never sees a page's signed-out state first.
 */
export function useSessionUser(): SessionUser | null {
  const initialUser = useContext(InitialUserContext);
  const loading = useUserStore((state) => state.loading);
  const user = useUserStore((state) => state.user);

  return loading ? initialUser : user;
}
