import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

import type { TemplateId } from "@/lib/portfolio";

export function PortfolioTemplatePreviewFrame({
  templateId,
  title,
  image = false,
  compact = false,
  interactive = false,
  href = `/templates/${templateId}/preview`,
}: {
  templateId: TemplateId;
  title: string;
  compact?: boolean;
  image?: boolean;
  interactive?: boolean;
  href?: string;
}) {
  return (
    <div className="border-ink-2 overflow-hidden rounded-3xl border-[3px] bg-white shadow-[16px_18px_0_rgba(17,17,15,0.14)]">
      <div className="border-ink-2 text-ink-2 flex min-h-12 items-center justify-between gap-4 border-b-2 bg-white px-4 text-[10px] font-bold tracking-[0.12em] uppercase">
        <span>{title}</span>

        <Link
          className="bg-ink-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white"
          href={`/templates/${templateId}/preview`}
        >
          Full page <ExternalLink size={12} />
        </Link>
      </div>

      <div
        className={`relative overflow-hidden bg-[#eceae2] ${
          compact ? "h-90 md:h-115" : "h-[70vh] min-h-155"
        }`}
      >
        {interactive ? (
          <iframe
            loading="lazy"
            src={`/templates/${templateId}/preview`}
            className="size-full border-0 bg-white"
            title={`${title} live portfolio template preview`}
          />
        ) : image ? (
          <Image
            fill
            src={href}
            sizes="(max-width: 768px) 95vw, (max-width: 1200px) 80vw, 60vw"
            alt={`${title} portfolio template preview`}
            className="size-full border-0 bg-white object-cover"
          />
        ) : (
          <TemplatePreviewArt templateId={templateId} />
        )}
      </div>
    </div>
  );
}

export function TemplatePreviewArt({ templateId }: { templateId: TemplateId }) {
  const isSignal = templateId === "signal";

  return (
    <Link
      className={`group block size-full overflow-hidden p-6 transition duration-500 hover:scale-[1.015] ${
        isSignal ? "bg-[#e9e8e1]" : "bg-[#f4eee4]"
      }`}
      href={`/templates/${templateId}`}
      aria-label={`View ${templateId} portfolio template details`}
    >
      <div
        className={`border-ink-2 relative mx-auto h-full max-w-190 overflow-hidden rounded-[1.8rem] border-2 bg-white shadow-[12px_14px_0_rgba(17,17,15,0.16)] ${
          isSignal ? "rotate-[-1.5deg]" : "rotate-[1.5deg]"
        }`}
      >
        <div className="border-ink-2 flex h-11 items-center justify-between border-b-2 px-4 text-[10px] font-bold tracking-[0.12em] uppercase">
          <span>{isSignal ? "Signal" : "Atelier"}</span>
          <span>{isSignal ? "Structured / technical" : "Expressive / editorial"}</span>
        </div>

        {isSignal ? <SignalPreview /> : <AtelierPreview />}
      </div>
    </Link>
  );
}

function SignalPreview() {
  return (
    <div className="relative h-full bg-[#efeee8] p-8">
      <div className="bg-accent absolute right-[-18%] bottom-[-20%] size-[46%] rounded-full" />
      <p className="text-[10px] font-bold tracking-[0.2em] uppercase">
        Engineers and product leaders
      </p>

      <h3 className="mt-10 max-w-xl text-[clamp(2.4rem,6vw,5.5rem)] leading-[0.82] font-bold tracking-[-0.09em]">
        You will build proof, clarity, and strong systems.
      </h3>

      <div className="mt-8 flex gap-3">
        <span className="bg-ink-2 h-12 w-32 rounded-full" />
        <span className="border-ink-2/20 h-12 w-40 rounded-full border bg-white" />
      </div>

      <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
        {["Work", "Systems", "Proof"].map((item) => (
          <span
            className="border-ink-2/15 rounded-2xl border bg-white p-4 text-xs font-bold"
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function AtelierPreview() {
  return (
    <div className="relative h-full bg-[#f7f1e8] p-8">
      <div className="bg-accent absolute top-20 right-8 h-[48%] w-[30%] rounded-t-full" />

      <p className="font-serif text-sm tracking-[0.16em] uppercase">Independent builders</p>

      <h3 className="mt-12 max-w-155 font-serif text-[clamp(2.6rem,6.5vw,6rem)] leading-[0.9] tracking-[-0.08em]">
        A warmer canvas for work with a point of view.
      </h3>

      <div className="mt-10 grid max-w-xl grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="bg-ink-2 min-h-28 rounded-4xl p-5 text-white">
          <span className="text-xs font-bold">Case study</span>
        </div>

        <div className="border-ink-2/15 min-h-28 rounded-4xl border bg-white p-5">
          <span className="text-accent text-xs font-bold">Voice</span>
        </div>
      </div>
    </div>
  );
}
