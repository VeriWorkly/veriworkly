import { Shield } from "lucide-react";
import PrivacyEngineSimulator from "@/features/landing/privacy/PrivacyEngineSimulator";

const PrivacyWhyUs = () => {
  return (
    <section className="relative overflow-hidden border-y border-zinc-200/40 bg-zinc-50/30 py-32 md:py-48 dark:border-zinc-800/20 dark:bg-[#000000]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.03)_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] bg-size-[24px_24px]" />

      <div className="relative z-10 mx-auto max-w-350 px-6 md:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-24">
          <div className="flex w-full items-center justify-center lg:order-2 lg:col-span-6">
            <PrivacyEngineSimulator />
          </div>

          <div className="flex flex-col justify-center lg:order-1 lg:col-span-6">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Shield className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h2 className="mb-6 font-sans text-4xl font-semibold tracking-tighter text-balance text-zinc-900 md:text-5xl lg:text-6xl dark:text-white">
              Privacy as a baseline, not an option
            </h2>
            <p className="mb-8 max-w-[50ch] text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
              Typical resume builders harvest your emails, work history, and contact coordinates to
              sell to recruiters or target lists. VeriWorkly reverses this by running the parsing,
              tailoring, and database engine directly inside your client browser.
            </p>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ✓
                </div>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    Local-First Vault:
                  </span>{" "}
                  Your resume inputs are stored inside your browser, protected by browser
                  sandboxing.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ✓
                </div>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    No Account Friction:
                  </span>{" "}
                  Start building instantly. There are no logins or registrations required to export
                  documents.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ✓
                </div>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">Audit-Ready:</span>{" "}
                  Open-core repository structure lets developers read and audit all client-side
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
