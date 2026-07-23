"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@veriworkly/ui";
import { enrollAffiliate } from "@/features/affiliate/affiliate-api";

export function EnrollButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <>
      {message ? <p className="text-destructive mt-4 text-sm">{message}</p> : null}
      <Button
        className="mt-6"
        loading={loading}
        onClick={async () => {
          setLoading(true);
          setMessage("");
          try {
            await enrollAffiliate();
            router.refresh();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not enroll.");
          } finally {
            setLoading(false);
          }
        }}
      >
        Join affiliate program
      </Button>
    </>
  );
}
