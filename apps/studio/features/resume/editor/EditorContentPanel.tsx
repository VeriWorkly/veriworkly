"use client";

import type { DragEvent } from "react";

import { memo, useCallback, useMemo, useRef, useState } from "react";

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

const EditorContentPanel = () => {
  const sections = useResumeStore((state) => state.resume.sections);
  const reorderSections = useResumeStore((state) => state.reorderSections);

  const draggedSectionIdRef = useRef<ResumeSectionId | null>(null);
  const [openSectionId, setOpenSectionId] = useState<ResumeSectionId | null>("basics");

  const sortedSections = useMemo(
    () => sections.slice().sort((left, right) => left.order - right.order),
    [sections],
  );

  const handleToggleSection = useCallback((sectionId: ResumeSectionId) => {
    setOpenSectionId((currentSectionId) => (currentSectionId === sectionId ? null : sectionId));
  }, []);

  const handleDragStart = useCallback((sectionId: ResumeSectionId) => {
    draggedSectionIdRef.current = sectionId;
  }, []);

  const handleDrop = useCallback(
    (sectionId: ResumeSectionId, sectionIndex: number) => {
      const draggedSectionId = draggedSectionIdRef.current;

      if (draggedSectionId && draggedSectionId !== sectionId) {
        const draggedIndex = sections.findIndex((item) => item.id === draggedSectionId);

        if (draggedIndex !== -1) {
          reorderSections(draggedIndex, sectionIndex);
        }
      }

      draggedSectionIdRef.current = null;
    },
    [reorderSections, sections],
  );

  const handleDragEnd = useCallback(() => {
    draggedSectionIdRef.current = null;
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-muted text-xs font-semibold tracking-[0.22em] uppercase">
          Resume Content
        </p>

        <h2 className="text-foreground text-xl font-semibold">Content editor</h2>
      </div>

      <div className="space-y-3">
        {sortedSections.map((section, sectionIndex) => (
          <EditorSectionItem
            key={section.id}
            id={section.id}
            index={sectionIndex}
            isOpen={openSectionId === section.id}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onToggle={handleToggleSection}
          />
        ))}
      </div>
    </div>
  );
};

interface EditorSectionItemProps {
  id: ResumeSectionId;
  index: number;
  isOpen: boolean;
  onDragEnd: () => void;
  onDragStart: (sectionId: ResumeSectionId) => void;
  onDrop: (sectionId: ResumeSectionId, sectionIndex: number) => void;
  onToggle: (sectionId: ResumeSectionId) => void;
}

const EditorSectionItem = memo(function EditorSectionItem({
  id,
  index,
  isOpen,
  onDragEnd,
  onDragStart,
  onDrop,
  onToggle,
}: EditorSectionItemProps) {
  const handleDragStart = useCallback(
    (event: DragEvent<HTMLSpanElement>) => {
      onDragStart(id);

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
    },
    [id, onDragStart],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      onDrop(id, index);
    },
    [id, index, onDrop],
  );

  const sectionProps = {
    isOpen,
    onDragEnd,
    onDragOver: handleDragOver,
    onDragStart: handleDragStart,
    onDrop: handleDrop,
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
