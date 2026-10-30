import { readFileSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CheckoutButton } from "@/features/pricing/components/CheckoutButton";
import {
  PricingAccountContext,
  describePricingAccount,
} from "@/features/pricing/components/PricingAccount";
import type { PlanKey } from "@/features/pricing/data/offers";
import FaqAccordionItem from "@/features/faq/components/FaqAccordionItem";
import TemplateLinksSection from "@/components/landing/TemplateLinksSection";

const checkoutHref = "https://app.example/checkout?productKey=bundle&interval=annual";

function renderButton(subscribedTo: PlanKey | null, plan?: PlanKey, onPass = false) {
  return renderToStaticMarkup(
    <PricingAccountContext.Provider value={{ subscribedTo, onPass }}>
      <CheckoutButton href={checkoutHref} plan={plan}>
        Choose
      </CheckoutButton>
    </PricingAccountContext.Provider>,
  );
}

describe("the pricing page's view of the visitor's plan (P-065, P-071)", () => {
  it("treats a live or past-due subscription as subscribed, and nothing else", () => {
    expect(describePricingAccount(null)).toEqual({ subscribedTo: null, onPass: false });
    expect(describePricingAccount({ status: "INACTIVE", productKey: "bundle" })).toEqual({
      subscribedTo: null,
      onPass: false,
    });
    expect(describePricingAccount({ status: "ACTIVE", productKey: "portfolio_pro" })).toEqual({
      subscribedTo: "portfolio_pro",
      onPass: false,
    });
    expect(describePricingAccount({ status: "PAST_DUE", productKey: "ai_credits" })).toEqual({
      subscribedTo: "ai_credits",
      onPass: false,
    });
  });

  it("does not take a pass (stored as a bundle row) for the Bundle subscription", () => {
    expect(
      describePricingAccount({ status: "ACTIVE", productKey: "bundle", interval: "SEVEN_DAY" }),
    ).toEqual({ subscribedTo: null, onPass: true });

    const html = renderButton(null, "bundle", true);
    expect(html).toContain("Manage billing");
    expect(html).not.toContain("Your current plan");
    expect(html).not.toContain("Upgrade");
    expect(html).not.toContain("checkout?");
  });

  it("shows an anonymous visitor the checkout link and says checkout opens soon (P-076)", () => {
    const html = renderButton(null, "bundle");

    expect(html).toContain(`href="${checkoutHref.replace(/&/g, "&amp;")}"`);
    expect(html).toContain("Paid plans open soon");
    expect(html).not.toContain("disabled");
  });

  it("shows a subscriber their current plan and the billing page, never a checkout that 409s", () => {
    const current = renderButton("portfolio_pro", "portfolio_pro");
    expect(current).toContain("Your current plan");
    expect(current).toContain("Manage billing");
    expect(current).not.toContain("checkout");

    // Moving to a smaller plan is cancel-then-rebuy, so it is only "Manage billing".
    const smaller = renderButton("bundle", "portfolio_pro");
    expect(smaller).toContain("Manage billing");
    expect(smaller).not.toContain("Upgrade");
    expect(smaller).not.toContain("checkout");

    // A pass is refused for subscribers too.
    expect(renderButton("ai_credits")).not.toContain("checkout");
  });

  it("offers Creator Pro and AI Credits subscribers the in-place bundle upgrade (V-202)", () => {
    for (const plan of ["portfolio_pro", "ai_credits"] as const) {
      const html = renderButton(plan, "bundle");

      expect(html).toContain("Upgrade to the Bundle (pay the difference)");
      expect(html).toContain('href="https://app.veriworkly.com/billing"');
      expect(html).not.toContain("Your current plan");
    }

    expect(renderButton("bundle", "bundle")).toContain("Your current plan");
  });

  it("renders the pricing page without any server-side account read", () => {
    const page = readFileSync(join(__dirname, "..", "app", "pricing", "page.tsx"), "utf8");

    expect(page).not.toMatch(/server-api|fetchServerApiData|cookies\(|isAdminUser/);
  });
});

describe("FAQ answers (P-075)", () => {
  const render = (isOpen: boolean) =>
    renderToStaticMarkup(
      <FaqAccordionItem
        id="x"
        question="Question?"
        answer={"A long answer. ".repeat(60)}
        isOpen={isOpen}
        onToggle={() => {}}
      />,
    );

  it("never caps an open answer's height", () => {
    const open = render(true);

    expect(open).not.toMatch(/max-h-/);
    expect(open).not.toContain("inert");
  });

  it("keeps a closed answer away from assistive tech", () => {
    expect(render(false)).toMatch(/<div[^>]*id="faq-content-x"[^>]*inert/);
  });

  it("puts the button inside the heading, not a heading inside the button", () => {
    const html = render(true);

    expect(html).toMatch(/<h3[^>]*><button/);
    expect(html).not.toMatch(/<button[^>]*>[^]*<h[1-6]/);
  });
});

describe("landing template links (P-080)", () => {
  it("marks the free and the Creator Pro templates", () => {
    const html = renderToStaticMarkup(<TemplateLinksSection />);

    expect(html).toContain("Signal and Atelier are free on yourname.veriworkly.com");
    expect(html).toContain("Nimbus and Cipher come with Creator Pro");
    expect(html.match(/>Creator Pro</g)).toHaveLength(2);
    expect(html.match(/>Free</g)).toHaveLength(2);
  });
});
