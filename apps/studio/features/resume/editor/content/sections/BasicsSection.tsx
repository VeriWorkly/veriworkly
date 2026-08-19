"use client";

import type { BaseSectionProps } from "./section-types";
import type { ResumeSectionId } from "@/types/resume";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { validateBasics } from "@/features/resume/utils/validation";
import {
  normalizePhoneValue,
  isLegacyUnqualifiedPhone,
} from "@/features/resume/schemas/resume-validation-rules";

import SectionAccordion from "@/features/documents/editor/SectionAccordion";
import { CheckboxField, TextInputField } from "@/features/documents/editor/form";

const BasicsSection = ({ isOpen, onToggle }: BaseSectionProps) => {
  const basics = useResumeStore((state) => state.resume.basics);
  const updateBasics = useResumeStore((state) => state.updateBasics);
  const basicErrors = validateBasics(basics);

  // A bare number stored before country codes were captured. Worth pointing out, never
  // worth blocking on: we cannot guess which country it belongs to, only the user can.
  const phoneNeedsCountryCode = isLegacyUnqualifiedPhone(basics.phone);

  return (
    <SectionAccordion
      id="basics"
      label="Basics"
      isOpen={isOpen}
      onToggle={(nextId) => onToggle(nextId as ResumeSectionId)}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextInputField
          error={basicErrors.fullName}
          label="Full name"
          onValueChange={(fullName) => updateBasics({ fullName })}
          value={basics.fullName}
        />

        <TextInputField
          error={basicErrors.role}
          label="Role"
          onValueChange={(role) => updateBasics({ role })}
          value={basics.role}
        />

        <TextInputField
          error={basicErrors.headline}
          label="Headline"
          onValueChange={(headline) => updateBasics({ headline })}
          value={basics.headline}
        />

        <TextInputField
          error={basicErrors.email}
          label="Email"
          onValueChange={(email) => updateBasics({ email })}
          type="email"
          value={basics.email}
        />

        <TextInputField
          error={basicErrors.phone}
          hint={
            phoneNeedsCountryCode ? "Add a country code so this works internationally." : undefined
          }
          inputMode="tel"
          label="Phone"
          // Normalising to E.164 on every keystroke would move the caret out from under the
          // user mid-number, so the raw text is kept while typing and folded down on blur.
          onBlur={() => updateBasics({ phone: normalizePhoneValue(basics.phone) })}
          onValueChange={(phone) => updateBasics({ phone })}
          placeholder="+44 20 7946 0958"
          value={basics.phone}
        />

        <TextInputField
          error={basicErrors.location}
          label="Location"
          onValueChange={(location) => updateBasics({ location })}
          value={basics.location}
        />

        <CheckboxField
          checked={basics.linkEmail}
          onCheckedChange={(linkEmail) => updateBasics({ linkEmail })}
        >
          Email opens mail app
        </CheckboxField>

        <CheckboxField
          checked={basics.linkPhone}
          onCheckedChange={(linkPhone) => updateBasics({ linkPhone })}
        >
          Phone opens call
        </CheckboxField>

        <CheckboxField
          checked={basics.linkLocation}
          className="md:col-span-2"
          onCheckedChange={(linkLocation) => updateBasics({ linkLocation })}
        >
          Location opens Google search
        </CheckboxField>
      </div>
    </SectionAccordion>
  );
};

export default BasicsSection;
