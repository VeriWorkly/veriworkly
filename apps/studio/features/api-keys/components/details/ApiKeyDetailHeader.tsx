"use client";

import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";

import type { ApiKeyDetailRecord } from "../ApiKeyTypes";

import { Badge } from "@veriworkly/ui";

import { statusClass } from "./api-key-detail-utils";

type ApiKeyDetailHeaderProps = {
  data: ApiKeyDetailRecord;
};

export function ApiKeyDetailHeader({ data }: ApiKeyDetailHeaderProps) {
  return (
    <section className="border-border bg-card grid gap-0 overflow-hidden rounded-2xl border lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="p-5 sm:p-6">
        <Link
          href="/api-keys"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to keys
        </Link>

        <div className="mt-5 flex flex-wrap items-start gap-3">
          <div className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <KeyRound className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                id="api-key-detail-title"
                className="text-3xl font-black tracking-tight sm:text-4xl"
              >
                {data.name}
              </h1>

              <Badge className={statusClass(data.isActive)}>
                {data.isActive ? "Active" : "Revoked"}
              </Badge>
            </div>

            <p className="text-muted mt-2 font-mono text-sm">
              {data.keyPrefix}........{data.keySuffix}
            </p>
          </div>
        </div>
      </div>

      <div className="border-border/70 grid content-center gap-3 border-t p-5 lg:border-t-0 lg:border-l">
        <div className="bg-background/70 rounded-xl p-4">
          <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            Rate limit
          </p>

          <p className="mt-2 text-2xl font-black">{data.rateLimit}/min</p>
        </div>

        {!data.isActive && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm font-medium text-red-700 dark:text-red-300">
            This API key is disabled and cannot authenticate requests.
          </div>
        )}
      </div>
    </section>
  );
}
