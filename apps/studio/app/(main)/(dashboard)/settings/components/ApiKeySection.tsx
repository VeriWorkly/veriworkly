"use client";

import { toast } from "sonner";
import { useEffect, useState, useCallback } from "react";

import type { ApiKeyRecord, GeneratedApiKeyRecord } from "./apiKeys/ApiKeyTypes";

import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

import ApiKeyList from "./apiKeys/ApiKeyList";
import ApiKeyCreateForm from "./apiKeys/ApiKeyCreateForm";
import ApiKeyRotateModal from "./apiKeys/ApiKeyRotateModal";
import GeneratedApiKeyCard from "./apiKeys/GeneratedApiKeyCard";
import { AVAILABLE_API_KEY_SCOPES } from "./apiKeys/ApiKeyScopes";

import DestructiveModal from "@/components/modals/DestructiveModal";

type ApiKeySectionProps = {
  initialKeys: ApiKeyRecord[];
  initialKeysLoaded: boolean;
};

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  return fallback;
}

export default function ApiKeySection({ initialKeys, initialKeysLoaded }: ApiKeySectionProps) {
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(!initialKeysLoaded);

  const [rateLimit, setRateLimit] = useState(20);
  const [newKeyName, setNewKeyName] = useState("");
  const [keys, setKeys] = useState<ApiKeyRecord[]>(initialKeys);
  const [generatedKey, setGeneratedKey] = useState<GeneratedApiKeyRecord | null>(null);

  const [expiresAt, setExpiresAt] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["user:read"]);

  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [rotateSubmitting, setRotateSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyRecord | null>(null);
  const [rotateTarget, setRotateTarget] = useState<ApiKeyRecord | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);

      const data = await fetchApiData<ApiKeyRecord[]>("/api-keys", {
        method: "GET",
      });

      setKeys(data);
    } catch (error) {
      toast.error(resolveErrorMessage(error, "Failed to fetch API keys."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialKeysLoaded) {
      void Promise.resolve().then(() => {
        setKeys(initialKeys);
        setLoading(false);
      });

      return;
    }

    const timer = setTimeout(() => {
      void fetchKeys();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchKeys, initialKeys, initialKeysLoaded]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      setCreating(true);
      const data = await fetchApiData<GeneratedApiKeyRecord>("/api-keys", {
        method: "POST",
        body: JSON.stringify({
          name: newKeyName,
          scopes: selectedScopes,
          rateLimit,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      });

      setGeneratedKey(data);
      setNewKeyName("");
      setRateLimit(20);
      setExpiresAt("");
      setSelectedScopes(["user:read"]);

      toast.success("API key created successfully.");

      void fetchKeys();
    } catch (error) {
      toast.error(resolveErrorMessage(error, "Failed to create API key."));
    } finally {
      setCreating(false);
    }
  };

  const handleRotateKey = async (values: {
    name: string;
    rateLimit: number;
    expiresAt?: string;
    scopes: string[];
  }) => {
    if (!rotateTarget) {
      return;
    }

    try {
      setRotateSubmitting(true);
      const data = await fetchApiData<GeneratedApiKeyRecord>(
        `/api-keys/${rotateTarget.id}/rotate`,
        {
          method: "POST",
          body: JSON.stringify(values),
        },
      );

      setGeneratedKey(data);
      setRotateTarget(null);

      toast.success("API key rotated successfully.");

      void fetchKeys();
    } catch (error) {
      toast.error(resolveErrorMessage(error, "Failed to rotate API key."));
    } finally {
      setRotateSubmitting(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleteSubmitting(true);

      await fetchApiData<null>(`/api-keys/${deleteTarget.id}`, {
        method: "DELETE",
      });

      setDeleteTarget(null);
      toast.success("API key deleted.");
      void fetchKeys();
    } catch (error) {
      toast.error(resolveErrorMessage(error, "Failed to delete API key."));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);

      setCopiedId(id);
      toast.success("Copied to clipboard");

      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy API key to clipboard.");
    }
  };

  return (
    <section id="api-keys" className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-foreground text-2xl font-bold tracking-tight">API Keys</h2>

          <p className="text-muted-foreground text-sm">
            Manage your API keys for programmatic access to VeriWorkly.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <ApiKeyCreateForm
          creating={creating}
          newKeyName={newKeyName}
          rateLimit={rateLimit}
          expiresAt={expiresAt}
          selectedScopes={selectedScopes}
          availableScopes={AVAILABLE_API_KEY_SCOPES}
          onNameChange={setNewKeyName}
          onRateLimitChange={setRateLimit}
          onExpiresAtChange={setExpiresAt}
          onScopesChange={setSelectedScopes}
          onSubmitAction={handleCreateKey}
        />

        {generatedKey && (
          <GeneratedApiKeyCard
            generatedKey={generatedKey.key}
            copied={copiedId === generatedKey.id}
            onCopy={() => void copyToClipboard(generatedKey.key, generatedKey.id)}
            onDismiss={() => setGeneratedKey(null)}
          />
        )}

        <ApiKeyList
          keys={keys}
          loading={loading}
          onRotate={setRotateTarget}
          onDelete={setDeleteTarget}
        />

        <ApiKeyRotateModal
          open={Boolean(rotateTarget)}
          keyRecord={rotateTarget}
          submitting={rotateSubmitting}
          onCloseAction={() => setRotateTarget(null)}
          onSubmitAction={handleRotateKey}
        />

        <DestructiveModal
          open={Boolean(deleteTarget)}
          onCloseAction={() => setDeleteTarget(null)}
          onConfirmAction={handleDeleteKey}
          loading={deleteSubmitting}
          entityName="API key"
          title="Delete API key?"
          warningText="This action permanently deletes the key from the database."
          description="Use this only when you no longer need the key at all. Permanent deletion cannot be undone."
        />
      </div>
    </section>
  );
}
