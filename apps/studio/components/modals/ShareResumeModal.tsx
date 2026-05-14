"use client";

import { toast } from "sonner";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Eye, Lock, Copy, Globe, Link2, Trash2, Calendar, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { Badge, Modal, Input, Button, Checkbox } from "@veriworkly/ui";

import {
  type ShareLinkItem as ResumeShareLinkItem,
  listResumeShareLinks,
  createResumeShareLink,
  revokeResumeShareLink,
} from "@/features/resume/services/share-links";
import { loadResumeById } from "@/features/resume/services/resume-service";
import { trackUsageEvent } from "@/features/analytics/services/usage-metrics";

import { ApiRequestError } from "@/utils/fetchApiData";

interface ShareResumeModalProps {
  resumeId: string | null;
  resumeTitle?: string;
  onClose: () => void;
}

interface LinkItem {
  id: string;
  token: string;
  passwordRequired?: boolean;
  viewCount: number;
  expiresAt: string | null;
}

const ActiveLinkRow = ({
  link,
  onRevoke,
  isRevoking,
}: {
  link: LinkItem;
  onRevoke: () => void;
  isRevoking: boolean;
}) => {
  const url = typeof window !== "undefined" ? `${window.location.origin}/share/${link.token}` : "";

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

          <span className="opacity-30">•</span>

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

const ShareResumeModal = ({ resumeId, onClose }: ShareResumeModalProps) => {
  const [busy, setBusy] = useState(false);
  const [expiry, setExpiry] = useState("");
  const [password, setPassword] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);

  const [linksLoading, setLinksLoading] = useState(false);

  const [shareLinks, setShareLinks] = useState<ResumeShareLinkItem[]>([]);
  const [revokingLinkId, setRevokingLinkId] = useState<string | null>(null);

  const refreshShareLinks = useCallback(async (id: string) => {
    setLinksLoading(true);

    try {
      const links = await listResumeShareLinks(id);

      setShareLinks(links);

      return links;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load share links.");

      return null;
    } finally {
      setLinksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (resumeId) {
      void Promise.resolve().then(() => refreshShareLinks(resumeId));
    }
  }, [resumeId, refreshShareLinks]);

  const handleCreate = async () => {
    if (!resumeId || busy) return;

    const fullResume = loadResumeById(resumeId);

    if (!fullResume) {
      toast.error("Resume not found. Refresh and try again.");
      return;
    }

    setBusy(true);

    const promise = createResumeShareLink(fullResume, {
      password: password.trim() || undefined,
      expiresAt: noExpiry ? null : expiry ? new Date(expiry).toISOString() : null,
      noExpiry,
    });

    toast.promise(promise, {
      loading: "Creating share link...",

      success: (shareLink) => {
        const nextShareUrl = `${window.location.origin}/share/${shareLink.token}`;
        void navigator.clipboard.writeText(nextShareUrl);

        trackUsageEvent({ event: "share_link_created" });
        void refreshShareLinks(resumeId);

        setPassword("");
        setExpiry("");

        return "Share link created and copied to clipboard!";
      },

      error: (err) => {
        if (err instanceof ApiRequestError && err.status === 409) {
          void refreshShareLinks(resumeId);
          return "A share link already exists for this resume.";
        }
        return err instanceof Error ? err.message : "Unable to create share link.";
      },

      finally: () => setBusy(false),
    });
  };

  const handleRevoke = async (linkId: string) => {
    if (!resumeId || revokingLinkId) return;

    setRevokingLinkId(linkId);

    try {
      await revokeResumeShareLink(resumeId, linkId);

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

  const activeLinks = useMemo(() => shareLinks, [shareLinks]);

  if (!resumeId) return null;

  return (
    <Modal open={true} onClose={handleClose}>
      <Modal.Content className="w-full overflow-hidden p-0 sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b p-4 md:bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="bg-accent/10 flex h-9 w-9 items-center justify-center rounded-xl">
            <Link2 className="text-accent h-4.5 w-4.5" />
          </div>

          <div>
            <Modal.Title className="text-lg font-bold">Share Resume</Modal.Title>

            <p className="text-muted-foreground text-xs">Create public links for your resume</p>
          </div>
        </div>

        <Modal.Body className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase">
                <Lock className="h-3.5 w-3.5 opacity-70" /> Password
              </label>

              <Input
                inputSize="sm"
                type="password"
                value={password}
                placeholder="Optional"
                onChange={(e) => setPassword(e.target.value)}
                className="focus:ring-accent/20 transition-all"
              />
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
            Generate Public Link
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

            <div className="scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 max-h-64 space-y-3 overflow-y-auto pr-1 transition-all">
              {linksLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="text-accent h-6 w-6 animate-spin opacity-40" />

                  <p className="text-muted-foreground mt-2 text-xs font-medium">Loading links...</p>
                </div>
              ) : activeLinks.length === 0 ? (
                <div className="text-muted-foreground hover:border-accent/20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-6 transition-colors">
                  <div className="bg-muted/30 mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                    <Globe className="h-6 w-6 opacity-20" />
                  </div>

                  <p className="text-xs font-medium">No active share links found</p>

                  <p className="mt-1 text-[10px] opacity-60">Create one to share your resume</p>
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

export default ShareResumeModal;
