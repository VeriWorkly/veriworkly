"use client";

import Link from "next/link";
import Image from "next/image";
import { FileText } from "lucide-react";

import { Badge } from "@veriworkly/ui";

import { getDocumentDefinition } from "@/features/documents/core/registry";
import { type ResumeWorkspaceDoc } from "@/features/documents/services/resume-workspace";

const RecentCard = ({ doc }: { doc: ResumeWorkspaceDoc }) => {
  const definition = getDocumentDefinition(doc.type);

  return (
    <Link
      href={`/editor/${doc.type.toLowerCase()}/${doc.id}`}
      className="border-border bg-background/70 group hover:border-accent/40 hover:bg-card overflow-hidden rounded-xl border transition"
    >
      <div className="border-border/70 relative h-28 border-b bg-[color-mix(in_oklab,var(--card)_78%,var(--background))]">
        {doc.previewImage ? (
          <Image src={doc.previewImage} alt="" fill className="object-contain p-2" sizes="20vw" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="text-accent h-8 w-8" />
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-bold">{doc.title}</h3>
          <Badge className="px-2 py-0.5 text-[10px]">{definition.label}</Badge>
        </div>

        <p className="text-muted mt-1 truncate text-xs">{doc.description || doc.templateName}</p>
      </div>
    </Link>
  );
};

export default RecentCard;
