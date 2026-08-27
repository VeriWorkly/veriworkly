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

const TOPIC_SUGGESTIONS = [
  "Resume & Cover Letters",
  "AI Credits & Billing",
  "Portfolio Website",
  "Bug Report",
  "Feature Idea",
  "General Question",
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

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setSubject(topic);
  };

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
      setError("Please enter your name.");
      setLoading(false);
      return;
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Please enter a valid email address so we can reply to you.");
      setLoading(false);
      return;
    }

    if (!subject.trim()) {
      setError("Please enter a subject.");
      setLoading(false);
      return;
    }

    if (!message.trim() || message.trim().length < MESSAGE_MIN_LENGTH) {
      setError(
        `Your message must be at least ${MESSAGE_MIN_LENGTH} characters so we have enough detail to help.`,
      );
      setLoading(false);
      return;
    }

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
      setError(
        err instanceof Error
          ? err.message
          : "Could not send message right now. Please email us directly at info@veriworkly.com.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Reveal className="border-border/60 bg-card/40 relative rounded-3xl border p-6 shadow-lg backdrop-blur-sm sm:p-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="bg-accent size-2 animate-pulse rounded-full" />
          <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
            Send a Direct Note
          </span>
        </div>

        <h2 className="text-foreground text-2xl font-bold tracking-tight">How can we help you?</h2>

        <p className="text-muted text-xs leading-relaxed sm:text-sm">
          Fill out the quick form below. Every note reaches our core engineering and support team
          directly.
        </p>
      </div>

      <div className="mt-6 space-y-2">
        <span className="text-muted block font-mono text-[10px] font-bold tracking-widest uppercase">
          Select a topic (optional):
        </span>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {TOPIC_SUGGESTIONS.map((topic) => {
            const isSelected = selectedTopic === topic || subject === topic;

            return (
              <button
                key={topic}
                type="button"
                onClick={() => handleSelectTopic(topic)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
                  isSelected
                    ? "bg-accent text-accent-foreground ring-accent/30 font-semibold shadow-xs ring-2"
                    : "border-border/60 bg-background/50 text-muted hover:text-foreground hover:border-border hover:bg-background/90 border"
                }`}
              >
                {topic}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
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
            <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-3 rounded-2xl border p-4 text-xs font-semibold">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />

              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFloatingField
            required
            id="name"
            value={name}
            label="Your Name"
            onChange={setName}
            disabled={loading}
            autoComplete="name"
            maxLength={FIELD_LIMITS.name}
          />

          <ContactFloatingField
            id="email"
            required
            type="email"
            value={email}
            label="Your Email"
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
          id="message"
          as="textarea"
          value={message}
          disabled={loading}
          label="Your Message"
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
          disabled={loading || !isValid}
          className="bg-accent text-accent-foreground group flex h-13 w-full cursor-pointer items-center justify-center rounded-full text-sm font-semibold shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
        >
          {loading ? (
            <>
              <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
              <span>Sending message...</span>
            </>
          ) : (
            <>
              <span>Send message to team</span>
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
    </Reveal>
  );
};

export default ContactForm;
