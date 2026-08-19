import type { ResumeLanguage } from "@/types/resume";

/**
 * The language proficiency levels, as the enum the schema stores plus the label shown.
 *
 * This used to be a bare list of display strings ("Beginner", "Intermediate", "Advanced")
 * written straight into the item — a third vocabulary alongside the master profile's and
 * the schema's, with nothing mapping between them. `unflattenLegacySections` translates the
 * old values on read; nothing writes them any more.
 */
export const fluencyOptions: Array<{ value: ResumeLanguage["fluency"]; label: string }> = [
  { value: "elementary", label: "Elementary" },
  { value: "limited", label: "Limited working" },
  { value: "professional", label: "Professional working" },
  { value: "fluent", label: "Fluent" },
  { value: "native", label: "Native" },
];
