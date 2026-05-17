import Link from "next/link";
import Image from "next/image";

interface MarketingNavLogoProps {
  logoSrc: string;
  homeHref: string;
  shortName: string;
}

export const MarketingNavLogo = ({ homeHref, shortName, logoSrc }: MarketingNavLogoProps) => {
  return (
    <Link href={homeHref} className="group flex items-center gap-3 transition-all active:scale-95">
      <div className="relative h-10 w-10 shrink-0">
        <Image
          priority
          width={40}
          height={40}
          src={logoSrc}
          alt="VeriWorkly Logo"
          className="h-full w-full object-contain"
        />
      </div>

      <span className="font-mono text-2xl font-semibold tracking-tight">{shortName}</span>
    </Link>
  );
};
