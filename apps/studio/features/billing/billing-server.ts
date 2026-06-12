import "server-only";
import { cookies } from "next/headers";
import { backendApiUrl } from "@/lib/constants";

export async function getBillingServerData<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(backendApiUrl(path), {
      headers: { Cookie: (await cookies()).toString() },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return ((await response.json()) as { data?: T }).data ?? null;
  } catch {
    return null;
  }
}
