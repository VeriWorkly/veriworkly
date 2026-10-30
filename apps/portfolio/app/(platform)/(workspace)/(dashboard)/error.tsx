"use client";

import { ErrorCard } from "@/components/ErrorCard";

export default function DashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorCard
      {...props}
      className="min-h-[calc(100dvh-4.25rem)]"
      title="This page could not load"
      body="Your draft and your published site are safe. Try again, or go back to the dashboard."
      back={{ href: "/dashboard", label: "Back to dashboard" }}
    />
  );
}
