"use client";

import type { FormEvent } from "react";

import { toast } from "sonner";
import { useMemo, useState } from "react";

import type { GeneratedApiKeyRecord } from "../components/ApiKeyTypes";

import { API_KEY_SCOPE_OPTIONS, AVAILABLE_API_KEY_SCOPES } from "../components/ApiKeyScopes";

import { useUserStore } from "@/store/useUserStore";

import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

const DEFAULT_SELECTED_SCOPES = ["user:read"];

function resolveErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) return error.message;
  return "Failed to create API key.";
}

export function useApiKeyCreate() {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  const [name, setName] = useState("");
  const [rateLimit, setRateLimit] = useState(20);

  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  const [creating, setCreating] = useState(false);

  const [generatedKey, setGeneratedKey] = useState<GeneratedApiKeyRecord | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(DEFAULT_SELECTED_SCOPES);

  const selectedScopeDetails = useMemo(
    () => API_KEY_SCOPE_OPTIONS.filter((scope) => selectedScopes.includes(scope.value)),
    [selectedScopes],
  );

  const toggleScope = (scope: string) => {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
  };

  const resetScopes = () => setSelectedScopes(DEFAULT_SELECTED_SCOPES);
  const selectAllScopes = () => setSelectedScopes([...AVAILABLE_API_KEY_SCOPES]);

  const createKey = async (event: FormEvent) => {
    event.preventDefault();

    if (!isLoggedIn) {
      toast.error("Sign in to create an API key.");
      return;
    }

    if (!name.trim() || selectedScopes.length === 0) return;

    try {
      setCreating(true);
      const data = await fetchApiData<GeneratedApiKeyRecord>("/api-keys", {
        method: "POST",
        body: JSON.stringify({
          name,
          scopes: selectedScopes,
          rateLimit,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      });

      setGeneratedKey(data);

      toast.success("API key created.");
    } catch (error) {
      toast.error(resolveErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const copyGeneratedKey = async () => {
    if (!generatedKey) return;

    try {
      await navigator.clipboard.writeText(generatedKey.key);

      setCopied(true);

      toast.success("Copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy API key.");
    }
  };

  return {
    creating,
    copied,
    name,
    rateLimit,
    expiresAt,
    selectedScopes,
    selectedScopeDetails,
    generatedKey,
    canSubmit: Boolean(isLoggedIn && name.trim() && selectedScopes.length > 0 && !creating),
    setName,
    setRateLimit,
    setExpiresAt,
    setGeneratedKey,
    toggleScope,
    selectAllScopes,
    resetScopes,
    createKey,
    copyGeneratedKey,
  };
}
