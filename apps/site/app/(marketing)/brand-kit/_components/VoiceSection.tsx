import { MessageSquareText } from "lucide-react";

import { Card } from "@veriworkly/ui";
import { pressFacts } from "@/config/brand";

import BrandSectionHeader from "./BrandSectionHeader";

const VOICE_PRINCIPLES = [
  {
    title: "Direct, not hypey",
    description:
      'Lead with what the product does, not adjectives. "No login required to start" beats "revolutionary, game-changing career platform."',
  },
  {
    title: "Privacy-forward",
    description:
      "Be specific about what stays local, what syncs, and why - vague privacy claims read as marketing, specifics read as true.",
  },
  {
    title: "Built by the same people who use it",
    description:
      "Written by people who build resumes, not a brand team. Plain language over jargon; explain ATS, JSON Resume, etc. on first use.",
  },
  {
    title: "Confident about being free and open",
    description:
      '"Free-to-use and open-core" is a real differentiator, not an apology - state it plainly rather than hedging.',
  },
];

const VoiceSection = () => {
  return (
    <section id="voice" className="scroll-mt-24 space-y-8">
      <BrandSectionHeader
        icon={MessageSquareText}
        title="Voice & Tone"
        description="How we write about VeriWorkly, and what we ask partners and press to keep in mind."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {VOICE_PRINCIPLES.map((principle) => (
          <Card key={principle.title} className="space-y-2 p-6">
            <p className="text-foreground font-semibold">{principle.title}</p>
            <p className="text-muted text-sm leading-relaxed">{principle.description}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-3 p-8">
        <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
          Naming Reference
        </p>

        <ul className="text-muted space-y-2 text-sm leading-relaxed">
          <li>
            <span className="text-foreground font-semibold">VeriWorkly</span> - the company and
            product name. One word, capital V and W, no space and no suffix.
            <span className="mt-2 flex flex-wrap gap-1.5">
              {pressFacts.misspellings.map((wrong) => (
                <span
                  key={wrong}
                  className="text-destructive border-destructive/25 bg-destructive/5 rounded-full border px-2.5 py-0.5 font-mono text-xs line-through"
                >
                  {wrong}
                </span>
              ))}
            </span>
          </li>
          <li>
            <span className="text-foreground font-semibold">VeriWorkly Resume</span> - used only
            when disambiguating from other VeriWorkly products (e.g. in the GitHub repo name).
          </li>
          <li>
            <span className="text-foreground font-semibold">Master Profile</span> - the canonical
            career-facts record that seeds resumes, cover letters, and portfolios. Capitalized as a
            product term.
          </li>
        </ul>
      </Card>
    </section>
  );
};

export default VoiceSection;
