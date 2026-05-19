"use client";

import type { BaseSectionProps } from "./section-types";

import { useResume } from "@/features/resume/hooks/use-resume";
import { validateBasics } from "@/features/resume/utils/validation";

import DraggableSection from "./DraggableSection";
import { CheckboxField, TextInputField } from "../EditorFormPrimitives";

const BasicsSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const { resume, updateBasics } = useResume();
  const basicErrors = validateBasics(resume.basics);

  return (
    <DraggableSection
      id="basics"
      label="Basics"
      isOpen={isOpen}
      onDrop={onDrop}
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextInputField
          error={basicErrors.fullName}
          label="Full name"
          onValueChange={(fullName) => updateBasics({ fullName })}
          value={resume.basics.fullName}
        />

        <TextInputField
          error={basicErrors.role}
          label="Role"
          onValueChange={(role) => updateBasics({ role })}
          value={resume.basics.role}
        />

        <TextInputField
          error={basicErrors.headline}
          label="Headline"
          onValueChange={(headline) => updateBasics({ headline })}
          value={resume.basics.headline}
        />

        <TextInputField
          error={basicErrors.email}
          label="Email"
          onValueChange={(email) => updateBasics({ email })}
          type="email"
          value={resume.basics.email}
        />

        <TextInputField
          error={basicErrors.phone}
          inputMode="numeric"
          label="Phone"
          maxLength={10}
          onValueChange={(phone) => updateBasics({ phone: phone.replace(/\D/g, "").slice(0, 10) })}
          pattern="[0-9]*"
          placeholder="1234567890"
          value={resume.basics.phone}
        />

        <TextInputField
          error={basicErrors.location}
          label="Location"
          onValueChange={(location) => updateBasics({ location })}
          value={resume.basics.location}
        />

        <CheckboxField
          checked={resume.basics.linkEmail}
          onCheckedChange={(linkEmail) => updateBasics({ linkEmail })}
        >
          Email opens mail app
        </CheckboxField>

        <CheckboxField
          checked={resume.basics.linkPhone}
          onCheckedChange={(linkPhone) => updateBasics({ linkPhone })}
        >
          Phone opens call
        </CheckboxField>

        <CheckboxField
          checked={resume.basics.linkLocation}
          className="md:col-span-2"
          onCheckedChange={(linkLocation) => updateBasics({ linkLocation })}
        >
          Location opens Google search
        </CheckboxField>
      </div>
    </DraggableSection>
  );
};

export default BasicsSection;
