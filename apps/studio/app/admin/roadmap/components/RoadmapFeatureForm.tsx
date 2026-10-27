"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

import type { RoadmapStatus, RoadmapFeature } from "@/features/roadmap/services/roadmap-backend";

import { Input, Button, Select, TextArea, cn } from "@veriworkly/ui";

import Panel from "@/components/admin/Panel";

import {
  createRoadmapFeature,
  updateRoadmapFeature,
} from "@/features/roadmap/services/admin-roadmap";
import { buildRoadmapPayload } from "@/app/admin/roadmap/components/roadmap-payload";
import { Badge } from "@veriworkly/ui";

const STATUS_OPTIONS: Array<{ value: RoadmapStatus; label: string }> = [
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

/**
 * Which date fields the server keeps for a status (`resolveStatusTimestamps`): a to-do item
 * clears both dates, an in-progress one its completion date, and the quarter label is set only
 * on a done item. The rest are disabled, so nothing typed into them is silently dropped.
 */
export function roadmapDateFields(status: RoadmapStatus) {
  return {
    startedAt: status !== "todo",
    completedAt: status === "done",
    completedQuarter: status === "done",
  };
}

const toDatetimeLocalValue = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (isNaN(date.getTime())) return "";

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function RoadmapFeatureForm({
  mode,
  feature,
}: {
  mode: "create" | "edit";
  feature?: RoadmapFeature;
}) {
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: feature?.title ?? "",
    description: feature?.description ?? "",
    status: (feature?.status ?? "todo") as RoadmapStatus,
    eta: feature?.eta ?? "",
    completedQuarter: feature?.completedQuarter ?? "",
    tags: (feature?.tags ?? []).join(", "),
    fullDescription: feature?.fullDescription ?? "",
    whyItMatters: feature?.whyItMatters ?? "",
    timeline: feature?.timeline ?? "",
    startedAt: toDatetimeLocalValue(feature?.startedAt),
    completedAt: toDatetimeLocalValue(feature?.completedAt),
    detailsJson: feature?.details ? JSON.stringify(feature.details, null, 2) : "",
  });

  const titleText = mode === "create" ? "Create roadmap item" : "Update roadmap item";
  const dateFields = roadmapDateFields(formData.status);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { id, value } = e.target;
      setFormData((prev) => ({ ...prev, [id]: value }));
    },
    [],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      setIsSaving(true);

      // A disabled date is sent as blank, as shown: the server would drop it anyway.
      const payload = buildRoadmapPayload(
        {
          ...formData,
          startedAt: dateFields.startedAt ? formData.startedAt : "",
          completedAt: dateFields.completedAt ? formData.completedAt : "",
          completedQuarter: dateFields.completedQuarter ? formData.completedQuarter : "",
        },
        mode,
      );

      if (mode === "create") {
        await createRoadmapFeature(payload);
      } else if (feature?.id) {
        await updateRoadmapFeature(feature.id, payload);
      }

      router.push("/admin/roadmap");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Panel className="rounded-xl p-4 md:p-6">
      <header className="mb-5">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">{titleText}</h2>

        <p className="text-muted mt-1 text-sm">
          Define feature details, narrative blocks, and custom JSON metadata for the roadmap.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-foreground text-sm font-semibold" htmlFor="title">
            Title
          </label>

          <Input
            required
            id="title"
            disabled={isSaving}
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., AI-Powered Resume Tailoring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-foreground text-sm font-semibold" htmlFor="status">
            Status
          </label>
          <Select
            id="status"
            disabled={isSaving}
            value={formData.status}
            onChange={handleInputChange}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-foreground text-sm font-semibold" htmlFor="eta">
            ETA
          </label>

          <Input
            id="eta"
            value={formData.eta}
            onChange={handleInputChange}
            placeholder="Q4 2026"
            disabled={isSaving}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-foreground text-sm font-semibold" htmlFor="description">
            Short Summary
          </label>

          <TextArea
            required
            id="description"
            disabled={isSaving}
            className="min-h-20"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="A brief overview for the roadmap cards..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-foreground text-sm font-semibold" htmlFor="startedAt">
            Started At
          </label>

          <Input
            id="startedAt"
            disabled={isSaving || !dateFields.startedAt}
            type="datetime-local"
            aria-describedby={dateFields.startedAt ? undefined : "roadmap-dates-hint"}
            value={dateFields.startedAt ? formData.startedAt : ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-2">
          <label className="text-foreground text-sm font-semibold" htmlFor="completedAt">
            Completed At
          </label>

          <Input
            id="completedAt"
            disabled={isSaving || !dateFields.completedAt}
            type="datetime-local"
            aria-describedby={dateFields.completedAt ? undefined : "roadmap-dates-hint"}
            value={dateFields.completedAt ? formData.completedAt : ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-2">
          <label className="text-foreground text-sm font-semibold" htmlFor="completedQuarter">
            Quarter Label
          </label>

          <Input
            disabled={isSaving || !dateFields.completedQuarter}
            id="completedQuarter"
            placeholder="Q2 2026"
            aria-describedby={dateFields.completedQuarter ? undefined : "roadmap-dates-hint"}
            onChange={handleInputChange}
            value={dateFields.completedQuarter ? formData.completedQuarter : ""}
          />
        </div>

        {formData.status !== "done" ? (
          <p id="roadmap-dates-hint" className="text-muted text-xs md:col-span-2">
            {formData.status === "todo"
              ? "A to-do item has no start or completion date; they are set when it moves on."
              : "An in-progress item has no completion date or quarter yet; they are set when it is done."}
          </p>
        ) : null}

        <div className="space-y-2">
          <label className="text-foreground text-sm font-semibold" htmlFor="tags">
            Tags
          </label>

          <Input
            id="tags"
            disabled={isSaving}
            value={formData.tags}
            onChange={handleInputChange}
            placeholder="Separate with commas..."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-foreground text-sm font-semibold" htmlFor="fullDescription">
            Full Narrative
          </label>

          <TextArea
            disabled={isSaving}
            id="fullDescription"
            className="min-h-37.5"
            onChange={handleInputChange}
            value={formData.fullDescription}
            placeholder="Deep dive into the feature..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-foreground text-sm font-semibold" htmlFor="whyItMatters">
            Value Proposition
          </label>

          <TextArea
            id="whyItMatters"
            disabled={isSaving}
            className="min-h-20"
            value={formData.whyItMatters}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-2">
          <label className="text-foreground text-sm font-semibold" htmlFor="timeline">
            Detailed Timeline
          </label>

          <TextArea
            id="timeline"
            disabled={isSaving}
            className="min-h-20"
            value={formData.timeline}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <label
              className="text-foreground flex items-center gap-2 text-sm font-semibold"
              htmlFor="detailsJson"
            >
              <Badge className="bg-accent/10 border-accent/20 border px-1.5 py-0.5 text-[10px]">
                JSON
              </Badge>
              Details Metadata
            </label>

            <span className="text-muted/60 text-[10px] font-medium tracking-wider uppercase">
              Advanced Configuration
            </span>
          </div>

          <div className="group relative">
            <div className="from-accent/5 absolute -inset-0.5 rounded-[22px] bg-linear-to-b to-transparent opacity-0 transition duration-300 group-focus-within:opacity-100" />

            <TextArea
              id="detailsJson"
              disabled={isSaving}
              value={formData.detailsJson}
              onChange={handleInputChange}
              placeholder='{ "problem": "...", "solution": "..." }'
              className={cn(
                "relative min-h-50 rounded-[20px] font-mono text-[13px] leading-relaxed transition-all",
                "border-border bg-background text-foreground placeholder:text-muted",
                "focus-visible:ring-accent/10 focus-visible:border-accent/30 shadow-inner",
                "selection:bg-accent/30 hide-scrollbar",
              )}
            />

            <div className="pointer-events-none absolute top-3 right-4 flex gap-1">
              <div className="bg-muted/50 h-1.5 w-1.5 rounded-full" />
              <div className="bg-muted/50 h-1.5 w-1.5 rounded-full" />
              <div className="bg-muted/50 h-1.5 w-1.5 rounded-full" />
            </div>
          </div>

          <p className="text-muted pl-1 text-[11px]">
            Valid JSON required. Used for technical highlights and impact metrics.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-2xl border p-4 text-sm font-medium md:col-span-2">
            Error: {error}
          </div>
        )}

        <footer className="mt-4 flex items-center gap-3 md:col-span-2">
          <Button type="submit" loading={isSaving} className="px-8">
            {mode === "create" ? "Create Feature" : "Save Changes"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/admin/roadmap")}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </footer>
      </form>
    </Panel>
  );
}
