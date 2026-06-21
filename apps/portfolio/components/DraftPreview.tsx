"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

import { demoPortfolio, type TemplateId } from "@/lib/portfolio";

const templates = {
  signal: dynamic(() => import("@/template-library/signal/SignalTemplate")),
  atelier: dynamic(() => import("@/template-library/atelier/AtelierTemplate")),
};

export function DraftPreview({ templateId }: { templateId: TemplateId }) {
  const Template = templates[templateId];

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (e.key === "F12") {
        e.preventDefault();
        return;
      }

      if (isCtrl) {
        if (
          e.key === "u" ||
          e.key === "U" ||
          e.key === "s" ||
          e.key === "S" ||
          e.key === "p" ||
          e.key === "P" ||
          e.key === "c" ||
          e.key === "C" ||
          e.key === "x" ||
          e.key === "X"
        ) {
          e.preventDefault();
          return;
        }

        if (
          isShift &&
          (e.key === "I" ||
            e.key === "i" ||
            e.key === "J" ||
            e.key === "j" ||
            e.key === "C" ||
            e.key === "c")
        ) {
          e.preventDefault();
          return;
        }
      }
    };

    const handleSelectStart = (e: Event) => e.preventDefault();
    const handleDragStart = (e: Event) => e.preventDefault();

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, []);

  return (
    <div className="select-none" style={{ userSelect: "none", WebkitUserSelect: "none" }}>
      <Template project={{ ...demoPortfolio, templateId }} />
    </div>
  );
}
