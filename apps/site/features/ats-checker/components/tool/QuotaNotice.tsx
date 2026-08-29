import Link from "next/link";
import { Clock, Gauge } from "lucide-react";

import { siteConfig } from "@/config/site";
import { allowanceCopy, resetCopy } from "../../services/quota-copy";
import type { AtsQuota } from "../../types";

export function loginHref(): string {
  return `${siteConfig.links.app}/login?callbackURL=${encodeURIComponent(
    `${siteConfig.url}/ats-checker/scan`,
  )}`;
}

export function QuotaNotice({ quota }: { quota: AtsQuota }) {
  const exhausted = quota.remaining <= 0;

  if (exhausted) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
        <Clock
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400"
          aria-hidden="true"
        />
        <div className="text-sm text-zinc-700 dark:text-zinc-200">
          <p className="font-semibold">You have used your {allowanceCopy(quota)}.</p>
          <p className="mt-1 leading-relaxed">
            It resets {resetCopy(quota.resetsAt)}
            {quota.tier === "anonymous" ? (
              <>
                , or{" "}
                <Link
                  href={loginHref()}
                  className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  log in free for 2 scans a day
                </Link>
              </>
            ) : null}
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <p className="mb-6 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
      <Gauge className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
      <span>
        <strong className="font-semibold text-zinc-900 tabular-nums dark:text-white">
          {quota.remaining}
        </strong>{" "}
        of {allowanceCopy(quota)} left
        {quota.used > 0 ? <> &middot; resets {resetCopy(quota.resetsAt)}</> : null}
      </span>
    </p>
  );
}

export default QuotaNotice;
