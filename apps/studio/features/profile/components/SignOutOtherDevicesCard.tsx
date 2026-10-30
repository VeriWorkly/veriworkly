"use client";

import * as React from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@veriworkly/ui";

import { signOutOtherDevices } from "@/features/profile/services/sessions";

/**
 * The login alert email links here as `/profile?focus=sessions`: a query, which the sign-in
 * redirect keeps where a #fragment is lost, so the card brings itself into view for it.
 */
function SignOutOtherDevicesCard() {
  const [signingOut, setSigningOut] = React.useState(false);
  const sectionRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get("focus") === "sessions") {
      sectionRef.current?.scrollIntoView({ block: "center" });
    }
  }, []);

  const handleClick = async () => {
    setSigningOut(true);

    try {
      await signOutOtherDevices();
      toast.success("Signed out of every other device. This one stays signed in.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out the other devices.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="sessions"
      aria-labelledby="sessions-title"
      className="border-border bg-card rounded-2xl border p-5 shadow-xs"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 id="sessions-title" className="text-sm font-bold">
            Signed-in devices
          </h2>
          <p className="text-muted text-xs leading-relaxed">
            Signed in on a shared or public computer, or got a sign-in alert that wasn&apos;t you?
            End every other session; this device stays signed in.
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          loading={signingOut}
          disabled={signingOut}
          onClick={() => void handleClick()}
          className="shrink-0 text-xs font-semibold"
        >
          <LogOut className="mr-1.5 h-3.5 w-3.5" />
          Sign out of all other devices
        </Button>
      </div>
    </section>
  );
}

export default SignOutOtherDevicesCard;
