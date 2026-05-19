"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { Input, Badge, Button } from "@veriworkly/ui";

import { AuthCard } from "./AuthCard";

import { authClient } from "@/lib/auth-client";

const OtpForm = ({
  sentTo,
  setSent,
}: {
  sentTo: string;
  setSent: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!sentTo || otp.length !== 6) return;

    setIsLoading(true);

    try {
      const { error: authError } = await authClient.signIn.emailOtp({
        email: sentTo,
        otp: otp,
        name: "Veriworkly User",
      });

      if (authError) {
        toast.error(authError.message || "Invalid or expired code.");
        return;
      }

      toast.success("Successfully signed in!");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Verification failed. Please check your connection.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0) return;

    setIsLoading(true);

    try {
      const { error: resendError } = await authClient.emailOtp.sendVerificationOtp({
        email: sentTo,
        type: "sign-in",
      });

      if (resendError) {
        toast.error(resendError.message || "Failed to resend code.");
      } else {
        setTimeLeft(60);
        setOtp("");
        toast.success("A new code has been sent to your email.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Resend failed. Please check your connection.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard blurPosition="top-right">
      <div className="space-y-4">
        <Badge className="bg-background/70">Secure Verification</Badge>

        <div className="space-y-3">
          <h1 className="text-foreground text-3xl font-semibold tracking-tight">
            Check your email
          </h1>

          <p className="text-muted text-sm leading-6 md:text-base">
            We sent a secure sign-in code to
            <span className="text-foreground mx-1.5 font-semibold">{sentTo}</span>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setSent(false)}
              className="cursor-pointer text-sm font-medium text-blue-600 underline underline-offset-4 transition-colors hover:text-blue-400 disabled:opacity-50"
            >
              Change
            </button>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="border-border/80 bg-background/65 rounded-2xl border p-3 backdrop-blur">
          <p className="text-muted text-sm">
            Enter the 6-digit code below. If you do not see the email, check your spam or promotions
            folder.
          </p>
        </div>

        <div className="border-border/80 rounded-2xl border bg-yellow-100/65 p-3 backdrop-blur dark:bg-yellow-300/5">
          <p className="text-muted text-sm">
            <span className="text-foreground font-medium">Tip:</span> Keep this tab open while you
            check your inbox.
          </p>
        </div>
      </div>

      <form onSubmit={handleVerifyOtp} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="otp" className="text-foreground text-sm font-medium">
            Verification Code
          </label>

          <Input
            required
            id="otp"
            type="text"
            value={otp}
            minLength={6}
            maxLength={6}
            pattern="\d{6}"
            inputMode="numeric"
            placeholder="000000"
            autoComplete="one-time-code"
            autoFocus
            className="text-center font-mono text-2xl tracking-[0.5em]"
            onChange={(event) => {
              const val = event.target.value.replace(/\D/g, "").slice(0, 6);
              setOtp(val);
            }}
          />
        </div>

        <Button size="md" type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
          {isLoading ? "Verifying..." : "Verify & Sign In"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted">Didn&apos;t receive the code? </span>

        {timeLeft > 0 ? (
          <span className="text-muted-foreground font-medium" aria-live="polite">
            Resend in {timeLeft}s
          </span>
        ) : (
          <button
            type="button"
            disabled={isLoading}
            onClick={handleResend}
            className="cursor-pointer font-medium text-blue-600 underline underline-offset-4 transition-colors hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Resend Code
          </button>
        )}
      </div>
    </AuthCard>
  );
};

export default OtpForm;
