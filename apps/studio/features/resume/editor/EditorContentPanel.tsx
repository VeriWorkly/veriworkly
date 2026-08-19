"use client";

import { memo, useCallback, useMemo, useState } from "react";

import type { ResumeSection, ResumeSectionId } from "@/types/resume";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { getResumeSectionKey } from "@/features/documents/rendering/resume-rendering";

import LinksSection from "./content/sections/LinksSection";
import AwardsSection from "./content/sections/AwardsSection";
import BasicsSection from "./content/sections/BasicsSection";
import CustomSection from "./content/sections/CustomSection";
import SkillsSection from "./content/sections/SkillsSection";
import SummarySection from "./content/sections/SummarySection";
import ProjectsSection from "./content/sections/ProjectsSection";
import LanguagesSection from "./content/sections/LanguagesSection";
import InterestsSection from "./content/sections/InterestsSection";
import VolunteerSection from "./content/sections/VolunteerSection";
import EducationSection from "./content/sections/EducationSection";
import ReferencesSection from "./content/sections/ReferencesSection";
import ExperienceSection from "./content/sections/ExperienceSection";
import AchievementsSection from "./content/sections/AchievementsSection";
import PublicationsSection from "./content/sections/PublicationsSection";
import CertificationsSection from "./content/sections/CertificationsSection";

const EditorContentPanel = memo(function EditorContentPanel() {
  const sections = useResumeStore((state) => state.resume.sections);

  /*
   * Tracked by section KEY, not section id: every custom section reports the id "custom",
   * so an id-keyed accordion would open all of them together.
   */
  const [openSectionKey, setOpenSectionKey] = useState<string | null>("basics");

  const sortedSections = useMemo(
    () => sections.slice().sort((left, right) => left.order - right.order),
    [sections],
  );

  const lastCustomKey = useMemo(() => {
    const customSections = sortedSections.filter((section) => section.id === "custom");
    const last = customSections[customSections.length - 1];

    return last ? getResumeSectionKey(last) : null;
  }, [sortedSections]);

  const handleToggleSection = useCallback((sectionKey: string) => {
    setOpenSectionKey((currentKey) => (currentKey === sectionKey ? null : sectionKey));
  }, []);

  return (
    <div>
      <div className="border-border/70 border-b p-3">
        <h2 className="text-foreground text-base font-semibold">Content editor</h2>
        <p className="text-muted text-sm">Edit resume sections. Reorder them in visibility.</p>
      </div>

      <div>
        {sortedSections.map((section) => {
          const key = getResumeSectionKey(section);

          return (
            <EditorSectionItem
              key={key}
              section={section}
              isLastCustom={key === lastCustomKey}
              isOpen={openSectionKey === key}
              onToggle={handleToggleSection}
            />
          );
        })}
      </div>
    </div>
  );
});

interface EditorSectionItemProps {
  section: ResumeSection;
  isLastCustom: boolean;
  isOpen: boolean;
  onToggle: (sectionKey: string) => void;
}

const EditorSectionItem = memo(function EditorSectionItem({
  section,
  isLastCustom,
  isOpen,
  onToggle,
}: EditorSectionItemProps) {
  const sectionProps = {
    isOpen,
    // The accordion children report their own id, which for a custom section is already its
    // key; for the rest, the id and the key are the same string.
    onToggle: onToggle as (sectionId: ResumeSectionId | string) => void,
  };

  if (section.id === "custom") {
    // Missing `customSectionId` means the entry predates the field. `normalizeResumeData`
    // assigns one on read, so this only guards a store mutated by hand.
    if (!section.customSectionId) return null;

    return (
      <CustomSection
        {...sectionProps}
        customSectionId={section.customSectionId}
        isLast={isLastCustom}
      />
    );
  }

  if (section.id === "basics") return <BasicsSection {...sectionProps} />;
  if (section.id === "links") return <LinksSection {...sectionProps} />;
  if (section.id === "summary") return <SummarySection {...sectionProps} />;
  if (section.id === "experience") return <ExperienceSection {...sectionProps} />;
  if (section.id === "education") return <EducationSection {...sectionProps} />;
  if (section.id === "projects") return <ProjectsSection {...sectionProps} />;
  if (section.id === "skills") return <SkillsSection {...sectionProps} />;
  if (section.id === "certifications") return <CertificationsSection {...sectionProps} />;
  if (section.id === "awards") return <AwardsSection {...sectionProps} />;
  if (section.id === "publications") return <PublicationsSection {...sectionProps} />;
  if (section.id === "languages") return <LanguagesSection {...sectionProps} />;
  if (section.id === "interests") return <InterestsSection {...sectionProps} />;
  if (section.id === "volunteer") return <VolunteerSection {...sectionProps} />;
  if (section.id === "references") return <ReferencesSection {...sectionProps} />;
  if (section.id === "achievements") return <AchievementsSection {...sectionProps} />;

  return null;
});

export default EditorContentPanel;
