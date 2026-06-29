"use client";

import { useState } from "react";
import { Sparkles, Trophy, Share2, Video, FileText, AlertCircle, Calendar } from "lucide-react";
import { Card } from "@veriworkly/ui";

export function AmbassadorPointsCalculator() {
  const [referrals, setReferrals] = useState(15);
  const [premiumReferrals, setPremiumReferrals] = useState(3);

  // Up to 30 for each category
  const [twitterPosts, setTwitterPosts] = useState(5);
  const [linkedinPosts, setLinkedinPosts] = useState(5);
  const [videos, setVideos] = useState(2);
  const [articles, setArticles] = useState(1);

  // Keep premium referrals <= total referrals
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

  // Content Allocation Algorithm (Max 30 total posts per month due to 1 post/day cap)
  // Higher-paying items are prioritized first to maximize points.
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

  // Point Calculation
  const basicCount = Math.max(0, referrals - premiumReferrals);
  const pointsFromBasic = basicCount * 10;
  const pointsFromPremium = premiumReferrals * 30; // 10 basic + 20 boost

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

  // 1500 points = 1 Month (30 Days) of Portfolio Pro
  const monthsUnlocked = Math.floor(totalPoints / 1500);
  const pointsToNextMonth = totalPoints % 1500;
  const progressPercent = (pointsToNextMonth / 1500) * 100;
  const pointsNeeded = 1500 - pointsToNextMonth;

  return (
    <Card className="border-border bg-card/60 relative overflow-hidden rounded-3xl border p-6 shadow-xl backdrop-blur-xs md:p-8">
      <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />

      <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Sliders Area */}
        <div className="space-y-6">
          <div>
            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Interactive Calculator
            </span>
            <h3 className="text-foreground mt-1 text-2xl font-bold tracking-tight">
              Simulate your ambassador points
            </h3>
            <p className="text-muted mt-1 text-sm">
              Adjust sliders to see points earned. Max 30 content posts counted per month (1
              post/day limit).
            </p>
          </div>

          <div className="space-y-5">
            {/* Referrals Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold">
                <label className="text-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-blue-500" /> Classmates Invited
                </label>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {referrals} students
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={referrals}
                onChange={(e) => handleReferralsChange(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-blue-600 dark:bg-zinc-800"
              />
              <span className="text-muted block text-[10px]">
                10 points per qualified invite (referred peer must verify and score at least 250
                platform engagement points)
              </span>
            </div>

            {/* Premium Upgrades Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold">
                <label className="text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" /> Premium Upgrades (+20 boost)
                </label>
                <span className="font-mono font-bold text-yellow-600 dark:text-yellow-400">
                  {premiumReferrals} upgrades
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={referrals || 10}
                disabled={referrals === 0}
                value={premiumReferrals}
                onChange={(e) => handlePremiumChange(Number(e.target.value))}
                className={`h-1.5 w-full cursor-pointer appearance-none rounded-lg accent-yellow-500 ${
                  referrals === 0
                    ? "cursor-not-allowed bg-zinc-100 opacity-50 dark:bg-zinc-900"
                    : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
              <span className="text-muted block text-[10px]">
                Boosts points for that invite to 30 points in total (10 basic + 20 boost)
              </span>
            </div>

            {/* Twitter Social Shares */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold">
                <label className="text-foreground flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-sky-500" /> Twitter/X Shares
                </label>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                  {twitterPosts} posts / mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={twitterPosts}
                onChange={(e) => setTwitterPosts(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-sky-500 dark:bg-zinc-800"
              />
              <span className="text-muted block text-[10px]">
                5 points per post (allocated out of 30 total daily post slots)
              </span>
            </div>

            {/* LinkedIn Social Shares */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold">
                <label className="text-foreground flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-blue-500" /> LinkedIn Shares
                </label>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {linkedinPosts} posts / mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={linkedinPosts}
                onChange={(e) => setLinkedinPosts(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-blue-600 dark:bg-zinc-800"
              />
              <span className="text-muted block text-[10px]">
                5 points per post (allocated out of 30 total daily post slots)
              </span>
            </div>

            {/* Videos Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold">
                <label className="text-foreground flex items-center gap-2">
                  <Video className="h-4 w-4 text-purple-500" /> Videos Created (LinkedIn /
                  Twitter/X)
                </label>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {videos} videos / mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={videos}
                onChange={(e) => setVideos(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-purple-500 dark:bg-zinc-800"
              />
              <span className="text-muted block text-[10px]">
                50 points per video (must be published on LinkedIn or Twitter/X)
              </span>
            </div>

            {/* Articles Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold">
                <label className="text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-500" /> Articles / Blog Posts
                </label>
                <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                  {articles} articles / mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={articles}
                onChange={(e) => setArticles(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-orange-500 dark:bg-zinc-800"
              />
              <span className="text-muted block text-[10px]">
                40 points per blog or article (Medium, Dev.to, LinkedIn Articles, or blog)
              </span>
            </div>

            <div className="text-muted flex items-center gap-1.5 text-[10px] italic">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>
                Daily Limit: Max 1 promotional post count per day (social post, video, or article)
                up to a max of 30 items per month. The calculator automatically prioritizes your
                highest-paying items.
              </span>
            </div>
          </div>
        </div>

        {/* Reward Outcome Area */}
        <div className="flex h-full flex-col justify-between space-y-6 rounded-2xl border border-zinc-200/50 bg-zinc-50/50 p-6 dark:border-zinc-800/80 dark:bg-zinc-900/50">
          <div className="space-y-4">
            <span className="text-muted block font-mono text-xs tracking-wider">
              ESTIMATED POINTS BALANCE
            </span>

            <div className="space-y-1">
              <div className="text-foreground font-mono text-5xl font-black tracking-tight">
                {totalPoints}
              </div>
              <span className="text-xs font-bold tracking-widest text-blue-600 uppercase dark:text-blue-400">
                Accumulated Points
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-amber-500/10 bg-amber-500/5 p-3 text-[11px] font-medium text-amber-800 dark:text-amber-400">
              <Calendar className="h-4.5 w-4.5 shrink-0 text-amber-500" />
              <span>All points reset annually on January 1st. Make sure to claim your codes!</span>
            </div>

            {/* Progress Bar to next 1 Month Pro */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted">Pro Code Progress</span>
                <span className="text-foreground font-bold">
                  {monthsUnlocked} claimed ({totalPoints} pts)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-muted flex justify-between font-mono text-[10px]">
                <span>{monthsUnlocked * 1500} pts</span>
                <span>{(monthsUnlocked + 1) * 1500} pts</span>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-blue-500/10 bg-blue-500/5 p-3 text-xs">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div>
                <span className="text-foreground font-bold">Redeem Pricing:</span> You need{" "}
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {pointsNeeded}
                </span>{" "}
                more points to claim a new{" "}
                <span className="font-bold">30-day Portfolio Pro token</span> (costs 1,500 points).
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-zinc-200/50 pt-4 dark:border-zinc-800/80">
            <span className="text-foreground block text-xs font-bold">Unlocked & Claims:</span>
            <ul className="space-y-2 text-xs">
              <li className="text-muted flex items-center justify-between">
                <span>Claimable 30-day Pro Tokens</span>
                <span className="text-foreground rounded-sm bg-zinc-200/50 px-2 py-0.5 font-mono font-bold dark:bg-zinc-800">
                  {monthsUnlocked}x
                </span>
              </li>
              <li className="text-muted flex items-center justify-between">
                <span>Allocated Daily Post count</span>
                <span className="text-foreground rounded-sm bg-zinc-200/50 px-2 py-0.5 font-mono font-bold dark:bg-zinc-800">
                  {totalContentPosts} / 30 posts
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
