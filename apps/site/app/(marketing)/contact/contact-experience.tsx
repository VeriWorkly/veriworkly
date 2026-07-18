"use client";

import { useMemo, useState } from "react";
import {
  Mail,
  Check,
  AlertCircle,
  ArrowRight,
  LoaderCircle,
  ShieldAlert,
  MessageSquare,
  HelpCircle,
  Bug,
} from "lucide-react";
import { fetchApiData } from "@/utils/fetchApiData";
import { siteConfig } from "@/config/site";
import { Reveal } from "@/components/marketing/Reveal";

const supportEmail = siteConfig.email;
const supportEmailHref = `mailto:${supportEmail}`;

const githubDiscussionsUrl = `${siteConfig.links.github}/discussions`;
const githubSecurityPolicyUrl = "https://github.com/VeriWorkly/veriworkly/blob/master/SECURITY.md";

const contactChannels = [
  {
    label: "Email Support",
    href: supportEmailHref,
    detail: `Billing, account access, deletion requests`,
    icon: Mail,
  },
  {
    label: "Security Report",
    href: githubSecurityPolicyUrl,
    detail: "Private disclosure before publishing",
    icon: ShieldAlert,
  },
  {
    label: "GitHub Community",
    href: githubDiscussionsUrl,
    detail: "Ask questions, share layouts, discuss ideas",
    icon: MessageSquare,
  },
];

const MESSAGE_MIN_LENGTH = 10;

function FloatingField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
  as = "input",
  rows,
  helper,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  as?: "input" | "textarea";
  rows?: number;
  helper?: string;
}) {
  const sharedClassName =
    "peer w-full rounded-xl border border-zinc-200 bg-white px-4 pt-6 pb-2.5 text-sm text-zinc-900 transition outline-none placeholder:text-transparent focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-[#080808] dark:text-white";

  return (
    <div className="relative">
      {as === "textarea" ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? label}
          disabled={disabled}
          rows={rows ?? 5}
          className={`${sharedClassName} resize-none`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? label}
          disabled={disabled}
          className={sharedClassName}
        />
      )}
      <label
        htmlFor={id}
        className="pointer-events-none absolute top-2.5 left-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase transition-all peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-placeholder-shown:normal-case peer-placeholder-shown:text-zinc-400 peer-focus:top-2.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:tracking-wide peer-focus:text-blue-500 peer-focus:uppercase dark:text-zinc-500"
      >
        {label}
      </label>
      {helper ? <p className="mt-1.5 text-right text-[11px] text-zinc-400">{helper}</p> : null}
    </div>
  );
}

