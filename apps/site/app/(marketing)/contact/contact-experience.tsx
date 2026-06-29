"use client";

import { useState } from "react";
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
import { Card, Button } from "@veriworkly/ui";
import { fetchApiData } from "@/utils/fetchApiData";
import { siteConfig } from "@/config/site";

const supportEmail = siteConfig.email;
const supportEmailHref = `mailto:${supportEmail}`;

const githubDiscussionsUrl = `${siteConfig.links.github}/discussions`;
const githubSecurityPolicyUrl = "https://github.com/VeriWorkly/veriworkly/blob/master/SECURITY.md";

const contactOptions = [
  {
    label: "Email Support",
    href: supportEmailHref,
    detail: `Send questions about billing, account access, or deletion directly to ${supportEmail}.`,
    icon: Mail,
    action: "Send Email",
  },
  {
    label: "Security Report",
    href: githubSecurityPolicyUrl,
    detail: "Read our security parameters and submit vulnerabilities privately before publishing.",
    icon: ShieldAlert,
    action: "Read Policy",
  },
  {
    label: "GitHub Community",
    href: githubDiscussionsUrl,
    detail: "Ask questions, share layouts, and discuss feature ideas with community members.",
    icon: MessageSquare,
    action: "Open Discussions",
  },
];

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
    if (!message.trim() || message.trim().length < 10) {
      setError("Message must be at least 10 characters");
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
    <div className="space-y-12">
      <section className="grid gap-6 md:grid-cols-3">
        {contactOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Card
              key={option.label}
              className="border-border bg-card flex flex-col justify-between rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] transition-all duration-300 hover:border-blue-500/50 hover:shadow-[6px_6px_0_0_rgba(37,99,235,0.15)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]"
            >
              <div className="space-y-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-foreground text-lg font-bold">{option.label}</h3>
                <p className="text-muted text-xs leading-5">{option.detail}</p>
              </div>
              <div className="pt-6">
                <Button asChild size="sm" variant="secondary" className="w-full justify-center">
                  <a
                    href={option.href}
                    target={option.href.startsWith("http") ? "_blank" : undefined}
                    rel={option.href.startsWith("http") ? "noreferrer" : undefined}
                  >
                    {option.action}
                  </a>
                </Button>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border bg-card rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
          <div className="space-y-2">
            <h2 className="text-foreground text-2xl font-extrabold tracking-tight">
              Direct Message
            </h2>
            <p className="text-muted text-sm">
              Send a message to our support and development team.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-xs font-semibold text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-foreground text-xs font-bold tracking-wider uppercase"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  disabled={loading}
                  className="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm shadow-[2px_2px_0_0_rgba(23,23,23,0.03)] transition outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-foreground text-xs font-bold tracking-wider uppercase"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  className="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm shadow-[2px_2px_0_0_rgba(23,23,23,0.03)] transition outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="subject"
                className="text-foreground text-xs font-bold tracking-wider uppercase"
              >
                Subject
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="How can we help?"
                disabled={loading}
                className="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm shadow-[2px_2px_0_0_rgba(23,23,23,0.03)] transition outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="message"
                className="text-foreground text-xs font-bold tracking-wider uppercase"
              >
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your details here..."
                disabled={loading}
                rows={5}
                className="border-border bg-background text-foreground w-full resize-none rounded-xl border px-4 py-3 text-sm shadow-[2px_2px_0_0_rgba(23,23,23,0.03)] transition outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <Button type="submit" disabled={loading} size="lg" className="w-full justify-center">
              {loading ? (
                <>
                  <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                  Sending message...
                </>
              ) : (
                <>
                  Send message
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="border-border bg-card space-y-4 rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
            <h3 className="text-foreground text-lg font-bold">Frequently asked topics</h3>
            <ul className="text-muted space-y-4 text-sm">
              <li className="flex gap-3">
                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <div>
                  <strong>General help</strong>
                  <p className="mt-1 text-xs leading-5">
                    For template usage, layout settings, and dashboard controls, search the FAQ or
                    open a GitHub discussion.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <Bug className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <div>
                  <strong>Bug reports</strong>
                  <p className="mt-1 text-xs leading-5">
                    If you find issues with exports, PDF downloads, or inputs, submit a ticket in
                    our GitHub issue tracker with steps to reproduce.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <div>
                  <strong>Security issues</strong>
                  <p className="mt-1 text-xs leading-5">
                    Report security flaws directly via email. Please do not disclose vulnerabilities
                    in public forums before we check and resolve them.
                  </p>
                </div>
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="bg-background animate-scale-in relative w-full max-w-lg space-y-6 rounded-3xl border border-blue-500/30 p-6 shadow-2xl md:p-8">
            <div className="flex flex-col items-center space-y-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Check className="h-8 w-8" />
              </span>
              <h2 className="text-foreground text-2xl font-bold tracking-tight">Message sent</h2>
              <p className="text-muted text-sm leading-6">
                Thank you for contacting support. Your inquiry has been forwarded to our email
                system.
              </p>
            </div>

            <div className="border-border bg-card space-y-3 rounded-xl border p-4 text-xs leading-5 shadow-[2px_2px_0_0_rgba(23,23,23,0.03)]">
              <div className="flex justify-between">
                <span className="text-muted">Ticket ID:</span>
                <strong className="text-foreground font-semibold">{successData.ticketId}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Submitter:</span>
                <span className="text-foreground font-semibold">
                  {successData.name} ({successData.email})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Subject:</span>
                <span className="text-foreground max-w-xs truncate font-semibold">
                  {successData.subject}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Timestamp:</span>
                <span className="text-foreground font-semibold">
                  {new Date(successData.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-4 text-center">
              <p className="text-muted text-xs leading-5">
                We typically respond within <strong>24 to 48 hours</strong>. The submission metadata
                has been stored, and a copy of the request was delivered to the site administrator.
              </p>
              <Button
                onClick={() => setSuccessData(null)}
                size="md"
                className="w-full justify-center"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
