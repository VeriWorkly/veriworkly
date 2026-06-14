"use client";

import { useEffect } from "react";

import { useUserStore } from "../store/useUserStore";

import type { SessionUser } from "@/features/auth/services/current-user";

import { setAllDocumentsSyncEnabled } from "@/features/documents/services/document-sync";
import {
  setAutoSyncEnabledInLocalStorage,
  loadWorkspaceSettingsFromLocalStorage,
} from "@/features/documents/services/workspace-settings";

export function AuthInitializer({ initialUser }: { initialUser: SessionUser | null }) {
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    setUser(initialUser);

    if (initialUser) {
      const localSettings = loadWorkspaceSettingsFromLocalStorage();
      const autoSyncEnabled = initialUser.autoSyncEnabled ?? false;

      if (localSettings.autoSyncEnabled !== autoSyncEnabled) {
        setAutoSyncEnabledInLocalStorage(autoSyncEnabled);
        setAllDocumentsSyncEnabled(autoSyncEnabled);
      }
    }
  }, [initialUser, setUser]);

  return null;
}
