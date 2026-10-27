import {
  AlertCircle,
  BadgeCheck,
  Building2,
  GraduationCap,
  Languages,
  User,
  Wrench,
} from "lucide-react";

import {
  ISCED_LABELS,
  formatCertification,
  formatRoleDates,
  formatSpokenLanguage,
  formatTenure,
  roleSpanMonths,
} from "@veriworkly/ats-engine/format";

import type { AtsParsedResume } from "../../types";

function Missing({ label }: { label: string }) {
  return (
    <span className="bg-warning/10 text-warning inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium">
      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> no {label}
    </span>
  );
}

function Panel({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof User;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-3xl p-6 sm:p-8">
      <h3 className="flex items-center gap-2 text-xl font-bold tracking-tight">
        <Icon className="text-muted h-5 w-5" aria-hidden="true" />
        {title}
      </h3>
      {hint ? <p className="text-muted mt-1 text-sm leading-6">{hint}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ParsedView({ parsed }: { parsed: AtsParsedResume }) {
  const contact: Array<[string, string]> = [
    ["Name", parsed.name],
    ["Email", parsed.email],
    ["Phone", parsed.phone],
  ];

  return (
    <div className="space-y-4">
      <Panel
        icon={User}
        title="Candidate record"
        hint="The header fields a parser writes into the candidate profile."
      >
        <dl className="grid gap-3 sm:grid-cols-3">
          {contact.map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted text-sm font-medium">{label}</dt>
              <dd className="mt-1 text-base break-words">
                {value || <Missing label={label.toLowerCase()} />}
              </dd>
            </div>
          ))}
        </dl>
        {parsed.links.length ? (
          <p className="text-muted mt-4 text-sm break-words">Links: {parsed.links.join(" · ")}</p>
        ) : null}
      </Panel>

      <Panel
        icon={Building2}
        title={`Work history — ${parsed.roles.length} ${parsed.roles.length === 1 ? "row" : "rows"} recovered`}
        hint="One row per job. Recruiters filter on employer, title and dates, so a gap here is a gap in their search."
      >
        {parsed.roles.length ? (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-base">
              <thead>
                <tr className="border-border border-b">
                  {["Title", "Employer", "Dates", "Tenure"].map((heading) => (
                    <th key={heading} scope="col" className="text-muted pb-3 text-sm font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.roles.map((role, index) => {
                  const dates = formatRoleDates(role);
                  return (
                    <tr
                      key={`${role.title}-${role.employer}-${index}`}
                      className="border-border border-b last:border-0"
                    >
                      <td className="py-3 pr-3 font-medium">
                        {role.title || <Missing label="title" />}
                      </td>
                      <td className="py-3 pr-3">{role.employer || <Missing label="employer" />}</td>
                      <td className="py-3 pr-3 tabular-nums">
                        {dates ?? <Missing label="dates" />}
                      </td>
                      <td className="text-muted py-3 tabular-nums">
                        {role.start ? formatTenure(roleSpanMonths(role)) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-warning text-base leading-7">
            No work history could be recovered. A parser builds one row per job from an employer, a
            job title and a date range on the same line or the line above — without them the role
            never enters the recruiter&rsquo;s search at all.
          </p>
        )}

        {parsed.monthsOfExperience !== null ? (
          <p className="border-border text-muted mt-5 border-t pt-4 text-base leading-7">
            Total experience read from your dates:{" "}
            <span className="text-foreground font-semibold tabular-nums">
              {formatTenure(parsed.monthsOfExperience)}
            </span>
            <span className="text-muted">
              {" "}
              — overlapping roles counted once, which is how a filter on years of experience reads
              it.
            </span>
          </p>
        ) : null}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel icon={GraduationCap} title="Education">
          {parsed.education.length ? (
            <ul className="space-y-2.5">
              {parsed.education.map((entry, index) => (
                <li key={`${entry.school}-${index}`} className="text-base leading-7">
                  <span className="font-semibold">
                    {entry.credential || entry.school || "Entry"}
                  </span>
                  {entry.school && entry.credential ? (
                    <span className="text-muted"> — {entry.school}</span>
                  ) : null}
                  {entry.end ? (
                    <span className="text-muted tabular-nums"> ({entry.end.year})</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted text-base">No education entries recovered.</p>
          )}
          {parsed.highestIsced ? (
            <p className="text-muted mt-4 text-sm">
              Highest level read:{" "}
              <span className="text-foreground font-medium">
                {ISCED_LABELS[parsed.highestIsced]}
              </span>
            </p>
          ) : null}
        </Panel>

        <Panel icon={Wrench} title={`Indexed skills — ${parsed.skills.length}`}>
          {parsed.skills.length ? (
            <ul className="flex flex-wrap gap-2">
              {parsed.skills.map((skill) => (
                <li
                  key={skill}
                  className="bg-background rounded-full px-3 py-1 text-sm font-medium"
                >
                  {skill}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted text-base">
              No skills section found. A labelled Skills heading with a comma-separated list is what
              a parser indexes for keyword search.
            </p>
          )}
        </Panel>
      </div>

      {parsed.certifications.length || parsed.spokenLanguages.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel
            icon={BadgeCheck}
            title={`Certifications — ${parsed.certifications.length}`}
            hint="Each filed with its issuer and dates, which is what a requirement such as “AWS certification” is checked against."
          >
            {parsed.certifications.length ? (
              <ul className="space-y-2.5">
                {parsed.certifications.map((row, index) => (
                  <li key={`${row.name}-${index}`} className="text-base leading-7">
                    {formatCertification(row)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted text-base">No certifications recovered.</p>
            )}
          </Panel>

          <Panel
            icon={Languages}
            title={`Languages — ${parsed.spokenLanguages.length}`}
            hint="Each with its level on the European scale (A1–C2), which a requirement such as “fluent German” is checked against."
          >
            {parsed.spokenLanguages.length ? (
              <ul className="flex flex-wrap gap-2">
                {parsed.spokenLanguages.map((row) => (
                  <li
                    key={row.language}
                    className="bg-background rounded-full px-3 py-1 text-sm font-medium"
                  >
                    {formatSpokenLanguage(row)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted text-base">No spoken languages recovered.</p>
            )}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
