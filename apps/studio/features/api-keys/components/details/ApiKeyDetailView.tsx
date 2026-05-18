"use client";

import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DestructiveModal from "@/components/modals/DestructiveModal";
import ConfirmationModal from "@/components/modals/ConfirmationModal";

import { fetchApiData, ApiRequestError } from "@/utils/fetchApiData";

import type { ApiKeyDetailRecord } from "../ApiKeyTypes";

import summarizeApiKeyScopes from "../ApiKeyScopes";
import ApiKeyRotateModal from "../ApiKeyRotateModal";
import GeneratedApiKeyCard from "../GeneratedApiKeyCard";

import { ApiKeyDetailActions } from "./ApiKeyDetailActions";
import { ApiKeyDetailHeader } from "./ApiKeyDetailHeader";
import { ApiKeyDetailOverview } from "./ApiKeyDetailOverview";
import { ApiKeyDetailScopes } from "./ApiKeyDetailScopes";

export default function ApiKeyDetailView({ initialData }: { initialData: ApiKeyDetailRecord }) {
  const router = useRouter();

  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<ApiKeyDetailRecord>(initialData);
  const [generatedKey, setGeneratedKey] = useState<{ id: string; key: string } | null>(null);

  const [rotateSubmitting, setRotateSubmitting] = useState(false);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [rotateTarget, setRotateTarget] = useState<ApiKeyDetailRecord | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyDetailRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyDetailRecord | null>(null);

  const scopeSummary = useMemo(() => summarizeApiKeyScopes(data.scopes), [data.scopes]);

  const handleCopy = async () => {
    if (!generatedKey) return;

    try {
      await navigator.clipboard.writeText(generatedKey.key);
      setCopied(true);
      toast.success("API key copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy API key.");
    }
  };

  const handleRotate = async (values: {
    name: string;
    rateLimit: number;
    expiresAt?: string;
    scopes: string[];
  }) => {
    if (!rotateTarget) return;

    setRotateSubmitting(true);

    try {
      const response = await fetchApiData<ApiKeyDetailRecord & { key: string }>(
        `/api-keys/${rotateTarget.id}/rotate`,
        { method: "POST", body: JSON.stringify(values) },
      );

      setData(response);
      setGeneratedKey({ id: response.id, key: response.key });
      setRotateTarget(null);

      toast.success("API key rotated.");

      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "Failed to rotate API key.");
    } finally {
      setRotateSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;

    setRevokeSubmitting(true);

    try {
      await fetchApiData(`/api-keys/${revokeTarget.id}/revoke`, { method: "POST" });

      setData((prev) => ({ ...prev, isActive: false, revokedAt: new Date().toISOString() }));
      setRevokeTarget(null);

      toast.success("API key revoked.");

      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "Failed to revoke API key.");
    } finally {
      setRevokeSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleteSubmitting(true);

    try {
      await fetchApiData(`/api-keys/${deleteTarget.id}`, { method: "DELETE" });

      setDeleteTarget(null);
      toast.success("API key deleted.");
      router.push("/api-keys");

      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "Failed to delete API key.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <main className="space-y-6" aria-labelledby="api-key-detail-title">
      <ApiKeyDetailHeader data={data} />

      {generatedKey && (
        <GeneratedApiKeyCard
          generatedKey={generatedKey.key}
          copied={copied}
          onCopy={handleCopy}
          onDismiss={() => setGeneratedKey(null)}
        />
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <ApiKeyDetailOverview data={data} />
          <ApiKeyDetailActions
            data={data}
            onDelete={() => setDeleteTarget(data)}
            onRevoke={() => setRevokeTarget(data)}
            onRotate={() => setRotateTarget(data)}
          />
        </div>

        <ApiKeyDetailScopes scopes={data.scopes} scopeSummary={scopeSummary} />
      </section>

      <ApiKeyRotateModal
        keyRecord={rotateTarget}
        open={Boolean(rotateTarget)}
        submitting={rotateSubmitting}
        onSubmitAction={handleRotate}
        onCloseAction={() => setRotateTarget(null)}
      />

      <ConfirmationModal
        variant="warning"
        title="Revoke API key?"
        confirmText="Revoke key"
        onConfirm={handleRevoke}
        loading={revokeSubmitting}
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        description="This disables the key immediately while keeping the record for audit and history."
      />

      <DestructiveModal
        entityName="API key"
        title="Delete API key?"
        loading={deleteSubmitting}
        open={Boolean(deleteTarget)}
        onConfirmAction={handleDelete}
        onCloseAction={() => setDeleteTarget(null)}
        warningText="This action permanently deletes the key from the database."
        description="Use this only when you no longer need the key at all. Permanent deletion cannot be undone."
      />
    </main>
  );
}
