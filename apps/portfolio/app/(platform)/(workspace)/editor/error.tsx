"use client";

import { ErrorCard } from "@/components/ErrorCard";

export default function EditorError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorCard
      {...props}
      className="workspace-theme h-dvh"
      title="The editor stopped working"
      body="Your last saved draft is safe. Try again, or go back to the dashboard."
      back={{ href: "/dashboard", label: "Back to dashboard" }}
    />
  );
}
