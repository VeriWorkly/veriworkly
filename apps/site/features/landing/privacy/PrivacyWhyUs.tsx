import dynamic from "next/dynamic";
import { Shield } from "lucide-react";

const PrivacyEngineSimulator = dynamic(
  () => import("@/features/landing/privacy/PrivacyEngineSimulator"),
);

const PrivacyWhyUs = () => {
  return (
    <section className="relative overflow-hidden border-y border-zinc-200/40 bg-zinc-50/30 py-24 sm:py-32 md:py-40 dark:border-zinc-800/20 dark:bg-[#000000]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.03)_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] bg-size-[24px_24px]" />

      <div className="relative z-10 mx-auto max-w-350 px-6 md:px-8">
        <div className="grid grid-cols-1 items-center gap-12 sm:gap-16 lg:grid-cols-12 lg:gap-24">
          <div className="flex w-full items-center justify-center lg:order-2 lg:col-span-6">
            <PrivacyEngineSimulator />
          </div>

          <div className="flex flex-col justify-center lg:order-1 lg:col-span-6">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 sm:h-12 sm:w-12 dark:text-blue-400">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
            </div>

            <h2 className="mb-4 font-sans text-3xl font-semibold tracking-tighter text-balance text-zinc-900 sm:text-4xl md:text-5xl lg:text-6xl dark:text-white">
              Privacy as a baseline, not an option
            </h2>

            <p className="mb-8 max-w-[50ch] text-base leading-relaxed text-zinc-500 sm:text-lg dark:text-zinc-400">
              VeriWorkly runs the entire parsing, AI tailoring, and database engine directly inside
              your client browser. Built open-source and local-first, your career facts and personal
              data remain strictly under your control.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5 sm:gap-4">
                <div className="mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ✓
                </div>

                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    Local-First Vault:
                  </span>{" "}
                  Your resume inputs are stored inside your browser, protected by browser
                  sandboxing.
                </p>
              </div>

              <div className="flex items-start gap-3.5 sm:gap-4">
                <div className="mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ✓
                </div>

                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    No Account Friction:
                  </span>{" "}
                  Start building instantly. No logins or registrations are required to export
                  documents.
                </p>
              </div>

              <div className="flex items-start gap-3.5 sm:gap-4">
                <div className="mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ✓
                </div>

                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Audit-Ready:</span>{" "}
                  Open-core repository structure lets developers inspect and audit all client-side
                  parsing code.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrivacyWhyUs;
