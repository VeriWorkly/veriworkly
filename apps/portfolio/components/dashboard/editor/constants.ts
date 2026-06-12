import { type PortfolioSectionType } from "@/lib/portfolio";

export const inputClass =
  "w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-sm outline-none transition hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent-soft text-ink";

export const actionClass =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-extrabold whitespace-nowrap transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-45";

export const sectionInfo: Record<PortfolioSectionType, { label: string; detail: string }> = {
  projects: { label: "Projects", detail: "Case studies and shipped work" },
  experience: { label: "Experience", detail: "Roles, teams, and outcomes" },
  services: { label: "Services", detail: "Ways people can work with you" },
  skills: { label: "Skills", detail: "Capabilities and tools" },
  education: { label: "Education", detail: "Degrees and training" },
  writing: { label: "Writing", detail: "Articles and talks" },
  testimonials: { label: "Testimonials", detail: "Words from collaborators" },
  awards: { label: "Awards", detail: "Recognition and milestones" },
  contact: { label: "Contact", detail: "Your closing invitation" },
};
