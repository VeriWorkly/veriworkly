"use client";

import Link from "next/link";
import { Plus, LockKeyhole } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { cn } from "@/lib/utils";

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
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const apiKeys = useApiKeys({ initialKeys, initialPagination, initialKeysLoaded });

  return (
    <section id="api-keys" className="relative space-y-6 min-h-[400px]">
      <div className={cn("flex items-center justify-between", !isLoggedIn && "blur-[3px] pointer-events-none opacity-40")}>
        <div className="space-y-1">
          <h2 className="text-foreground text-2xl font-bold tracking-tight">Your keys</h2>

          <p className="text-muted-foreground text-sm">
            Review active tokens first. Create new keys from the dedicated create flow.
          </p>
        </div>

        <Button asChild disabled={!isLoggedIn}>
          <Link href={isLoggedIn ? "/api-keys/create" : "#"}>
            <Plus className="mr-1 h-4 w-4" />
            Create API key
          </Link>
        </Button>
      </div>

      <div className={cn("grid gap-6", !isLoggedIn && "blur-[3px] pointer-events-none opacity-40")}>
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

      {!isLoggedIn ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl border border-border bg-card/45 p-6 text-center backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <LockKeyhole size={20} />
          </div>
          <h2 className="mt-4 text-base font-extrabold text-foreground">
            Log in to manage API keys
          </h2>
          <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
            API keys allow you to integrate your resumes and profile data with developer environments. Please log in to manage your access tokens.
          </p>
          <button
            onClick={() => {
              const loginUrl =
                process.env.NODE_ENV === "development"
                  ? "http://localhost:3001/login"
                  : "https://app.veriworkly.com/login";
              window.location.href = `${loginUrl}?callbackURL=${encodeURIComponent(window.location.href)}`;
            }}
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-accent text-accent-foreground px-5 text-xs font-bold hover:bg-accent/90 transition"
          >
            Log In
          </button>
        </div>
      ) : null}
    </section>
  );
}
