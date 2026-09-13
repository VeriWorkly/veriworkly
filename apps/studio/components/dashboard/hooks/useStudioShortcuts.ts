"use client";

import { useEffect } from "react";

interface StudioShortcutsOptions {
  onOpenSearch: () => void;
  onOpenImport: (provider?: "linkedin" | "github") => void;
}

export function useStudioShortcuts({ onOpenSearch, onOpenImport }: StudioShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenSearch();
      }
    };

    const handleOpenImportEvent = () => {
      onOpenImport("linkedin");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-import-profile", handleOpenImportEvent);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-import-profile", handleOpenImportEvent);
    };
  }, [onOpenSearch, onOpenImport]);
}
