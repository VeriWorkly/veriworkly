import { Zap } from "lucide-react";
import { customPlans, type ProductKey, type BillingInterval } from "../data/pricingData";
import CheckoutButton from "./CheckoutButton";

interface PricingAlaCarteProps {
  customPlan: "portfolio_pro" | "ai_credits";
  setCustomPlan: (plan: "portfolio_pro" | "ai_credits") => void;
  loading: string;
  paymentsBlocked: boolean;
  onCheckout: (productKey: ProductKey, interval: BillingInterval) => void;
}

const PricingAlaCarte = ({
  customPlan,
  setCustomPlan,
  loading,
  paymentsBlocked,
  onCheckout,
}: PricingAlaCarteProps) => {
  const selectedCustom = customPlans[customPlan];
  const CustomIcon = selectedCustom.icon;

  return (
    <section className="border-border border-b py-24 lg:py-32">
      <div className="mx-auto grid w-[min(1180px,calc(100%_-_32px))] gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div>
          <div className="border-border bg-card text-accent inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold">
            <Zap className="size-3.5" /> Ala Carte
          </div>
          <h2 className="mt-5 text-[clamp(2.4rem,6vw,4rem)] leading-[0.92] font-bold tracking-tighter">
            Only need one superpower?
          </h2>
          <p className="text-muted mt-6 max-w-lg text-sm leading-7">
            Skip the bundle and choose the specific capability that unblocks you today. You can
            always upgrade or scale up later.
          </p>
        </div>

        <article className="border-border bg-card rounded-3xl border p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(customPlans) as Array<keyof typeof customPlans>).map((key) => (
              <button
                className={`rounded-2xl px-5 py-4 text-left font-semibold transition ${
                  customPlan === key ? "bg-foreground text-background" : "hover:bg-muted"
                }`}
                key={key}
                onClick={() => setCustomPlan(key)}
                type="button"
              >
                <span className="block text-[10px] font-bold tracking-wider uppercase opacity-65">
                  {customPlans[key].eyebrow}
                </span>
                <span className="mt-1 block text-lg font-bold tracking-tight">
                  {customPlans[key].title}
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-8 p-6 sm:grid-cols-[1fr_auto] sm:items-end sm:p-8">
            <div>
              <CustomIcon className="text-accent size-6" />
              <h3 className="mt-4 text-3xl font-bold tracking-tight">{selectedCustom.title}</h3>
              <p className="text-muted mt-3 max-w-sm text-sm leading-6">
                {selectedCustom.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {selectedCustom.features.map((feature) => (
                  <span
                    className="border-border text-muted bg-background/50 rounded-full border px-3 py-1 text-xs font-semibold"
                    key={feature}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <div className="min-w-[180px]">
              <p className="text-4xl font-bold tracking-tight">{selectedCustom.price}</p>
              <p className="text-muted mt-1 text-xs font-bold">per month</p>
              <CheckoutButton
                className="bg-foreground text-background hover:bg-foreground/95 mt-6 w-full"
                loading={loading === `${customPlan}:monthly`}
                disabled={paymentsBlocked}
                onClick={() => void onCheckout(customPlan, "monthly")}
              >
                {paymentsBlocked ? "Payments disabled" : `Choose ${selectedCustom.title}`}
              </CheckoutButton>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};

export default PricingAlaCarte;
