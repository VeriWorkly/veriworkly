"use client";

import type { BaseSectionProps } from "./section-types";

import { useResumeStore } from "@/features/resume/store/resume-store";
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
  const basics = useResumeStore((state) => state.resume.basics);
  const updateBasics = useResumeStore((state) => state.updateBasics);
  const basicErrors = validateBasics(basics);

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
          inputMode="numeric"
          label="Phone"
          maxLength={10}
          onValueChange={(phone) => updateBasics({ phone: phone.replace(/\D/g, "").slice(0, 10) })}
          pattern="[0-9]*"
          placeholder="1234567890"
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
    </DraggableSection>
  );
};

export default BasicsSection;
