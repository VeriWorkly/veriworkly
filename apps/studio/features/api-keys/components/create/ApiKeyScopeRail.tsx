"use client";

import { ShieldCheck } from "lucide-react";

import { Button, Card, Checkbox } from "@veriworkly/ui";

import { API_KEY_SCOPE_GROUPS, API_KEY_SCOPE_OPTIONS } from "../ApiKeyScopes";

import { cn } from "@/lib/utils";

type ApiKeyScopeRailProps = {
  selectedScopes: string[];
  onToggleScope: (scope: string) => void;
  onSelectAll: () => void;
  onReset: () => void;
};

export function ApiKeyScopeRail({
  selectedScopes,
  onToggleScope,
  onSelectAll,
  onReset,
}: ApiKeyScopeRailProps) {
  return (
    <aside className="lg:self-start">
      <Card className="rounded-2xl p-4 lg:max-h-[calc(100dvh-11rem)] lg:overflow-hidden">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="bg-accent/10 text-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <ShieldCheck className="h-4 w-4" />
          </span>

          <div>
            <h2 className="text-base font-black">Scopes</h2>
            <p className="text-muted text-xs">Grouped API permissions.</p>
          </div>
        </div>

        <div className="mb-3 flex gap-2">
          <Button
            size="sm"
            type="button"
            variant="primary"
            className="h-7 w-16"
            onClick={onSelectAll}
          >
            All
          </Button>

          <Button
            size="sm"
            type="button"
            variant="secondary"
            className="h-7 w-16"
            onClick={onReset}
          >
            Reset
          </Button>
        </div>

        <div className="space-y-2 pb-4 lg:max-h-[calc(100dvh-18rem)] lg:overflow-y-auto lg:pr-1">
          {API_KEY_SCOPE_GROUPS.map((group) => (
            <section key={group.key} className="border-border/70 border-t p-2.5">
              <div className="mb-2">
                <h3 className="text-xs font-black">{group.label}</h3>
                <p className="text-muted mt-0.5 text-[11px] leading-4">{group.description}</p>
              </div>

              <div className="space-y-1.5">
                {group.scopes.map((scopeValue) => {
                  const scope = API_KEY_SCOPE_OPTIONS.find((item) => item.value === scopeValue);

                  if (!scope) return null;

                  const selected = selectedScopes.includes(scope.value);

                  return (
                    <div
                      key={scope.value}
                      className={cn(
                        "rounded-lg border px-2.5 py-2 transition",
                        selected
                          ? "border-accent bg-accent/10"
                          : "border-border/70 hover:border-accent/50 hover:bg-muted/5",
                      )}
                    >
                      <Checkbox
                        checked={selected}
                        label={scope.label}
                        onCheckedChange={() => onToggleScope(scope.value)}
                        className="w-full [&>span]:min-w-0 [&>span]:truncate [&>span]:text-xs [&>span]:font-bold"
                      />

                      <span className="text-muted block truncate pl-8 text-[11px]">
                        {scope.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </Card>
    </aside>
  );
}
