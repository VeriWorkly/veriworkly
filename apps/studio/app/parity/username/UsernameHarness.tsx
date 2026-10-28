"use client";

import { useState } from "react";

import EditProfileUsernameModal from "@/features/profile/components/EditProfileUsernameModal";

export function UsernameHarness() {
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <main>
      <p data-testid="saved-username">{saved ?? ""}</p>
      <EditProfileUsernameModal open={saved === null} onClose={() => {}} onSaved={setSaved} />
    </main>
  );
}
