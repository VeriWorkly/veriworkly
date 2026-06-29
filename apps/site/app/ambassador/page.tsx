import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { Card, Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@veriworkly/ui";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Trophy, Award, HeartHandshake, Coins } from "lucide-react";
import { AmbassadorPointsCalculator } from "./components/AmbassadorPointsCalculator";
import { CampusLeaderboard } from "./components/CampusLeaderboard";

const pageUrl = `${siteConfig.url}/ambassador`;
const pageOgImage = `${siteConfig.url}/og/ambassador-page-og.png`;

export const metadata: Metadata = {
  title: "Student Ambassador Program | VeriWorkly",
  description:
    "Gated campus program for college students. Share local-first career editors, earn points for social shares or peer referrals, and unlock free Portfolio Pro access.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: "Student Ambassador Program | VeriWorkly",
    description:
      "Help your peers build professional resumes and portfolios. Earn point multipliers and redeem them for free Portfolio Pro upgrades.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: "VeriWorkly Student Ambassador Program",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Student Ambassador Program | VeriWorkly",
    description:
      "Earn campus points and redeem them for free Portfolio Pro access as a student ambassador.",
    images: [pageOgImage],
  },
};

const keyBenefits = [
  {
    title: "Qualified invite points",
    description:
      "Earn 10 points for classmates referred. Enjoy a 1.2x boost of +20 points (totaling 30 points) if they choose to upgrade.",
    icon: Trophy,
  },
  {
    title: "Claim Portfolio Pro",
    description:
      "Redeem accumulated points directly for Pro access: 1,500 points = 30 days of Portfolio Pro. Unclaimed points reset annually.",
    icon: Award,
  },
  {
    title: "Platform abuse filter",
    description:
      "Referrals are qualified only after classmate accounts verify and score at least 250 platform points, blocking spam.",
    icon: Coins,
  },
  {
    title: "Engaging content rewards",
    description:
      "Create up to 30 videos or articles per month. Upload reviews on Twitter/X or LinkedIn and get points credited.",
    icon: HeartHandshake,
  },
];

const faqItems = [
  {
    question: "Is there a cash payout or budget for student ambassadors?",
    answer:
      "No. VeriWorkly is a free, open-source project. Because we operate without a direct commercial marketing budget, we run a points-based system instead of cash payouts. Points can be exchanged for premium platform access tokens.",
  },
  {
    question: "How do classmate invite points work and how do we prevent spam?",
    answer:
      "You earn 10 points for every peer who registers. To prevent invite spam or fake self-referral accounts, invites are only officially 'qualified' and credited once the classmate actively engages with the builder and scores at least 250 platform points (e.g. creating their resume, Master Profile, or customization).",
  },
  {
    question: "How does the upgrade boost work?",
    answer:
      "If a classmate you invited upgrades to a paid plan (Portfolio Pro, AI Credits, or the Bundle), you receive a 1.2x boost of +20 points (totaling 30 points for that referral).",
  },
  {
    question: "Do my points expire?",
    answer:
      "Yes. To keep the program structured and encourage active participation, points expire at the end of each calendar year. For example, all points earned in 2026 will reset on January 1, 2027. Be sure to redeem your points before the end of the year!",
  },
  {
    question: "What are the limits on social posts, articles, and videos?",
    answer:
      "Ambassadors can create and upload up to 30 videos (50 pts each), 30 articles/blog posts (40 pts each), and 30 Twitter/X or LinkedIn shares (5 pts each) per month. To maintain high quality and prevent system spam, a daily limit of 1 post count per day applies across all channels.",
  },
  {
    question: "What platforms are allowed for video walkthroughs and articles?",
    answer:
      "Videos must be posted on LinkedIn or Twitter/X (videos uploaded on TikTok or YouTube are not credited). Articles and blog posts must be published on Medium, Dev.to, LinkedIn Articles, or a reputable personal blog. All posts are reviewed manually.",
  },
  {
    question: "How do I redeem Portfolio Pro access and when does it expire?",
    answer:
      "You can redeem 30 days of Portfolio Pro at any time for 1,500 points. The 30-day Pro license begins the day you claim it and expires after 30 days, regardless of whether you keep a portfolio published or not.",
  },
  {
    question: "How is my student status verified?",
    answer:
      "Verification is simple. Submit your application using a valid university email domain (.edu or your institution's local equivalent). Once validated, your account is activated as a Campus Ambassador.",
  },
];

