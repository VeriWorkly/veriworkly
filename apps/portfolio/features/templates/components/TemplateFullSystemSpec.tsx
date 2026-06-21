"use client";

import { useState } from "react";

import type { TemplateDetails } from "../data/template-details";

type SystemSpecProps = {
  details: TemplateDetails;
};

const TemplateFullSystemSpec = ({ details }: SystemSpecProps) => {
  const { system } = details;

  const [activeTab, setActiveTab] = useState<"blueprint" | "layout" | "components" | "json">(
    "blueprint",
  );

  if (!system) return null;

  const tabs = [
    { id: "blueprint", label: "Visual Blueprint" },
    { id: "layout", label: "Layout & Shapes" },
    { id: "components", label: "Component Spec" },
    { id: "json", label: "JSON Spec" },
  ] as const;

  return (
    <section className="border-ink-2/10 dark:bg-paper-2 border-t bg-[#faf9f6] py-20 md:py-28">
      <div className="mx-auto w-[min(1200px,calc(100%-48px))]">
        <div className="mb-12 md:mb-16">
          <p className="text-accent mb-3 font-mono text-[0.72rem] font-bold tracking-[0.2em] uppercase">
            Technical Spec Sheet
          </p>

          <h2 className="text-ink-2 text-[clamp(2.2rem,4vw,3.6rem)] leading-[1.1] font-bold tracking-tighter">
            Engineering blueprint.
          </h2>

          <p className="text-ink-2/65 mt-4 max-w-2xl text-base leading-relaxed">
            Developer specifications, design tokens, responsive thresholds, and structural rules
            powering this template.
          </p>
        </div>

        <div className="border-ink-2/10 mb-10 flex flex-wrap gap-2 border-b pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer rounded-full px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-ink-2 text-paper shadow-sm"
                  : "text-ink-2/62 hover:bg-ink-2/5 hover:text-ink-2"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-[400px]">
          {activeTab === "blueprint" && (
            <div className="animate-fade-in space-y-10">
              <div className="grid gap-6 md:grid-cols-2">
                <article className="border-ink-2/10 dark:bg-panel rounded-3xl border bg-white p-6 md:p-8">
                  <span className="text-accent font-mono text-[10px] font-bold tracking-wider uppercase">
                    01 / POSTURE & GENRE
                  </span>

                  <h3 className="text-ink-2 mt-4 mb-3 text-xl font-bold tracking-tight uppercase">
                    Visual Strategy
                  </h3>

                  <p className="text-ink-2/72 text-sm leading-relaxed">
                    {system.overview.description}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="bg-accent/8 border-accent/15 text-accent rounded-full border px-3 py-1 font-mono text-[11px] font-bold uppercase">
                      {system.overview.genre}
                    </span>

                    <span className="bg-ink-2/5 border-ink-2/10 text-ink-2/72 rounded-full border px-3 py-1 font-mono text-[11px] font-bold uppercase">
                      Hue: {system.overview.anchorHue}
                    </span>
                  </div>
                </article>

                <article className="border-ink-2/10 dark:bg-panel rounded-3xl border bg-white p-6 md:p-8">
                  <span className="text-accent font-mono text-[10px] font-bold tracking-wider uppercase">
                    02 / CANVAS COLORSPACES
                  </span>

                  <h3 className="text-ink-2 mt-4 mb-3 text-xl font-bold tracking-tight uppercase">
                    The Floor
                  </h3>

                  <p className="text-ink-2/72 text-sm leading-relaxed">
                    The page canvas operates with {system.overview.canvas}. Layout transitions
                    handle values cleanly across dark and light palettes.
                  </p>

                  <div className="mt-6 space-y-2">
                    <div className="border-ink-2/10 flex items-center justify-between border-b pb-2 text-xs">
                      <span className="text-ink-2/62 font-semibold">Dark Canvas</span>

                      <span className="bg-ink-2/5 text-ink-2/80 rounded px-2.5 py-1 font-mono text-[10px] font-bold">
                        {system.colors.surface.paperDark}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-ink-2/62 font-semibold">Light Canvas</span>

                      <span className="bg-ink-2/5 text-ink-2/80 rounded px-2.5 py-1 font-mono text-[10px] font-bold">
                        {system.colors.surface.paperLight}
                      </span>
                    </div>
                  </div>
                </article>
              </div>

              <div className="border-ink-2/10 dark:bg-panel rounded-3xl border bg-white p-6 md:p-8">
                <span className="text-accent mb-4 block font-mono text-[10px] font-bold tracking-wider uppercase">
                  03 / BRAND COLOR MATRIX
                </span>

                <h3 className="text-ink-2 mb-6 text-xl font-bold tracking-tight uppercase">
                  Accent & Surface Hues
                </h3>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="border-ink-2/10 dark:bg-paper-2 rounded-2xl border bg-[#faf9f6] p-4.5">
                    <div className="border-ink-2/10 mb-3 h-10 rounded-xl border bg-[#39e5a1]" />
                    <h4 className="text-ink-2 text-sm font-bold">Accent (Dark)</h4>
                    <p className="text-ink-2/62 mt-1 font-mono text-[11px]">
                      {system.colors.brand.accentDark}
                    </p>
                  </div>

                  <div className="border-ink-2/10 dark:bg-paper-2 rounded-2xl border bg-[#faf9f6] p-4.5">
                    <div className="border-ink-2/10 mb-3 h-10 rounded-xl border bg-[#1a8f65]" />
                    <h4 className="text-ink-2 text-sm font-bold">Accent (Light)</h4>
                    <p className="text-ink-2/62 mt-1 font-mono text-[11px]">
                      {system.colors.brand.accentLight}
                    </p>
                  </div>

                  <div className="border-ink-2/10 dark:bg-paper-2 rounded-2xl border bg-[#faf9f6] p-4.5">
                    <div className="border-ink-2/10 mb-3 h-10 rounded-xl border bg-[#0c100e]" />
                    <h4 className="text-ink-2 text-sm font-bold">Obsidian Paper</h4>
                    <p className="text-ink-2/62 mt-1 font-mono text-[11px]">
                      {system.colors.surface.paperDark}
                    </p>
                  </div>

                  <div className="border-ink-2/10 dark:bg-paper-2 rounded-2xl border bg-[#faf9f6] p-4.5">
                    <div className="border-ink-2/10 mb-3 h-10 rounded-xl border bg-[#fbfcf9]" />
                    <h4 className="text-ink-2 text-sm font-bold">Chalk Paper</h4>
                    <p className="text-ink-2/62 mt-1 font-mono text-[11px]">
                      {system.colors.surface.paperLight}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-ink-2/10 dark:bg-panel overflow-x-auto rounded-3xl border bg-white p-6 md:p-8">
                <span className="text-accent mb-4 block font-mono text-[10px] font-bold tracking-wider uppercase">
                  04 / TYPOGRAPHIC HIERARCHY
                </span>

                <h3 className="text-ink-2 mb-6 text-xl font-bold tracking-tight uppercase">
                  Text Tokens
                </h3>

                <table className="w-full min-w-[650px] border-collapse text-left">
                  <thead>
                    <tr className="border-ink-2/10 text-ink-2/62 border-b font-mono text-xs uppercase">
                      <th className="pb-3 font-bold">Token</th>
                      <th className="pb-3 font-bold">Size</th>
                      <th className="pb-3 font-bold">Weight</th>
                      <th className="pb-3 font-bold">Purpose / Use Case</th>
                    </tr>
                  </thead>

                  <tbody className="divide-ink-2/5 divide-y">
                    {system.typography.hierarchy.map((row: any) => (
                      <tr key={row.token} className="text-sm">
                        <td className="text-accent py-4 font-mono font-bold">{row.token}</td>
                        <td className="text-ink-2 py-4 font-semibold">{row.size}</td>
                        <td className="text-ink-2/62 py-4 font-mono text-xs">{row.weight}</td>
                        <td className="text-ink-2/80 py-4 font-medium">{row.use}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "layout" && (
            <div className="animate-fade-in space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="border-ink-2/10 dark:bg-panel rounded-3xl border bg-white p-6 md:p-8">
                  <span className="text-accent mb-4 block font-mono text-[10px] font-bold tracking-wider uppercase">
                    01 / LAYOUT GRID SYSTEMS
                  </span>

                  <h3 className="text-ink-2 mb-6 text-xl font-bold tracking-tight uppercase">
                    Spacing Standards
                  </h3>

                  <div className="space-y-4">
                    <div className="border-ink-2/10 flex items-center justify-between border-b pb-3 text-sm">
                      <span className="text-ink-2/62 font-semibold">Base Spacing Unit</span>
                      <span className="bg-ink-2/5 text-ink-2/80 rounded px-2.5 py-1 font-mono text-xs font-bold">
                        {system.layout?.baseGridUnit || "4px"}
                      </span>
                    </div>

                    <div className="border-ink-2/10 flex items-center justify-between border-b pb-3 text-sm">
                      <span className="text-ink-2/62 font-semibold">Section Padding</span>
                      <span className="bg-ink-2/5 text-ink-2/80 rounded px-2.5 py-1 font-mono text-xs font-bold">
                        {system.layout?.sectionPadding || "120px desktop"}
                      </span>
                    </div>

                    <div className="border-ink-2/10 flex items-center justify-between border-b pb-3 text-sm">
                      <span className="text-ink-2/62 font-semibold">Asymmetric Split Layout</span>
                      <span className="bg-ink-2/5 text-ink-2/80 rounded px-2.5 py-1 font-mono text-xs font-bold">
                        {system.layout?.asymmetricSplit || "320px left / 1fr right"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-2/62 font-semibold">Max Container Boundary</span>
                      <span className="bg-ink-2/5 text-ink-2/80 rounded px-2.5 py-1 font-mono text-xs font-bold">
                        {system.layout?.containerLimit || "1200px limit"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-ink-2/10 dark:bg-panel rounded-3xl border bg-white p-6 md:p-8">
                  <span className="text-accent mb-4 block font-mono text-[10px] font-bold tracking-wider uppercase">
                    02 / GEOMETRY & RADIUS TOKENS
                  </span>

                  <h3 className="text-ink-2 mb-6 text-xl font-bold tracking-tight uppercase">
                    Corner Radii
                  </h3>

                  <div className="space-y-4">
                    <div className="border-ink-2/10 flex items-center justify-between border-b pb-3 text-sm">
                      <span className="text-ink-2/62 font-semibold">Card Corner Radius</span>
                      <span className="bg-ink-2/5 text-ink-2/80 rounded px-2.5 py-1 font-mono text-xs font-bold">
                        {system.shapes?.cardRadius || "24px"}
                      </span>
                    </div>

                    <div className="border-ink-2/10 flex items-center justify-between border-b pb-3 text-sm">
                      <span className="text-ink-2/62 font-semibold">Interior Item Radius</span>
                      <span className="bg-ink-2/5 text-ink-2/80 rounded px-2.5 py-1 font-mono text-xs font-bold">
                        {system.shapes?.itemRadius || "16px"}
                      </span>
                    </div>

                    <div className="border-ink-2/10 flex items-center justify-between border-b pb-3 text-sm">
                      <span className="text-ink-2/62 font-semibold">
                        Button/Input Corner Radius
                      </span>

                      <span className="bg-ink-2/5 text-ink-2/80 rounded px-2.5 py-1 font-mono text-xs font-bold">
                        {system.shapes?.buttonRadius || "14px"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-2/62 font-semibold">Badge/Pill Radius</span>
                      <span className="bg-ink-2/5 text-ink-2/80 rounded px-2.5 py-1 font-mono text-xs font-bold">
                        {system.shapes?.badgeRadius || "9999px"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {system.responsive?.breakpoints && (
                <div className="border-ink-2/10 dark:bg-panel overflow-x-auto rounded-3xl border bg-white p-6 md:p-8">
                  <span className="text-accent mb-4 block font-mono text-[10px] font-bold tracking-wider uppercase">
                    03 / RESPONSIVE BREAKPOINT BEHAVIORS
                  </span>

                  <h3 className="text-ink-2 mb-6 text-xl font-bold tracking-tight uppercase">
                    Media Query Rules
                  </h3>

                  <table className="w-full min-w-[650px] border-collapse text-left">
                    <thead>
                      <tr className="border-ink-2/10 text-ink-2/62 border-b font-mono text-xs uppercase">
                        <th className="pb-3 font-bold">Breakpoint</th>
                        <th className="pb-3 font-bold">Width Range</th>
                        <th className="pb-3 font-bold">Layout Adjustment & Behaviors</th>
                      </tr>
                    </thead>

                    <tbody className="divide-ink-2/5 divide-y">
                      {system.responsive.breakpoints.map((bp: any) => (
                        <tr key={bp.name} className="text-sm">
                          <td className="text-accent py-4 font-mono font-bold uppercase">
                            {bp.name}
                          </td>

                          <td className="text-ink-2 py-4 font-mono text-xs">{bp.width}</td>

                          <td className="text-ink-2/80 py-4 leading-relaxed font-medium">
                            {bp.behavior}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "components" && (
            <div className="animate-fade-in grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(system.components || {}).map(([key, comp]: [string, any]) => (
                <div
                  key={key}
                  className="border-ink-2/10 dark:bg-panel flex flex-col justify-between rounded-3xl border bg-white p-6"
                >
                  <div>
                    <span className="text-accent font-mono text-[9px] font-bold tracking-wider uppercase">
                      Component Spec / {key}
                    </span>

                    <h4 className="text-ink-2 mt-3 mb-4 text-lg font-bold tracking-tight">
                      {comp.name}
                    </h4>

                    <p className="text-ink-2/72 text-xs leading-relaxed">{comp.treatment}</p>
                  </div>

                  <div className="border-ink-2/5 text-ink-2/55 mt-6 flex items-center justify-between border-t pt-4 font-mono text-[11px]">
                    <span>Target Class</span>

                    <span className="bg-ink-2/5 text-ink-2/80 rounded px-1.5 py-0.5">
                      .signal-{key}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "json" && (
            <div className="border-ink-2/10 animate-fade-in max-h-[500px] overflow-x-auto rounded-3xl border bg-[#0f1412] p-6 font-mono text-xs text-emerald-400 shadow-inner">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3 text-[11px] text-white/50">
                <span>programmatic_design_spec.json</span>
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(system, null, 2))}
                  className="cursor-pointer rounded border border-white/10 bg-white/5 px-2.5 py-1 font-bold text-white transition hover:bg-white/10 active:scale-95"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="leading-5">{JSON.stringify(system, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TemplateFullSystemSpec;
