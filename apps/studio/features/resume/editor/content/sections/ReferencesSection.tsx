"use client";

import type { BaseSectionProps } from "./section-types";

import { TextInputField } from "@/features/documents/editor/form";
import { normalizePhoneValue } from "@/features/resume/schemas/resume-validation-rules";
import TypedSectionEditor from "./TypedSectionEditor";

const ReferencesSection = (props: BaseSectionProps) => {
  return (
    <TypedSectionEditor
      {...props}
      sectionKey="references"
      sectionId="references"
      label="References"
      addLabel="Add reference"
      fallbackItemLabel="Reference"
      emptyMessage="No references yet. Click Add reference."
      labelFor={(item) => item.name}
    >
      {({ item: reference, update }) => (
        <div className="grid gap-4 md:grid-cols-2">
          <TextInputField
            label="Name"
            value={reference.name}
            onValueChange={(name) => update({ name })}
          />

          <TextInputField
            label="Title"
            value={reference.title}
            onValueChange={(title) => update({ title })}
          />

          <TextInputField
            label="Organization"
            value={reference.organization}
            onValueChange={(organization) => update({ organization })}
          />

          <TextInputField
            label="Relationship"
            value={reference.relationship}
            onValueChange={(relationship) => update({ relationship })}
          />

          <TextInputField
            type="email"
            label="Email (optional)"
            value={reference.email ?? ""}
            onValueChange={(email) => update({ email })}
          />

          <TextInputField
            label="Phone (optional)"
            inputMode="tel"
            placeholder="+44 20 7946 0958"
            value={reference.phone ?? ""}
            // Folded to E.164 on blur, not per keystroke: normalising mid-number moves the
            // caret out from under the user.
            onBlur={() => update({ phone: normalizePhoneValue(reference.phone ?? "") })}
            onValueChange={(phone) => update({ phone })}
          />
        </div>
      )}
    </TypedSectionEditor>
  );
};

export default ReferencesSection;
