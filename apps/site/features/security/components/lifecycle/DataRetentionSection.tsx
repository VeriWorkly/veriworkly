import { Trash2 } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";

import { DATA_RETENTION_MATRIX } from "../../data";

export const DataRetentionSection = () => {
  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Data Lifecycle &amp; Erasure
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Cryptographic retention and purge policies
        </h2>

        <p className="text-muted max-w-2xl text-sm leading-relaxed">
          We do not monetize or hold user data indefinitely. Review our exact retention timelines
          and deletion methods across each platform subsystem.
        </p>
      </div>

      <Reveal className="border-border/60 bg-card/40 overflow-hidden rounded-3xl border shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 border-collapse text-left text-sm">
            <caption className="sr-only">
              Data retention, storage location, and deletion lifecycle matrix
            </caption>

            <thead>
              <tr className="border-border/60 bg-muted/4 text-muted border-b font-mono text-[11px] font-bold tracking-wider uppercase">
                <th scope="col" className="w-1/4 p-4 sm:p-5">
                  Platform Area
                </th>

                <th scope="col" className="w-1/4 p-4 sm:p-5">
                  Storage Location
                </th>

                <th scope="col" className="w-1/4 p-4 sm:p-5">
                  Retention Period
                </th>

                <th scope="col" className="w-1/4 p-4 sm:p-5">
                  Deletion Method
                </th>
              </tr>
            </thead>

            <tbody className="divide-border/40 divide-y">
              {DATA_RETENTION_MATRIX.map((row) => (
                <tr key={row.platformArea} className="hover:bg-muted/3 transition-colors">
                  <th
                    scope="row"
                    className="text-foreground p-4 text-xs font-semibold sm:p-5 sm:text-sm"
                  >
                    <div className="space-y-1">
                      <span>{row.platformArea}</span>

                      <span className="text-accent block font-mono text-[10px] font-normal">
                        {row.encryption}
                      </span>
                    </div>
                  </th>

                  <td className="text-muted p-4 text-xs sm:p-5 sm:text-sm">
                    {row.storageLocation}
                  </td>

                  <td className="p-4 text-xs sm:p-5 sm:text-sm">
                    <span className="text-foreground font-medium">{row.retentionPeriod}</span>
                  </td>

                  <td className="text-muted p-4 text-xs sm:p-5 sm:text-sm">
                    <div className="flex items-start gap-1.5">
                      <Trash2 className="text-destructive mt-0.5 size-3.5 shrink-0" />

                      <span>{row.deletionMethod}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </section>
  );
};

export default DataRetentionSection;
