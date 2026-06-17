import Image from "next/image";

const RootLoading = () => {
  return (
    <div className="bg-paper text-ink relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 select-none">
      <div className="bg-line/10 fixed top-0 right-0 left-0 z-50 h-[2.5px] overflow-hidden">
        <div className="bg-accent h-full w-[40%] animate-[topProgress_1.6s_infinite_ease-in-out] rounded-full" />
      </div>

      <div className="surface-grid pointer-events-none absolute inset-0 opacity-[0.08]" />
      <div className="bg-accent/5 pointer-events-none absolute -top-40 -left-40 size-96 rounded-full blur-3xl" />
      <div className="bg-accent/5 pointer-events-none absolute -right-40 -bottom-40 size-96 rounded-full blur-3xl" />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes topProgress {
          0% {
            transform: translateX(-105%);
          }
          100% {
            transform: translateX(250%);
          }
        }
        @keyframes blueprintTrace {
          0% {
            stroke-dasharray: 40 240;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 120 160;
            stroke-dashoffset: -140;
          }
          100% {
            stroke-dasharray: 40 240;
            stroke-dashoffset: -280;
          }
        }
        @keyframes textSequence {
          0%, 25% {
            transform: translateY(0);
          }
          33%, 58% {
            transform: translateY(-16px);
          }
          66%, 91% {
            transform: translateY(-32px);
          }
          100% {
            transform: translateY(0);
          }
        }
        .animate-blueprint-trace {
          animation: blueprintTrace 2.8s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }
        .animate-text-sequence {
          animation: textSequence 7s cubic-bezier(0.76, 0, 0.24, 1) infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-blueprint-trace, .animate-text-sequence {
            animation: none !important;
          }
          .animate-blueprint-trace {
            stroke-dasharray: none !important;
            opacity: 0.6;
          }
          .animate-text-sequence {
            transform: translateY(0) !important;
          }
        }
      `,
        }}
      />

      <div className="relative flex flex-col items-center">
        <div className="relative flex size-28 items-center justify-center">
          <div className="border-line-strong/60 absolute top-0 left-0 size-3 border-t border-l" />
          <div className="border-line-strong/60 absolute top-0 right-0 size-3 border-t border-r" />
          <div className="border-line-strong/60 absolute bottom-0 left-0 size-3 border-b border-l" />
          <div className="border-line-strong/60 absolute right-0 bottom-0 size-3 border-r border-b" />

          <svg className="size-[96px] opacity-90" viewBox="0 0 100 100">
            <line
              x1="50"
              y1="8"
              x2="50"
              y2="92"
              stroke="var(--color-line)"
              strokeWidth="0.5"
              strokeDasharray="3 3"
            />
            <line
              x1="8"
              y1="50"
              x2="92"
              y2="50"
              stroke="var(--color-line)"
              strokeWidth="0.5"
              strokeDasharray="3 3"
            />

            <circle
              cx="50"
              cy="50"
              r="18"
              fill="none"
              stroke="var(--color-line)"
              strokeWidth="0.75"
            />

            <rect
              x="15"
              y="15"
              width="70"
              height="70"
              rx="8"
              fill="none"
              stroke="var(--color-line)"
              strokeWidth="0.75"
            />

            <rect
              x="15"
              y="15"
              rx="8"
              width="70"
              height="70"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-blueprint-trace"
              stroke="var(--color-accent, #2563eb)"
              style={{ filter: "drop-shadow(0 0 2px var(--color-accent, #2563eb))" }}
            />
          </svg>

          <div className="border-line/40 bg-panel absolute z-10 flex size-9 items-center justify-center rounded-lg border shadow-sm">
            <Image
              priority
              width={18}
              height={18}
              alt="VeriWorkly logo"
              src="/veriworkly-logo.png"
              className="opacity-95"
            />
          </div>
        </div>

        <div className="mt-8 space-y-2 text-center">
          <h2 className="text-ink font-mono text-[10px] font-bold tracking-[0.25em] uppercase">
            VeriWorkly
          </h2>

          <div className="relative h-4 overflow-hidden">
            <div className="animate-text-sequence text-muted flex flex-col font-mono text-[8px] tracking-widest uppercase">
              <span className="h-4 leading-4">ALIGNING CANVAS</span>
              <span className="h-4 leading-4">RESOLVING SCHEMAS</span>
              <span className="h-4 leading-4">RENDERING PROOF</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RootLoading;
