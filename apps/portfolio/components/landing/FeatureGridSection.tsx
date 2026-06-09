import { Check, Globe2, MousePointer2, PencilLine, Search, Sparkles } from "lucide-react";

const FeatureGridSection = () => {
  return (
    <section className="bg-[#11110f] py-32 text-[#f4f2e9] md:py-48">
      <div className="mx-auto w-[min(1360px,calc(100%-48px))] max-sm:w-[min(calc(100%-30px),1360px)]">
        <div className="mb-18 space-y-8" data-reveal>
          <p className="mb-5 text-[0.72rem] font-black tracking-[0.16em] uppercase">
            Everything required. Nothing to maintain.
          </p>

          <h2 className="max-w-4xl text-[clamp(3.4rem,7vw,7rem)] leading-[0.9] tracking-tighter wrap-normal">
            Your professional presence, already handled.
          </h2>
        </div>

        <div className="grid grid-flow-dense auto-rows-[430px] grid-cols-12 gap-3 max-lg:auto-rows-auto max-lg:grid-cols-1">
          <article
            data-reveal
            className="hover:border-accent relative col-span-7 flex overflow-hidden rounded-3xl border border-white/15 bg-[#191916] p-8 transition-all! duration-500 hover:-translate-y-1.5 max-lg:col-auto max-lg:min-h-107.5"
          >
            <div className="flex items-start gap-4">
              <PencilLine size={20} aria-hidden="true" />

              <div>
                <h3 className="max-w-xl text-[clamp(1.7rem,3vw,2.6rem)] leading-[0.95] tracking-[-0.055em]">
                  A form that thinks like an editor
                </h3>

                <p className="mt-3 text-xs leading-7 text-white/50">
                  Only the questions that sharpen your story and VeriWorkly&apos;s product proof.
                </p>
              </div>
            </div>

            <div className="absolute right-8 -bottom-16.25 left-[10%] -rotate-2 rounded-t-2xl bg-[#f4f2e9] p-6 text-[#11110f] max-sm:right-6 max-sm:left-6">
              <span className="mb-2 flex justify-between text-[9px] font-black uppercase">
                Headline <span>64 / 80</span>
              </span>

              <div className="rounded-lg border border-[#11110f]/15 p-3 text-xs">
                Building VeriWorkly into a product ecosystem.
              </div>

              <span className="mt-4 mb-2 block text-[9px] font-black uppercase">
                Featured product
              </span>

              <div className="flex items-center gap-2 rounded-lg border border-[#11110f]/15 p-3 text-xs">
                <span className="bg-accent h-6 w-8 rounded" aria-hidden="true" />
                <b>Portfolio Builder</b>
                <Check size={15} className="ml-auto" aria-hidden="true" />
              </div>

              <span className="bg-accent absolute right-[18%] bottom-[11%] grid size-8 place-items-center rounded-full text-white">
                <MousePointer2 size={15} aria-hidden="true" />
              </span>
            </div>
          </article>

          <article
            data-reveal
            className="bg-accent border-accent/25 relative col-span-5 flex flex-col justify-between overflow-hidden rounded-3xl border p-8 text-white transition-all! duration-500 hover:-translate-y-1.5 max-lg:col-auto max-lg:min-h-107.5"
          >
            <div className="self-end rounded-full border border-white/25 p-6">
              <Globe2 size={88} strokeWidth={1} aria-hidden="true" />
            </div>

            <div>
              <h3 className="text-[clamp(1.7rem,3vw,2.6rem)] leading-[0.95] tracking-[-0.055em]">
                A subdomain with your name on it
              </h3>

              <p className="mt-3 text-xs leading-7 text-white/70">
                Claim a clean address the moment you publish.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-2 text-[10px] font-black">
                <span className="size-1.75 rounded-full bg-[#50d672]" aria-hidden="true" />
                gautam.veriworkly.com
              </div>
            </div>
          </article>

          <article
            data-reveal
            className="hover:border-accent col-span-5 flex flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-[#191916] p-8 transition-all! duration-500 hover:-translate-y-1.5 max-lg:col-auto max-lg:min-h-107.5"
          >
            <div>
              <Search size={20} aria-hidden="true" />

              <h3 className="mt-3 text-[clamp(1.7rem,3vw,2.6rem)] leading-[0.95] tracking-[-0.055em]">
                Control how the world sees you
              </h3>

              <p className="mt-3 text-xs leading-7 text-white/50">
                Set the title and description that appear on search, social, and link previews.
              </p>
            </div>

            <div className="rotate-2 rounded-2xl bg-white p-5 text-[#11110f]">
              <span className="text-[10px] text-[#237b38]">gautam.veriworkly.com</span>

              <b className="text-accent mt-2 block text-base">Gautam Raj - Builder of VeriWorkly</b>

              <p className="mt-1 text-xs leading-6 text-[#11110f]/60">
                Portfolio builder, resume tools, publishing workflows, and product experiments.
              </p>
            </div>
          </article>

          <article
            data-reveal
            className="hover:border-accent col-span-7 flex items-end gap-3 overflow-hidden rounded-3xl border border-white/15 bg-[#191916] p-8 transition-all! duration-500 hover:-translate-y-1.5 max-lg:col-auto max-lg:min-h-130 max-sm:flex-wrap"
          >
            <div className="w-[35%] self-start max-sm:w-full">
              <Sparkles size={20} aria-hidden="true" />

              <h3 className="mt-3 text-[clamp(1.7rem,3vw,2.6rem)] leading-[0.95] tracking-[-0.055em]">
                Change the mood, not the content
              </h3>

              <p className="mt-3 text-xs leading-7 text-white/50">
                Move from technical Signal to editorial Atelier without rebuilding.
              </p>
            </div>

            <div className="flex h-3/4 w-[27%] -rotate-3 flex-col justify-between rounded-2xl bg-[#f2efe5] p-5 text-[#11110f] transition duration-500 hover:-translate-y-3 max-sm:h-64 max-sm:w-[calc(50%-0.5rem)]">
              <span className="text-[9px] font-black uppercase">Signal</span>
              <strong className="text-6xl tracking-[-0.08em]">Aa</strong>
            </div>

            <div className="bg-accent flex h-3/4 w-[27%] rotate-3 flex-col justify-between rounded-2xl p-5 text-white transition duration-500 hover:-translate-y-3 max-sm:h-64 max-sm:w-[calc(50%-0.5rem)]">
              <span className="text-[9px] font-black uppercase">Atelier</span>
              <strong className="text-6xl tracking-[-0.08em]">Aa</strong>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default FeatureGridSection;
