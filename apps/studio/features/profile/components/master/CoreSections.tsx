import { Button } from "@veriworkly/ui";
import { Input } from "@veriworkly/ui";
import { Select } from "@veriworkly/ui";
import { TextArea } from "@veriworkly/ui";
import type { MasterProfileData, ResumeLanguage } from "@/types/resume";

import { SectionCard, SectionItemCard } from "./master-shared";
import {
  emptyEducation,
  emptyExperience,
  emptyInterest,
  emptyLanguage,
  emptyProject,
  emptySkill,
  fluencyOptions,
  isValidAbsoluteUrl,
} from "./master-utils";
import { useDelimitedDraft } from "@/features/documents/editor/form";

import type { AddRepeatableItem, RemoveRepeatableItem, UpdateRepeatableItem } from "./types";

type CoreSectionsProps = {
  localProfile: MasterProfileData;
  updateRepeatableItem: UpdateRepeatableItem;
  addRepeatableItem: AddRepeatableItem;
  removeRepeatableItem: RemoveRepeatableItem;
};

export function CoreSections({
  localProfile,
  updateRepeatableItem,
  addRepeatableItem,
  removeRepeatableItem,
}: CoreSectionsProps) {
  const completeExperience = localProfile.experience.filter(
    (item) => item.company.trim() && item.role.trim(),
  ).length;
  const completeProjects = localProfile.projects.filter(
    (item) => item.name.trim() && item.role.trim(),
  ).length;
  const completeSkills = localProfile.skills.filter(
    (item) => item.name.trim() && item.keywords.length > 0,
  ).length;

  return (
    <>
      <SectionCard
        sectionId="profile-experience"
        title="Experience"
        description="Each job is edited with direct fields and bullet-style highlights."
        badge={{
          text: `${completeExperience}/${localProfile.experience.length} complete`,
          tone:
            localProfile.experience.length === 0 ||
            completeExperience === localProfile.experience.length
              ? "success"
              : "warning",
        }}
      >
        <div className="space-y-4">
          {localProfile.experience.map((item) => (
            <SectionItemCard
              key={item.id}
              title={item.company || "New role"}
              onRemove={() => removeRepeatableItem("experience", item.id)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  aria-label="Company"
                  value={item.company}
                  onChange={(event) =>
                    updateRepeatableItem("experience", item.id, (current) => ({
                      ...current,
                      company: event.target.value,
                    }))
                  }
                  placeholder="Company"
                />
                <Input
                  aria-label="Role"
                  value={item.role}
                  onChange={(event) =>
                    updateRepeatableItem("experience", item.id, (current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                  placeholder="Role"
                />
                <Input
                  aria-label="Location"
                  value={item.location}
                  onChange={(event) =>
                    updateRepeatableItem("experience", item.id, (current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Location"
                />
                <Input
                  aria-label="Start date"
                  value={item.startDate}
                  onChange={(event) =>
                    updateRepeatableItem("experience", item.id, (current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  placeholder="Start, e.g. Mar 2022"
                />
                <Input
                  aria-label="End date"
                  value={item.endDate}
                  onChange={(event) =>
                    updateRepeatableItem("experience", item.id, (current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  placeholder="End, e.g. Jun 2024"
                />
                <label className="border-border/60 bg-card/40 flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.current}
                    onChange={(event) =>
                      updateRepeatableItem("experience", item.id, (current) => ({
                        ...current,
                        current: event.target.checked,
                      }))
                    }
                  />
                  Current role
                </label>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Summary</p>
                <TextArea
                  aria-label="Summary"
                  value={item.summary}
                  onChange={(event) =>
                    updateRepeatableItem("experience", item.id, (current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Highlights</p>
                <LinesTextArea
                  aria-label="Highlights"
                  value={item.highlights}
                  onChange={(lines) =>
                    updateRepeatableItem("experience", item.id, (current) => ({
                      ...current,
                      highlights: lines,
                    }))
                  }
                  rows={4}
                />
              </div>
            </SectionItemCard>
          ))}
          <Button
            onClick={() => addRepeatableItem("experience", emptyExperience())}
            variant="secondary"
          >
            Add experience
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        sectionId="profile-education"
        title="Education"
        description="Schools, degrees, and study notes."
      >
        <div className="space-y-4">
          {localProfile.education.map((item) => (
            <SectionItemCard
              key={item.id}
              title={item.school || "New education"}
              onRemove={() => removeRepeatableItem("education", item.id)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  aria-label="School"
                  value={item.school}
                  onChange={(event) =>
                    updateRepeatableItem("education", item.id, (current) => ({
                      ...current,
                      school: event.target.value,
                    }))
                  }
                  placeholder="School"
                />
                <Input
                  aria-label="Degree"
                  value={item.degree}
                  onChange={(event) =>
                    updateRepeatableItem("education", item.id, (current) => ({
                      ...current,
                      degree: event.target.value,
                    }))
                  }
                  placeholder="Degree"
                />
                <Input
                  aria-label="Field"
                  value={item.field}
                  onChange={(event) =>
                    updateRepeatableItem("education", item.id, (current) => ({
                      ...current,
                      field: event.target.value,
                    }))
                  }
                  placeholder="Field"
                />
                <Input
                  aria-label="Start date"
                  value={item.startDate}
                  onChange={(event) =>
                    updateRepeatableItem("education", item.id, (current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  placeholder="Start year, e.g. 2018"
                />
                <Input
                  aria-label="End date"
                  value={item.endDate}
                  onChange={(event) =>
                    updateRepeatableItem("education", item.id, (current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  placeholder="End year, e.g. 2022"
                />
                <label className="border-border/60 bg-card/40 flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.current}
                    onChange={(event) =>
                      updateRepeatableItem("education", item.id, (current) => ({
                        ...current,
                        current: event.target.checked,
                      }))
                    }
                  />
                  Current study
                </label>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Summary</p>
                <TextArea
                  aria-label="Summary"
                  value={item.summary}
                  onChange={(event) =>
                    updateRepeatableItem("education", item.id, (current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                  rows={4}
                />
              </div>
            </SectionItemCard>
          ))}
          <Button
            onClick={() => addRepeatableItem("education", emptyEducation())}
            variant="secondary"
          >
            Add education
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        sectionId="profile-projects"
        title="Projects"
        description="Project entries with links and bullet notes."
        badge={{
          text: `${completeProjects}/${localProfile.projects.length} complete`,
          tone:
            localProfile.projects.length === 0 || completeProjects === localProfile.projects.length
              ? "success"
              : "warning",
        }}
      >
        <div className="space-y-4">
          {localProfile.projects.map((item) => (
            <SectionItemCard
              key={item.id}
              title={item.name || "New project"}
              onRemove={() => removeRepeatableItem("projects", item.id)}
            >
              {item.link.trim() && !isValidAbsoluteUrl(item.link.trim()) ? (
                <p className="text-xs font-medium text-red-600">
                  Project link should be a valid URL. It will be normalized on save.
                </p>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  aria-label="Project name"
                  value={item.name}
                  onChange={(event) =>
                    updateRepeatableItem("projects", item.id, (current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Project name"
                />
                <Input
                  aria-label="Role"
                  value={item.role}
                  onChange={(event) =>
                    updateRepeatableItem("projects", item.id, (current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                  placeholder="Role"
                />
                <Input
                  aria-label="Link"
                  type="url"
                  value={item.link}
                  onChange={(event) =>
                    updateRepeatableItem("projects", item.id, (current) => ({
                      ...current,
                      link: event.target.value,
                    }))
                  }
                  placeholder="Link"
                  aria-invalid={
                    item.link.trim().length > 0 && !isValidAbsoluteUrl(item.link.trim())
                  }
                  className={
                    item.link.trim().length > 0 && !isValidAbsoluteUrl(item.link.trim())
                      ? "border-red-500/60"
                      : undefined
                  }
                />
                <div className="space-y-2 md:col-span-2">
                  <p className="text-sm font-medium">Summary</p>
                  <TextArea
                    aria-label="Summary"
                    value={item.summary}
                    onChange={(event) =>
                      updateRepeatableItem("projects", item.id, (current) => ({
                        ...current,
                        summary: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <p className="text-sm font-medium">Highlights</p>
                  <LinesTextArea
                    aria-label="Highlights"
                    value={item.highlights}
                    onChange={(lines) =>
                      updateRepeatableItem("projects", item.id, (current) => ({
                        ...current,
                        highlights: lines,
                      }))
                    }
                    rows={4}
                  />
                </div>
              </div>
            </SectionItemCard>
          ))}
          <Button onClick={() => addRepeatableItem("projects", emptyProject())} variant="secondary">
            Add project
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        sectionId="profile-skills"
        title="Skills"
        description="Skill groups with keyword lists."
        badge={{
          text: `${completeSkills}/${localProfile.skills.length} complete`,
          tone:
            localProfile.skills.length === 0 || completeSkills === localProfile.skills.length
              ? "success"
              : "warning",
        }}
      >
        <div className="space-y-4">
          {localProfile.skills.map((item) => (
            <SectionItemCard
              key={item.id}
              title={item.name || "New skill group"}
              onRemove={() => removeRepeatableItem("skills", item.id)}
            >
              <Input
                aria-label="Group name"
                value={item.name}
                onChange={(event) =>
                  updateRepeatableItem("skills", item.id, (current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Group name"
              />
              <div className="space-y-2">
                <p className="text-sm font-medium">Keywords</p>
                <LinesTextArea
                  aria-label="Keywords"
                  value={item.keywords}
                  onChange={(lines) =>
                    updateRepeatableItem("skills", item.id, (current) => ({
                      ...current,
                      keywords: lines,
                    }))
                  }
                  rows={4}
                />
              </div>
            </SectionItemCard>
          ))}
          <Button onClick={() => addRepeatableItem("skills", emptySkill())} variant="secondary">
            Add skill group
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        sectionId="profile-languages"
        title="Languages"
        description="Language proficiency entries."
      >
        <div className="space-y-4">
          {localProfile.languages.map((item) => (
            <SectionItemCard
              key={item.id}
              title={item.language || "New language"}
              onRemove={() => removeRepeatableItem("languages", item.id)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  aria-label="Language"
                  value={item.language}
                  onChange={(event) =>
                    updateRepeatableItem("languages", item.id, (current) => ({
                      ...current,
                      language: event.target.value,
                    }))
                  }
                  placeholder="Language"
                />
                <Select
                  aria-label="Fluency"
                  value={item.fluency}
                  onChange={(event) =>
                    updateRepeatableItem("languages", item.id, (current) => ({
                      ...current,
                      fluency: event.target.value as ResumeLanguage["fluency"],
                    }))
                  }
                >
                  {fluencyOptions.map((fluency) => (
                    <option key={fluency} value={fluency}>
                      {fluency}
                    </option>
                  ))}
                </Select>
              </div>
            </SectionItemCard>
          ))}
          <Button
            onClick={() => addRepeatableItem("languages", emptyLanguage())}
            variant="secondary"
          >
            Add language
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        sectionId="profile-interests"
        title="Interests"
        description="Simple interest names and keywords."
      >
        <div className="space-y-4">
          {localProfile.interests.map((item) => (
            <SectionItemCard
              key={item.id}
              title={item.name || "New interest"}
              onRemove={() => removeRepeatableItem("interests", item.id)}
            >
              <Input
                aria-label="Interest"
                value={item.name}
                onChange={(event) =>
                  updateRepeatableItem("interests", item.id, (current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Interest"
              />
              <LinesTextArea
                value={item.keywords}
                onChange={(lines) =>
                  updateRepeatableItem("interests", item.id, (current) => ({
                    ...current,
                    keywords: lines,
                  }))
                }
                rows={3}
                placeholder="One keyword per line"
              />
            </SectionItemCard>
          ))}
          <Button
            onClick={() => addRepeatableItem("interests", emptyInterest())}
            variant="secondary"
          >
            Add interest
          </Button>
        </div>
      </SectionCard>
    </>
  );
}

/**
 * A one-entry-per-line list. Holds the typed text rather than re-joining the parsed list on
 * every keystroke, which swallowed Enter and trimmed the space before the next word.
 */
export function LinesTextArea({
  "aria-label": ariaLabel,
  onChange,
  placeholder,
  rows,
  value,
}: {
  "aria-label"?: string;
  onChange: (lines: string[]) => void;
  placeholder?: string;
  rows?: number;
  value: string[];
}) {
  return (
    <TextArea
      aria-label={ariaLabel}
      placeholder={placeholder}
      rows={rows}
      {...useDelimitedDraft(value, "newline", onChange)}
    />
  );
}
