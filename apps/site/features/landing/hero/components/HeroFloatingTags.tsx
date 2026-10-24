import type { CSSProperties } from "react";
import { Briefcase, FileText, Globe, Sparkles } from "lucide-react";

/**
 * Drifting tags beside the hero, desktop only. A CSS animation (`.hero-float` in globals.css)
 * stops while the element is display:none, so nothing ticks on mobile; the framer loops these
 * replaced ran on the main thread on every screen size (W-035).
 */
const TAGS = [
  {
    icon: FileText,
    label: "Resume AI",
    place: "top-[10%] left-[5%]",
    drift: -10,
    seconds: 4,
    delay: 0,
  },
  {
    icon: Briefcase,
    label: "Cover Letter",
    place: "top-[15%] right-[5%]",
    drift: 10,
    seconds: 5,
    delay: 1,
  },
  {
    icon: Globe,
    label: "Portfolio Builder",
    place: "top-[45%] left-[12%]",
    drift: -8,
    seconds: 4.5,
    delay: 0.5,
  },
  {
    icon: Sparkles,
    label: "AI CV",
    place: "top-[48%] right-[10%]",
    drift: 8,
    seconds: 4.2,
    delay: 1.5,
  },
];

export const HeroFloatingTags = () => (
  <>
    {TAGS.map(({ icon: Icon, label, place, drift, seconds, delay }) => (
      <div
        key={label}
        aria-hidden="true"
        style={
          {
            "--drift": `${drift}px`,
            animationDuration: `${seconds}s`,
            animationDelay: `${delay}s`,
          } as CSSProperties
        }
        className={`hero-float pointer-events-none absolute ${place} hidden items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-2 text-sm text-blue-600 backdrop-blur-md lg:flex dark:text-blue-400`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span>{label}</span>
      </div>
    ))}
  </>
);

export default HeroFloatingTags;
