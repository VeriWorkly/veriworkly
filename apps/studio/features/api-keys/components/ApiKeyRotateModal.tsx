"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Calendar, Key, TrendingUp, UserPen, Loader2 } from "lucide-react";

import type { ApiKeyRecord, ApiKeyDetailRecord } from "./ApiKeyTypes";

import { Button, Input, Modal } from "@veriworkly/ui";
import { fetchApiData, ApiRequestError } from "@/utils/fetchApiData";

type ApiKeyRotateModalProps = {
  open: boolean;
  keyRecord: ApiKeyRecord | null;
  submitting: boolean;
  onCloseAction: () => void;
  onSubmitAction: (values: {
    name: string;
    rateLimit: number;
    expiresAt?: string;
    scopes: string[];
  }) => void;
};

function formatDateValue(dateValue: string | null) {
  if (!dateValue) {
    return "";
  }
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

export default function ApiKeyRotateModal({
  open,
  keyRecord,
  submitting,
  onCloseAction,
  onSubmitAction,
}: ApiKeyRotateModalProps) {
  const [name, setName] = useState("");
  const [rateLimit, setRateLimit] = useState(20);
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    if (!open || !keyRecord) return;

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      setLoadingDetails(true);
      setDetailError("");

      fetchApiData<ApiKeyDetailRecord>(`/api-keys/${keyRecord.id}`, { method: "GET" })
        .then((data) => {
          if (cancelled) return;

          setName(data.name);
          setSelectedScopes(data.scopes);
          setExpiresAt(formatDateValue(data.expiresAt));
          setRateLimit(Math.min(20, Math.max(1, data.rateLimit || 20)));
        })
        .catch((err) => {
          if (cancelled) return;

          setDetailError(
            err instanceof ApiRequestError ? err.message : "Failed to load key details",
          );
        })
        .finally(() => {
          if (!cancelled) setLoadingDetails(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [open, keyRecord]);

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!keyRecord) {
      return;
    }

    onSubmitAction({
      name: name.trim() || keyRecord.name,
      rateLimit: Math.min(20, Math.max(1, rateLimit)),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      scopes: selectedScopes,
    });
  };

  const handleClose = () => {
    if (!submitting) {
      onCloseAction();
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Modal.Content className="w-full overflow-hidden p-0 sm:rounded-xl">
        <div className="flex items-center gap-3 border-b px-4 pt-2 pb-4 md:bg-zinc-50/50 md:pt-4 dark:bg-zinc-900/50">
          <div className="ring-offset-background bg-accent/10 ring-accent/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300">
            <ArrowRightLeft className="text-accent h-4.5 w-4.5" />
          </div>

          <div className="min-w-0">
            <Modal.Title>Rotate API Key</Modal.Title>

            {keyRecord ? (
              <p className="text-muted-foreground text-xs font-medium">
                Rotating <span className="text-foreground font-mono">{keyRecord.keyPrefix}...</span>
              </p>
            ) : null}
          </div>
        </div>

        {loadingDetails ? (
          <div className="flex justify-center py-12">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : detailError ? (
          <div className="p-6 text-center text-sm text-red-500">{detailError}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-4">
            <div className="grid gap-4 px-4 sm:grid-cols-1">
              <div className="space-y-1.5">
                <label
                  htmlFor="rotate-api-key-name"
                  className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium"
                >
                  <UserPen className="h-3.5 w-3.5" /> Key name
                </label>

                <Input
                  value={name}
                  inputSize="sm"
                  disabled={submitting}
                  id="rotate-api-key-name"
                  className="bg-background/50 h-9"
                  placeholder="Documentation token"
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 px-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="rotate-api-key-rate-limit"
                  className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium"
                >
                  <TrendingUp className="h-3.5 w-3.5" /> Rate limit
                </label>

                <Input
                  min={1}
                  max={20}
                  type="number"
                  inputSize="sm"
                  value={rateLimit}
                  disabled={submitting}
                  id="rotate-api-key-rate-limit"
                  className="bg-background/50 h-9"
                  onChange={(event) => {
                    const nextValue = Number(event.target.value || 1);
                    setRateLimit(Math.min(20, Math.max(1, nextValue)));
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="rotate-api-key-expires-at"
                  className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium"
                >
                  <Calendar className="h-3.5 w-3.5" /> Expires at
                </label>

                <Input
                  type="date"
                  inputSize="sm"
                  value={expiresAt}
                  disabled={submitting}
                  className="bg-background/50 h-9"
                  id="rotate-api-key-expires-at"
                  onChange={(event) => setExpiresAt(event.target.value)}
                />
              </div>
            </div>

            <div className="border-border/70 bg-muted/10 text-muted-foreground mx-4 rounded-xl border p-3 text-xs">
              <div className="flex items-start gap-2">
                <Key className="text-accent mt-0.5 h-4 w-4 shrink-0" />

                <p>
                  The old key is revoked as soon as this replacement is created. Share the new key
                  only after copying it securely.
                </p>
              </div>
            </div>

            <Modal.Footer>
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>

              <Button size="sm" type="submit" loading={submitting} className="w-full sm:w-auto">
                Generate Key
              </Button>
            </Modal.Footer>
          </form>
        )}
      </Modal.Content>
    </Modal>
  );
}
