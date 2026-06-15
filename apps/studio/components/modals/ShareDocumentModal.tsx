"use client";

import {
  Eye,
  Lock,
  Copy,
  Globe,
  Link2,
  Trash2,
  Loader2,
  Calendar,
  UserRound,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";

import { cn } from "@/lib/utils";

import { Badge, Modal, Input, Button, Checkbox } from "@veriworkly/ui";

import type { DocumentType } from "@/features/documents/core/document-types";
import type { DocumentLibraryItem } from "@/features/documents/services/document-library";

import {
  type ShareLinkItem,
  createShareLink,
  revokeShareLink,
  listAllShareLinks,
} from "@/features/documents/services/share-service";
import { getDocumentDefinition } from "@/features/documents/core/registry";

import { trackUsageEvent } from "@/features/analytics/services/usage-metrics";
import { loadDocumentById } from "@/features/documents/services/document-workspace-service";

import { useUserStore } from "@/store/useUserStore";

interface ShareDocumentModalProps {
  documentId: string | null;
  documentTitle?: string;
  documentType?: DocumentType;
  document?: DocumentLibraryItem | null;
  onClose: () => void;
}

interface LinkItem {
  id: string;
  token: string;
  username: string;
  passwordRequired?: boolean;
  viewCount: number;
  expiresAt: string | null;
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ActiveLinkRow = ({
  link,
  onRevoke,
  isRevoking,
}: {
  link: LinkItem;
  onRevoke: () => void;
  isRevoking: boolean;
}) => {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${link.username}/${link.token}`
      : "";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }, [url]);

  return (
    <div className="bg-card hover:bg-accent/5 group flex items-center justify-between rounded-xl border p-3 transition-all duration-200 hover:shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-foreground max-w-30 truncate font-mono text-xs font-bold tracking-tight sm:max-w-none">
            {link.token}
          </p>

          {link.passwordRequired && (
            <div className="bg-accent/10 flex h-4.5 w-4.5 items-center justify-center rounded-md">
              <Lock className="text-accent h-2.5 w-2.5 shrink-0" />
            </div>
          )}
        </div>

        <div className="text-muted-foreground mt-1.5 flex items-center gap-2.5 text-[10px] font-bold tracking-wider uppercase">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3 opacity-60" /> {link.viewCount} views
          </span>

          <span className="opacity-30">/</span>

          <span
            className={cn(
              "flex items-center gap-1",
              link.expiresAt ? "text-orange-500/80" : "text-emerald-500/80",
            )}
          >
            {link.expiresAt ? (
              <>
                <Calendar className="h-3 w-3" />
                Expires {new Date(link.expiresAt).toLocaleDateString()}
              </>
            ) : (
              "Permanent Access"
            )}
          </span>
        </div>
      </div>

      <div className="ml-3 flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          title="Copy Link"
          onClick={handleCopy}
          className="h-8 w-8 rounded-lg p-0 transition-transform active:scale-90"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="sm"
          loadingText=""
          variant="ghost"
          onClick={onRevoke}
          loading={isRevoking}
          disabled={isRevoking}
          title="Revoke Access"
          className="text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg p-0 transition-transform active:scale-90"
        >
          {!isRevoking && <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
};

function getShareSnapshot(
  document: DocumentLibraryItem | null | undefined,
  documentId: string | null,
  documentType: DocumentType | undefined,
) {
  const type = document?.type ?? documentType;
  const id = document?.id ?? documentId;
  return id && type ? loadDocumentById(type, id) : null;
}

const ShareDocumentModal = ({
  documentId: fallbackDocumentId,
  documentTitle: fallbackDocumentTitle,
  documentType: fallbackDocumentType,
  document,
  onClose,
}: ShareDocumentModalProps) => {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const isMissingUsername = !user?.username;
  const [busy, setBusy] = useState(false);
  const [expiry, setExpiry] = useState("");
  const [password, setPassword] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [updateSlug, setUpdateSlug] = useState(false);
  const [removePassword, setRemovePassword] = useState(false);

  const [linksLoading, setLinksLoading] = useState(false);

  const [shareLinks, setShareLinks] = useState<ShareLinkItem[]>([]);
  const [revokingLinkId, setRevokingLinkId] = useState<string | null>(null);

  const documentId = document?.id ?? fallbackDocumentId;
  const documentType = document?.type ?? fallbackDocumentType;
  const documentLabel = documentType ? getDocumentDefinition(documentType).label : "Document";
  const documentTitle = document?.title ?? fallbackDocumentTitle ?? "Untitled Document";

  const hasActiveLink = shareLinks.length > 0;
  const activeLink = shareLinks[0];

  const documentSlug = useMemo(() => slugify(documentTitle), [documentTitle]);
  const isSlugOutofSync = useMemo(() => {
    if (!activeLink) return false;
    return slugify(activeLink.token) !== documentSlug;
  }, [activeLink, documentSlug]);

  const refreshShareLinks = useCallback(async (id: string) => {
    setLinksLoading(true);

    try {
      const links = await listAllShareLinks(id);

      setShareLinks(links);

      if (links.length > 0) {
        const link = links[0];

        if (link.expiresAt) {
          setExpiry(new Date(link.expiresAt).toISOString().split("T")[0]);
          setNoExpiry(false);
        } else {
          setExpiry("");
          setNoExpiry(true);
        }
      } else {
        setExpiry("");
        setNoExpiry(false);
      }

      setRemovePassword(false);
      setUpdateSlug(false);

      return links;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load share links.");

      return null;
    } finally {
      setLinksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (documentId && !isMissingUsername)
      void Promise.resolve().then(() => refreshShareLinks(documentId));
  }, [documentId, isMissingUsername, refreshShareLinks]);

  const handleCreate = async () => {
    if (!documentId || busy) return;

    const snapshot = getShareSnapshot(document, fallbackDocumentId, documentType);

    if (!snapshot) {
      toast.error("Document not found. Refresh and try again.");
      return;
    }

    setBusy(true);

    const promise = createShareLink(snapshot.id, snapshot, {
      password: password.trim() || undefined,
      expiresAt: noExpiry ? null : expiry ? new Date(expiry).toISOString() : null,
      noExpiry,
      updateSlug,
      removePassword,
    });

    toast.promise(promise, {
      loading: hasActiveLink ? "Updating share link..." : "Creating share link...",

      success: (shareLink) => {
        const nextShareUrl = `${window.location.origin}/share/${shareLink.username}/${shareLink.token}`;
        void navigator.clipboard.writeText(nextShareUrl);

        trackUsageEvent({ event: hasActiveLink ? "share_link_updated" : "share_link_created" });
        void refreshShareLinks(documentId);

        setPassword("");
        setExpiry("");
        setRemovePassword(false);
        setUpdateSlug(false);

        return hasActiveLink
          ? "Share link updated and copied to clipboard!"
          : "Share link created and copied to clipboard!";
      },

      error: (err) => {
        return err instanceof Error ? err.message : "Unable to save share link.";
      },

      finally: () => setBusy(false),
    });
  };

  const handleRevoke = async (linkId: string) => {
    if (!documentId || revokingLinkId) return;

    setRevokingLinkId(linkId);

    try {
      await revokeShareLink(documentId, linkId);

      setShareLinks((prev) => prev.filter((item) => item.id !== linkId));

      toast.success("Share link revoked successfully.");
      trackUsageEvent({ event: "share_link_revoked" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to revoke share link.");
    } finally {
      setRevokingLinkId(null);
    }
  };

  const handleClose = () => {
    if (!busy && !revokingLinkId) {
      onClose();
    }
  };

  const activeLinks = useMemo<LinkItem[]>(
    () =>
      shareLinks.map((link) => ({
        id: link.id,
        token: link.token,
        username: link.username,
        expiresAt: link.expiresAt,
        viewCount: link.viewCount,
        passwordRequired: link.hasPassword,
      })),
    [shareLinks],
  );

  if (!documentId) return null;

  return (
    <Modal open={true} onClose={handleClose}>
      <Modal.Content className="w-full overflow-hidden p-0 sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b p-4 md:bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="bg-accent/10 flex h-9 w-9 items-center justify-center rounded-xl">
            <Link2 className="text-accent h-4.5 w-4.5" />
          </div>

          <div>
            <Modal.Title>Share {documentLabel}</Modal.Title>

            <p className="text-muted-foreground text-xs">Create public links for {documentTitle}</p>
          </div>
        </div>

        <Modal.Body className="space-y-4 p-4">
          {isMissingUsername ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
                <UserRound className="h-7 w-7 text-amber-500" />
              </div>

              <div className="space-y-2 text-center">
                <h3 className="text-foreground text-base font-bold">Username Required</h3>

                <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
                  You need to set a username in your profile settings before you can share documents
                  publicly.
                </p>
              </div>

              <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />

                  <p className="text-[11px] leading-relaxed font-medium text-amber-600 dark:text-amber-400">
                    Your username is used in share link URLs (e.g.{" "}
                    <code className="text-foreground rounded bg-zinc-500/10 px-1 py-0.5 font-mono text-[10px]">
                      /share/your-username/document-slug
                    </code>
                    ) and can only be set once.
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                id="go-to-profile-settings-btn"
                onClick={() => {
                  onClose();
                  router.push("/profile");
                }}
                className="shadow-accent/10 w-full shadow-md transition-all active:scale-[0.98]"
              >
                Go to Profile Settings
              </Button>
            </div>
          ) : (
            <>
              {hasActiveLink && isSlugOutofSync && activeLink && (
                <div className="flex flex-col gap-2 rounded-xl border border-orange-500/25 bg-orange-500/5 p-3">
                  <div className="flex gap-2.5">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />

                    <div className="space-y-1">
                      <p className="text-xs leading-none font-bold text-orange-500">
                        Document Title Renamed
                      </p>

                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        This document has been renamed, but your public link is still using the
                        older slug:{" "}
                        <code className="text-foreground rounded bg-zinc-500/10 px-1 py-0.5 font-mono text-[10px]">
                          {activeLink.token}
                        </code>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between border-t border-orange-500/10 pt-2">
                    <label
                      htmlFor="update-slug-checkbox"
                      className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Sync link slug with new title
                    </label>
                    <Checkbox
                      id="update-slug-checkbox"
                      checked={updateSlug}
                      onCheckedChange={setUpdateSlug}
                      className="scale-90"
                    />
                  </div>

                  {updateSlug && (
                    <p className="mt-1 text-[10px] leading-tight font-medium text-orange-500">
                      ⚠️ Warning: Syncing will update the link slug. Anyone visiting the old URL
                      will get a 404 error.
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase">
                    <Lock className="h-3.5 w-3.5 opacity-70" /> Password
                  </label>

                  <Input
                    inputSize="sm"
                    type="password"
                    value={password}
                    disabled={removePassword}
                    placeholder={
                      hasActiveLink && activeLink?.hasPassword && !removePassword
                        ? "•••••••• (Protected)"
                        : "Optional"
                    }
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (e.target.value) {
                        setRemovePassword(false);
                      }
                    }}
                    className="focus:ring-accent/20 transition-all"
                  />

                  {hasActiveLink && activeLink?.hasPassword && (
                    <div className="mt-1.5 flex items-center justify-between">
                      <label
                        htmlFor="remove-password-checkbox"
                        className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                      >
                        Remove password
                      </label>

                      <Checkbox
                        id="remove-password-checkbox"
                        checked={removePassword}
                        onCheckedChange={(val) => {
                          setRemovePassword(val);
                          if (val) {
                            setPassword("");
                          }
                        }}
                        className="scale-90"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase">
                      <Calendar className="h-3.5 w-3.5 opacity-70" /> Expiry
                    </label>

                    <Checkbox
                      label="Never"
                      id="no-expiry"
                      checked={noExpiry}
                      className="scale-90"
                      onCheckedChange={setNoExpiry}
                    />
                  </div>

                  <Input
                    type="date"
                    inputSize="sm"
                    value={expiry}
                    disabled={noExpiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="disabled:bg-muted/50 disabled:opacity-50"
                  />
                </div>
              </div>

              <Button
                size="sm"
                loading={busy}
                onClick={handleCreate}
                className="shadow-accent/10 w-full shadow-md transition-all active:scale-[0.98]"
              >
                {hasActiveLink ? "Update Share Link" : "Generate Public Link"}
              </Button>

              <div className="border-t pt-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-muted-foreground flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase">
                    Active Links
                    {activeLinks.length > 0 && (
                      <Badge className="bg-accent/10 text-accent border-none px-1.5 py-0.5 text-[10px] font-bold">
                        {activeLinks.length}
                      </Badge>
                    )}
                  </h4>
                </div>

                <div className="max-h-64 scrollbar-thin scrollbar-thumb-zinc-200 space-y-3 overflow-y-auto pr-1 transition-all dark:scrollbar-thumb-zinc-800">
                  {linksLoading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="text-accent h-6 w-6 animate-spin opacity-40" />

                      <p className="text-muted-foreground mt-2 text-xs font-medium">
                        Loading links...
                      </p>
                    </div>
                  ) : activeLinks.length === 0 ? (
                    <div className="text-muted-foreground hover:border-accent/20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-6 transition-colors">
                      <div className="bg-muted/30 mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                        <Globe className="h-6 w-6 opacity-20" />
                      </div>

                      <p className="text-xs font-medium">No active share links found</p>

                      <p className="mt-1 text-[10px] opacity-60">
                        Create one to share this document
                      </p>
                    </div>
                  ) : (
                    activeLinks.map((link) => (
                      <ActiveLinkRow
                        link={link}
                        key={link.id}
                        isRevoking={revokingLinkId === link.id}
                        onRevoke={() => handleRevoke(link.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="bg-zinc-50/50 dark:bg-zinc-900/50">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleClose}
            className="w-full font-semibold md:w-fit"
            disabled={busy || Boolean(revokingLinkId)}
          >
            Done
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
};

export default ShareDocumentModal;
