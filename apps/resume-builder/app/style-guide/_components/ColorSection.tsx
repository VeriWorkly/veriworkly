import { Palette } from "lucide-react";

import { ColorCard } from "./ColorCard";
import { SectionHeader } from "./SectionHeader";

const COLORS = [
  {
    hex: "#F5F4EF",
    name: "Background",
    variable: "--background",
    description: "Primary page background",
  },
  {
    hex: "#171717",
    name: "Foreground",
    variable: "--foreground",
    description: "Main text color",
  },
  {
    hex: "#2563EB",
    name: "Accent (Blue)",
    variable: "--accent",
    description: "Primary action color",
  },
  {
    name: "Card",
    hex: "#FFFFFF",
    variable: "--card",
    description: "Component surfaces",
  },
  {
    name: "Muted",
    hex: "#5F5C54",
    variable: "--muted",
    description: "Secondary text and details",
  },
  {
    name: "Border",
    variable: "--border",
    hex: "rgba(23, 23, 23, 0.12)",
    description: "Subtle dividers",
  },
  {
    name: "Destructive",
    hex: "#DC2626",
    variable: "--destructive",
    description: "Error and danger states",
  },
  {
    name: "Accent FG",
    hex: "#F8FBFF",
    variable: "--accent-foreground",
    description: "Text on accent background",
  },
];

export const ColorSection = () => {
  return (
    <section id="colors" className="space-y-8 scroll-mt-24">
      <SectionHeader icon={Palette} title="Colors" />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {COLORS.map((color) => (
          <ColorCard key={color.variable} {...color} />
        ))}
      </div>
    </section>
  );
};
