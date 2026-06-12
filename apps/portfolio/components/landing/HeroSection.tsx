import Link from "next/link";
import { ArrowRight, ArrowDownRight } from "lucide-react";
import HeroPortfolio from "./HeroPortfolio";

const action =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black transition duration-300 hover:-translate-y-1";
const eyebrow = "mb-5 text-[0.72rem] font-black uppercase tracking-[0.16em]";

const HeroSection = () => {
  return (
    <section
      data-spotlight
      className="relative flex min-h-svh flex-col items-center overflow-hidden bg-[radial-gradient(circle_at_var(--pointer-x,78%)_var(--pointer-y,18%),rgba(37,99,235,0.24),transparent_31%),radial-gradient(circle_at_10%_70%,rgba(255,255,255,0.82),transparent_28%),#f1efe7] px-6 pt-44 pb-20 max-sm:px-4"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#11110f_0.7px,transparent_0.7px)] mask-[linear-gradient(to_bottom,black,transparent_75%)] bg-size-[7px_7px] opacity-[0.18]" />
      <div className="absolute top-[-30vw] left-[-15vw] h-[54vw] w-[54vw] rounded-full border border-[#11110f]/10" />
      <div className="absolute top-[15vw] right-[-33vw] h-[45vw] w-[45vw] rounded-full border border-[#11110f]/10" />

      <div className="relative z-2 mb-14 w-[min(1220px,100%)] text-center" data-reveal>
        <p className={eyebrow}>Portfolio builder by VeriWorkly</p>

        <h1 className="mx-auto max-w-6xl text-[clamp(3.6rem,8vw,8.2rem)] leading-[0.9] tracking-[-0.06em] wrap-normal">
          One form. A portfolio that feels{" "}
          <span className="bg-accent relative inline-block h-[clamp(2.5rem,5.8vw,5.5rem)] w-[clamp(5.5rem,10vw,9rem)] rotate-[-4deg] overflow-hidden rounded-full border-3 border-[#11110f] align-[0.05em] max-sm:hidden">
            <span className="absolute inset-[18%_12%] rotate-12 border-y-[3px] border-[#f8fbff]" />
          </span>{" "}
          unmistakably yours.
        </h1>

        <p className="mx-auto mt-10 max-w-2xl text-base text-[clamp(1rem,1.5vw,1.2rem)] leading-8 text-[#11110f]/62">
          Turn scattered work into a sharp portfolio in minutes. Update once, switch templates
          freely, publish on a subdomain, and control how your site appears in search and social.
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className={`${action} bg-accent text-white shadow-[0_5px_0_#11110f]`}
          >
            Build my portfolio <ArrowRight size={16} />
          </Link>

          <Link
            href="/templates"
            className={`${action} border border-[#11110f]/20 bg-white/65 text-[#11110f]`}
          >
            Check live templates <ArrowDownRight size={16} />
          </Link>
        </div>
      </div>

      <HeroPortfolio />
    </section>
  );
};

export default HeroSection;
