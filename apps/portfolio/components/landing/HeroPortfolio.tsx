import { WandSparkles } from "lucide-react";

const HeroPortfolio = () => {
  return (
    <div
      data-tilt
      data-hero-stage
      data-tilt-base="rotate(-2deg)"
      className="relative z-4 mx-auto mt-14 w-[min(1080px,84vw)] -rotate-2 transition-transform duration-300 max-lg:w-[92vw]"
    >
      <div className="overflow-hidden rounded-3xl border-[5px] border-[#11110f] bg-white shadow-[25px_30px_0_rgba(17,17,15,0.13)] max-sm:rounded-2xl max-sm:border-[3px]">
        <div className="flex h-12 items-center justify-between gap-4 border-b-2 border-[#11110f] px-4 text-[10px] font-black">
          <span className="flex gap-1.5">
            <i className="size-2 rounded-full border border-[#11110f]" aria-hidden="true" />
            <i className="size-2 rounded-full border border-[#11110f]" aria-hidden="true" />
            <i className="size-2 rounded-full border border-[#11110f]" aria-hidden="true" />
          </span>

          <span className="rounded-full bg-[#efeee8] px-6 py-1.5 max-sm:hidden">
            gautam.veriworkly.com
          </span>

          <span className="bg-accent size-2 rounded-full" aria-hidden="true" />
        </div>

        <div className="relative h-135 overflow-hidden bg-[#e9e8e1] p-8 max-lg:h-105 max-lg:p-5 max-sm:h-92.5">
          <div className="flex items-center justify-between text-[10px] font-black tracking-[0.16em] text-[#11110f]/55 uppercase">
            <span>Builder console</span>
            <span className="rounded-full bg-white px-3 py-1">Live draft</span>
          </div>

          <div className="mt-12 grid gap-8 max-lg:mt-8 lg:grid-cols-[1.02fr_0.98fr]">
            <div>
              <span className="bg-accent inline-flex rounded-full px-4 py-2 text-[10px] font-black tracking-[0.14em] text-white uppercase">
                Gautam Raj profile
              </span>

              <h2 className="mt-6 max-w-xl text-[clamp(2.7rem,5.8vw,5.8rem)] leading-[0.84] font-black tracking-[-0.065em]">
                Generate a site from one clean source.
              </h2>

              <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
                {["Projects", "SEO title", "Subdomain"].map((item, index) => (
                  <div
                    className="rounded-2xl border border-[#11110f]/15 bg-white/72 p-4 text-left shadow-[6px_7px_0_rgba(17,17,15,0.08)]"
                    key={item}
                  >
                    <span className="text-accent text-[10px] font-black" aria-hidden="true">
                      0{index + 1}
                    </span>

                    <b className="mt-8 block text-sm tracking-[-0.04em]">{item}</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-accent relative min-h-82.5 overflow-hidden rounded-[2.2rem] border-2 border-[#11110f] p-5 text-white shadow-[12px_14px_0_rgba(17,17,15,0.16)] max-lg:hidden">
              <div
                className="absolute -right-15 -bottom-17.5 size-64 rounded-full bg-white/18"
                aria-hidden="true"
              />

              <div className="relative z-2 rounded-3xl bg-white p-5 text-[#11110f]">
                <div className="flex items-center justify-between text-[10px] font-black uppercase">
                  <span>VeriWorkly</span>
                  <span>Signal</span>
                </div>

                <h3 className="mt-10 text-5xl leading-[0.88] font-black tracking-[-0.08em]">
                  You build proof, clarity, and systems.
                </h3>

                <p className="mt-5 max-w-sm text-xs leading-6 text-[#11110f]/60">
                  One update moves through projects, services, links, metadata, and every template.
                </p>
              </div>

              <div className="relative z-2 mt-4 grid grid-cols-2 gap-3">
                <span className="rounded-2xl bg-[#11110f] p-4 text-xs font-black">
                  gautam.veriworkly.com
                </span>

                <span className="rounded-2xl bg-white/15 p-4 text-xs font-black">
                  Meta preview ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        data-parallax="0.08"
        className="absolute top-[26%] left-[-8%] flex items-center gap-2.5 rounded-2xl border-2 border-[#11110f] bg-white px-3.5 py-3 text-[10px] shadow-[7px_7px_0_#11110f] max-lg:hidden"
      >
        <WandSparkles size={17} />

        <span>
          <b className="block text-[11px]">Template changed</b>Content stayed in place
        </span>
      </div>

      <div
        data-parallax="-0.07"
        className="absolute right-[-7%] bottom-[25%] z-10 flex items-center gap-2.5 rounded-2xl border-2 border-[#11110f] bg-white px-3.5 py-3 text-[10px] shadow-[7px_7px_0_#11110f] max-lg:hidden"
      >
        <span className="size-1.75 rounded-full bg-[#50d672] shadow-[0_0_0_4px_rgba(80,214,114,0.18)]" />
        <span>
          <b className="block text-[11px]">Published</b>gautam.veriworkly.com
        </span>
      </div>
    </div>
  );
};

export default HeroPortfolio;
