import React, { useRef } from "react";
import { Check } from "lucide-react";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={successDialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-success-title"
        tabIndex={-1}
        className="animate-scale-in relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0c0c0c]"
      >
        <div className="flex flex-col items-center gap-3 border-b border-dashed border-zinc-200 px-7 pt-8 pb-6 text-center dark:border-zinc-800">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <Check className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2
            id="contact-success-title"
            className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white"
          >
            Message sent
          </h2>
          <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Your inquiry has been forwarded to our support inbox.
          </p>
        </div>

        <div className="space-y-3 px-7 py-6 font-mono text-xs leading-5">
          <div className="flex justify-between gap-4">
            <span className="text-zinc-400 dark:text-zinc-600">From</span>
            <span className="truncate text-right text-zinc-700 dark:text-zinc-300">
              {data.name} · {data.email}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-400 dark:text-zinc-600">Subject</span>
            <span className="max-w-[60%] truncate text-right text-zinc-700 dark:text-zinc-300">
              {data.subject}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400 dark:text-zinc-600">Sent</span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {new Date(data.timestamp).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="space-y-4 px-7 pb-7 text-center">
          <p className="text-[11px] leading-5 text-zinc-400 dark:text-zinc-600">
            We typically respond within <strong>24 to 48 hours</strong>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactSuccessModal;
