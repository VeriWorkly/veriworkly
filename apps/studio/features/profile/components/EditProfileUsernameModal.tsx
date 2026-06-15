"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AtSign, AlertTriangle, Check, Loader2 } from "lucide-react";

import { Modal, Button, Input } from "@veriworkly/ui";

import {
  updateAccountUsername,
  checkUsernameAvailability,
} from "@/features/profile/services/update-profile";

interface EditProfileUsernameModalProps {
  open: boolean;
  onClose: () => void;
}

const EditProfileUsernameModal = ({ open, onClose }: EditProfileUsernameModalProps) => {
  const router = useRouter();

  const [username, setUsername] = React.useState("");
  const [prevOpen, setPrevOpen] = React.useState(open);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [isAvailable, setIsAvailable] = React.useState<boolean | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);

    if (open) {
      setUsername("");
      setValidationError(null);
      setIsAvailable(null);
      setIsSaving(false);
      setIsChecking(false);
    }
  }

  const validateUsernameFormat = (val: string): string | null => {
    if (!val) return "Username cannot be empty";
    if (val.length < 3) return "Username must be at least 3 characters";
    if (val.length > 32) return "Username cannot exceed 32 characters";
    if (!/^[a-z0-9_-]+$/.test(val)) {
      return "Use only lowercase letters, numbers, hyphens, and underscores";
    }
    return null;
  };

  React.useEffect(() => {
    const trimmed = username.trim().toLowerCase();

    if (!trimmed || validateUsernameFormat(trimmed)) return;

    const delayDebounce = setTimeout(async () => {
      try {
        const response = await checkUsernameAvailability(trimmed);
        setIsAvailable(response.available);
        if (!response.available) {
          setValidationError(
            response.reason === "taken"
              ? "This username is already taken"
              : "This username is reserved or invalid",
          );
        }
      } catch {
        setValidationError("Could not verify username availability. Please try again.");
      } finally {
        setIsChecking(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmed = username.trim().toLowerCase();
    const formatError = validateUsernameFormat(trimmed);
    if (formatError) {
      setValidationError(formatError);
      return;
    }

    if (isAvailable === false) {
      return;
    }

    try {
      setIsSaving(true);
      setValidationError(null);

      await updateAccountUsername(trimmed);

      toast.success("Username configured successfully");
      router.refresh();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set username";
      setValidationError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Content className="overflow-hidden p-0">
        <div className="relative flex items-center gap-4 border-b border-zinc-100 p-4 md:bg-zinc-500/2 dark:border-zinc-900">
          <div className="bg-accent/10 pointer-events-none absolute -top-10 -left-10 h-24 w-24 rounded-full opacity-10 blur-2xl" />

          <div className="ring-offset-background bg-accent/10 ring-accent/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-3 ring-offset-2 transition-all duration-300">
            <AtSign className="text-accent h-4.5 w-4.5" />
          </div>

          <div>
            <Modal.Title id="edit-username-title" className="text-lg font-bold">
              Configure Username
            </Modal.Title>

            <p className="text-muted-foreground text-xs">Account settings</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Modal.Body className="space-y-4 p-5">
            <div className="flex gap-3 rounded-xl border border-amber-200/30 bg-amber-500/10 p-3 text-amber-600 dark:border-amber-500/20 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="text-xs leading-relaxed font-semibold">
                Choose carefully. Your username can only be set once and cannot be changed later.
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="profile-username-input"
                className="text-foreground text-sm font-semibold"
              >
                Username
              </label>

              <div className="relative">
                <Input
                  autoFocus
                  type="text"
                  value={username}
                  error={!!validationError}
                  className="w-full pr-10"
                  disabled={isSaving}
                  id="profile-username-input"
                  placeholder="e.g. john_doe"
                  onChange={(e) => {
                    const value = e.target.value;
                    setUsername(value);
                    const trimmed = value.trim().toLowerCase();
                    if (!trimmed) {
                      setIsChecking(false);
                      setIsAvailable(null);
                      setValidationError(null);
                    } else {
                      setIsAvailable(null);
                      const formatError = validateUsernameFormat(trimmed);
                      if (formatError) {
                        setValidationError(formatError);
                        setIsChecking(false);
                      } else {
                        setValidationError(null);
                        setIsChecking(true);
                      }
                    }
                  }}
                />

                <div className="absolute top-1/2 right-3.5 flex -translate-y-1/2 items-center justify-center">
                  {isChecking && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
                  {isAvailable && <Check className="h-4.5 w-4.5 text-emerald-500" />}
                </div>
              </div>

              {validationError ? (
                <p
                  id="profile-username-error"
                  className="text-destructive pl-1 text-xs font-semibold"
                >
                  {validationError}
                </p>
              ) : isAvailable ? (
                <p className="pl-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Username is available!
                </p>
              ) : (
                <p className="text-muted-foreground/70 pl-1 text-[11px] leading-relaxed font-medium">
                  Use 3-32 characters, lowercase letters, numbers, hyphens, and underscores.
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
              id="cancel-edit-username-btn"
              className="w-full border-zinc-200 text-xs font-semibold tracking-wide transition-all duration-200 hover:bg-zinc-100 active:scale-[0.98] sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              size="sm"
              type="submit"
              loading={isSaving}
              disabled={isChecking || !isAvailable || isSaving}
              id="save-edit-username-btn"
              className="bg-accent text-accent-foreground w-full text-xs font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] sm:w-auto"
            >
              Set Username
            </Button>
          </div>
        </form>
      </Modal.Content>
    </Modal>
  );
};

export default EditProfileUsernameModal;
