"use client";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";

import { Field } from "../EditorFormPrimitives";
import GenericCustomSection from "./GenericCustomSection";

const CertificationsSection = (props: BaseSectionProps) => {
  return (
    <GenericCustomSection
      {...props}
      kind="certifications"
      label="Certifications"
      addLabel="Add certification"
      fallbackItemLabel="Certification"
      emptyMessage="No certifications yet. Click Add certification."
    >
      {({ item: activeCertification, update }) => (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Certificate name">
            <Input
              onChange={(event) => update({ name: event.target.value })}
              value={activeCertification.name}
            />
          </Field>

          <Field label="Issuer">
            <Input
              onChange={(event) => update({ issuer: event.target.value })}
              value={activeCertification.issuer}
            />
          </Field>

          <Field label="Issue date (YYYY-MM)">
            <Input
              type="month"
              onChange={(event) => update({ date: event.target.value })}
              value={activeCertification.date}
            />
          </Field>

          <Field label="Credential ID">
            <Input
              onChange={(event) => update({ referenceId: event.target.value })}
              value={activeCertification.referenceId}
            />
          </Field>

          <Field label="Verification link">
            <Input
              placeholder="https://..."
              type="url"
              onChange={(event) => update({ link: event.target.value })}
              value={activeCertification.link}
            />
          </Field>
        </div>
      )}
    </GenericCustomSection>
  );
};

export default CertificationsSection;
