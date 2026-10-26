import { AlertCircle } from "lucide-react";

/**
 * Shown while the profile editor holds a stored profile that only partly validated: what
 * could be read is on screen, and the next save writes exactly that over the stored copy.
 */
export function RecoveredProfileNotice() {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4"
      role="status"
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-orange-500" />
      <p className="text-muted text-sm">
        Part of your saved profile could not be read, so only what could be read is shown here.
        Saving replaces the stored profile with what you see.
      </p>
    </div>
  );
}
