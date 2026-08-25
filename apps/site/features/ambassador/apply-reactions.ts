/**
 * Reaction media for each question in the apply flow.
 *
 * `src` points at a self-hosted file under `public/ambassador/reactions/`. Leave it
 * `null` and the question falls back to an animated emoji sticker, which is why this
 * ships working without a single binary asset committed. Dropping a real GIF in is a
 * one-line change here - see `public/ambassador/reactions/README.md`.
 *
 * Self-hosted on purpose: `next.config.ts` only whitelists `images.unsplash.com` and
 * `avatars.githubusercontent.com` as remote image hosts, and the CSP sets
 * `frame-src 'none'`, so hotlinked Giphy images and Giphy iframe embeds are both blocked.
 */
export type ApplyReaction = {
  /** Path under /public, or null to use the emoji sticker fallback. */
  src: string | null;
  /** Shown as the sticker when `src` is null, and as a decorative badge when it isn't. */
  emoji: string;
  /** Caption under the media. Keep it short and funny. */
  caption: string;
  /** Alt text used when `src` is set. */
  alt: string;
};

export const APPLY_REACTIONS = {
  intro: {
    src: null,
    emoji: "🚀",
    caption: "no cover letter, we promise",
    alt: "An excited reaction",
  },
  college: {
    src: null,
    emoji: "🏫",
    caption: "campus rivalry starts now",
    alt: "A campus reaction",
  },
  year: {
    src: null,
    emoji: "🎓",
    caption: "the countdown is real",
    alt: "A graduation reaction",
  },
  why: {
    src: null,
    emoji: "💬",
    caption: "spill it, we're listening",
    alt: "A listening reaction",
  },
  superpower: {
    src: null,
    emoji: "⚡",
    caption: "flex responsibly",
    alt: "A superpower reaction",
  },
  funfact: {
    src: null,
    emoji: "🎲",
    caption: "make it weird",
    alt: "A surprised reaction",
  },
  vibe: {
    src: null,
    emoji: "🌈",
    caption: "there are no wrong answers (there is one wrong answer)",
    alt: "A vibing reaction",
  },
  social: {
    src: null,
    emoji: "📱",
    caption: "so we can hype you up publicly",
    alt: "A phone-scrolling reaction",
  },
  review: {
    src: null,
    emoji: "🧐",
    caption: "one last look",
    alt: "A reviewing reaction",
  },
  success: {
    src: null,
    emoji: "🎉",
    caption: "certified main character behaviour",
    alt: "A celebration reaction",
  },
} as const satisfies Record<string, ApplyReaction>;

export type ApplyReactionKey = keyof typeof APPLY_REACTIONS;
