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
import { useIndexedListEditor } from "@/features/documents/editor/useIndexedListEditor";
import type { BaseSectionProps } from "./section-types";

import ListSection from "./ListSection";

const ProjectsSection = ({ isOpen, onToggle }: BaseSectionProps) => {
  const projects = useResumeStore((state) => state.resume.projects);
  const resumeId = useResumeStore((state) => state.resume.id);
  const addProject = useResumeStore((state) => state.addProject);
  const removeProject = useResumeStore((state) => state.removeProject);
  const reorderProjects = useResumeStore((state) => state.reorderProjects);
  const updateProject = useResumeStore((state) => state.updateProject);

  const list = useIndexedListEditor(projects, addProject);

  const projectErrors = useMemo(
    () => (list.activeItem ? validateProject(list.activeItem) : {}),
    [list.activeItem],
  );

  return (
    <ListSection
      id="projects"
      label="Projects"
      isOpen={isOpen}
      onToggle={onToggle}
      list={list}
      items={projects}
      onRemove={removeProject}
      onMove={reorderProjects}
      labelFor={(item, index) => item.name || `Project ${index + 1}`}
      emptyMessage="No projects yet. Click Add to create one."
    >
      {(activeProject) => (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInputField
              label="Project name"
              value={activeProject.name}
              onValueChange={(name) => updateProject(list.index, { name })}
            />

            <TextInputField
              label="Role"
              value={activeProject.role}
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
              placeholder="Leave empty to show the address"
              disabled={!(activeProject.showLinkAsText ?? true)}
              value={activeProject.linkLabel}
              onValueChange={(linkLabel) => updateProject(list.index, { linkLabel })}
            />
          </div>

          <div className="mt-4 space-y-4">
            <CheckboxField
              checked={activeProject.showLinkAsText ?? true}
              onCheckedChange={(showLinkAsText) => updateProject(list.index, { showLinkAsText })}
            >
              Hide project URL behind text
            </CheckboxField>

            {/* Children-based `Field`: DelimitedTextArea holds a local draft string and so
              cannot take the value/onChange contract the `*Field` wrappers impose. */}
            <Field label="Skills (comma separated)">
              <DelimitedTextArea
                delimiter="comma"
                key={`${activeProject.id}-skills`}
                onChange={(skills) => updateProject(list.index, { skills })}
                value={activeProject.skills ?? []}
              />
            </Field>

            <TextAreaField
              label="Summary"
              value={activeProject.summary}
              onValueChange={(summary) => updateProject(list.index, { summary })}
            />

            <AiFieldAssist
              key={activeProject.id}
              action={activeProject.summary ? "rewrite_section" : "generate_section"}
              getContext={() =>
                JSON.stringify({
                  name: activeProject.name,
                  role: activeProject.role,
                  skills: activeProject.skills,
                  highlights: activeProject.highlights,
                })
              }
              documentId={resumeId}
              onApply={(summary) => updateProject(list.index, { summary })}
              text={activeProject.summary}
            />

            <Field label="Highlights (one per line)">
              <DelimitedTextArea
                delimiter="newline"
                key={activeProject.id}
                onChange={(highlights) => updateProject(list.index, { highlights })}
                value={activeProject.highlights}
              />
            </Field>
          </div>
        </>
      )}
    </ListSection>
  );
};

export default ProjectsSection;
