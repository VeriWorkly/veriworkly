"use client";

import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";

import type {
  ApiKeyRecord,
  GeneratedApiKeyRecord,
  OffsetPaginationPayload,
} from "../components/ApiKeyTypes";

import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

type UseApiKeysOptions = {
  initialKeys: ApiKeyRecord[];
  initialKeysLoaded: boolean;
  initialPagination: OffsetPaginationPayload<ApiKeyRecord> | null;
};

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) return error.message;

  return fallback;
}

export function useApiKeys({
  initialKeys,
  initialPagination,
  initialKeysLoaded,
}: UseApiKeysOptions) {
  const [page, setPage] = useState(initialPagination?.page ?? 1);
  const [pageSize] = useState(initialPagination?.pageSize ?? 20);
  const [totalPages, setTotalPages] = useState(initialPagination?.totalPages ?? 1);

  const [loading, setLoading] = useState(!initialKeysLoaded);
  const [hasMore, setHasMore] = useState(initialPagination?.hasMore ?? false);

  const [keys, setKeys] = useState<ApiKeyRecord[]>(initialKeys);
  const [generatedKey, setGeneratedKey] = useState<GeneratedApiKeyRecord | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [rotateSubmitting, setRotateSubmitting] = useState(false);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyRecord | null>(null);
  const [rotateTarget, setRotateTarget] = useState<ApiKeyRecord | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRecord | null>(null);

  const applyPage = useCallback((data: OffsetPaginationPayload<ApiKeyRecord>) => {
    setPage(data.page);
    setKeys(data.items);
    setHasMore(data.hasMore);
    setTotalPages(data.totalPages);
  }, []);

  const fetchKeys = useCallback(
    async (targetPage = 1) => {
      try {
        setLoading(true);

        const data = await fetchApiData<OffsetPaginationPayload<ApiKeyRecord>>(
          `/api-keys?page=${targetPage}&pageSize=${pageSize}`,
          { method: "GET" },
        );

        applyPage(data);
      } catch (error) {
        toast.error(resolveErrorMessage(error, "Failed to fetch API keys."));
      } finally {
        setLoading(false);
      }
    },
    [applyPage, pageSize],
  );

  useEffect(() => {
    if (initialKeysLoaded && initialPagination) {
      queueMicrotask(() => {
        applyPage(initialPagination);
        setLoading(false);
      });

      return;
    }

    queueMicrotask(() => {
      void fetchKeys(1);
    });
  }, [applyPage, fetchKeys, initialKeysLoaded, initialPagination]);

  const rotateKey = async (values: {
    name: string;
    rateLimit: number;
    expiresAt?: string;
    scopes: string[];
  }) => {
    if (!rotateTarget) return;

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

      toast.success("API key rotated.");

      void fetchKeys(1);
    } catch (error) {
      toast.error(resolveErrorMessage(error, "Failed to rotate API key."));
    } finally {
      setRotateSubmitting(false);
    }
  };

  const deleteKey = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteSubmitting(true);

      await fetchApiData<null>(`/api-keys/${deleteTarget.id}`, { method: "DELETE" });

      setDeleteTarget(null);
      toast.success("API key deleted.");
      void fetchKeys(1);
    } catch (error) {
      toast.error(resolveErrorMessage(error, "Failed to delete API key."));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const revokeKey = async () => {
    if (!revokeTarget) return;

    try {
      setRevokeSubmitting(true);

      await fetchApiData<null>(`/api-keys/${revokeTarget.id}/revoke`, { method: "POST" });

      setRevokeTarget(null);
      toast.success("API key revoked.");
      void fetchKeys(1);
    } catch (error) {
      toast.error(resolveErrorMessage(error, "Failed to revoke API key."));
    } finally {
      setRevokeSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);

      setCopiedId(id);
      toast.success("Copied to clipboard.");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy API key.");
    }
  };

  return {
    generatedKey,
    copiedId,
    keys,
    page,
    totalPages,
    hasMore,
    loading,
    rotateTarget,
    rotateSubmitting,
    deleteTarget,
    deleteSubmitting,
    revokeTarget,
    revokeSubmitting,
    copyToClipboard,
    setGeneratedKey,
    setRotateTarget,
    setRevokeTarget,
    setDeleteTarget,
    rotateKey,
    deleteKey,
    revokeKey,
    goToPreviousPage: () => {
      if (page > 1 && !loading) void fetchKeys(page - 1);
    },
    goToNextPage: () => {
      if (hasMore && !loading) void fetchKeys(page + 1);
    },
  };
}
