import { Input } from "@veriworkly/ui";
import { Select } from "@veriworkly/ui";
import { TextArea } from "@veriworkly/ui";
import { templateSummaries } from "@/config/templates";
import type { MasterProfileData, ResumeLinkDisplayMode, ResumeLinkType } from "@/types/resume";

import { SectionCard } from "./master-shared";
import { isValidAbsoluteUrl, isValidEmail, linkTypes } from "./master-utils";
import type { UpdateProfile } from "./types";

type BasicsAndSummarySectionsProps = {
  localProfile: MasterProfileData;
  updateProfile: UpdateProfile;
  setBasicField: (key: keyof MasterProfileData["basics"], value: string | boolean) => void;
  updateLinkDisplayMode: (displayMode: ResumeLinkDisplayMode) => void;
  updateLink: (type: ResumeLinkType, value: string) => void;
};

export function BasicsAndSummarySections({
  localProfile,
  updateProfile,
  setBasicField,
  updateLinkDisplayMode,
  updateLink,
}: BasicsAndSummarySectionsProps) {
  const emailValue = localProfile.basics.email.trim();
  const hasInvalidEmail = emailValue.length > 0 && !isValidEmail(emailValue);

  const basicsCompleted = [
    localProfile.basics.fullName,
    localProfile.basics.role,
    localProfile.basics.email,
  ].filter((value) => value.trim().length > 0).length;

  const linksCount = localProfile.links.items.length;
  const linksWithValidUrls = localProfile.links.items.filter((item) =>
    isValidAbsoluteUrl(item.url.trim()),
  ).length;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard
        sectionId="profile-basics"
        title="Resume Basics"
        description="Core identity fields used by every resume and template."
        badge={{
          text: `${basicsCompleted}/3 complete`,
          tone: basicsCompleted === 3 ? "success" : "warning",
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Template</p>
            <Select
              aria-label="Template"
              value={localProfile.templateId}
              onChange={(event) =>
                updateProfile((prev) => ({
                  ...prev,
                  templateId: event.target.value,
                }))
              }
            >
              {templateSummaries.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Display Mode</p>
            <Select
              aria-label="Display Mode"
              value={localProfile.links.displayMode}
              onChange={(event) =>
                updateLinkDisplayMode(event.target.value as ResumeLinkDisplayMode)
              }
            >
              <option value="icon">Icons only</option>
              <option value="icon-username">Icon + username</option>
              <option value="url">Full URL</option>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Full Name</p>
            <Input
              aria-label="Full Name"
              value={localProfile.basics.fullName}
              onChange={(event) => setBasicField("fullName", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Role</p>
            <Input
              aria-label="Role"
              value={localProfile.basics.role}
              onChange={(event) => setBasicField("role", event.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <p className="text-sm font-medium">Headline</p>
            <Input
              aria-label="Headline"
              value={localProfile.basics.headline}
              onChange={(event) => setBasicField("headline", event.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <p className="text-sm font-medium">Email</p>
            <Input
              aria-label="Email"
              type="email"
              value={localProfile.basics.email}
              onChange={(event) => setBasicField("email", event.target.value)}
              placeholder="resume@email.com"
              aria-invalid={hasInvalidEmail}
              className={hasInvalidEmail ? "border-red-500/60" : undefined}
            />
            {hasInvalidEmail ? (
              <p className="text-xs font-medium text-red-600">Enter a valid email address.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Phone</p>
            <Input
              aria-label="Phone"
              value={localProfile.basics.phone}
              onChange={(event) => setBasicField("phone", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Location</p>
            <Input
              aria-label="Location"
              value={localProfile.basics.location}
              onChange={(event) => setBasicField("location", event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 pt-2 md:grid-cols-3">
          <label className="border-border/60 bg-card/40 flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={localProfile.basics.linkEmail}
              onChange={(event) => setBasicField("linkEmail", event.target.checked)}
            />
            Email opens mail app
          </label>
          <label className="border-border/60 bg-card/40 flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={localProfile.basics.linkPhone}
              onChange={(event) => setBasicField("linkPhone", event.target.checked)}
            />
            Phone opens call
          </label>
          <label className="border-border/60 bg-card/40 flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={localProfile.basics.linkLocation}
              onChange={(event) => setBasicField("linkLocation", event.target.checked)}
            />
            Location opens Google search
          </label>
        </div>

        <p className="text-muted text-xs">
          New documents print every detail filled in here. To keep your phone or location off them,
          leave it empty here, or clear it in one document&apos;s editor.
        </p>
      </SectionCard>

      <SectionCard
        sectionId="profile-summary-links"
        title="Summary and Links"
        description="A short summary and your public profile links."
        badge={{
          text: `${linksWithValidUrls}/${linksCount} valid links`,
          tone: linksCount === 0 || linksWithValidUrls === linksCount ? "success" : "warning",
        }}
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Summary</p>
          <TextArea
            aria-label="Summary"
            value={localProfile.summary}
            onChange={(event) =>
              updateProfile((prev) => ({
                ...prev,
                summary: event.target.value,
              }))
            }
            rows={10}
          />
        </div>

        <div className="space-y-4 pt-2">
          <div className="grid gap-4 md:grid-cols-3">
            {linkTypes.map((type) => {
              const existing = localProfile.links.items.find((item) => item.type === type);
              const rawUrl = existing?.url ?? "";
              const hasInvalidUrl = rawUrl.trim().length > 0 && !isValidAbsoluteUrl(rawUrl.trim());

              return (
                <div key={type} className="space-y-2">
                  <label className="text-sm font-medium capitalize">{type}</label>
                  <Input
                    aria-label={type}
                    type="url"
                    value={rawUrl}
                    onChange={(event) => updateLink(type, event.target.value)}
                    placeholder={`https://${type}.com/...`}
                    aria-invalid={hasInvalidUrl}
                    className={hasInvalidUrl ? "border-red-500/60" : undefined}
                  />
                  {hasInvalidUrl ? (
                    <p className="text-xs font-medium text-red-600">
                      Enter a valid URL (for example, https://example.com).
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
