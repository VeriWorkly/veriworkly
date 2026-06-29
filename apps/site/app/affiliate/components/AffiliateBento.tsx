"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, BadgeDollarSign, ShieldCheck, Check, Terminal } from "lucide-react";

export function AffiliateBento() {
  const [username, setUsername] = useState("username");
  const [copied, setCopied] = useState(false);
  const [scans, setScans] = useState<string[]>(["Filter initialized.", "Network trace: OK."]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`veriworkly.com/?ref=${username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const logs = [
      "Securing device session...",
      "Self-referral check: clean.",
      "Fraud footprint: negative.",
      "IP reputation: verified.",
      "Conversion locked successfully.",
    ];
    let i = 0;
    const interval = setInterval(() => {
      setScans((prev) => [...prev.slice(-3), logs[i]]);
      i = (i + 1) % logs.length;
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="mx-auto max-w-7xl border-t border-zinc-200/50 px-6 py-24 md:py-32 dark:border-zinc-800/30">
      <div className="mb-16 max-w-xl space-y-4">
        <span className="w-fit rounded-full bg-blue-500/10 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-blue-600 uppercase dark:bg-blue-500/20 dark:text-blue-400">
          Local Console
        </span>
        <h2 className="text-foreground text-4xl leading-tight font-bold tracking-tight md:text-5xl">
          Elite Tracking <br />
          <span className="font-serif font-normal text-blue-600 italic dark:text-blue-400">
            Dashboard & Security
          </span>
        </h2>
        <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
          Track link performance, manage your cashflow limits, and audit conversions through our
          localized safety framework.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="group relative flex min-h-[350px] flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200/50 bg-white/40 p-8 shadow-sm backdrop-blur-md md:col-span-2 dark:border-zinc-800/80 dark:bg-zinc-900/30"
        >
          <div className="pointer-events-none absolute inset-px rounded-[23px] border border-white/40 dark:border-zinc-800/30" />
          <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-gradient-to-bl from-blue-500/5 to-transparent blur-3xl" />

          <div className="space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/30 bg-zinc-100 text-blue-600 dark:border-zinc-700/30 dark:bg-zinc-800/50 dark:text-blue-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground text-lg font-bold tracking-tight">
                Real-time URL Generator
              </h3>
              <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
                Generate tracking links instantly. Enter your unique handle below, then copy and
                distribute to start accumulating lifetime MRR rewards.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-3 pt-6">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center rounded-xl border border-zinc-200/80 bg-zinc-100/60 px-3.5 py-2.5 transition-colors focus-within:border-blue-500/50 dark:border-zinc-800 dark:bg-zinc-950/60">
                <span className="text-muted-foreground pr-1 font-mono text-xs select-none">
                  ref=
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  placeholder="handle"
                  className="text-foreground w-full border-0 bg-transparent p-0 font-mono text-xs outline-none focus:ring-0"
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCopy}
                className="flex min-w-[100px] items-center justify-center rounded-xl bg-zinc-950 px-6 py-2.5 text-xs font-bold text-zinc-100 shadow-sm transition-colors duration-200 hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.span
                      key="copied"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" /> Copied
                    </motion.span>
                  ) : (
                    <span key="copy">Copy Link</span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
            <div className="w-full truncate rounded-xl border border-zinc-200/50 bg-zinc-100/40 p-3 font-mono text-[10px] text-blue-600 select-all dark:border-zinc-800/40 dark:bg-zinc-950/30 dark:text-blue-400">
              veriworkly.com/?ref={username || "handle"}
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="group relative flex min-h-[350px] flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200/50 bg-white/40 p-8 shadow-sm backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/30"
        >
          <div className="pointer-events-none absolute inset-px rounded-[23px] border border-white/40 dark:border-zinc-800/30" />

          <div className="space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/30 bg-zinc-100 text-emerald-600 dark:border-zinc-700/30 dark:bg-zinc-800/50 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-foreground text-lg font-bold tracking-tight">Conversions</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Visual monthly metrics and click logs updated inside your live analytics panel.
              </p>
            </div>
          </div>

          <div className="flex h-28 items-end gap-1.5 pt-4">
            {[35, 50, 42, 68, 55, 80, 60, 95].map((val, idx) => (
              <div key={idx} className="group/bar flex h-full flex-1 flex-col justify-end">
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: `${val}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full cursor-pointer rounded-t-md bg-emerald-500/10 transition-colors duration-150 group-hover/bar:bg-emerald-500 dark:bg-emerald-500/15 dark:group-hover/bar:bg-emerald-400"
                >
                  <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-zinc-950 px-1 py-0.5 font-mono text-[8px] font-bold text-white opacity-0 shadow-sm transition-opacity duration-150 select-none group-hover/bar:opacity-100 dark:bg-zinc-100 dark:text-zinc-950">
                    {val}
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="group relative flex min-h-[350px] flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200/50 bg-white/40 p-8 shadow-sm backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/30"
        >
          <div className="pointer-events-none absolute inset-px rounded-[23px] border border-white/40 dark:border-zinc-800/30" />

          <div className="space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/30 bg-zinc-100 text-amber-600 dark:border-zinc-700/30 dark:bg-zinc-800/50 dark:text-amber-400">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-foreground text-lg font-bold tracking-tight">Payout Floor</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Stripe transfers queue dynamically. Withdraw balance as soon as you cross the lock.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-3 pt-4">
            <div className="flex w-full flex-col gap-1 rounded-2xl border border-zinc-200/60 bg-zinc-50 p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/40">
              <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
                Transfer Limit
              </span>
              <span className="font-mono text-lg font-bold text-amber-600 dark:text-amber-400">
                $25.00 Minimum
              </span>
            </div>
            <div className="text-muted-foreground flex items-center gap-2 pl-1 text-[10px]">
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
              <span>Funds dispatch ready immediately</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="border-zinc-805 group relative flex min-h-[350px] flex-col justify-between overflow-hidden rounded-3xl border bg-zinc-950 p-8 text-zinc-100 shadow-md md:col-span-2"
        >
          <div className="pointer-events-none absolute inset-px rounded-[23px] border border-white/5" />
          <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-gradient-to-bl from-rose-500/10 to-transparent blur-3xl" />

          <div className="space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-rose-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold tracking-tight text-white">
                Security & Fraud Filter
              </h3>
              <p className="max-w-md text-xs leading-relaxed text-zinc-400">
                Continuous anti-abuse scanners monitor referrers. The local security system filters
                self-referrals, browser masking, and malicious routing patterns.
              </p>
            </div>
          </div>

          <div className="flex h-36 flex-col justify-end gap-1.5 overflow-hidden rounded-2xl border border-zinc-900 bg-black/60 p-4 font-mono text-[10px] text-zinc-400 shadow-inner">
            <div className="mb-1.5 flex items-center gap-1.5 border-b border-zinc-900 pb-2 text-zinc-500 select-none">
              <Terminal className="h-3.5 w-3.5 text-rose-500" />
              <span>veriworkly_firewall.sh</span>
            </div>
            <AnimatePresence mode="popLayout">
              {scans.map((log, idx) => (
                <motion.div
                  key={log + idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex items-center gap-1.5 truncate"
                >
                  <span className="font-black text-rose-500/80">❯</span>
                  <span className="text-zinc-300">{log}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
