"use client";

import * as React from "react";
import { toast } from "sonner";
import { AtSign, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Modal, Button, Input } from "@veriworkly/ui";

import {
  updateAccountUsername,
  checkUsernameAvailability,
} from "@/features/profile/services/update-profile";

interface SetUsernameModalProps {
  open: boolean;
  onClose: () => void;
}

type ValidationState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "invalid"; reason: string }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken" };

const SetUsernameModal = ({ open, onClose }: SetUsernameModalProps) => {
  const router = useRouter();

  const [username, setUsername] = React.useState("");
  const [prevOpen, setPrevOpen] = React.useState(open);
  const [isSaving, setIsSaving] = React.useState(false);
  const [validation, setValidation] = React.useState<ValidationState>({ status: "idle" });
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setUsername("");
      setValidation({ status: "idle" });
      setIsSaving(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value) {
      setValidation({ status: "idle" });
      return;
    }

    setValidation({ status: "checking" });

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(value);
        if (result.available) {
          setValidation({ status: "available" });
        } else {
          const reason = result.reason;
          if (reason === "taken") {
            setValidation({ status: "taken" });
          } else if (reason === "reserved") {
            setValidation({ status: "invalid", reason: "This username is reserved" });
          } else if (reason === "too_short") {
            setValidation({ status: "invalid", reason: "Username must be at least 3 characters" });
          } else if (reason === "too_long") {
            setValidation({ status: "invalid", reason: "Username must be at most 32 characters" });
          } else if (reason === "invalid_characters") {
            setValidation({
              status: "invalid",
              reason: "Only lowercase letters, numbers, underscores, and hyphens are allowed",
            });
          } else {
            setValidation({ status: "taken" });
          }
        }
      } catch {
        setValidation({ status: "idle" });
      }
    }, 500);
  };

  const canSubmit = !isSaving && username.length >= 3 && validation.status === "available";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canSubmit) return;

    try {
      setIsSaving(true);
      await updateAccountUsername(username);
      toast.success("Username set successfully");
      router.refresh();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set username";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const inputError = validation.status === "invalid" || validation.status === "taken";
  const errorMessage =
    validation.status === "invalid"
      ? validation.reason
      : validation.status === "taken"
        ? "This username is already taken"
        : null;

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Content className="w-full overflow-hidden border border-zinc-200/50 p-0 shadow-2xl backdrop-blur-xl sm:rounded-2xl dark:border-zinc-800/50">
        <div className="relative flex items-center gap-4 border-b border-zinc-100 p-4 md:bg-zinc-500/2 dark:border-zinc-900">
          <div className="bg-accent/10 pointer-events-none absolute -top-10 -left-10 h-24 w-24 rounded-full opacity-10 blur-2xl" />

          <div className="ring-offset-background bg-accent/10 ring-accent/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-3 ring-offset-2 transition-all duration-300">
            <AtSign className="text-accent h-4.5 w-4.5" />
          </div>

          <div className="min-w-0 flex-1">
            <Modal.Title
              className="text-foreground text-base font-black tracking-tight"
              id="set-username-title"
            >
              Set Your Username
            </Modal.Title>

            <p className="text-muted-foreground text-[10px] font-black tracking-widest uppercase opacity-80">
              Account settings
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Modal.Body className="space-y-4 p-5">
            <div className="flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50/60 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-950/20">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="text-[11px] leading-relaxed font-medium text-amber-700 dark:text-amber-400">
                Usernames are permanent. Once set, your username cannot be changed.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="username-input" className="text-foreground text-sm font-semibold">
                Username
              </label>

              <div className="relative">
                <span className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium select-none">
                  @
                </span>
                <Input
                  autoFocus
                  type="text"
                  value={username}
                  error={inputError}
                  className="w-full pl-7"
                  disabled={isSaving}
                  id="username-input"
                  placeholder="yourname"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  onChange={handleChange}
                />
              </div>

              {errorMessage ? (
                <p className="text-destructive pl-1 text-xs font-semibold">{errorMessage}</p>
              ) : validation.status === "checking" ? (
                <p className="text-muted pl-1 text-[11px] font-medium">Checking availability…</p>
              ) : validation.status === "available" ? (
                <p className="pl-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  @{username} is available
                </p>
              ) : (
                <p className="text-muted-foreground/70 pl-1 text-[11px] leading-relaxed font-medium">
                  3–32 characters. Lowercase letters, numbers, underscores, and hyphens only.
                </p>
              )}
            </div>
          </Modal.Body>

          <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/50 p-4 sm:flex-row sm:justify-end sm:gap-3 dark:border-zinc-900 dark:bg-zinc-950/20">
            <Button
              size="sm"
              onClick={onClose}
              variant="secondary"
              disabled={isSaving}
              id="cancel-set-username-btn"
              className="w-full border-zinc-200 text-xs font-semibold tracking-wide transition-all duration-200 hover:bg-zinc-100 active:scale-[0.98] sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              size="sm"
              type="submit"
              loading={isSaving}
              disabled={!canSubmit}
              id="save-set-username-btn"
              className="bg-accent text-accent-foreground w-full px-6 text-xs font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] sm:w-auto"
            >
              Set Username
            </Button>
          </div>
        </form>
      </Modal.Content>
    </Modal>
  );
};

export default SetUsernameModal;
