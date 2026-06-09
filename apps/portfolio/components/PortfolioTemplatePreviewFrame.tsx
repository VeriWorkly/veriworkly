import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

import type { TemplateId } from "@/lib/portfolio";

export function PortfolioTemplatePreviewFrame({
  templateId,
  title,
  image = true,
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
    <div className="overflow-hidden rounded-3xl border-[3px] border-[#11110f] bg-white shadow-[16px_18px_0_rgba(17,17,15,0.14)]">
      <div className="flex min-h-12 items-center justify-between gap-4 border-b-2 border-[#11110f] bg-white px-4 text-[10px] font-black tracking-[0.12em] text-[#11110f] uppercase">
        <span>{title}</span>

        <Link
          className="inline-flex items-center gap-1.5 rounded-full bg-[#11110f] px-3 py-1.5 text-white"
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
            className="size-full border-0 bg-white"
            src={`/templates/${templateId}/preview`}
            title={`${title} live portfolio template preview`}
          />
        ) : image ? (
          <Image
            fill
            src={href}
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
        className={`relative mx-auto h-full max-w-190 overflow-hidden rounded-[1.8rem] border-2 border-[#11110f] bg-white shadow-[12px_14px_0_rgba(17,17,15,0.16)] ${
          isSignal ? "rotate-[-1.5deg]" : "rotate-[1.5deg]"
        }`}
      >
        <div className="flex h-11 items-center justify-between border-b-2 border-[#11110f] px-4 text-[10px] font-black tracking-[0.12em] uppercase">
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
      <p className="text-[10px] font-black tracking-[0.2em] uppercase">
        Engineers and product leaders
      </p>

      <h3 className="mt-10 max-w-xl text-[clamp(2.4rem,6vw,5.5rem)] leading-[0.82] font-black tracking-[-0.09em]">
        You will build proof, clarity, and strong systems.
      </h3>

      <div className="mt-8 flex gap-3">
        <span className="h-12 w-32 rounded-full bg-[#11110f]" />
        <span className="h-12 w-40 rounded-full border border-[#11110f]/20 bg-white" />
      </div>

      <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
        {["Work", "Systems", "Proof"].map((item) => (
          <span
            className="rounded-2xl border border-[#11110f]/15 bg-white p-4 text-xs font-black"
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
        <div className="min-h-28 rounded-4xl bg-[#11110f] p-5 text-white">
          <span className="text-xs font-black">Case study</span>
        </div>

        <div className="min-h-28 rounded-4xl border border-[#11110f]/15 bg-white p-5">
          <span className="text-accent text-xs font-black">Voice</span>
        </div>
      </div>
    </div>
  );
}
