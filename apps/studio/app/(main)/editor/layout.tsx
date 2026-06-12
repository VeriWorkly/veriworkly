import type { ReactNode } from "react";

import { FontStylesheetPreload } from "@/features/documents/components/FontStylesheetPreload";

export default function EditorRouteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <FontStylesheetPreload />
      <div className="bg-background min-h-dvh">{children}</div>
    </>
  );
}
