"use client";

import { useApiKeyCreate } from "../../hooks/useApiKeyCreate";

import { ApiKeyScopeRail } from "./ApiKeyScopeRail";
import { ApiKeyDetailsForm } from "./ApiKeyDetailsForm";
import { ApiKeySelectedScopes } from "./ApiKeySelectedScopes";

export default function ApiKeyCreateClient() {
  const create = useApiKeyCreate();

  return (
    <form
      onSubmit={create.createKey}
      className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="space-y-5">
        <ApiKeyDetailsForm
          name={create.name}
          creating={create.creating}
          rateLimit={create.rateLimit}
          expiresAt={create.expiresAt}
          onNameChange={create.setName}
          onRateLimitChange={create.setRateLimit}
          onExpiresAtChange={create.setExpiresAt}
        />

        <ApiKeySelectedScopes
          copied={create.copied}
          creating={create.creating}
          canSubmit={create.canSubmit}
          generatedKey={create.generatedKey}
          selectedScopes={create.selectedScopes}
          onCopyGeneratedKey={create.copyGeneratedKey}
          selectedScopeDetails={create.selectedScopeDetails}
          onDismissGeneratedKey={() => create.setGeneratedKey(null)}
        />
      </div>

      <ApiKeyScopeRail
        onReset={create.resetScopes}
        onToggleScope={create.toggleScope}
        onSelectAll={create.selectAllScopes}
        selectedScopes={create.selectedScopes}
      />
    </form>
  );
}
