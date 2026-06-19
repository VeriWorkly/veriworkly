import { Globe, Layout, Settings, DollarSign, HelpCircle } from "lucide-react";

export const categories = [
  { id: "all", name: "All Questions", icon: HelpCircle },
  { id: "general", name: "General & Product", icon: Layout },
  { id: "templates", name: "Templates & Media", icon: Settings },
  { id: "domains", name: "Subdomains & SEO", icon: Globe },
  { id: "billing", name: "Billing & Subscriptions", icon: DollarSign },
] as const;

export const faqs = [
  {
    id: "diff",
    category: "general",
    question: "How does the portfolio builder differ from the resume builder?",
    answer:
      "The resume builder is optimized for structured, print-ready documents (PDFs, ATS trackers). The portfolio builder takes your resume data and transforms it into a public, fully styled website hosted on a custom subdomain, designed for online discovery and showcase.",
  },

  {
    id: "build-before-paying",
    category: "general",
    question: "Can I build my portfolio before paying?",
    answer:
      "Yes. You can create a private draft, fill your content, and preview live templates before upgrading to Portfolio Pro.",
  },

  {
    id: "export",
    category: "general",
    question: "Can I export my portfolio content at any time?",
    answer:
      "Yes. Since your portfolio is built on top of your unified VeriWorkly profile, you can export your entire data schema as a structured JSON file or render it into an ATS-friendly PDF resume at any time.",
  },

  {
    id: "pro-for",
    category: "general",
    question: "Who is Portfolio Pro meant for?",
    answer:
      "Portfolio Pro is for builders, developers, designers, and founders who want a public VeriWorkly subdomain, better sharing controls, analytics, hosted media, and no watermark.",
  },

  {
    id: "templates",
    category: "templates",
    question: "How do page templates work?",
    answer:
      "You can switch templates at any time with a single click. Your profile data, project details, testimonials, and SEO tags remain intact. Only the presentation layer morphs, letting you redesign your portfolio instantly.",
  },

  {
    id: "switch-changes",
    category: "templates",
    question: "What changes when I switch visual templates?",
    answer:
      "Only the visual styling and layout logic change. Your underlying resume data, uploaded media files, subdomain settings, custom scripts, and SEO metadata stay perfectly preserved and reusable.",
  },

  {
    id: "images",
    category: "templates",
    question: "Is there a limit on image and media hosting?",
    answer:
      "Pro portfolios include high-speed CDN image hosting for all your project media, screenshots, custom icons, and avatar photos. There are no hard limits on the number of projects you can showcase.",
  },

  {
    id: "domain",
    category: "domains",
    question: "How do custom subdomains work?",
    answer:
      "With Portfolio Pro, you can choose a unique VeriWorkly subdomain (like yourname.veriworkly.com) to share your site with the world. All subdomains include automatic, secure SSL certificates.",
  },

  {
    id: "analytics",
    category: "domains",
    question: "How are page views and outbound clicks tracked?",
    answer:
      "We provide built-in, privacy-first page view and outbound click analytics. It tracks which templates perform best and where visitors click. No cookie consent banners are required on your public site.",
  },

  {
    id: "pricing",
    category: "billing",
    question: "What plans are available and how do AI writing credits work?",
    answer:
      "We offer flexible options: 1-Day Pass ($0.69, 25 AI credits) and 7-Day Sprint ($3.99, 220 AI credits) where credits expire when the pass ends. For long-term use, the Full Bundle subscription is $11.99/mo (or $9.99/mo annual) with 1,000 monthly AI credits that reset each billing cycle. You can also purchase Portfolio Pro only ($8.99/mo) or AI Credits only ($4.99/mo) if you prefer a single service. Unused credits do not roll over.",
  },

  {
    id: "credits",
    category: "billing",
    question: "How do AI writing credits work and when do they reset?",
    answer:
      "AI credits are consumed when generating or tailoring resumes, cover letters, and portfolio bios. If you choose the Full Bundle (either $11.99/mo monthly or $9.99/mo annual) or the standalone AI Credits plan ($4.99/mo), your allowance of 1,000 credits resets at the start of each billing cycle. Unused credits do not roll over. Single-purchase 1-Day ($0.69) and 7-Day ($3.99) passes provide fixed credit amounts (25 and 220 credits) that expire when the plan term ends.",
  },

  {
    id: "rollover",
    category: "billing",
    question: "Do unused AI credits roll over to the next month?",
    answer:
      "No, unused credits do not roll over. For monthly subscriptions (like the Full Bundle or standalone AI Credits), credits reset at the start of each billing cycle and any remaining credits from the previous month are cleared. For 1-day and 7-day passes, all credits expire and are gone as soon as the pass duration expires.",
  },

  {
    id: "standalone",
    category: "billing",
    question: "Can I buy Portfolio Pro or AI Credits separately?",
    answer:
      "Yes, if you do not need the full bundle, you can buy single add-on plans. Portfolio Pro is available standalone for $8.99/month, which gives you full publishing on your own custom subdomain, visitor analytics, and no watermark. Standalone AI Credits are available for $4.99/month, providing 1,000 monthly credits for resume and writing tools without website hosting.",
  },

  {
    id: "subdomain-cost",
    category: "billing",
    question: "Do I have to pay extra for a custom subdomain?",
    answer:
      "No. Choosing a custom VeriWorkly subdomain (e.g., yourname.veriworkly.com) with automatic SSL certificates is fully included in the Portfolio Pro standalone plan ($8.99/mo) and the Full Bundle ($11.99/mo monthly, $9.99/mo annual) at no extra cost.",
  },

  {
    id: "upgrade",
    category: "billing",
    question: "Can I upgrade, downgrade, or change my plan later?",
    answer:
      "Absolutely. You can switch between passes, subscriptions, or standalone add-ons at any point. Your billing and credit allowances will be adjusted or extended based on the remaining value of your previous plan terms.",
  },

  {
    id: "cancel",
    category: "billing",
    question: "What happens if I decide to cancel my subscription?",
    answer:
      "If you cancel your active Portfolio Pro or Full Bundle subscription, your custom subdomain mapping and public publishing will be paused at the end of your billing cycle. However, all of your saved resume documents, cover letters, and portfolio drafts remain securely stored in your account so you can reactivate them whenever you're ready.",
  },

  {
    id: "secure",
    category: "billing",
    question: "Is my payment information secure?",
    answer:
      "Yes. All payment processing is managed securely by Dodo Payments, adhering to strict PCI-DSS standards. VeriWorkly never stores or handles your credit card credentials directly on our servers.",
  },
];

export const landingFaqs = [
  faqs.find((f) => f.id === "diff"),
  faqs.find((f) => f.id === "pricing"),
  faqs.find((f) => f.id === "domain"),
  faqs.find((f) => f.id === "templates"),
  faqs.find((f) => f.id === "build-before-paying"),
].filter((f): f is (typeof faqs)[number] => !!f);

export const pricingFaqs = [
  faqs.find((f) => f.id === "credits"),
  faqs.find((f) => f.id === "rollover"),
  faqs.find((f) => f.id === "standalone"),
  faqs.find((f) => f.id === "subdomain-cost"),
  faqs.find((f) => f.id === "upgrade"),
  faqs.find((f) => f.id === "cancel"),
  faqs.find((f) => f.id === "secure"),
].filter((f): f is (typeof faqs)[number] => !!f);
