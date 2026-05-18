import type { LucideIcon } from "lucide-react";
import { Activity, Ban, Calendar, Clock3 } from "lucide-react";

import type { ApiKeyDetailRecord } from "../ApiKeyTypes";

import { Card } from "@veriworkly/ui";

import { formatDateTime } from "./api-key-detail-utils";

function DetailMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Card className="rounded-xl p-4">
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
        <Icon className="h-4 w-4" />
        {label}
      </div>

      <p className="mt-2 text-sm font-semibold">{value}</p>
    </Card>
  );
}

export function ApiKeyDetailOverview({ data }: { data: ApiKeyDetailRecord }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <DetailMetric icon={Calendar} label="Created" value={formatDateTime(data.createdAt)} />
      <DetailMetric icon={Activity} label="Last used" value={formatDateTime(data.lastUsed)} />
      <DetailMetric
        icon={Clock3}
        label="Expires"
        value={data.expiresAt ? formatDateTime(data.expiresAt) : "No expiry"}
      />
      <DetailMetric
        icon={Ban}
        label="Revoked"
        value={data.revokedAt ? formatDateTime(data.revokedAt) : "Not revoked"}
      />
    </div>
  );
}
