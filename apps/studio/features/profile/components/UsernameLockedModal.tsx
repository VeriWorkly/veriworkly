"use client";

import * as React from "react";
import { Lock } from "lucide-react";

import { Modal, Button } from "@veriworkly/ui";

interface UsernameLockedModalProps {
  open: boolean;
  onClose: () => void;
}

const UsernameLockedModal = ({ open, onClose }: UsernameLockedModalProps) => {
  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Content className="w-full overflow-hidden border border-zinc-200/50 p-0 shadow-2xl backdrop-blur-xl sm:rounded-2xl dark:border-zinc-800/50">
        <div className="relative flex items-center gap-4 border-b border-zinc-100 p-4 md:bg-zinc-500/2 dark:border-zinc-900">
          <div className="pointer-events-none absolute -top-10 -left-10 h-24 w-24 rounded-full bg-red-500/10 opacity-10 blur-2xl" />

          <div className="ring-offset-background flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 ring-3 ring-red-500/10 ring-offset-2 transition-all duration-300">
            <Lock className="h-4.5 w-4.5 text-red-500" />
          </div>

          <div className="min-w-0 flex-1">
            <Modal.Title
              className="text-foreground text-base font-black tracking-tight"
              id="username-locked-title"
            >
              Username Locked
            </Modal.Title>

            <p className="text-muted-foreground text-[10px] font-black tracking-widest uppercase opacity-80">
              Account settings
            </p>
          </div>
        </div>

        <Modal.Body className="space-y-3 p-5">
          <p className="text-foreground text-sm leading-relaxed font-semibold">
            Your username is a unique identifier used for your public profile and portfolio links.
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed font-medium">
            To prevent broken links, usernames are locked once set and cannot be changed. If you
            have an exceptional reason to update it, please contact our support team.
          </p>
        </Modal.Body>

        <div className="flex border-t border-zinc-100 bg-zinc-50/50 p-4 sm:justify-end dark:border-zinc-900 dark:bg-zinc-950/20">
          <Button
            size="sm"
            onClick={onClose}
            id="close-locked-username-btn"
            className="w-full bg-zinc-900 px-6 text-xs font-semibold tracking-wide text-white transition-all duration-200 active:scale-[0.98] sm:w-auto dark:bg-zinc-100 dark:text-zinc-900"
          >
            Got it
          </Button>
        </div>
      </Modal.Content>
    </Modal>
  );
};

export default UsernameLockedModal;
