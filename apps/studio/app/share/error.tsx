"use client";

import { useEffect } from "react";

import { Button } from "@veriworkly/ui";

import { FullScreenMessage } from "./components/FullScreenMessage";

/** A share link's reader is not a VeriWorkly user, so this offers a retry, not the workspace. */
export default function ShareError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Shared document failed to load", error);
  }, [error]);

  return (
    <FullScreenMessage
      title="This document could not be loaded"
      description="Something went wrong on our side. Try again in a moment."
      action={<Button onClick={() => retry()}>Try again</Button>}
    />
  );
}
