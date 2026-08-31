import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { COMPETITORS } from "../../data";

export const CompareQuickMatrix = () => {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Quick Comparison Table
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Compare all 6 platforms at a glance
        </h2>

        <p className="text-muted max-w-2xl text-sm leading-relaxed">
          See the key rules, download limits, and starting prices side-by-side.
        </p>
      </div>

      <div className="border-border/60 bg-card/40 overflow-hidden rounded-2xl border shadow-md backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 border-collapse text-left text-xs sm:text-sm">
            <caption className="sr-only">
              Quick comparison of VeriWorkly against Rezi, Teal, Kickresume, Novoresume, Zety, and
              Enhancv
            </caption>

            <thead>
              <tr className="border-border/60 bg-muted/4 text-muted border-b font-mono text-[10px] font-bold tracking-wider uppercase sm:text-[11px]">
                <th className="p-4 sm:p-5">Platform</th>
                <th className="p-4 sm:p-5">Sign-Up Needed</th>
                <th className="p-4 sm:p-5">Free PDF Downloads</th>
                <th className="p-4 sm:p-5">Watermarks</th>
                <th className="p-4 sm:p-5">Job-Post ATS Match</th>
                <th className="p-4 sm:p-5">Online Portfolio</th>
                <th className="p-4 sm:p-5">Starting Price</th>
                <th className="p-4 text-right sm:p-5">Details</th>
              </tr>
            </thead>

            <tbody className="divide-border/40 divide-y">
              <tr className="bg-accent/6 font-medium transition-colors">
                <td className="text-foreground flex items-center gap-2 p-4 font-bold sm:p-5">
                  <span className="bg-accent size-2.5 animate-pulse rounded-full" />
                  <span className="text-base">VeriWorkly</span>
                </td>

                <td className="p-4 font-semibold text-emerald-600 sm:p-5 dark:text-emerald-400">
                  No login needed
                </td>

                <td className="p-4 font-semibold text-emerald-600 sm:p-5 dark:text-emerald-400">
                  Unlimited PDF, DOCX, MD
                </td>

                <td className="p-4 font-semibold text-emerald-600 sm:p-5 dark:text-emerald-400">
                  Documents: No Watermark
                </td>

                <td className="text-foreground p-4 font-semibold sm:p-5">Matches Target Job</td>

                <td className="p-4 font-semibold text-emerald-600 sm:p-5 dark:text-emerald-400">
                  Free core, paid premium
                </td>

                <td className="text-accent p-4 font-mono font-bold sm:p-5">$0 Free Core</td>

                <td className="p-4 text-right sm:p-5">
                  <span className="bg-accent/15 text-accent rounded-md px-2.5 py-1 text-[11px] font-bold">
                    You Are Here
                  </span>
                </td>
              </tr>

              {COMPETITORS.map((comp) => (
                <tr key={comp.id} className="hover:bg-muted/3 transition-colors">
                  <td className="text-foreground flex items-center gap-2.5 p-4 font-semibold sm:p-5">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: comp.color }}
                    />

                    <span className="text-sm">{comp.name}</span>
                  </td>

                  <td className="text-muted p-4 sm:p-5">
                    <span className="text-destructive/90 font-medium">Required</span>
                  </td>

                  <td className="text-muted p-4 sm:p-5">
                    {comp.id === "rezi" && "Capped (3 downloads)"}
                    {comp.id === "teal" && "Unlimited PDF"}
                    {comp.id === "kickresume" && "Limited styling"}
                    {comp.id === "novoresume" && "1-page PDF only"}
                    {comp.id === "zety" && "Plain text only (.txt)"}
                    {comp.id === "enhancv" && "Watermarked trial"}
                  </td>

                  <td className="text-muted p-4 sm:p-5">
                    {comp.id === "enhancv" ? (
                      <span className="text-destructive/90 font-medium">Watermarked</span>
                    ) : (
                      "Clean"
                    )}
                  </td>

                  <td className="text-muted p-4 sm:p-5">
                    {comp.id === "novoresume"
                      ? "General completeness only"
                      : comp.id === "zety"
                        ? "Basic formatting"
                        : "Included"}
                  </td>

                  <td className="text-muted p-4 sm:p-5">
                    {comp.id === "kickresume" ? "Included (Paid themes)" : "No"}
                  </td>

                  <td className="text-muted p-4 font-mono text-xs sm:p-5">
                    {comp.id === "rezi" && "$29/mo or $149"}
                    {comp.id === "teal" && "~$29/mo (Teal+)"}
                    {comp.id === "kickresume" && "$4-$9/mo"}
                    {comp.id === "novoresume" && "$19.99/mo"}
                    {comp.id === "zety" && "$1.95 trial → $25.95/4wks"}
                    {comp.id === "enhancv" && "$13-$25/mo"}
                  </td>

                  <td className="p-4 text-right sm:p-5">
                    <Link
                      href={`/compare/${comp.id}`}
                      className="text-accent inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                    >
                      Compare
                      <ArrowRight className="size-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default CompareQuickMatrix;
