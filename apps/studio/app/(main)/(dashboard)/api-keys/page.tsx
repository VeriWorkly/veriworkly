import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";

import { headers } from "next/headers";
import { KeyRound, ShieldCheck } from "lucide-react";

import { backendApiUrl } from "@/lib/constants";

import type {
  ApiKeyRecord,
  OffsetPaginationPayload,
} from "@/features/api-keys/components/ApiKeyTypes";

import ApiKeySection from "@/features/api-keys/components/ApiKeySection";

export const metadata: Metadata = {
  title: "API Keys",
  description: "Create and manage API keys for VeriWorkly integrations.",
  robots: { index: false, follow: false },
};

async function fetchInitialApiKeys() {
  try {
    const requestHeaders = await headers();
    const cookie = requestHeaders.get("cookie");

    const response = await fetch(backendApiUrl("/api-keys"), {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
    });

    if (!response.ok) {
      return { keys: [] as ApiKeyRecord[], pagination: null, loaded: false };
    }

    const payload = (await response.json()) as { data?: OffsetPaginationPayload<ApiKeyRecord> };

    return {
      keys: payload.data?.items ?? [],
      pagination: payload.data ?? null,
      loaded: true,
    };
  } catch {
    return { keys: [] as ApiKeyRecord[], pagination: null, loaded: false };
  }
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="bg-background/70 rounded-xl p-4">
      <div className="text-muted flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

const ApiKeysPage = async () => {
  const initialApiKeys = await fetchInitialApiKeys();

  const total = initialApiKeys.pagination?.total ?? initialApiKeys.keys.length;
  const active = initialApiKeys.keys.filter((key) => key.isActive).length;

  return (
    <main className="space-y-6" aria-labelledby="api-keys-title">
      <section className="border-border bg-card grid gap-0 overflow-hidden rounded-2xl border lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="p-5 sm:p-6">
          <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase">API keys</p>

          <h1 id="api-keys-title" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Developer access
          </h1>

          <p className="text-muted mt-2 max-w-2xl text-base">
            Review existing tokens before creating another. Rotate keys when access changes.
          </p>
        </div>

        <div className="border-border/70 grid gap-3 border-t p-5 sm:grid-cols-2 lg:border-t-0 lg:border-l">
          <Metric icon={KeyRound} label="Total keys" value={total.toString()} />
          <Metric icon={ShieldCheck} label="Active keys" value={active.toString()} />
        </div>
      </section>

      <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
        <ApiKeySection
          initialKeys={initialApiKeys.keys}
          initialKeysLoaded={initialApiKeys.loaded}
          initialPagination={initialApiKeys.pagination}
        />
      </section>
    </main>
  );
};

export default ApiKeysPage;
