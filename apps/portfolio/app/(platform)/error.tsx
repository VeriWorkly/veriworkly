"use client";

import { ErrorCard } from "@/components/ErrorCard";

export default function PlatformError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorCard
      {...props}
      title="This page could not load"
      body="Something went wrong on our side. Please try again in a moment."
      back={{ href: "/", label: "Back to home" }}
    />
  );
}
