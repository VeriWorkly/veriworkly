import Link from "next/link";
import { Palette } from "lucide-react";

import { TokenSwatch } from "@/components/brand/TokenSwatch";
import { coreBrandColors } from "@/config/brand";

import BrandSectionHeader from "./BrandSectionHeader";

const ColorSection = () => {
  return (
    <section id="colors" className="scroll-mt-24 space-y-8">
      <BrandSectionHeader
        icon={Palette}
        title="Colors"
        description="Every colour ships in two values - one for light mode, one for dark. Each swatch shows both, composited over the background it belongs to. Copy either value directly."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {coreBrandColors.map((token) => (
          <TokenSwatch key={token.variable} {...token} />
        ))}
      </div>

      <p className="text-muted text-sm leading-relaxed">
        These are the colours you will reach for when writing or designing about VeriWorkly.
        Semantic status colours and the remaining internal tokens are documented on the{" "}
        <Link href="/style-guide#colors" className="text-accent font-semibold hover:underline">
          full design system page
        </Link>
        .
      </p>
    </section>
  );
};

export default ColorSection;
