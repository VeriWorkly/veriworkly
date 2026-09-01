"use client";

import { motion } from "framer-motion";

const AmbassadorPerks = () => {
  /**
   * Framed as what the program is being built to do, not as live mechanics. The
   * server implements apply, review, and status only: there is no points ledger,
   * no voucher issuance, and no automated student verification behind any of this.
   * Specific point values here would read as a running economy, so they are out.
   */
  const perks = [
    {
      num: "01",
      title: "Free access to paid features",
      badge: "In development",
      description:
        "The reward we are building first: ambassadors get the paid tier free while they are active, so you can use the premium portfolio templates and AI credits you are telling classmates about.",
      details: ["Terms published before launch", "No cash payouts"],
    },
    {
      num: "02",
      title: "Reviewed by a person",
      badge: "How it works today",
      description:
        "Every application is read by hand. There is no automated validator and no instant badge, which means slower decisions and far fewer fake accounts in the program.",
      details: ["Manual review of each application", "Status visible on the apply page"],
    },
    {
      num: "03",
      title: "A direct line to the builder",
      badge: "Available now",
      description:
        "VeriWorkly is built by one person. Ambassadors get to say what is broken for students on their campus and see it fixed, which is the part we can promise today without qualification.",
      details: ["Direct contact, not a support queue", "Roadmap input taken seriously"],
    },
    {
      num: "04",
      title: "Shape the reward system",
      badge: "Founding intake",
      description:
        "The first cohort helps decide what earns recognition and what it is worth. Joining now means influencing the rules rather than inheriting them.",
      details: ["Founding-cohort input", "Specifics published before anyone earns"],
    },
  ];

  return (
    <section className="bg-background relative mx-auto w-full max-w-7xl overflow-hidden border-b border-zinc-200/80 px-6 py-28 dark:border-white/10">
      <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4 lg:sticky lg:top-32">
          <h2 className="text-5xl leading-[0.85] font-black tracking-tight text-zinc-950 uppercase sm:text-6xl md:text-7xl dark:text-white">
            CAMPUS
            <br />
            LEADER
            <br />
            BENEFITS
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            What the campus program offers today, and what we are building next. Reward mechanics
            are still being designed — we will publish them in full before anyone is asked to earn
            anything.
          </p>
        </div>

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
              <span className="block font-mono text-4xl leading-none font-black text-zinc-300 transition-colors select-none group-hover:text-indigo-600 dark:text-zinc-700 dark:group-hover:text-indigo-400">
                {perk.num}
              </span>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-xl leading-none font-extrabold tracking-tight text-zinc-950 dark:text-white">
                    {perk.title}
                  </h3>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-zinc-500 uppercase dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
                    {perk.badge}
                  </span>
                </div>

                <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {perk.description}
                </p>

                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 font-mono text-[10px] font-bold text-zinc-500 uppercase dark:text-zinc-500">
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
};

export default AmbassadorPerks;
