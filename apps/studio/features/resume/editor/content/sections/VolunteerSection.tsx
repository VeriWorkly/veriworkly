"use client";

import type { BaseSectionProps } from "./section-types";

import { CheckboxField, TextAreaField, TextInputField } from "@/features/documents/editor/form";
import TypedSectionEditor from "./TypedSectionEditor";

const VolunteerSection = (props: BaseSectionProps) => {
  return (
    <TypedSectionEditor
      {...props}
      sectionKey="volunteer"
      sectionId="volunteer"
      label="Volunteer"
      addLabel="Add volunteer entry"
      fallbackItemLabel="Volunteer"
      emptyMessage="No volunteer entries yet. Click Add volunteer entry."
      labelFor={(item) => item.organization}
    >
      {({ item: volunteer, update }) => (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInputField
              label="Organization"
              value={volunteer.organization}
              onValueChange={(organization) => update({ organization })}
            />

            <TextInputField
              label="Role"
              value={volunteer.role}
              onValueChange={(role) => update({ role })}
            />

            {/*
              A real start/end pair, like experience has. The flattened model had one `date`
              field, so a volunteer stint could only ever print whichever single date fitted.
            */}
            <TextInputField
              type="month"
              label="Start date (YYYY-MM)"
              value={volunteer.startDate}
              onValueChange={(startDate) => update({ startDate })}
            />

            <TextInputField
              type="month"
              label="End date (YYYY-MM)"
              disabled={volunteer.current}
              value={volunteer.endDate}
              onValueChange={(endDate) => update({ endDate })}
            />

            <TextInputField
              label="Location"
              value={volunteer.location}
              onValueChange={(location) => update({ location })}
            />

            <CheckboxField
              checked={volunteer.current}
              onCheckedChange={(current) =>
                update({ current, endDate: current ? "" : volunteer.endDate })
              }
            >
              I currently volunteer here
            </CheckboxField>
          </div>

          <div className="mt-4">
            <TextAreaField
              label="Summary"
              value={volunteer.summary}
              onValueChange={(summary) => update({ summary })}
            />
          </div>
        </>
      )}
    </TypedSectionEditor>
  );
};

export default VolunteerSection;
