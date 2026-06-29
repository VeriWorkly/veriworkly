"use client";

import { motion } from "framer-motion";

export function AmbassadorPerks() {
  const perks = [
    {
      num: "01",
      title: "Invite Points System",
      badge: "Standard Node",
      description:
        "Earn 10 points for every peer invited to VeriWorkly. Boost to +30 points automatically when the classmate upgrades to a Pro seat.",
      details: ["+10 points standard verify", "+30 points pro seat multiplier"],
    },
    {
      num: "02",
      title: "Security & Abuse Control",
      badge: "Verification",
      description:
        "Points settle only after account verifies student credentials & reaches 250 platform activity score. Prevents bot registrations.",
      details: ["Verified (.edu) university domain check", "Anti-abuse activity scoring active"],
    },
    {
      num: "03",
      title: "Voucher Exchange",
      badge: "Milestone Claims",
      description:
        "Claim permanent license keys instantly. Every block of 1,500 points can be redeemed for a 30-day premium Portfolio Pro voucher code.",
      details: ["1500 points = 30-day upgrade key", "Stackable license extensions supported"],
    },
    {
      num: "04",
      title: "Walkthrough Showcase",
      badge: "Creator Channels",
      description:
        "Publish video reviews or blog posts demonstrating the local-first editor. Receive up to 50 points per approved creator post.",
      details: ["Video reviews: +50 points each", "Blog articles: +40 points each"],
    },
  ];

  return (
    <section className="bg-background relative mx-auto w-full max-w-7xl overflow-hidden border-b border-zinc-200/80 px-6 py-28 dark:border-white/10">
      <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left Column: Big Sticky Editorial Title */}
        <div className="space-y-4 lg:sticky lg:top-32">
          <h2 className="text-5xl leading-[0.85] font-black tracking-tight text-zinc-950 uppercase sm:text-6xl md:text-7xl dark:text-white">
            CAMPUS
            <br />
            LEADER
            <br />
            BENEFITS
          </h2>
          <p className="text-zinc-555 max-w-sm text-sm leading-relaxed dark:text-zinc-400">
            Structured points offsets, verification safeguards, and custom license inventory claims
            built for verified student leaders.
          </p>
        </div>

        {/* Right Column: High-contrast Editorial Rows (No generic cards!) */}
        <div className="border-t border-zinc-950 dark:border-white/20">
          {perks.map((perk, idx) => (
            <motion.div
              key={perk.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className="group grid grid-cols-1 items-start gap-6 rounded-lg border-b border-zinc-200 px-4 py-10 transition-colors duration-300 hover:bg-zinc-50 md:grid-cols-[80px_1fr] dark:border-white/10 dark:hover:bg-white/2"
            >
              {/* Giant Index */}
              <span className="group-hover:text-indigo-650 block font-mono text-4xl leading-none font-black text-zinc-300 transition-colors select-none dark:text-zinc-700 dark:group-hover:text-indigo-400">
                {perk.num}
              </span>

              {/* Content */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-xl leading-none font-extrabold tracking-tight text-zinc-950 dark:text-white">
                    {perk.title}
                  </h3>
                  <span className="text-zinc-550 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-widest uppercase dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
                    {perk.badge}
                  </span>
                </div>

                <p className="text-zinc-555 max-w-xl text-sm leading-relaxed dark:text-zinc-400">
                  {perk.description}
                </p>

                {/* Sub details list */}
                <div className="text-zinc-450 flex flex-wrap gap-x-6 gap-y-2 pt-2 font-mono text-[10px] font-bold uppercase dark:text-zinc-500">
                  {perk.details.map((detail, dIdx) => (
                    <span key={dIdx} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                      <span>{detail}</span>
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
