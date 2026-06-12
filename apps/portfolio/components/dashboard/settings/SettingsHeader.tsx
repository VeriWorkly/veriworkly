import Link from "next/link";
import { Save } from "lucide-react";

const action =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-extrabold transition";

export interface SettingsHeaderProps {
  status: string;
  onSave: () => void;
}

export function SettingsHeader({ status, onSave }: SettingsHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-accent text-xs font-extrabold">Publishing controls</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">
          Own every shared impression.
        </h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Control your address, search result, and the preview people see before they open your
          work.
        </p>
      </div>
      <div className="flex gap-2">
        <Link className={`${action} border-line bg-panel text-ink border`} href="/editor">
          Open editor
        </Link>
        <button
          className={`${action} bg-accent text-accent-ink hover:bg-accent-strong`}
          onClick={onSave}
        >
          <Save size={14} /> {status === "Saving" ? "Saving..." : "Save settings"}
        </button>
      </div>
    </header>
  );
}
