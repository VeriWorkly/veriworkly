"use client";

import type { BaseSectionProps } from "./section-types";

import { TextInputField } from "@/features/documents/editor/form";
import TypedSectionEditor from "./TypedSectionEditor";

const CertificationsSection = (props: BaseSectionProps) => {
  return (
    <TypedSectionEditor
      {...props}
      sectionKey="certificates"
      sectionId="certifications"
      label="Certifications"
      addLabel="Add certification"
      fallbackItemLabel="Certification"
      emptyMessage="No certifications yet. Click Add certification."
      labelFor={(item) => item.title}
    >
      {({ item: certificate, update }) => (
        <div className="grid gap-4 md:grid-cols-2">
          <TextInputField
            label="Certificate name"
            value={certificate.title}
            onValueChange={(title) => update({ title })}
          />

          <TextInputField
            label="Issuer"
            value={certificate.issuer}
            onValueChange={(issuer) => update({ issuer })}
          />

          <TextInputField
            type="month"
            label="Issue date (YYYY-MM)"
            value={certificate.date}
            onValueChange={(date) => update({ date })}
          />

          <TextInputField
            label="Credential ID"
            value={certificate.referenceId ?? ""}
            onValueChange={(referenceId) => update({ referenceId })}
          />

          <TextInputField
            type="url"
            label="Verification link"
            placeholder="https://..."
            value={certificate.website ?? ""}
            onValueChange={(website) => update({ website })}
          />
        </div>
      )}
    </TypedSectionEditor>
  );
};

export default CertificationsSection;
