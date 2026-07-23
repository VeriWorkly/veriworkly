"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input } from "@veriworkly/ui";

import { applyAmbassador } from "@/features/ambassador/ambassador-api";

export function AmbassadorApplyForm() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [collegeName, setCollegeName] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeName.trim() || !gradYear.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    try {
      await applyAmbassador(collegeName, gradYear);
      toast.success("Ambassador application submitted successfully!");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!showForm) {
    return (
      <Button className="mt-5" onClick={() => setShowForm(true)}>
        Apply Now
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border-border mt-5 max-w-md space-y-4 border-t pt-5">
      <h3 className="text-foreground text-sm font-bold">Ambassador Application Form</h3>

      <div className="space-y-1.5">
        <label className="text-muted-foreground text-xs font-semibold" htmlFor="college-name">
          College / University Name
        </label>
        <Input
          id="college-name"
          value={collegeName}
          onChange={(e) => setCollegeName(e.target.value)}
          placeholder="e.g., Stanford University"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-muted-foreground text-xs font-semibold" htmlFor="grad-year">
          Graduation Year
        </label>
        <Input
          id="grad-year"
          value={gradYear}
          onChange={(e) => setGradYear(e.target.value)}
          placeholder="e.g., 2026 or 2027"
          required
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" type="submit" loading={submitting}>
          Submit Application
        </Button>
        <Button size="sm" variant="secondary" type="button" onClick={() => setShowForm(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
