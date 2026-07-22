import { Briefcase, FileSignature, FileText, Globe, User } from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";

const documents = [
  { title: "Resume", icon: FileText },
  { title: "Cover Letter", icon: FileSignature },
  { title: "Portfolio", icon: Globe },
  { title: "Invoice", icon: Briefcase },
];

export const MasterProfileFlow = () => {
  return (
    <div className="relative overflow-hidden rounded-4xl border border-zinc-800 bg-[#0a0a0a] p-8 md:p-12">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.06)_1px,transparent_1px)] mask-[radial-gradient(ellipse_70%_70%_at_30%_50%,#000_60%,transparent_100%)] bg-size-[26px_26px]" />

      <div className="relative z-10 flex flex-col items-stretch gap-10 lg:flex-row lg:items-center">
        <Reveal className="relative flex shrink-0 flex-col items-start gap-4 rounded-3xl border border-blue-500/20 bg-blue-500/6 p-6 lg:w-72">
          <span className="absolute -top-2 -right-2 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-40" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-blue-500" />
          </span>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
            <User className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-semibold text-white">Master Profile</p>
            <p className="mt-1.5 text-sm leading-6 text-zinc-400">
              One private record of your career facts, stored locally first.
            </p>
          </div>
        </Reveal>

        <div className="relative flex flex-1 flex-col gap-6">
          <div className="pointer-events-none absolute top-1/2 right-0 left-0 hidden h-px -translate-y-1/2 bg-linear-to-r from-blue-500/40 via-zinc-700 to-zinc-700 lg:block" />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {documents.map((doc, idx) => {
              const Icon = doc.icon;
              return (
                <Reveal
                  key={doc.title}
                  delay={0.15 + idx * 0.08}
                  className="relative flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-6 text-center"
                >
                  <span className="pointer-events-none absolute top-0 left-1/2 hidden h-6 w-px -translate-x-1/2 -translate-y-full bg-zinc-700 lg:block" />
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
                    <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium text-zinc-200">{doc.title}</span>
                  <span className="text-[11px] text-zinc-500">Snapshot, decoupled</span>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterProfileFlow;
