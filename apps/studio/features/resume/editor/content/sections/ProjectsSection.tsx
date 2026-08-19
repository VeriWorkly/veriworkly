"use client";

import { useMemo } from "react";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { validateProject } from "@/features/resume/utils/validation";
import { AiFieldAssist } from "@/features/ai/AiFieldAssist";

import {
  Field,
  CheckboxField,
  TextAreaField,
  TextInputField,
  DelimitedTextArea,
} from "@/features/documents/editor/form";
import SectionAccordion from "@/features/documents/editor/SectionAccordion";
import { ListEditorControls } from "@/features/documents/editor/ListEditorControls";
import { useIndexedListEditor } from "@/features/documents/editor/useIndexedListEditor";
import type { BaseSectionProps } from "./section-types";
import type { ResumeSectionId } from "@/types/resume";

const ProjectsSection = ({ isOpen, onToggle }: BaseSectionProps) => {
  const projects = useResumeStore((state) => state.resume.projects);
  const resumeId = useResumeStore((state) => state.resume.id);
  const addProject = useResumeStore((state) => state.addProject);
  const removeProject = useResumeStore((state) => state.removeProject);
  const updateProject = useResumeStore((state) => state.updateProject);

  const list = useIndexedListEditor(projects, addProject);
  const activeProject = list.activeItem;

  const projectErrors = useMemo(
    () => (activeProject ? validateProject(activeProject) : {}),
    [activeProject],
  );

  return (
    <SectionAccordion
      id="projects"
      isOpen={isOpen}
      label="Projects"
      onToggle={(nextId) => onToggle(nextId as ResumeSectionId)}
    >
      <ListEditorControls
        items={projects}
        index={list.index}
        onAdd={list.add}
        onSelect={list.select}
        onRemove={removeProject}
        labelFor={(item, index) => item.name || `Project ${index + 1}`}
      />

      {activeProject ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInputField
              label="Project name"
              value={activeProject.name}
              error={projectErrors.name}
              onValueChange={(name) => updateProject(list.index, { name })}
            />

            <TextInputField
              label="Role"
              value={activeProject.role}
              error={projectErrors.role}
              onValueChange={(role) => updateProject(list.index, { role })}
            />

            <TextInputField
              type="url"
              label="Link"
              placeholder="https://..."
              value={activeProject.link}
              error={projectErrors.link}
              onValueChange={(link) => updateProject(list.index, { link })}
            />

            <TextInputField
              label="Link text"
              placeholder="Link"
              disabled={!(activeProject.showLinkAsText ?? true)}
              value={activeProject.linkLabel || "Link"}
              onValueChange={(linkLabel) => updateProject(list.index, { linkLabel })}
            />
          </div>

          <div className="mt-4 space-y-4">
            <CheckboxField
              checked={activeProject.showLinkAsText ?? true}
              onCheckedChange={(showLinkAsText) =>
                updateProject(list.index, {
                  showLinkAsText,
                  linkLabel: activeProject.linkLabel || "Link",
                })
              }
            >
              Hide project URL behind text
            </CheckboxField>

            {/* Children-based `Field`: DelimitedTextArea holds a local draft string and so
                cannot take the value/onChange contract the `*Field` wrappers impose. */}
            <Field label="Skills (comma separated)">
              <DelimitedTextArea
                key={`${activeProject.id}-skills`}
                onChange={(skills) => updateProject(list.index, { skills })}
                value={activeProject.skills ?? []}
              />
            </Field>

            <TextAreaField
              label="Summary"
              value={activeProject.summary}
              error={projectErrors.summary}
              onValueChange={(summary) => updateProject(list.index, { summary })}
            />

            <AiFieldAssist
              action={activeProject.summary ? "rewrite_section" : "generate_section"}
              context={JSON.stringify({
                name: activeProject.name,
                role: activeProject.role,
                skills: activeProject.skills,
                highlights: activeProject.highlights,
              })}
              documentId={resumeId}
              onApply={(summary) => updateProject(list.index, { summary })}
              text={activeProject.summary}
            />

            <Field label="Highlights (comma separated)">
              <DelimitedTextArea
                key={activeProject.id}
                onChange={(highlights) => updateProject(list.index, { highlights })}
                value={activeProject.highlights}
              />
            </Field>
          </div>
        </>
      ) : (
        <p className="text-muted text-sm">No projects yet. Click Add to create one.</p>
      )}
    </SectionAccordion>
  );
};

export default ProjectsSection;
