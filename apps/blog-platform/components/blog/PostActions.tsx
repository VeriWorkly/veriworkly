"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Share2, Copy, Check, ExternalLink, BookOpen, Home } from "lucide-react";

import { Button, Input, Menu, MenuItem, Modal } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

type PostActionsProps = {
  title: string;
  url: string;
  path: string;
};

const PostActions = ({ title, url, path }: PostActionsProps) => {
  const [copied, setCopied] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const shareMessage = useMemo(() => `${title} - ${url}`, [title, url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareMessage, url });

        return;
      }

      setIsShareOpen(true);
    } catch {
      setIsShareOpen(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleNativeShare}
          aria-label="Share this article"
          className="text-muted hover:text-foreground"
        >
          <Share2 className="size-4" />
        </Button>

        <Menu
          panelClassName="min-w-52"
          trigger={({ open, toggle, menuId }) => (
            <Button
              size="sm"
              variant="ghost"
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label="Open article menu"
              className="text-muted hover:text-foreground"
              aria-controls={open ? menuId : undefined}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          )}
        >
          {({ close }) => (
            <>
              <MenuItem
                onClick={async () => {
                  close();
                  await handleCopy();
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy Link
              </MenuItem>

              <MenuItem
                onClick={() => {
                  close();
                  setIsShareOpen(true);
                }}
              >
                <Share2 className="h-4 w-4" />
                Share Options
              </MenuItem>

              <MenuItem
                onClick={() => {
                  close();
                  window.open(siteConfig.links.app, "_blank", "noopener,noreferrer");
                }}
              >
                <Home className="h-4 w-4" />
                Open Resume Builder
              </MenuItem>

              <MenuItem
                onClick={() => {
                  close();
                  window.open(siteConfig.links.docs, "_blank", "noopener,noreferrer");
                }}
              >
                <BookOpen className="h-4 w-4" />
                Open Docs
              </MenuItem>

              <MenuItem
                onClick={() => {
                  close();
                  window.open(
                    `${siteConfig.links.github}/tree/master/apps/blog-platform/content/blog/${path}`,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
              >
                <ExternalLink className="h-4 w-4" />
                View on GitHub
              </MenuItem>
            </>
          )}
        </Menu>
      </div>

      <Modal open={isShareOpen} onClose={() => setIsShareOpen(false)}>
        <Modal.Content className="md:max-w-xl">
          <Modal.Header>
            <Modal.Title>Share this article</Modal.Title>

            <Modal.Description>
              Copy the link or share this post in your preferred app.
            </Modal.Description>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            <Input readOnly value={url} />

            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" onClick={handleCopy}>
                {copied ? "Copied" : "Copy link"}
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                Share to X
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                Share to LinkedIn
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
                }}
              >
                Share by Email
              </Button>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setIsShareOpen(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </>
  );
};

export default PostActions;
