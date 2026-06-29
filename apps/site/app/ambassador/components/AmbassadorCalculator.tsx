"use client";

import { useState, useEffect, useRef } from "react";
import { motion, animate, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Sparkles,
  Trophy,
  Share2,
  Video,
  FileText,
  AlertCircle,
  Calendar,
  Key,
  Lock,
  Copy,
  Check,
} from "lucide-react";

// Spring number counter for points
function SpringCounter({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(motionVal, value, {
      type: "spring",
      stiffness: 70,
      damping: 14,
      onUpdate: (latest) => {
        if (spanRef.current) {
          spanRef.current.textContent = Math.round(latest).toLocaleString();
        }
      },
    });
    return () => controls.stop();
  }, [value, motionVal]);

  return <span ref={spanRef}>0</span>;
}

// Stepper item component
function CounterStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  disabled = false,
  icon: Icon,
  colorClass = "text-zinc-500",
  description,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  colorClass?: string;
  description: string;
}) {
  return (
    <div
      className={`flex flex-col justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-6 transition-colors duration-300 dark:border-white/10 dark:bg-zinc-900/40 ${disabled ? "opacity-40 select-none" : "hover:border-zinc-300 dark:hover:border-white/20"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black tracking-wider text-zinc-900 uppercase dark:text-white">
            <Icon className={`h-4 w-4 ${colorClass}`} />
            <span>{label}</span>
          </div>
          <p className="max-w-[220px] text-[10px] leading-normal text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>

        {/* Stepper Controls */}
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-zinc-200 bg-white p-1 shadow-xs select-none dark:border-white/10 dark:bg-zinc-950">
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            disabled={disabled || value <= min}
            onClick={() => onChange(value - 1)}
            className="stepper-btn"
          >
            -
          </motion.button>
          <span className="stepper-value font-mono text-xs font-bold text-zinc-900 dark:text-white">
            {value}
          </span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            disabled={disabled || value >= max}
            onClick={() => onChange(value + 1)}
            className="stepper-btn"
          >
            +
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// Voucher Key Ticket component
function KeyTicket({ index }: { index: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`VW-PRO-KEY-${index}-CAMPUS`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, delay: index * 0.05 }}
      className="group relative flex min-w-[180px] items-center justify-between gap-3 overflow-hidden rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[9px] font-bold tracking-widest text-zinc-900 uppercase shadow-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
    >
      {/* Notch Left */}
      <div
        className="absolute top-1/2 left-0 h-2.5 w-1.5 -translate-y-1/2 rounded-r-full border-r border-zinc-200 bg-zinc-50 dark:border-white/15 dark:bg-zinc-950"
        style={{ marginLeft: "-1px" }}
      />
      {/* Notch Right */}
      <div
        className="absolute top-1/2 right-0 h-2.5 w-1.5 -translate-y-1/2 rounded-l-full border-l border-zinc-200 bg-zinc-50 dark:border-white/15 dark:bg-zinc-950"
        style={{ marginRight: "-1px" }}
      />

      <div className="flex items-center gap-2 pl-1.5">
        <Key className="text-indigo-650 h-3.5 w-3.5 dark:text-indigo-400" />
        <span>VW PRO KEY #{index}</span>
      </div>

      <motion.button
        type="button"
        onClick={handleCopy}
        whileTap={{ scale: 0.85 }}
        className="text-zinc-550 cursor-pointer p-1 pr-1 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
        )}
      </motion.button>
    </motion.div>
  );
}

export function AmbassadorCalculator() {
  const [referrals, setReferrals] = useState(15);
  const [premiumReferrals, setPremiumReferrals] = useState(3);
  const [twitterPosts, setTwitterPosts] = useState(5);
  const [linkedinPosts, setLinkedinPosts] = useState(5);
  const [videos, setVideos] = useState(2);
  const [articles, setArticles] = useState(1);

  const handleReferralsChange = (val: number) => {
    setReferrals(val);
    if (premiumReferrals > val) {
      setPremiumReferrals(val);
    }
  };

  const handlePremiumChange = (val: number) => {
    if (val <= referrals) {
      setPremiumReferrals(val);
    }
  };

  let remainingSlots = 30;

  const allocatedVideos = Math.min(videos, remainingSlots);
  remainingSlots -= allocatedVideos;

  const allocatedArticles = Math.min(articles, remainingSlots);
  remainingSlots -= allocatedArticles;

  const allocatedTwitter = Math.min(twitterPosts, remainingSlots);
  remainingSlots -= allocatedTwitter;

  const allocatedLinkedin = Math.min(linkedinPosts, remainingSlots);
  remainingSlots -= allocatedLinkedin;

  const totalContentPosts =
    allocatedVideos + allocatedArticles + allocatedTwitter + allocatedLinkedin;

  const basicCount = Math.max(0, referrals - premiumReferrals);
  const pointsFromBasic = basicCount * 10;
  const pointsFromPremium = premiumReferrals * 30;

  const pointsFromVideos = allocatedVideos * 50;
  const pointsFromArticles = allocatedArticles * 40;
  const pointsFromTwitter = allocatedTwitter * 5;
  const pointsFromLinkedin = allocatedLinkedin * 5;

  const totalPoints =
    pointsFromBasic +
    pointsFromPremium +
    pointsFromVideos +
    pointsFromArticles +
    pointsFromTwitter +
    pointsFromLinkedin;

  const monthsUnlocked = Math.floor(totalPoints / 1500);
  const pointsToNextMonth = totalPoints % 1500;
  const progressPercent = (pointsToNextMonth / 1500) * 100;
  const pointsNeeded = 1500 - pointsToNextMonth;

  const springProgress = useSpring(progressPercent, { stiffness: 60, damping: 15 });

  useEffect(() => {
    springProgress.set(progressPercent);
  }, [progressPercent, springProgress]);

  const widthStyle = useTransform(springProgress, (latest) => `${latest}%`);

  return (
    <section
      id="calculator-widget"
      className="bg-background relative mx-auto w-full max-w-7xl border-b border-zinc-200/80 px-6 py-28 dark:border-white/10"
    >
      <div className="grid grid-cols-1 items-stretch gap-16 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left Column: Interactive Inputs */}
        <div className="space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl leading-[0.85] font-black tracking-tight text-zinc-950 uppercase sm:text-5xl dark:text-white">
              EARNINGS
              <br />
              SIMULATOR
            </h2>
            <p className="text-zinc-555 max-w-lg text-sm leading-relaxed dark:text-zinc-400">
              Estimate points from peer verification notes and social review shares. Capped at 30
              approved posts monthly.
            </p>
          </div>

          <div className="space-y-8">
            {/* Section 1 */}
            <div className="space-y-4">
              <h4 className="text-indigo-650 text-[10px] font-black tracking-widest uppercase dark:text-indigo-400">
                01 / Referral nodes
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CounterStepper
                  label="Referrals"
                  description="Qualified invite checks: student domain must verify (+10 PTS)."
                  value={referrals}
                  onChange={handleReferralsChange}
                  min={0}
                  max={100}
                  icon={Trophy}
                />
                <CounterStepper
                  label="Pro Upgrades"
                  description="Upgrade boost: referral point allocation multiplies to +30 PTS."
                  value={premiumReferrals}
                  onChange={handlePremiumChange}
                  min={0}
                  max={referrals}
                  disabled={referrals === 0}
                  icon={Sparkles}
                />
              </div>
            </div>

            {/* Section 2 */}
            <div className="space-y-4 border-t border-zinc-200/80 pt-6 dark:border-white/10">
              <h4 className="text-sky-650 text-[10px] font-black tracking-widest uppercase dark:text-sky-400">
                02 / Social feed shares
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CounterStepper
                  label="Twitter/X Shares"
                  description="Approved platform review posts shared on Twitter/X (+5 PTS)."
                  value={twitterPosts}
                  onChange={setTwitterPosts}
                  min={0}
                  max={30}
                  icon={Share2}
                />
                <CounterStepper
                  label="LinkedIn Shares"
                  description="Approved platform review posts shared on LinkedIn (+5 PTS)."
                  value={linkedinPosts}
                  onChange={setLinkedinPosts}
                  min={0}
                  max={30}
                  icon={Share2}
                />
              </div>
            </div>

            {/* Section 3 */}
            <div className="space-y-4 border-t border-zinc-200/80 pt-6 dark:border-white/10">
              <h4 className="text-purple-650 text-[10px] font-black tracking-widest uppercase dark:text-purple-400">
                03 / Content creator
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CounterStepper
                  label="Video Reviews"
                  description="Video walkthroughs uploaded to LinkedIn or Twitter/X (+50 PTS)."
                  value={videos}
                  onChange={setVideos}
                  min={0}
                  max={30}
                  icon={Video}
                />
                <CounterStepper
                  label="Blog Articles"
                  description="Articles published on Medium, Dev.to, or LinkedIn (+40 PTS)."
                  value={articles}
                  onChange={setArticles}
                  min={0}
                  max={30}
                  icon={FileText}
                />
              </div>
            </div>

            <div className="text-zinc-555 flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4.5 text-xs leading-relaxed dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-400">
              <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
              <span>
                Referral credits are settled after manually reviewing activity tags. Promotional
                items enforce a strict cap of 30 total posts per month.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Display Console (Editorial Outlined box) */}
        <div className="flex flex-col justify-between gap-8 rounded-3xl border border-zinc-200 bg-zinc-50/50 p-8 md:p-10 dark:border-white/10 dark:bg-zinc-900/10">
          <div className="space-y-8">
            <span className="block text-[9px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
              Calculated Standing
            </span>

            {/* Score */}
            <div className="space-y-2">
              <div className="font-sans text-6xl leading-none font-black tracking-tighter text-zinc-950 select-none sm:text-7xl md:text-8xl dark:text-white">
                <SpringCounter value={totalPoints} />
              </div>
              <span className="block text-[9px] font-black tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
                Accumulated Points
              </span>
            </div>

            <div className="text-zinc-650 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-xs leading-normal font-bold dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
              <Calendar className="h-4.5 w-4.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
              <span>Voucher inventory keys reset annually on January 1st.</span>
            </div>

            {/* Milestones */}
            <div className="space-y-3.5 pt-2">
              <div className="text-zinc-550 flex justify-between text-xs font-bold tracking-widest uppercase dark:text-zinc-400">
                <span className="text-zinc-450 dark:text-zinc-500">Next Milestone</span>
                <span className="text-zinc-900 dark:text-white">{monthsUnlocked}x Unlocked</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full border border-zinc-200 bg-zinc-200 dark:border-white/5 dark:bg-zinc-900">
                <motion.div
                  style={{ width: widthStyle }}
                  className="h-full rounded-full bg-zinc-950 dark:bg-white"
                />
              </div>
              <div className="flex justify-between font-mono text-[9px] font-bold text-zinc-400 dark:text-zinc-500">
                <span>{monthsUnlocked * 1500} pts</span>
                <span>{(monthsUnlocked + 1) * 1500} pts</span>
              </div>
            </div>

            <div className="text-zinc-555 flex items-center justify-between rounded-xl bg-zinc-100 p-4 text-xs font-bold dark:bg-zinc-900 dark:text-zinc-400">
              <span>Next Upgrade In:</span>
              <span className="font-mono text-zinc-950 dark:text-white">{pointsNeeded} PTS</span>
            </div>
          </div>

          {/* Shelf */}
          <div className="space-y-4 border-t border-zinc-200 pt-6 dark:border-white/10">
            <span className="block text-xs font-black tracking-wider text-zinc-950 uppercase dark:text-white">
              Vouchers Inventory
            </span>

            <div className="flex flex-wrap gap-2">
              {monthsUnlocked > 0 ? (
                Array.from({ length: Math.min(monthsUnlocked, 4) }).map((_, kIndex) => (
                  <KeyTicket key={kIndex} index={kIndex + 1} />
                ))
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[9px] font-bold tracking-widest text-zinc-400 uppercase dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-500">
                  <Lock className="h-3.5 w-3.5" />
                  <span>No key vouchers claimed</span>
                </div>
              )}
            </div>

            <div className="text-zinc-450 flex items-center justify-between border-t border-zinc-200 pt-4 text-[11px] font-bold tracking-wide uppercase dark:border-white/10 dark:text-zinc-500">
              <span>Active monthly slots</span>
              <span className="font-mono font-bold text-zinc-950 dark:text-white">
                {totalContentPosts} / 30 posts
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
