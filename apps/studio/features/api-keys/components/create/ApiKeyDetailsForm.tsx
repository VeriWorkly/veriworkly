"use client";

import { KeyRound } from "lucide-react";

import { Card, Input } from "@veriworkly/ui";

type ApiKeyDetailsFormProps = {
  creating: boolean;
  name: string;
  rateLimit: number;
  expiresAt: string;
  onNameChange: (value: string) => void;
  onRateLimitChange: (value: number) => void;
  onExpiresAtChange: (value: string) => void;
};

export function ApiKeyDetailsForm({
  creating,
  name,
  rateLimit,
  expiresAt,
  onNameChange,
  onRateLimitChange,
  onExpiresAtChange,
}: ApiKeyDetailsFormProps) {
  return (
    <Card className="space-y-5 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <KeyRound className="h-5 w-5" />
        </span>

        <div>
          <h2 className="text-lg font-black">Key details</h2>
          <p className="text-muted text-sm">Name keys by app, environment, or deployment target.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-bold">Name</span>

          <Input
            value={name}
            disabled={creating}
            placeholder="Production docs integration"
            onChange={(event) => onNameChange(event.target.value)}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold">Rate limit</span>

          <Input
            min={1}
            max={20}
            type="number"
            value={rateLimit}
            disabled={creating}
            onChange={(event) => {
              const nextValue = Number(event.target.value || 1);
              onRateLimitChange(Math.min(20, Math.max(1, nextValue)));
            }}
          />

          <span className="text-muted block text-xs">Max 20 requests per window.</span>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold">Expires at</span>

          <Input
            type="date"
            value={expiresAt}
            disabled={creating}
            onChange={(event) => onExpiresAtChange(event.target.value)}
          />

          <span className="text-muted block text-xs">Empty uses default lifetime.</span>
        </label>
      </div>
    </Card>
  );
}
