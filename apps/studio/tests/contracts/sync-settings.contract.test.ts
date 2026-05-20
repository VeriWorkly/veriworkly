import { describe, expect, it } from "vitest";

import { getAutoSyncControlState } from "@/app/(main)/(dashboard)/settings/components/sync-section-state";

describe("sync settings contract", () => {
  it("disables and unchecks auto-sync when the user is logged out", () => {
    expect(
      getAutoSyncControlState({
        autoSync: true,
        isLoggedIn: false,
        loading: false,
      }),
    ).toEqual({
      checked: false,
      disabled: true,
      description: "Sign in to enable background synchronization.",
    });
  });

  it("preserves the saved auto-sync state for logged-in users", () => {
    expect(
      getAutoSyncControlState({
        autoSync: true,
        isLoggedIn: true,
        loading: false,
      }),
    ).toEqual({
      checked: true,
      disabled: false,
      description: "Manage background synchronization.",
    });
  });
});
