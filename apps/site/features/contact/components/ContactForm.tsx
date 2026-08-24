import React, { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, LoaderCircle } from "lucide-react";
import { fetchApiData } from "@/utils/fetchApiData";
import { Reveal } from "@/components/marketing/Reveal";
import { ContactFloatingField } from "./ContactFloatingField";
import type { ContactSuccessData } from "./ContactSuccessModal";

const MESSAGE_MIN_LENGTH = 10;

const FIELD_LIMITS = {
  name: 100,
  email: 254,
  subject: 150,
  message: 5000,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface ContactFormProps {
  onSuccess: (data: ContactSuccessData) => void;
}

export const ContactForm = ({ onSuccess }: ContactFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messageRemaining = Math.max(0, MESSAGE_MIN_LENGTH - message.trim().length);
  const isValid = useMemo(
    () =>
      name.trim().length > 0 &&
      EMAIL_PATTERN.test(email.trim()) &&
      subject.trim().length > 0 &&
      message.trim().length >= MESSAGE_MIN_LENGTH,
    [name, email, subject, message],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!name.trim()) {
      setError("Name is required");
      setLoading(false);
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Valid email is required");
      setLoading(false);
      return;
    }
    if (!subject.trim()) {
      setError("Subject is required");
      setLoading(false);
      return;
    }
    if (!message.trim() || message.trim().length < MESSAGE_MIN_LENGTH) {
      setError(`Message must be at least ${MESSAGE_MIN_LENGTH} characters`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetchApiData<ContactSuccessData>("/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, subject, message }),
      });

      onSuccess({
        name: response.name,
        email: response.email,
        subject: response.subject,
        timestamp: response.timestamp,
      });

      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send message. Please email us directly.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Reveal className="rounded-4xl border border-zinc-200 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:p-8 dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          Direct message
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Send a message to our support and development team.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <div role="alert" aria-live="assertive">
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-xs font-semibold text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <ContactFloatingField
            id="name"
            label="Name"
            value={name}
            onChange={setName}
            disabled={loading}
            required
            autoComplete="name"
            maxLength={FIELD_LIMITS.name}
          />
          <ContactFloatingField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            disabled={loading}
            required
            autoComplete="email"
            maxLength={FIELD_LIMITS.email}
            invalid={email.trim().length > 0 && !EMAIL_PATTERN.test(email.trim())}
          />
        </div>

        <ContactFloatingField
          id="subject"
          label="Subject"
          value={subject}
          onChange={setSubject}
          disabled={loading}
          required
          autoComplete="off"
          maxLength={FIELD_LIMITS.subject}
        />

        <ContactFloatingField
          id="message"
          label="Message"
          as="textarea"
          value={message}
          onChange={setMessage}
          disabled={loading}
          required
          maxLength={FIELD_LIMITS.message}
          invalid={message.length > 0 && messageRemaining > 0}
          helper={
            messageRemaining > 0
              ? `${messageRemaining} more characters needed`
              : `${message.trim().length} characters`
          }
        />

        <button
          type="submit"
          disabled={loading || !isValid}
          className="group flex h-14 w-full items-center justify-center rounded-full bg-zinc-950 text-base font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
        >
          {loading ? (
            <>
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              Sending message...
            </>
          ) : (
            <>
              Send message
              <ArrowRight
                className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </>
          )}
        </button>

        <p className="sr-only" role="status" aria-live="polite">
          {loading ? "Sending your message" : ""}
        </p>
      </form>
    </Reveal>
  );
};

export default ContactForm;
