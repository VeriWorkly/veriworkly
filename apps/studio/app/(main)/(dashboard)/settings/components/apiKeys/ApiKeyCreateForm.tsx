import { SyntheticEvent } from "react";
import { Plus, Loader2 } from "lucide-react";

import { Button, Card, Input } from "@veriworkly/ui";

import ApiKeyScopePicker from "./ApiKeyScopePicker";

type ApiKeyCreateFormProps = {
  creating: boolean;
  newKeyName: string;
  rateLimit: number;
  expiresAt: string;
  selectedScopes: string[];
  availableScopes: readonly string[];
  onNameChange: (value: string) => void;
  onRateLimitChange: (value: number) => void;
  onExpiresAtChange: (value: string) => void;
  onScopesChange: (value: string[]) => void;
  onSubmitAction: (e: SyntheticEvent<HTMLFormElement>) => void | Promise<void>;
};

export default function ApiKeyCreateForm({
  creating,
  newKeyName,
  rateLimit,
  expiresAt,
  selectedScopes,
  availableScopes,
  onNameChange,
  onRateLimitChange,
  onExpiresAtChange,
  onScopesChange,
  onSubmitAction,
}: ApiKeyCreateFormProps) {
  return (
    <Card className="border-accent/10 bg-card/50 p-6 backdrop-blur-sm">
      <form onSubmit={onSubmitAction} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="key-name" className="text-foreground text-sm font-medium">
            Create New Key
          </label>

          <div className="flex gap-2">
            <Input
              id="key-name"
              value={newKeyName}
              disabled={creating}
              className="bg-background/50"
              placeholder="e.g. Documentation Project"
              onChange={(e) => onNameChange(e.target.value)}
            />

            <Button type="submit" disabled={creating || !newKeyName.trim()}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Generate
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="rate-limit" className="text-foreground text-sm font-medium">
              Rate limit
            </label>

            <Input
              min={1}
              max={20}
              type="number"
              id="rate-limit"
              value={rateLimit}
              disabled={creating}
              className="bg-background/50"
              onChange={(e) => {
                const nextValue = Number(e.target.value || 1);
                onRateLimitChange(Math.min(20, Math.max(1, nextValue)));
              }}
            />

            <p className="text-muted-foreground text-[11px]">
              Values above 20 are capped automatically.
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="expires-at" className="text-foreground text-sm font-medium">
              Expires at
            </label>

            <Input
              type="date"
              id="expires-at"
              value={expiresAt}
              disabled={creating}
              className="bg-background/50"
              onChange={(e) => onExpiresAtChange(e.target.value)}
            />
          </div>
        </div>

        <ApiKeyScopePicker
          onChange={onScopesChange}
          selectedScopes={selectedScopes}
          availableScopes={availableScopes}
        />

        <p className="text-muted-foreground text-[12px] italic">
          Leave expiry empty to use the default lifetime. Lower scopes and lower rate limits are
          safer.
        </p>
      </form>
    </Card>
  );
}
