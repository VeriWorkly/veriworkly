import React, { useRef } from "react";
import { Check, X } from "lucide-react";

import { useFocusTrap } from "@/hooks/use-focus-trap";

export interface ContactSuccessData {
  name: string;
  email: string;
  subject: string;
  timestamp: string;
}

interface ContactSuccessModalProps {
  data: ContactSuccessData | null;
  onClose: () => void;
}

export const ContactSuccessModal = ({ data, onClose }: ContactSuccessModalProps) => {
  const successDialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(data !== null, successDialogRef, {
    onEscape: onClose,
  });

  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        ref={successDialogRef}
        aria-labelledby="contact-success-title"
        className="animate-scale-in border-border/80 bg-card/95 relative w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-md"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="text-muted hover:text-foreground absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors"
        >
          <X className="size-4" />
        </button>

        <div className="border-border/60 flex flex-col items-center gap-3 border-b px-7 pt-8 pb-6 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400">
            <Check className="size-7 stroke-[2.5]" aria-hidden="true" />
          </span>

          <h2
            id="contact-success-title"
            className="text-foreground text-2xl font-bold tracking-tight"
          >
            Message Sent Successfully!
          </h2>

          <p className="text-muted max-w-xs text-xs leading-relaxed sm:text-sm">
            Thank you, {data.name}. Your note has landed directly in our team inbox.
          </p>
        </div>

        <div className="border-border/40 bg-background/50 m-6 space-y-2.5 rounded-2xl border p-4 font-mono text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted">From:</span>
            <span className="text-foreground truncate text-right font-semibold">{data.email}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-muted">Subject:</span>
            <span className="text-foreground max-w-[65%] truncate text-right font-semibold">
              {data.subject}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-muted">Time:</span>
            <span className="text-muted text-right">
              {new Date(data.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        <div className="space-y-4 px-7 pb-7 text-center">
          <p className="text-muted text-xs leading-relaxed">
            We typically reply within <strong className="text-foreground">24 to 48 hours</strong>. A
            confirmation receipt has also been dispatched to your email address.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="bg-accent text-accent-foreground flex h-12 w-full cursor-pointer items-center justify-center rounded-full text-sm font-semibold shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
          >
            Back to VeriWorkly
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactSuccessModal;
