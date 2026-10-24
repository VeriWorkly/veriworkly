import React, { useState } from "react";
import { AlertCircle, ArrowRight, LoaderCircle } from "lucide-react";

import { siteConfig } from "@/config/site";
import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

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

/** apps/server/src/middleware/rateLimit.ts: the contact route allows 5 messages per hour. */
const CONTACT_LIMIT_PER_HOUR = 5;

type Field = "name" | "email" | "subject" | "message";

export function validate(values: Record<Field, string>): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};

  if (!values.name.trim()) errors.name = "Please enter your name.";
  if (!EMAIL_PATTERN.test(values.email.trim()))
    errors.email = "Please enter a valid email address so we can reply to you.";
  if (!values.subject.trim()) errors.subject = "Please enter a subject.";
  if (values.message.trim().length < MESSAGE_MIN_LENGTH)
    errors.message = `Your message needs at least ${MESSAGE_MIN_LENGTH} characters so we have enough detail to help.`;

  return errors;
}

const TOPIC_SUGGESTIONS = [
  "Resumes and cover letters",
  "AI credits and billing",
  "Portfolio website",
  "Bug report",
  "Feature idea",
  "General question",
];

interface ContactFormProps {
  onSuccess: (data: ContactSuccessData) => void;
}

export const ContactForm = ({ onSuccess }: ContactFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");

  const mountTimestamp = React.useRef<number | null>(null);

  React.useEffect(() => {
    mountTimestamp.current = Date.now();
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setSubject(topic);
  };

  const messageRemaining = Math.max(0, MESSAGE_MIN_LENGTH - message.trim().length);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const errors = validate({ name, email, subject, message });
    setFieldErrors(errors);

    const firstInvalid = (Object.keys(errors) as Field[])[0];
    if (firstInvalid) {
      e.currentTarget
        .querySelector<HTMLElement>(
          `#${firstInvalid === "message" ? "message-body" : firstInvalid}`,
        )
        ?.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await fetchApiData<ContactSuccessData>("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          website,
          _ts: mountTimestamp.current,
        }),
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
      setSelectedTopic("");
      setWebsite("");

      mountTimestamp.current = Date.now();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 429) {
        setError(
          `You can send ${CONTACT_LIMIT_PER_HOUR} messages an hour from one connection, and that limit is used up. Try again later, or email ${siteConfig.email}.`,
        );
      } else if (
        err instanceof ApiRequestError &&
        err.status === 400 &&
        Array.isArray(err.details)
      ) {
        const fromServer: Partial<Record<Field, string>> = {};
        for (const detail of err.details as { path?: string; message?: string }[])
          if (
            detail.path &&
            detail.message &&
            ["name", "email", "subject", "message"].includes(detail.path)
          )
            fromServer[detail.path as Field] = detail.message;
        setFieldErrors(fromServer);
        setError("Some fields need another look.");
      } else {
        setError(
          `Your message could not be sent just now. Please try again, or email ${siteConfig.email}.`,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="message"
      className="bg-background relative scroll-mt-28 rounded-3xl p-6 sm:p-8 lg:p-10"
    >
      <div role="group" aria-labelledby="contact-topic-label">
        <p id="contact-topic-label" className="text-muted text-sm font-semibold">
          What is it about? (optional)
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {TOPIC_SUGGESTIONS.map((topic) => {
            const isSelected = selectedTopic === topic || subject === topic;

            return (
              <button
                key={topic}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleSelectTopic(topic)}
                className={`focus-visible:ring-accent/40 min-h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition-[background-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] ${
                  isSelected
                    ? "bg-foreground text-background"
                    : "bg-card text-muted hover:text-foreground"
                }`}
              >
                {topic}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <div
          className="pointer-events-none absolute top-[-9999px] left-[-9999px] h-0 w-0 overflow-hidden opacity-0"
          aria-hidden="true"
        >
          <label htmlFor="contact-field-website">Website URL (leave blank)</label>

          <input
            type="text"
            name="website"
            tabIndex={-1}
            value={website}
            autoComplete="off"
            id="contact-field-website"
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div role="alert" aria-live="assertive">
          {error && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-3 rounded-2xl border p-4 text-sm font-semibold">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />

              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFloatingField
            required
            id="name"
            error={fieldErrors.name}
            value={name}
            label="Your name"
            onChange={setName}
            disabled={loading}
            autoComplete="name"
            maxLength={FIELD_LIMITS.name}
          />

          <ContactFloatingField
            id="email"
            error={fieldErrors.email}
            required
            type="email"
            value={email}
            label="Your email"
            disabled={loading}
            onChange={setEmail}
            autoComplete="email"
            maxLength={FIELD_LIMITS.email}
            invalid={email.trim().length > 0 && !EMAIL_PATTERN.test(email.trim())}
          />
        </div>

        <ContactFloatingField
          required
          id="subject"
          error={fieldErrors.subject}
          label="Subject"
          value={subject}
          disabled={loading}
          autoComplete="off"
          maxLength={FIELD_LIMITS.subject}
          onChange={(val) => {
            setSubject(val);
            if (selectedTopic !== val) setSelectedTopic("");
          }}
        />

        <ContactFloatingField
          required
          rows={5}
          id="message-body"
          error={fieldErrors.message}
          as="textarea"
          value={message}
          disabled={loading}
          label="Your message"
          onChange={setMessage}
          maxLength={FIELD_LIMITS.message}
          invalid={message.length > 0 && messageRemaining > 0}
          helper={
            messageRemaining > 0
              ? `${messageRemaining} more characters needed`
              : `${message.trim().length} / ${FIELD_LIMITS.message} characters`
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-foreground text-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent/40 group flex h-13 w-full cursor-pointer items-center justify-center rounded-full text-base font-semibold transition-[background-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
        >
          {loading ? (
            <>
              <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
              <span>Sending message...</span>
            </>
          ) : (
            <>
              <span>Send message</span>
              <ArrowRight
                className="ml-2 size-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </>
          )}
        </button>

        <p className="sr-only" role="status" aria-live="polite">
          {loading ? "Sending your message" : ""}
        </p>
      </form>
    </div>
  );
};

export default ContactForm;
