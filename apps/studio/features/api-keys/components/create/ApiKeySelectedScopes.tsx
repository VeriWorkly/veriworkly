"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";

import type { GeneratedApiKeyRecord } from "../ApiKeyTypes";
import type { API_KEY_SCOPE_OPTIONS } from "../ApiKeyScopes";

import { Badge, Button, Card } from "@veriworkly/ui";

import GeneratedApiKeyCard from "../GeneratedApiKeyCard";

type ScopeOption = (typeof API_KEY_SCOPE_OPTIONS)[number];

type ApiKeySelectedScopesProps = {
  creating: boolean;
  canSubmit: boolean;
  copied: boolean;
  selectedScopes: string[];
  selectedScopeDetails: ScopeOption[];
  generatedKey: GeneratedApiKeyRecord | null;
  onCopyGeneratedKey: () => void;
  onDismissGeneratedKey: () => void;
};

export function ApiKeySelectedScopes({
  creating,
  canSubmit,
  copied,
  selectedScopes,
  selectedScopeDetails,
  generatedKey,
  onCopyGeneratedKey,
  onDismissGeneratedKey,
}: ApiKeySelectedScopesProps) {
  return (
    <Card className="space-y-4 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black">Selected scopes</h2>
          <p className="text-muted text-sm">Review before generating.</p>
        </div>

        <Badge className="shrink-0">{selectedScopes.length} selected</Badge>
      </div>

      <div className="border-border bg-muted/5 flex flex-wrap gap-2 rounded-xl border p-4">
        {selectedScopeDetails.map((scope) => (
          <Badge key={scope.value} className="rounded-full px-2.5 py-1 text-xs">
            {scope.label}
          </Badge>
        ))}
      </div>

      {generatedKey ? (
        <GeneratedApiKeyCard
          copied={copied}
          onCopy={onCopyGeneratedKey}
          generatedKey={generatedKey.key}
          onDismiss={onDismissGeneratedKey}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" size="sm" disabled={!canSubmit} className="gap-2">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create key
        </Button>

        <Button asChild size="sm" type="button" variant="secondary">
          <Link href="/api-keys">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to keys
          </Link>
        </Button>
      </div>
    </Card>
  );
}
