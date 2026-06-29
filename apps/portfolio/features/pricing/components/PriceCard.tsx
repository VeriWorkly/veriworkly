import React from "react";
import { Check, Clock3 } from "lucide-react";

import { CheckoutButton } from "./CheckoutButton";

interface PriceCardProps {
  marker: string;
  title: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  note?: string;
  badge?: string;
  featured?: boolean;
  href: string;
  toggle?: React.ReactNode;
}

export function PriceCard({
  marker,
  title,
  price,
  cadence,
  description,
  features,
  note,
  badge,
  featured,
  href,
  toggle,
}: PriceCardProps) {
  return (
    <article
      className={`group relative flex min-h-[560px] flex-col rounded-[2.2rem] border-2 p-6 transition-all duration-300 hover:-translate-y-1 lg:min-h-[590px] ${
        featured
          ? "border-line-strong bg-accent z-10 text-white shadow-[12px_14px_0_rgba(17,17,15,0.22)] hover:shadow-[14px_16px_0_rgba(17,17,15,0.26)] dark:shadow-[12px_14px_0_rgba(255,255,255,0.12)] hover:dark:shadow-[14px_16px_0_rgba(255,255,255,0.15)]"
          : "border-line bg-panel z-0 shadow-[8px_10px_0_rgba(17,17,15,0.12)] hover:shadow-[10px_12px_0_rgba(17,17,15,0.15)] dark:shadow-[8px_10px_0_rgba(255,255,255,0.05)] hover:dark:shadow-[10px_12px_0_rgba(255,255,255,0.07)]"
      }`}
    >
      {featured && (
        <div className="pointer-events-none absolute inset-0 z-0 rounded-[2rem] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
      )}
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`font-mono text-xs font-bold ${featured ? "text-white/60" : "text-muted/60"}`}
          >
            {marker}
          </span>

          {badge ? (
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase ${
                featured
                  ? "text-accent animate-pulse bg-white"
                  : "bg-accent/10 text-accent border-accent/20 border"
              }`}
            >
              {badge}
            </span>
          ) : (
            <Clock3 className={`size-4 ${featured ? "text-white/60" : "text-muted/40"}`} />
          )}
        </div>

        <h2 className="mt-8 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{title}</h2>

        <div className="mt-5">
          <p
            className={`${
              featured ? "text-[clamp(3.4rem,6.5vw,4.8rem)]" : "text-[clamp(2.6rem,5.5vw,3.6rem)]"
            } leading-none font-bold tracking-[-0.07em]`}
          >
            {price}
          </p>

          <p className="mt-2 text-xs font-bold opacity-70">{cadence}</p>

          {note ? <p className="mt-1 text-xs font-bold opacity-80">{note}</p> : null}
        </div>

        {toggle ? <div className="mt-5">{toggle}</div> : null}

        <p className={`mt-6 text-base leading-7 ${featured ? "text-white/90" : "text-muted"}`}>
          {description}
        </p>

        <ul className="mt-7 mb-8 space-y-3.5 text-xs font-bold">
          {features.map((feature) => (
            <li className="flex items-center gap-2" key={feature}>
              <Check className="size-3.5" /> {feature}
            </li>
          ))}
        </ul>

        <CheckoutButton
          href={href}
          className={`mt-auto w-full transition-all duration-200 active:scale-[0.97] ${
            featured
              ? "text-accent hover:bg-paper-2 bg-white shadow-[0_8px_20px_rgba(255,255,255,0.1)]"
              : "bg-accent hover:bg-accent-strong text-white shadow-[0_8px_20px_rgba(37,99,235,0.15)]"
          }`}
        >
          Choose {title}
        </CheckoutButton>
      </div>
    </article>
  );
}
