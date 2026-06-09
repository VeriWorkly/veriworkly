import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const Navigation = () => {
  return (
    <nav className="fixed top-4.5 left-1/2 z-90 flex min-h-15.5 w-[min(1160px,calc(100%-32px))] -translate-x-1/2 items-center justify-between gap-5 rounded-full border border-[#11110f]/12 bg-[#f7f5ee]/80 py-2 pr-2.5 pl-4 shadow-[0_14px_45px_rgba(17,17,15,0.08)] backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-2.5 text-sm font-black tracking-[-.04em]">
        <Image src="/veriworkly-logo.png" width={28} height={28} alt="VeriWorkly Logo" priority />
        VeriWorkly
      </Link>

      <div className="hidden items-center gap-7 text-xs font-black md:flex">
        <Link href="/templates">Templates</Link>
        <Link href="/pricing">Pricing</Link>
      </div>

      <Link
        href="/dashboard"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#11110f] px-6 text-sm font-black text-white transition duration-300 hover:-translate-y-1"
      >
        Start building <ArrowRight size={15} />
      </Link>
    </nav>
  );
};

export default Navigation;
