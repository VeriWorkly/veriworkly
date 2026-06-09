import Link from "next/link";
import { ArrowRight } from "lucide-react";

const action =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black transition duration-300 hover:-translate-y-1";

const CtaSection = () => {
  return (
    <section className="pb-24 md:pb-36">
      <div className="mx-auto w-[min(1360px,calc(100%-48px))] max-sm:w-[min(calc(100%-30px),1360px)]">
        <div
          data-reveal
          className="relative grid min-h-170 place-content-center overflow-hidden rounded-[28px] bg-[#11110f] px-8 py-16 text-center text-white"
        >
          <div
            aria-hidden="true"
            data-parallax="-0.05"
            data-parallax-base="translate(-50%, -50%)"
            className="bg-accent absolute top-1/2 left-1/2 h-[42vw] w-[42vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[100px]"
          />

          <p className="relative z-2 mb-5 text-[0.72rem] font-black tracking-[0.16em] text-[#93c5fd] uppercase">
            You already did the work.
          </p>

          <h2 className="relative z-2 mx-auto max-w-5xl text-[clamp(4rem,9vw,9rem)] leading-[0.9] tracking-[-0.06em] wrap-normal">
            Now make it impossible to overlook.
          </h2>

          <p className="relative z-2 mx-auto mt-6 max-w-lg text-sm leading-7 text-white/58">
            Start with a private draft. Publish when the story, metadata, and template feel
            unmistakably VeriWorkly.
          </p>

          <div className="relative z-2 mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className={`${action} bg-accent text-white`}>
              Create my portfolio <ArrowRight size={16} />
            </Link>

            <Link
              href="/pricing"
              className={`${action} border border-white/25 bg-white/10 text-white`}
            >
              View pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
