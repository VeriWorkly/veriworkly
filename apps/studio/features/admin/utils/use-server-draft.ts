import { useState } from "react";

export interface ServerDraft<T> {
  /** The server value the draft was made from. */
  base: T;
  value: T;
}

/** The draft while the server value it started from still holds; the server value once it moves. */
export function resolveServerDraft<T>(draft: ServerDraft<T>, server: T) {
  return Object.is(draft.base, server) ? draft.value : server;
}

/**
 * A control's staged value, seeded from a server prop. After an action, `router.refresh()` sends
 * the new server value as a prop; a plain `useState(prop)` would keep the old one and show the
 * control as changed (or offer to "change" a status to what it already is).
 */
export function useServerDraft<T>(server: T) {
  const [draft, setDraft] = useState<ServerDraft<T>>({ base: server, value: server });

  const value = resolveServerDraft(draft, server);
  const setValue = (next: T) => setDraft({ base: server, value: next });

  return [value, setValue] as const;
}
