import { Button } from "@veriworkly/ui";
import { Input } from "@veriworkly/ui";
import { TextArea } from "@veriworkly/ui";
import type { MasterProfileData, ResumeAdditionalItem } from "@/types/resume";

import { SectionCard, SectionItemCard } from "./master-shared";
import {
  createId,
  emptyAchievement,
  emptyAward,
  emptyCertificate,
  emptyCustomSection,
  emptyPublication,
  emptyReference,
  emptyVolunteer,
  isValidAbsoluteUrl,
  isValidEmail,
  joinLines,
  splitLines,
  updateItem,
} from "./master-utils";
import type { AddRepeatableItem, RemoveRepeatableItem, UpdateRepeatableItem } from "./types";

type AdditionalSectionsProps = {
  localProfile: MasterProfileData;
  updateRepeatableItem: UpdateRepeatableItem;
  addRepeatableItem: AddRepeatableItem;
  removeRepeatableItem: RemoveRepeatableItem;
};

export function AdditionalSections({
  localProfile,
  updateRepeatableItem,
  addRepeatableItem,
  removeRepeatableItem,
}: AdditionalSectionsProps) {
  const completeCredentials =
    localProfile.awards.filter((item) => item.title.trim() && item.awarder.trim()).length +
    localProfile.certificates.filter((item) => item.title.trim() && item.issuer.trim()).length +
    localProfile.publications.filter((item) => item.title.trim() && item.publisher.trim()).length;
  const totalCredentials =
    localProfile.awards.length +
    localProfile.certificates.length +
    localProfile.publications.length;

  const completeReferences = localProfile.references.filter(
    (item) => item.name.trim() && item.title.trim(),
  ).length;

  return (
    <>
      <SectionCard
        sectionId="profile-credentials"
        title="Awards, Certificates, Publications"
        description="Track recognition, courses, and published work with direct fields."
        badge={{
          text: `${completeCredentials}/${totalCredentials} complete`,
          tone:
            totalCredentials === 0 || completeCredentials === totalCredentials
              ? "success"
              : "warning",
        }}
      >
        <div className="space-y-4">
          {localProfile.awards.map((item) => (
            <SectionItemCard
              key={item.id}
              title={item.title || "New award"}
              onRemove={() => removeRepeatableItem("awards", item.id)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  value={item.title}
                  onChange={(event) =>
                    updateRepeatableItem("awards", item.id, (current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Title"
                />
                <Input
                  value={item.awarder}
                  onChange={(event) =>
                    updateRepeatableItem("awards", item.id, (current) => ({
                      ...current,
                      awarder: event.target.value,
                    }))
                  }
                  placeholder="Awarder"
                />
                <Input
                  value={item.date}
                  onChange={(event) =>
                    updateRepeatableItem("awards", item.id, (current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  placeholder="Date"
                />
                <Input
                  type="url"
                  value={item.website ?? ""}
                  onChange={(event) =>
                    updateRepeatableItem("awards", item.id, (current) => ({
                      ...current,
                      website: event.target.value,
                    }))
                  }
                  placeholder="Website"
                  aria-invalid={
                    Boolean(item.website?.trim()) &&
                    !isValidAbsoluteUrl((item.website ?? "").trim())
                  }
                  className={
                    Boolean(item.website?.trim()) &&
                    !isValidAbsoluteUrl((item.website ?? "").trim())
                      ? "border-red-500/60"
                      : undefined
                  }
                />
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <TextArea
                    value={item.description}
                    onChange={(event) =>
                      updateRepeatableItem("awards", item.id, (current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
                <label className="border-border/60 bg-card/40 flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.showLink}
                    onChange={(event) =>
                      updateRepeatableItem("awards", item.id, (current) => ({
                        ...current,
                        showLink: event.target.checked,
                      }))
                    }
                  />
                  Show link
                </label>
              </div>
            </SectionItemCard>
          ))}
          <Button onClick={() => addRepeatableItem("awards", emptyAward())} variant="secondary">
            Add award
          </Button>

          {localProfile.certificates.map((item) => (
            <SectionItemCard
              key={item.id}
              title={item.title || "New certificate"}
              onRemove={() => removeRepeatableItem("certificates", item.id)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  value={item.title}
                  onChange={(event) =>
                    updateRepeatableItem("certificates", item.id, (current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Title"
                />
                <Input
                  value={item.issuer}
                  onChange={(event) =>
                    updateRepeatableItem("certificates", item.id, (current) => ({
                      ...current,
                      issuer: event.target.value,
                    }))
                  }
                  placeholder="Issuer"
                />
                <Input
                  value={item.date}
                  onChange={(event) =>
                    updateRepeatableItem("certificates", item.id, (current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  placeholder="Date"
                />
                <Input
                  type="url"
                  value={item.website ?? ""}
                  onChange={(event) =>
                    updateRepeatableItem("certificates", item.id, (current) => ({
                      ...current,
                      website: event.target.value,
                    }))
                  }
                  placeholder="Website"
                  aria-invalid={
                    Boolean(item.website?.trim()) &&
                    !isValidAbsoluteUrl((item.website ?? "").trim())
                  }
                  className={
                    Boolean(item.website?.trim()) &&
                    !isValidAbsoluteUrl((item.website ?? "").trim())
                      ? "border-red-500/60"
                      : undefined
                  }
                />
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <TextArea
                    value={item.description}
                    onChange={(event) =>
                      updateRepeatableItem("certificates", item.id, (current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
                <label className="border-border/60 bg-card/40 flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.showLink}
                    onChange={(event) =>
                      updateRepeatableItem("certificates", item.id, (current) => ({
                        ...current,
                        showLink: event.target.checked,
                      }))
                    }
                  />
                  Show link
                </label>
              </div>
            </SectionItemCard>
          ))}
          <Button
            onClick={() => addRepeatableItem("certificates", emptyCertificate())}
            variant="secondary"
          >
            Add certificate
          </Button>

          {localProfile.publications.map((item) => (
            <SectionItemCard
              key={item.id}
              title={item.title || "New publication"}
              onRemove={() => removeRepeatableItem("publications", item.id)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  value={item.title}
                  onChange={(event) =>
                    updateRepeatableItem("publications", item.id, (current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Title"
                />
                <Input
                  value={item.publisher}
                  onChange={(event) =>
                    updateRepeatableItem("publications", item.id, (current) => ({
                      ...current,
                      publisher: event.target.value,
                    }))
                  }
                  placeholder="Publisher"
                />
                <Input
                  value={item.date}
                  onChange={(event) =>
                    updateRepeatableItem("publications", item.id, (current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  placeholder="Date"
                />
                <Input
                  type="url"
                  value={item.website ?? ""}
                  onChange={(event) =>
                    updateRepeatableItem("publications", item.id, (current) => ({
                      ...current,
                      website: event.target.value,
                    }))
                  }
                  placeholder="Website"
                  aria-invalid={
                    Boolean(item.website?.trim()) &&
                    !isValidAbsoluteUrl((item.website ?? "").trim())
                  }
                  className={
                    Boolean(item.website?.trim()) &&
                    !isValidAbsoluteUrl((item.website ?? "").trim())
                      ? "border-red-500/60"
                      : undefined
                  }
                />
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <TextArea
                    value={item.description}
                    onChange={(event) =>
                      updateRepeatableItem("publications", item.id, (current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
                <label className="border-border/60 bg-card/40 flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.showLink}
                    onChange={(event) =>
                      updateRepeatableItem("publications", item.id, (current) => ({
                        ...current,
                        showLink: event.target.checked,
                      }))
                    }
                  />
                  Show link
                </label>
              </div>
            </SectionItemCard>
          ))}
          <Button
            onClick={() => addRepeatableItem("publications", emptyPublication())}
            variant="secondary"
          >
            Add publication
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        sectionId="profile-volunteer"
        title="Volunteer"
        description="Volunteer roles and contributions."
      >
        <div className="space-y-4">
          {localProfile.volunteer.map((item) => (
            <SectionItemCard
              key={item.id}
              title={item.organization || "New volunteer role"}
              onRemove={() => removeRepeatableItem("volunteer", item.id)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  value={item.organization}
                  onChange={(event) =>
                    updateRepeatableItem("volunteer", item.id, (current) => ({
                      ...current,
                      organization: event.target.value,
                    }))
                  }
                  placeholder="Organization"
                />
                <Input
                  value={item.role}
                  onChange={(event) =>
                    updateRepeatableItem("volunteer", item.id, (current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                  placeholder="Role"
                />
                <Input
                  value={item.startDate}
                  onChange={(event) =>
                    updateRepeatableItem("volunteer", item.id, (current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  placeholder="Start date"
                />
                <Input
                  value={item.endDate}
                  onChange={(event) =>
                    updateRepeatableItem("volunteer", item.id, (current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  placeholder="End date"
                />
                <Input
                  value={item.location}
                  onChange={(event) =>
                    updateRepeatableItem("volunteer", item.id, (current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Location"
                />
                <label className="border-border/60 bg-card/40 flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.current}
                    onChange={(event) =>
                      updateRepeatableItem("volunteer", item.id, (current) => ({
                        ...current,
                        current: event.target.checked,
                      }))
                    }
                  />
                  Current role
                </label>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Summary</label>
                  <TextArea
                    value={item.summary}
                    onChange={(event) =>
                      updateRepeatableItem("volunteer", item.id, (current) => ({
                        ...current,
                        summary: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
              </div>
            </SectionItemCard>
          ))}
          <Button
            onClick={() => addRepeatableItem("volunteer", emptyVolunteer())}
            variant="secondary"
          >
            Add volunteer role
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        sectionId="profile-references"
        title="References"
        description="People who can vouch for your work."
        badge={{
          text: `${completeReferences}/${localProfile.references.length} complete`,
          tone:
            localProfile.references.length === 0 ||
            completeReferences === localProfile.references.length
              ? "success"
              : "warning",
        }}
      >
        <div className="space-y-4">
          {localProfile.references.map((item) => (
            <SectionItemCard
              key={item.id}
              title={item.name || "New reference"}
              onRemove={() => removeRepeatableItem("references", item.id)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  value={item.name}
                  onChange={(event) =>
                    updateRepeatableItem("references", item.id, (current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Name"
                />
                <Input
                  value={item.title}
                  onChange={(event) =>
                    updateRepeatableItem("references", item.id, (current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Title"
                />
                <Input
                  value={item.organization}
                  onChange={(event) =>
                    updateRepeatableItem("references", item.id, (current) => ({
                      ...current,
                      organization: event.target.value,
                    }))
                  }
                  placeholder="Organization"
                />
                <Input
                  value={item.relationship}
                  onChange={(event) =>
                    updateRepeatableItem("references", item.id, (current) => ({
                      ...current,
                      relationship: event.target.value,
                    }))
                  }
                  placeholder="Relationship"
                />
                <Input
                  type="email"
                  value={item.email ?? ""}
                  onChange={(event) =>
                    updateRepeatableItem("references", item.id, (current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="Email"
                  aria-invalid={
                    Boolean(item.email?.trim()) && !isValidEmail((item.email ?? "").trim())
                  }
                  className={
                    Boolean(item.email?.trim()) && !isValidEmail((item.email ?? "").trim())
                      ? "border-red-500/60"
                      : undefined
                  }
                />
                {item.email?.trim() && !isValidEmail((item.email ?? "").trim()) ? (
                  <p className="text-xs font-medium text-red-600 md:col-span-2">
                    Reference email should be a valid email address.
                  </p>
                ) : null}
                <Input
                  value={item.phone ?? ""}
                  onChange={(event) =>
                    updateRepeatableItem("references", item.id, (current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="Phone"
                />
              </div>
            </SectionItemCard>
          ))}
          <Button
            onClick={() => addRepeatableItem("references", emptyReference())}
            variant="secondary"
          >
            Add reference
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        sectionId="profile-achievements"
        title="Achievements"
        description="Awards, milestones, and standout wins."
      >
        <div className="space-y-4">
          {localProfile.achievements.map((item) => (
            <SectionItemCard
              key={item.id}
              title={item.title || "New achievement"}
              onRemove={() => removeRepeatableItem("achievements", item.id)}
            >
              <Input
                value={item.title}
                onChange={(event) =>
                  updateRepeatableItem("achievements", item.id, (current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Title"
              />
              <TextArea
                value={item.description}
                onChange={(event) =>
                  updateRepeatableItem("achievements", item.id, (current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Description"
              />
            </SectionItemCard>
          ))}
          <Button
            onClick={() => addRepeatableItem("achievements", emptyAchievement())}
            variant="secondary"
          >
            Add achievement
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        sectionId="profile-custom-sections"
        title="Custom Sections"
        description="Other structures that do not fit the standard sections."
      >
        <div className="space-y-4">
          {localProfile.customSections
            .filter((section) => section.kind === "custom")
            .map((item) => (
              <SectionItemCard
                key={item.id}
                title={item.title || "Custom section"}
                onRemove={() => removeRepeatableItem("customSections", item.id)}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    value={item.title}
                    onChange={(event) =>
                      updateRepeatableItem("customSections", item.id, (current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Title"
                  />
                  <div className="border-border/60 bg-muted/20 text-muted flex h-10 items-center rounded-xl border px-3 text-sm">
                    Custom section
                  </div>
                  <label className="border-border/60 bg-card/40 flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.editableTitle ?? true}
                      onChange={(event) =>
                        updateRepeatableItem("customSections", item.id, (current) => ({
                          ...current,
                          editableTitle: event.target.checked,
                        }))
                      }
                    />
                    Editable title
                  </label>
                </div>
                <div className="space-y-3">
                  {item.items.map((customItem) => (
                    <div
                      key={customItem.id}
                      className="border-border/60 bg-card/30 space-y-3 rounded-xl border p-4"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <Input
                          value={customItem.name}
                          onChange={(event) =>
                            updateRepeatableItem("customSections", item.id, (current) => ({
                              ...current,
                              items: updateItem(current.items, customItem.id, (currentItem) => ({
                                ...currentItem,
                                name: event.target.value,
                              })),
                            }))
                          }
                          placeholder="Name"
                        />
                        <Input
                          value={customItem.issuer}
                          onChange={(event) =>
                            updateRepeatableItem("customSections", item.id, (current) => ({
                              ...current,
                              items: updateItem(current.items, customItem.id, (currentItem) => ({
                                ...currentItem,
                                issuer: event.target.value,
                              })),
                            }))
                          }
                          placeholder="Issuer"
                        />
                        <Input
                          value={customItem.date}
                          onChange={(event) =>
                            updateRepeatableItem("customSections", item.id, (current) => ({
                              ...current,
                              items: updateItem(current.items, customItem.id, (currentItem) => ({
                                ...currentItem,
                                date: event.target.value,
                              })),
                            }))
                          }
                          placeholder="Date"
                        />
                        <Input
                          value={customItem.link}
                          onChange={(event) =>
                            updateRepeatableItem("customSections", item.id, (current) => ({
                              ...current,
                              items: updateItem(current.items, customItem.id, (currentItem) => ({
                                ...currentItem,
                                link: event.target.value,
                              })),
                            }))
                          }
                          placeholder="Link"
                        />
                        <Input
                          value={customItem.referenceId}
                          onChange={(event) =>
                            updateRepeatableItem("customSections", item.id, (current) => ({
                              ...current,
                              items: updateItem(current.items, customItem.id, (currentItem) => ({
                                ...currentItem,
                                referenceId: event.target.value,
                              })),
                            }))
                          }
                          placeholder="Reference ID"
                        />
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium">Description</label>
                          <TextArea
                            value={customItem.description}
                            onChange={(event) =>
                              updateRepeatableItem("customSections", item.id, (current) => ({
                                ...current,
                                items: updateItem(current.items, customItem.id, (currentItem) => ({
                                  ...currentItem,
                                  description: event.target.value,
                                })),
                              }))
                            }
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium">Details</label>
                          <TextArea
                            value={joinLines(customItem.details)}
                            onChange={(event) =>
                              updateRepeatableItem("customSections", item.id, (current) => ({
                                ...current,
                                items: updateItem(current.items, customItem.id, (currentItem) => ({
                                  ...currentItem,
                                  details: splitLines(event.target.value),
                                })),
                              }))
                            }
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={() =>
                      updateRepeatableItem("customSections", item.id, (current) => ({
                        ...current,
                        items: [
                          ...current.items,
                          {
                            id: createId("custom-item"),
                            name: "",
                            issuer: "",
                            date: "",
                            link: "",
                            referenceId: "",
                            description: "",
                            details: [],
                          } satisfies ResumeAdditionalItem,
                        ],
                      }))
                    }
                    variant="secondary"
                  >
                    Add custom item
                  </Button>
                </div>
              </SectionItemCard>
            ))}
          <Button
            onClick={() => addRepeatableItem("customSections", emptyCustomSection())}
            variant="secondary"
          >
            Add custom section
          </Button>
        </div>
      </SectionCard>
    </>
  );
}
