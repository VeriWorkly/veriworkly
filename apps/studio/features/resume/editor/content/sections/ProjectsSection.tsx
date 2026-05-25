"use client";

import { useMemo, useState } from "react";

import { Button } from "@veriworkly/ui";
import { Input } from "@veriworkly/ui";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { validateProject } from "@/features/resume/utils/validation";

import { Field, TextArea, invalidClass, DelimitedTextArea } from "../EditorFormPrimitives";
import DraggableSection from "./DraggableSection";
import type { BaseSectionProps } from "./section-types";

const ProjectsSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const projects = useResumeStore((state) => state.resume.projects);
  const addProject = useResumeStore((state) => state.addProject);
  const removeProject = useResumeStore((state) => state.removeProject);
  const updateProject = useResumeStore((state) => state.updateProject);

  const [projectIndex, setProjectIndex] = useState(0);

  const safeProjectIndex = Math.min(projectIndex, Math.max(0, projects.length - 1));

  const activeProject = projects[safeProjectIndex];

  const projectErrors = useMemo(
    () => (activeProject ? validateProject(activeProject) : {}),
    [activeProject],
  );

  return (
    <DraggableSection
      id="projects"
      isOpen={isOpen}
      onDrop={onDrop}
      label="Projects"
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {projects.length ? (
          <select
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setProjectIndex(Number(event.target.value))}
            value={safeProjectIndex}
          >
            {projects.map((_, index) => (
              <option key={index} value={index}>
                Project {index + 1}
              </option>
            ))}
          </select>
        ) : null}

        <Button onClick={addProject} size="sm" variant="secondary">
          Add
        </Button>

        <Button
          disabled={projects.length === 0}
          onClick={() => removeProject(safeProjectIndex)}
          size="sm"
          variant="ghost"
        >
          Remove
        </Button>
      </div>

      {activeProject ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field error={projectErrors.name} label="Project name">
              <Input
                className={invalidClass(projectErrors.name)}
                onChange={(event) =>
                  updateProject(safeProjectIndex, {
                    name: event.target.value,
                  })
                }
                value={activeProject.name}
              />
            </Field>

            <Field error={projectErrors.role} label="Role">
              <Input
                className={invalidClass(projectErrors.role)}
                onChange={(event) =>
                  updateProject(safeProjectIndex, {
                    role: event.target.value,
                  })
                }
                value={activeProject.role}
              />
            </Field>

            <Field error={projectErrors.link} label="Link">
              <Input
                className={invalidClass(projectErrors.link)}
                onChange={(event) =>
                  updateProject(safeProjectIndex, {
                    link: event.target.value,
                  })
                }
                type="url"
                placeholder="https://..."
                value={activeProject.link}
              />
            </Field>

            <Field label="Link text">
              <Input
                disabled={!(activeProject.showLinkAsText ?? true)}
                onChange={(event) =>
                  updateProject(safeProjectIndex, {
                    linkLabel: event.target.value,
                  })
                }
                placeholder="Link"
                value={activeProject.linkLabel || "Link"}
              />
            </Field>
          </div>

          <div className="mt-4 space-y-4">
            <label className="text-muted flex items-center gap-2 text-sm">
              <input
                checked={activeProject.showLinkAsText ?? true}
                onChange={(event) =>
                  updateProject(safeProjectIndex, {
                    showLinkAsText: event.target.checked,
                    linkLabel: activeProject.linkLabel || "Link",
                  })
                }
                type="checkbox"
              />
              Hide project URL behind text
            </label>

            <Field label="Skills (comma separated)">
              <DelimitedTextArea
                key={`${activeProject.id}-skills`}
                onChange={(nextSkills) =>
                  updateProject(safeProjectIndex, {
                    skills: nextSkills,
                  })
                }
                value={activeProject.skills ?? []}
              />
            </Field>

            <Field error={projectErrors.summary} label="Summary">
              <TextArea
                className={invalidClass(projectErrors.summary)}
                onChange={(event) =>
                  updateProject(safeProjectIndex, {
                    summary: event.target.value,
                  })
                }
                value={activeProject.summary}
              />
            </Field>

            <Field label="Highlights (comma separated)">
              <DelimitedTextArea
                key={activeProject.id}
                onChange={(nextHighlights) =>
                  updateProject(safeProjectIndex, {
                    highlights: nextHighlights,
                  })
                }
                value={activeProject.highlights}
              />
            </Field>
          </div>
        </>
      ) : (
        <p className="text-muted text-sm">No projects yet. Click Add to create one.</p>
      )}
    </DraggableSection>
  );
};

export default ProjectsSection;