const AmbassadorPage = () => {
  const ambassadorSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "VeriWorkly Student Ambassador Program",
    url: pageUrl,
    description:
      "Represent VeriWorkly on campus, earn points by sharing with peers, and get free Pro access.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ambassadorSchema) }}
      />

      <PublicPageShell
        eyebrow="Campus Program"
        title="VeriWorkly Student Ambassador Program"
        secondaryAction={{ href: "/affiliate", label: "Standard Affiliates" }}
        primaryAction={{
          href: "https://app.veriworkly.com/ambassador",
          label: "Apply for Student Program",
        }}
        description="Are you a university student? Help your peers build secure, ATS-friendly resumes and web portfolios. Invite classmates, share content on social media, earn points, and redeem them for free Portfolio Pro access."
      >
        {/* Value Proposition Grid */}
        <section className="grid gap-6 md:grid-cols-2">
          {keyBenefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <Card
                key={benefit.title}
                className="border-border bg-card flex flex-col justify-between rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] transition-all duration-300 hover:border-blue-500/50 hover:shadow-[6px_6px_0_0_rgba(37,99,235,0.15)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs font-black tracking-wider text-blue-600 uppercase dark:text-blue-400">
                      Ambassador Perk
                    </span>
                  </div>
                  <h3 className="text-foreground text-xl font-bold tracking-tight">
                    {benefit.title}
                  </h3>
                  <p className="text-muted text-sm leading-6">{benefit.description}</p>
                </div>
              </Card>
            );
          })}
        </section>

        {/* Interactive Calculator & Leaderboard */}
        <section className="grid gap-8 lg:grid-cols-2">
          <AmbassadorPointsCalculator />
          <CampusLeaderboard />
        </section>

        {/* How It Works Playbook */}
        <Card className="border-border bg-card space-y-6 rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
          <span className="text-xs font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
            Playbook
          </span>
          <h2 className="text-foreground text-2xl font-extrabold tracking-tight">
            How the points system works
          </h2>
          <p className="text-muted max-w-3xl text-sm">
            Earn points by sharing VeriWorkly and helping classmates build their professional
            presence. Here is the process:
          </p>

          <div className="text-muted grid gap-6 pt-4 text-sm leading-6 md:grid-cols-3">
            <div className="border-border space-y-3 border-t pt-4">
              <h4 className="text-foreground flex items-center gap-2 font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 text-xs font-black text-blue-600 dark:text-blue-400">
                  1
                </span>
                Verify status
              </h4>
              <p className="text-xs">
                Submit your application. We verify your university email domain (.edu or local
                equivalents) to unlock your dashboard.
              </p>
            </div>
            <div className="border-border space-y-3 border-t pt-4">
              <h4 className="text-foreground flex items-center gap-2 font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 text-xs font-black text-blue-600 dark:text-blue-400">
                  2
                </span>
                Share & Create
              </h4>
              <p className="text-xs">
                Share your unique link in student forums, write about VeriWorkly on a blog, or post
                video review walkthroughs.
              </p>
            </div>
            <div className="border-border space-y-3 border-t pt-4">
              <h4 className="text-foreground flex items-center gap-2 font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 text-xs font-black text-blue-600 dark:text-blue-400">
                  3
                </span>
                Redeem codes
              </h4>
              <p className="text-xs">
                Reach point milestones (1,500 points = 30 days Pro token) to claim and activate
                Portfolio Pro access.
              </p>
            </div>
          </div>
        </Card>

        {/* FAQs */}
        <section className="space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
              FAQ
            </span>
            <h2 className="text-foreground text-2xl font-extrabold tracking-tight">
              Frequently asked questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="gap-3">
            {faqItems.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </PublicPageShell>
    </>
  );
};

export default AmbassadorPage;
