"use client";

import { AlertTriangle, RotateCcw, Info, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { Modal, Button } from "@veriworkly/ui";

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning" | "info" | "success";
  loading?: boolean;
}

const variantConfig = {
  default: {
    color: "text-zinc-600 dark:text-zinc-400",
    bg: "bg-zinc-500/10",
    ring: "ring-zinc-500/10",
    border: "border-zinc-500/10",
    buttonClass:
      "bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100",
    icon: RotateCcw,
  },

  destructive: {
    color: "text-red-500",
    bg: "bg-red-500/10",
    ring: "ring-red-500/10",
    border: "border-red-500/10",
    buttonClass: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-600/10 border-none",
    icon: AlertTriangle,
  },

  warning: {
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/10",
    border: "border-amber-500/10",
    buttonClass:
      "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-600/10 border-none",
    icon: AlertTriangle,
  },

  info: {
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/10",
    border: "border-blue-500/10",
    buttonClass:
      "bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-600/10 border-none",
    icon: Info,
  },

  success: {
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/10",
    border: "border-emerald-500/10",
    buttonClass:
      "bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-600/10 border-none",
    icon: CheckCircle2,
  },
};

const ConfirmationModal = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmationModalProps) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Content className="overflow-hidden p-0">
        <div
          className={cn(
            "relative flex items-start gap-4 border-b p-4",
            config.border,
            "md:bg-zinc-500/2",
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute -top-10 -left-10 h-24 w-24 rounded-full opacity-10 blur-2xl",
              config.bg,
            )}
          />

          <div
            className={cn(
              "ring-offset-background flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-4 ring-offset-2 transition-all duration-300",
              config.bg,
              config.ring,
            )}
          >
            <Icon className={cn("h-4.5 w-4.5", config.color)} />
          </div>

          <div className="min-w-0 flex-1">
            <Modal.Title className="text-foreground text-base font-bold tracking-tight">
              {title}
            </Modal.Title>

            <p
              className={cn(
                "text-[9px] font-black tracking-widest uppercase opacity-80",
                config.color,
              )}
            >
              {variant === "destructive" || variant === "warning"
                ? "Attention Required"
                : "Confirmation"}
            </p>
          </div>
        </div>

        <Modal.Body className="p-5">
          <p className="text-muted-foreground text-[13px] leading-relaxed font-medium">
            {description}
          </p>
        </Modal.Body>

        <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/50 p-4 sm:flex-row sm:justify-end sm:gap-3 dark:border-zinc-900 dark:bg-zinc-950/20">
          <Button
            size="sm"
            onClick={onClose}
            variant="secondary"
            className="w-full border-zinc-200 text-xs font-semibold tracking-wide transition-all duration-200 hover:bg-zinc-100 active:scale-[0.98] sm:w-auto"
          >
            {cancelText}
          </Button>

          <Button
            size="sm"
            loading={loading}
            onClick={onConfirm}
            className={cn(
              "w-full px-6 text-xs font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] sm:w-auto",
              config.buttonClass,
            )}
          >
            {confirmText}
          </Button>
        </div>
      </Modal.Content>
    </Modal>
  );
};

export default ConfirmationModal;
