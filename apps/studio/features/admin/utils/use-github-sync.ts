import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchAdminGithubSyncRunning } from "@/features/admin/services/admin-actions";

const SYNC_POLL_MS = 3000;

/**
 * A GitHub sync answers 202 and runs in the background for up to several minutes. While one
 * runs (the server said so, or this page just started one) the status endpoint is polled, and
 * the page refreshes once it ends, so a control never claims "done" for a sync still running.
 */
export function useGithubSyncRunning(serverRunning: boolean) {
  const router = useRouter();

  const [started, setStarted] = useState(false);
  const [pollError, setPollError] = useState("");

  const running = (serverRunning || started) && !pollError;

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(async () => {
      try {
        if (await fetchAdminGithubSyncRunning()) return;

        setStarted(false);
        router.refresh();
      } catch (error) {
        setStarted(false);
        setPollError(
          `Could not check the sync's progress: ${error instanceof Error ? error.message : "unknown error"}. Reload to see its result.`,
        );
      }
    }, SYNC_POLL_MS);

    return () => window.clearInterval(timer);
  }, [running, router]);

  return {
    running,
    pollError,
    /** Call once the start request was accepted. */
    markStarted: () => {
      setPollError("");
      setStarted(true);
    },
  };
}
