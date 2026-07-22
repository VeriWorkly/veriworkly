"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, animate, useMotionValue } from "framer-motion";
import {
  Sparkles,
  Trophy,
  Share2,
  Video,
  FileText,
  AlertCircle,
  Key,
  Lock,
  Copy,
  Check,
} from "lucide-react";

const SpringCounter = ({ value }: { value: number }) => {
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
};

const CounterStepper = ({
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
}) => {
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
          <p className="max-w-55 text-[10px] leading-normal text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>

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
};

const KeyTicket = ({ index }: { index: number }) => {
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
      className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-white/10 dark:bg-zinc-900"
    >
      <Key className="h-3.5 w-3.5 text-indigo-500" />
      <span className="font-mono text-[10px] font-bold text-zinc-900 dark:text-white">
        KEY #{index}
      </span>
      <button
        onClick={handleCopy}
        className="ml-2 flex items-center gap-1 rounded-md bg-zinc-200 px-2 py-1 text-[9px] font-bold text-zinc-700 hover:bg-zinc-300 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </motion.div>
  );
};

const AmbassadorCalculator = () => {
  const [standardInvites, setStandardInvites] = useState(25);
  const [proUpgrades, setProUpgrades] = useState(10);
  const [videoReviews, setVideoReviews] = useState(2);
  const [blogArticles, setBlogArticles] = useState(3);
  const [activityScore, setActivityScore] = useState(320);

  const totalContentPosts = videoReviews + blogArticles;
  const isActivityScoreVerified = activityScore >= 250;

  const pointsFromInvites = standardInvites * 10;
  const pointsFromProUpgrades = proUpgrades * 30;
  const pointsFromVideos = videoReviews * 50;
  const pointsFromBlogs = blogArticles * 40;

  const grossPoints =
    pointsFromInvites + pointsFromProUpgrades + pointsFromVideos + pointsFromBlogs;
  const totalPoints = isActivityScoreVerified ? grossPoints : 0;

  const monthsUnlocked = Math.floor(totalPoints / 1500);
  const pointsNeeded = 1500 - (totalPoints % 1500);
  const progressRatio = (totalPoints % 1500) / 1500;
  const widthStyle = `${Math.min(Math.max(progressRatio * 100, 0), 100)}%`;

  return (
    <section
      id="calculator-widget"
      className="bg-background relative mx-auto w-full max-w-7xl overflow-hidden border-b border-zinc-200/80 px-6 py-28 dark:border-white/10"
    >
      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-8">
          <div className="space-y-3">
            <span className="text-indigo-650 inline-flex items-center gap-1.5 font-mono text-[10px] font-black tracking-widest uppercase dark:text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" />
              Points Offset Calculator
            </span>
            <h2 className="text-4xl leading-[0.95] font-black tracking-tight text-zinc-950 uppercase sm:text-5xl md:text-6xl dark:text-white">
              ESTIMATE <br /> YOUR POINTS
            </h2>
            <p className="text-zinc-555 max-w-md text-sm leading-relaxed dark:text-zinc-400">
              Adjust peer invitations and content publications to calculate your point yield and
              unlocked Portfolio Pro license vouchers.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CounterStepper
              label="Standard Invites"
              value={standardInvites}
              onChange={setStandardInvites}
              icon={Share2}
              description="+10 points per verified peer invite"
              colorClass="text-blue-500"
            />

            <CounterStepper
              label="Pro Upgrades"
              value={proUpgrades}
              onChange={setProUpgrades}
              icon={Trophy}
              description="+30 points bonus per Pro upgrade"
              colorClass="text-amber-500"
            />

            <CounterStepper
              label="Video Reviews"
              value={videoReviews}
              onChange={setVideoReviews}
              max={15}
              icon={Video}
              description="+50 points per approved video post"
              colorClass="text-rose-500"
            />

            <CounterStepper
              label="Blog Articles"
              value={blogArticles}
              onChange={setBlogArticles}
              max={15}
              icon={FileText}
              description="+40 points per written walkthrough"
              colorClass="text-emerald-500"
            />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-white/10 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black tracking-wider text-zinc-900 uppercase dark:text-white">
                  Platform Activity Score
                </span>
                <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                  Minimum 250 activity score required for points verification.
                </p>
              </div>

              <div className="flex items-center gap-2 font-mono text-sm font-bold text-zinc-900 dark:text-white">
                <span>{activityScore}</span>
                {isActivityScoreVerified ? (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    Verified
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                    Unverified
                  </span>
                )}
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="500"
              step="10"
              value={activityScore}
              onChange={(e) => setActivityScore(Number(e.target.value))}
              className="mt-4 w-full"
            />
          </div>
        </div>

        <div className="sticky top-28 space-y-6 rounded-3xl border border-zinc-200/80 bg-zinc-50 p-8 dark:border-white/10 dark:bg-zinc-950">
          <div className="space-y-6">
            <div>
              <span className="text-xs font-black tracking-wider text-zinc-400 uppercase">
                Yield Output
              </span>
              <div className="mt-2 font-mono text-5xl font-black tracking-tight text-zinc-950 md:text-6xl dark:text-white">
                <SpringCounter value={totalPoints} />
                <span className="ml-2 text-xl text-indigo-600 dark:text-indigo-400">PTS</span>
              </div>
            </div>

            {!isActivityScoreVerified && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-bold text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Points locked until activity score reaches 250.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-zinc-200 pt-6 dark:border-white/10">
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                  Pro Months
                </span>
                <p className="font-mono text-2xl font-black text-zinc-900 dark:text-white">
                  {monthsUnlocked} Mo
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                  Redeem Ratio
                </span>
                <p className="font-mono text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  1500 : 1 Key
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-xs font-bold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
                <span>Progress to Next Key</span>
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

            <div className="flex items-center justify-between rounded-xl bg-zinc-100 p-4 text-xs font-bold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <span>Next Upgrade In:</span>
              <span className="font-mono text-zinc-950 dark:text-white">{pointsNeeded} PTS</span>
            </div>
          </div>

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

            <div className="flex items-center justify-between border-t border-zinc-200 pt-4 text-[11px] font-bold tracking-wide text-zinc-400 uppercase dark:border-white/10 dark:text-zinc-500">
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
};

export default AmbassadorCalculator;
