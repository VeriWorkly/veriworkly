import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";

import { KeyRound, ShieldCheck } from "lucide-react";

import { hasSessionCookie, serverFetchData } from "@/lib/server-fetch";

import type { ApiKeyRecord } from "@/features/api-keys/components/ApiKeyTypes";
import type { OffsetPaginationPayload } from "@/utils/fetchApiData";

import ApiKeySection from "@/features/api-keys/components/ApiKeySection";
import { getApiKeyStatus } from "@/features/api-keys/api-key-service";

export const metadata: Metadata = {
  title: "API Keys",
  description: "Create and manage API keys for VeriWorkly integrations.",
  robots: { index: false, follow: false },
};

/** A guest has no keys to list; for a signed-in user a failed load throws rather than showing "0 keys". */
async function fetchInitialApiKeys() {
  if (!(await hasSessionCookie())) {
    return { keys: [] as ApiKeyRecord[], pagination: null, loaded: true };
  }

  const page = await serverFetchData<OffsetPaginationPayload<ApiKeyRecord>>("/api-keys");

  return { keys: page.items, pagination: page, loaded: true };
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="bg-background/70 rounded-xl p-4">
      <div className="text-muted flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
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
  const active = initialApiKeys.keys.filter((key) => getApiKeyStatus(key) === "active").length;

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
          {/* Statuses come one page at a time, so past the first page the count says so. */}
          <Metric
            icon={ShieldCheck}
            label={initialApiKeys.pagination?.hasMore ? "Active on first page" : "Active keys"}
            value={active.toString()}
          />
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
