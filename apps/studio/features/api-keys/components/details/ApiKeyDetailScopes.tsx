import { Shield } from "lucide-react";

import { Badge, Card } from "@veriworkly/ui";

import type { ApiKeyScopeSummary } from "../ApiKeyScopes";

import { scopeOptionMap } from "./api-key-detail-utils";

type ApiKeyDetailScopesProps = {
  scopes: string[];
  scopeSummary: ApiKeyScopeSummary[];
};

export function ApiKeyDetailScopes({ scopes, scopeSummary }: ApiKeyDetailScopesProps) {
  return (
    <aside className="space-y-4">
      <Card className="rounded-xl p-5">
        <div className="flex items-center gap-2">
          <Shield className="text-accent h-4 w-4" />
          <h2 className="font-bold">Scopes</h2>
        </div>

        <div className="mt-4 space-y-3">
          {scopes.map((scope) => {
            const option = scopeOptionMap.get(scope);

            return (
              <div key={scope} className="border-border/70 rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold">{option?.label ?? scope}</p>

                  <Badge className="bg-accent/10 border-accent/20 text-accent px-2 py-0 text-[10px]">
                    {scope}
                  </Badge>
                </div>

                {option?.description && (
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {option.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-xl p-5">
        <h2 className="font-bold">Access summary</h2>

        <div className="mt-4 grid gap-2">
          {scopeSummary.map((scope) => (
            <div
              key={scope.label}
              className="bg-background/70 flex items-center justify-between gap-3 rounded-lg px-3 py-2"
            >
              <span className="text-sm font-medium">{scope.label}</span>
              <span className="text-muted-foreground text-xs font-bold">{scope.access}</span>
            </div>
          ))}
        </div>
      </Card>
    </aside>
  );
}
