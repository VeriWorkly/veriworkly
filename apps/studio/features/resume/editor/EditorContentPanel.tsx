"use client";

import { memo, useCallback, useMemo, useState } from "react";

import type { ResumeSectionId } from "@/types/resume";

import { useResumeStore } from "@/features/resume/store/resume-store";

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

  const [openSectionId, setOpenSectionId] = useState<ResumeSectionId | null>("basics");

  const sortedSections = useMemo(
    () => sections.slice().sort((left, right) => left.order - right.order),
    [sections],
  );

  const handleToggleSection = useCallback((sectionId: ResumeSectionId) => {
    setOpenSectionId((currentSectionId) => (currentSectionId === sectionId ? null : sectionId));
  }, []);

  return (
    <div>
      <div className="border-border/70 border-b p-3">
        <h2 className="text-foreground text-base font-semibold">Content editor</h2>
        <p className="text-muted text-sm">Edit resume sections. Reorder them in visibility.</p>
      </div>

      <div>
        {sortedSections.map((section) => (
          <EditorSectionItem
            key={section.id}
            id={section.id}
            isOpen={openSectionId === section.id}
            onToggle={handleToggleSection}
          />
        ))}
      </div>
    </div>
  );
});

interface EditorSectionItemProps {
  id: ResumeSectionId;
  isOpen: boolean;
  onToggle: (sectionId: ResumeSectionId) => void;
}

const EditorSectionItem = memo(function EditorSectionItem({
  id,
  isOpen,
  onToggle,
}: EditorSectionItemProps) {
  const sectionProps = {
    isOpen,
    onDragEnd: () => undefined,
    onDragOver: () => undefined,
    onDragStart: () => undefined,
    onDrop: () => undefined,
    onToggle,
  };

  if (id === "basics") return <BasicsSection {...sectionProps} />;
  if (id === "links") return <LinksSection {...sectionProps} />;
  if (id === "summary") return <SummarySection {...sectionProps} />;
  if (id === "experience") return <ExperienceSection {...sectionProps} />;
  if (id === "education") return <EducationSection {...sectionProps} />;
  if (id === "projects") return <ProjectsSection {...sectionProps} />;
  if (id === "skills") return <SkillsSection {...sectionProps} />;
  if (id === "certifications") return <CertificationsSection {...sectionProps} />;
  if (id === "awards") return <AwardsSection {...sectionProps} />;
  if (id === "publications") return <PublicationsSection {...sectionProps} />;
  if (id === "languages") return <LanguagesSection {...sectionProps} />;
  if (id === "interests") return <InterestsSection {...sectionProps} />;
  if (id === "volunteer") return <VolunteerSection {...sectionProps} />;
  if (id === "references") return <ReferencesSection {...sectionProps} />;
  if (id === "achievements") return <AchievementsSection {...sectionProps} />;
  if (id === "custom") return <CustomSection {...sectionProps} />;

  return null;
});

export default EditorContentPanel;
