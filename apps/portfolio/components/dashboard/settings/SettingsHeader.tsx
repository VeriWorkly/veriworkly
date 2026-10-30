import Link from "next/link";
import { Save } from "lucide-react";
import { UnpublishButton } from "@/components/dashboard/UnpublishButton";
import { saveStatusLabel, type SaveIssue, type SaveStatus } from "@/store/portfolio-store";

const action =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-extrabold transition";

export interface SettingsHeaderProps {
  status: SaveStatus;
  saveIssue: SaveIssue;
  onSave: () => void;
}

export function SettingsHeader({ status, saveIssue, onSave }: SettingsHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-accent text-xs font-extrabold">Publishing controls</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">
          Own every shared impression.
        </h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Control your address, search result, and the preview people see before they open your
          work.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p
          aria-live="polite"
          className={`basis-full text-xs font-bold sm:basis-auto ${
            status === "Not saved" || status === "Conflict" ? "text-danger" : "text-muted"
          }`}
        >
          {saveStatusLabel(status, saveIssue)}
        </p>
        <UnpublishButton className={`${action} border-line bg-panel text-ink border`} />
        <Link className={`${action} border-line bg-panel text-ink border`} href="/editor">
          Open editor
        </Link>
        <button
          className={`${action} bg-accent text-accent-ink hover:bg-accent-strong`}
          onClick={onSave}
          type="button"
        >
          <Save size={14} /> {status === "Saving" ? "Saving..." : "Save settings"}
        </button>
      </div>
    </header>
  );
}