export function ContactExperience() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{
    ticketId: string;
    name: string;
    email: string;
    subject: string;
    timestamp: string;
  } | null>(null);

  const messageRemaining = Math.max(0, MESSAGE_MIN_LENGTH - message.trim().length);
  const isValid = useMemo(
    () =>
      name.trim().length > 0 &&
      email.includes("@") &&
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
    if (!email.trim() || !email.includes("@")) {
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
      const response = await fetchApiData<{
        name: string;
        email: string;
        subject: string;
        timestamp: string;
      }>("/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, subject, message }),
      });

      const mockTicketId = `VW-${Math.floor(100000 + Math.random() * 900000)}`;

      setSuccessData({
        ticketId: mockTicketId,
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
    <div className="space-y-10">
      {/* Channel rail — one divided bar instead of three separate cards. */}
      <Reveal className="grid divide-y divide-zinc-200 overflow-hidden rounded-3xl border border-zinc-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-zinc-800 dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
        {contactChannels.map((option) => {
          const Icon = option.icon;
          return (
            <a
              key={option.label}
              href={option.href}
              target={option.href.startsWith("http") ? "_blank" : undefined}
              rel={option.href.startsWith("http") ? "noreferrer" : undefined}
              className="group flex items-center gap-4 p-5 transition-colors hover:bg-blue-500/5 md:p-6"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <Icon className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {option.label}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {option.detail}
                </p>
              </div>
              <ArrowRight
                className="ml-auto h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-500 dark:text-zinc-700"
                aria-hidden="true"
              />
            </a>
          );
        })}
      </Reveal>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <Reveal className="rounded-4xl border border-zinc-200 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:p-8 dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Direct message
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Send a message to our support and development team.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-xs font-semibold text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <FloatingField id="name" label="Name" value={name} onChange={setName} disabled={loading} />
              <FloatingField
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                disabled={loading}
              />
            </div>

            <FloatingField id="subject" label="Subject" value={subject} onChange={setSubject} disabled={loading} />

            <FloatingField
              id="message"
              label="Message"
              as="textarea"
              value={message}
              onChange={setMessage}
              disabled={loading}
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
          </form>
        </Reveal>

        <Reveal delay={0.1} className="space-y-6">
          <div className="space-y-3 rounded-4xl border border-blue-500/15 bg-blue-500/4 p-6 dark:border-blue-500/10 dark:bg-blue-500/3">
            <p className="text-xs font-bold tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Average reply time
            </p>
            <p className="text-3xl font-semibold tracking-tighter text-zinc-900 dark:text-white">
              24–48 hrs
            </p>
            <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              We&apos;re a small team. Every message reaches a real person, not a queue.
            </p>
          </div>

          <div className="space-y-4 rounded-4xl border border-zinc-200 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:p-8 dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
              Frequently asked topics
            </h3>
            <ul className="space-y-4 text-sm text-zinc-500 dark:text-zinc-400">
              <li className="flex gap-3">
                <HelpCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                  aria-hidden="true"
                />
                <div>
                  <strong className="text-zinc-800 dark:text-zinc-200">General help</strong>
                  <p className="mt-1 text-xs leading-5">
                    For template usage, layout settings, and dashboard controls, search the FAQ or
                    open a GitHub discussion.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <Bug
                  className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                  aria-hidden="true"
                />
                <div>
                  <strong className="text-zinc-800 dark:text-zinc-200">Bug reports</strong>
                  <p className="mt-1 text-xs leading-5">
                    If you find issues with exports, PDF downloads, or inputs, submit a ticket in
                    our GitHub issue tracker with steps to reproduce.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <ShieldAlert
                  className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                  aria-hidden="true"
                />
                <div>
                  <strong className="text-zinc-800 dark:text-zinc-200">Security issues</strong>
                  <p className="mt-1 text-xs leading-5">
                    Report security flaws directly via email. Please do not disclose vulnerabilities
                    in public forums before we check and resolve them.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </Reveal>
      </section>

      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="animate-scale-in relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0c0c0c]">
            <div className="flex flex-col items-center gap-3 border-b border-dashed border-zinc-200 px-7 pt-8 pb-6 text-center dark:border-zinc-800">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <Check className="h-8 w-8" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                Message sent
              </h2>
              <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Your inquiry has been forwarded to our support inbox.
              </p>
            </div>

            <div className="space-y-3 px-7 py-6 font-mono text-xs leading-5">
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-600">Ticket</span>
                <strong className="font-semibold text-zinc-900 dark:text-white">
                  {successData.ticketId}
                </strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-400 dark:text-zinc-600">From</span>
                <span className="truncate text-right text-zinc-700 dark:text-zinc-300">
                  {successData.name} · {successData.email}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-400 dark:text-zinc-600">Subject</span>
                <span className="max-w-[60%] truncate text-right text-zinc-700 dark:text-zinc-300">
                  {successData.subject}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-600">Sent</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {new Date(successData.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-4 px-7 pb-7 text-center">
              <p className="text-[11px] leading-5 text-zinc-400 dark:text-zinc-600">
                We typically respond within <strong>24 to 48 hours</strong>.
              </p>
              <button
                type="button"
                onClick={() => setSuccessData(null)}
                className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
