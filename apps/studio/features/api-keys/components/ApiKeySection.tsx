"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import type { ApiKeyRecord, OffsetPaginationPayload } from "./ApiKeyTypes";

import { Button } from "@veriworkly/ui";

import { useApiKeys } from "../hooks/useApiKeys";

import ApiKeyList from "./ApiKeyList";
import ApiKeyRotateModal from "./ApiKeyRotateModal";
import GeneratedApiKeyCard from "./GeneratedApiKeyCard";

import DestructiveModal from "@/components/modals/DestructiveModal";
import ConfirmationModal from "@/components/modals/ConfirmationModal";

type ApiKeySectionProps = {
  initialKeys: ApiKeyRecord[];
  initialPagination: OffsetPaginationPayload<ApiKeyRecord> | null;
  initialKeysLoaded: boolean;
};

export default function ApiKeySection({
  initialKeys,
  initialPagination,
  initialKeysLoaded,
}: ApiKeySectionProps) {
  const apiKeys = useApiKeys({ initialKeys, initialPagination, initialKeysLoaded });

  return (
    <section id="api-keys" className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-foreground text-2xl font-bold tracking-tight">Your keys</h2>

          <p className="text-muted-foreground text-sm">
            Review active tokens first. Create new keys from the dedicated create flow.
          </p>
        </div>

        <Button asChild>
          <Link href="/api-keys/create">
            <Plus className="mr-1 h-4 w-4" />
            Create API key
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {apiKeys.generatedKey && (
          <GeneratedApiKeyCard
            generatedKey={apiKeys.generatedKey.key}
            onDismiss={() => apiKeys.setGeneratedKey(null)}
            copied={apiKeys.copiedId === apiKeys.generatedKey.id}
            onCopy={() =>
              void apiKeys.copyToClipboard(apiKeys.generatedKey!.key, apiKeys.generatedKey!.id)
            }
          />
        )}

        <ApiKeyList
          keys={apiKeys.keys}
          page={apiKeys.page}
          hasMore={apiKeys.hasMore}
          loading={apiKeys.loading}
          totalPages={apiKeys.totalPages}
          onNextPage={apiKeys.goToNextPage}
          onRotate={apiKeys.setRotateTarget}
          onDelete={apiKeys.setDeleteTarget}
          onRevoke={apiKeys.setRevokeTarget}
          onPrevPage={apiKeys.goToPreviousPage}
        />

        <ApiKeyRotateModal
          keyRecord={apiKeys.rotateTarget}
          onSubmitAction={apiKeys.rotateKey}
          open={Boolean(apiKeys.rotateTarget)}
          submitting={apiKeys.rotateSubmitting}
          onCloseAction={() => apiKeys.setRotateTarget(null)}
        />
        <DestructiveModal
          entityName="API key"
          title="Delete API key?"
          loading={apiKeys.deleteSubmitting}
          onConfirmAction={apiKeys.deleteKey}
          open={Boolean(apiKeys.deleteTarget)}
          onCloseAction={() => apiKeys.setDeleteTarget(null)}
          warningText="This action permanently deletes the key from the database."
          description="Use this only when you no longer need the key at all. Permanent deletion cannot be undone."
        />

        <ConfirmationModal
          title="Revoke API key?"
          variant="warning"
          confirmText="Revoke key"
          loading={apiKeys.revokeSubmitting}
          open={Boolean(apiKeys.revokeTarget)}
          onConfirm={apiKeys.revokeKey}
          onClose={() => apiKeys.setRevokeTarget(null)}
          description="This disables the key immediately while keeping the record for audit and history."
        />
      </div>
    </section>
  );
}
