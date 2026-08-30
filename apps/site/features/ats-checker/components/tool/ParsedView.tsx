import { AlertCircle, Building2, GraduationCap, User, Wrench } from "lucide-react";

import type { AtsParsedDate, AtsParsedResume } from "../../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DEGREE_LABELS: Record<string, string> = {
  diploma: "Diploma",
  associate: "Associate",
  bachelor: "Bachelor's",
  master: "Master's",
  doctorate: "Doctorate",
};

function formatDate(date: AtsParsedDate | null) {
  if (!date) return null;
  return date.month ? `${MONTHS[date.month - 1]} ${date.year}` : String(date.year);
}

function formatSpan(months: number) {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (!years) return `${rest} mo`;
  return rest ? `${years} yr ${rest} mo` : `${years} yr`;
}

function monthsBetween(start: AtsParsedDate, end: AtsParsedDate | null, current: boolean) {
  const now = new Date();
  const from = start.year * 12 + (start.month ?? 1) - 1;
  const to = current
    ? now.getFullYear() * 12 + now.getMonth()
    : end
      ? end.year * 12 + (end.month ?? 12) - 1
      : from;
  return Math.max(0, to - from + 1);
}

/** A field the parser could not recover, shown as the empty column it actually is. */
function Missing({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
      <AlertCircle className="h-3 w-3" aria-hidden="true" /> no {label}
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
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-white/2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
        <Icon className="h-4 w-4 text-zinc-400" aria-hidden="true" />
        {title}
      </h3>
      {hint ? (
        <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * The recovered record, shown as the database rows it becomes.
 *
 * This is the half of the report that is not a score. An applicant tracking system does not rank
 * a resume — it shreds it into a row per job and lets recruiters filter those rows, so a blank
 * employer or a missing date range is a column their search cannot match on. Seeing the table is
 * what makes that concrete in a way no number does.
 */
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
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</dt>
              <dd className="mt-0.5 text-sm break-words text-zinc-900 dark:text-white">
                {value || <Missing label={label.toLowerCase()} />}
              </dd>
            </div>
          ))}
        </dl>
        {parsed.links.length ? (
          <p className="mt-3 text-xs break-words text-zinc-500 dark:text-zinc-400">
            Links: {parsed.links.join(" · ")}
          </p>
        ) : null}
      </Panel>

      <Panel
        icon={Building2}
        title={`Work history — ${parsed.roles.length} ${parsed.roles.length === 1 ? "row" : "rows"} recovered`}
        hint="One row per job. Recruiters filter on employer, title and dates, so a gap here is a gap in their search."
      >
        {parsed.roles.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  {["Title", "Employer", "Dates", "Tenure"].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="pb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.roles.map((role, index) => {
                  const from = formatDate(role.start);
                  const to = role.current ? "Present" : formatDate(role.end);
                  return (
                    <tr
                      key={`${role.title}-${role.employer}-${index}`}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                    >
                      <td className="py-2.5 pr-3 text-zinc-900 dark:text-white">
                        {role.title || <Missing label="title" />}
                      </td>
                      <td className="py-2.5 pr-3 text-zinc-700 dark:text-zinc-300">
                        {role.employer || <Missing label="employer" />}
                      </td>
                      <td className="py-2.5 pr-3 text-zinc-700 tabular-nums dark:text-zinc-300">
                        {from ? `${from} – ${to ?? "?"}` : <Missing label="dates" />}
                      </td>
                      <td className="py-2.5 text-zinc-500 tabular-nums dark:text-zinc-400">
                        {role.start
                          ? formatSpan(monthsBetween(role.start, role.end, role.current))
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            No work history could be recovered. A parser builds one row per job from an employer, a
            job title and a date range on the same line or the line above — without them the role
            never enters the recruiter&rsquo;s search at all.
          </p>
        )}

        {parsed.monthsOfExperience !== null ? (
          <p className="mt-4 border-t border-zinc-100 pt-3 text-sm text-zinc-600 dark:border-zinc-900 dark:text-zinc-300">
            Total experience read from your dates:{" "}
            <span className="font-semibold text-zinc-900 tabular-nums dark:text-white">
              {formatSpan(parsed.monthsOfExperience)}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
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
                <li key={`${entry.school}-${index}`} className="text-sm">
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {entry.credential || entry.school || "Entry"}
                  </span>
                  {entry.school && entry.credential ? (
                    <span className="text-zinc-600 dark:text-zinc-300"> — {entry.school}</span>
                  ) : null}
                  {entry.end ? (
                    <span className="text-zinc-500 tabular-nums dark:text-zinc-400">
                      {" "}
                      ({entry.end.year})
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No education entries recovered.
            </p>
          )}
          {parsed.highestDegree ? (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Highest degree read:{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                {DEGREE_LABELS[parsed.highestDegree]}
              </span>
            </p>
          ) : null}
        </Panel>

        <Panel icon={Wrench} title={`Indexed skills — ${parsed.skills.length}`}>
          {parsed.skills.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {parsed.skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-white/5 dark:text-zinc-300"
                >
                  {skill}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No skills section found. A labelled Skills heading with a comma-separated list is what
              a parser indexes for keyword search.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

export default ParsedView;
