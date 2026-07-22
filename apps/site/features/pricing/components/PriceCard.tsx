import React from "react";
import { Check, Clock3 } from "lucide-react";
import CheckoutButton from "./CheckoutButton";

interface PriceCardProps {
  marker: string;
  title: string;
  price: string;
  onCheckout: () => void;
  cadence: string;
  description: string;
  features: string[];
  note?: string;
  badge?: string;
  featured?: boolean;
  loading: boolean;
  toggle?: React.ReactNode;
  disabled?: boolean;
}

const PriceCard = ({
  marker,
  title,
  price,
  cadence,
  description,
  features,
  note,
  badge,
  featured,
  loading,
  toggle,
  onCheckout,
  disabled,
}: PriceCardProps) => {
  return (
    <article
      className={`relative flex min-h-[550px] flex-col rounded-3xl border-2 p-6 transition duration-300 hover:-translate-y-1 lg:p-7 ${
        featured
          ? "border-accent bg-accent text-accent-foreground shadow-accent/15 shadow-lg"
          : "border-border bg-card text-foreground shadow-sm"
      }`}
    >
      {featured && (
        <div className="pointer-events-none absolute inset-0 z-0 rounded-[1.3rem] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_60%)]" />
      )}

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`font-mono text-xs font-bold ${featured ? "text-white/60" : "text-muted/50"}`}
          >
            {marker}
          </span>
          {badge ? (
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase ${
                featured
                  ? "text-accent animate-pulse bg-white"
                  : "bg-accent/10 border-accent/20 text-accent border"
              }`}
            >
              {badge}
            </span>
          ) : (
            <Clock3 className={`size-4 ${featured ? "text-white/60" : "text-muted/40"}`} />
          )}
        </div>

        <h2 className="mt-8 text-3xl font-bold tracking-tight">{title}</h2>

        <div className="mt-6">
          <p className="text-[clamp(3.2rem,5vw,4.8rem)] leading-none font-bold tracking-tighter">
            {price}
          </p>
          <p className="mt-2 text-xs font-bold opacity-75">{cadence}</p>
          {note ? <p className="mt-1 text-xs font-bold opacity-80">{note}</p> : null}
        </div>

        {toggle ? <div className="mt-5">{toggle}</div> : null}

        <p className="mt-6 text-sm leading-6 opacity-85">{description}</p>

        <ul className="mt-7 mb-8 space-y-3.5 text-xs font-bold">
          {features.map((feature) => (
            <li className="flex items-center gap-2" key={feature}>
              <Check className="size-3.5" /> {feature}
            </li>
          ))}
        </ul>

        <CheckoutButton
          className={`mt-auto w-full transition duration-200 active:scale-[0.97] ${
            featured
              ? "text-accent bg-white hover:bg-white/95"
              : "bg-foreground text-background hover:bg-foreground/95"
          }`}
          loading={loading}
          disabled={disabled}
          onClick={onCheckout}
        >
          {disabled ? "Payments disabled" : `Choose ${title}`}
        </CheckoutButton>
      </div>
    </article>
  );
};

export default PriceCard;
