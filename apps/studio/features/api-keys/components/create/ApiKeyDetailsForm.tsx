"use client";

import { KeyRound } from "lucide-react";

import { Card, Input } from "@veriworkly/ui";

import { useTomorrowDateInput } from "@/components/LocalDate";

import { API_KEY_MAX_RATE_LIMIT, API_KEY_RATE_WINDOW_LABEL } from "../../api-key-service";

type ApiKeyDetailsFormProps = {
  disabled: boolean;
  name: string;
  rateLimit: number;
  expiresAt: string;
  onNameChange: (value: string) => void;
  onRateLimitChange: (value: number) => void;
  onExpiresAtChange: (value: string) => void;
};

export function ApiKeyDetailsForm({
  disabled,
  name,
  rateLimit,
  expiresAt,
  onNameChange,
  onRateLimitChange,
  onExpiresAtChange,
}: ApiKeyDetailsFormProps) {
  const minExpiry = useTomorrowDateInput();

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
            disabled={disabled}
            placeholder="Production docs integration"
            onChange={(event) => onNameChange(event.target.value)}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold">Rate limit</span>

          <Input
            required
            min={1}
            step={1}
            max={API_KEY_MAX_RATE_LIMIT}
            type="number"
            value={rateLimit || ""}
            disabled={disabled}
            onChange={(event) => onRateLimitChange(Number(event.target.value))}
          />

          <span className="text-muted block text-xs">
            Up to {API_KEY_MAX_RATE_LIMIT} requests per {API_KEY_RATE_WINDOW_LABEL}.
          </span>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold">Expires at end of</span>

          <Input
            type="date"
            min={minExpiry}
            value={expiresAt}
            disabled={disabled}
            onChange={(event) => onExpiresAtChange(event.target.value)}
          />

          <span className="text-muted block text-xs">
            The key stops working when this day ends in your time zone. Leave it empty for the
            standard lifetime of one year.
          </span>
        </label>
      </div>
    </Card>
  );
}
