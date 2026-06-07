import "server-only";

import { cookies } from "next/headers";

import { backendApiUrl, firstPartyServerHeaders } from "@/lib/backend";

export async function fetchServerApiData<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(backendApiUrl(path, true), {
      headers: firstPartyServerHeaders({ Cookie: (await cookies()).toString() }),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as { data?: T };
    return payload.data ?? null;
  } catch {
    return null;
  }
}
