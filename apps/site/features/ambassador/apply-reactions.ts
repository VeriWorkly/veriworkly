export type ApplyReaction = {
  emoji: string;
  caption: string;
};

export const APPLY_REACTIONS = {
  intro: {
    emoji: "🚀",
    caption: "no cover letter, we promise",
  },
  college: {
    emoji: "🏫",
    caption: "campus rivalry starts now",
  },
  year: {
    emoji: "🎓",
    caption: "the countdown is real",
  },
  why: {
    emoji: "💬",
    caption: "spill it, we're listening",
  },
  superpower: {
    emoji: "⚡",
    caption: "flex responsibly",
  },
  funfact: {
    emoji: "🎲",
    caption: "make it weird",
  },
  vibe: {
    emoji: "🌈",
    caption: "there are no wrong answers (there is one wrong answer)",
  },
  social: {
    emoji: "📱",
    caption: "so we can hype you up publicly",
  },
  review: {
    emoji: "🧐",
    caption: "one last look",
  },
  success: {
    emoji: "🎉",
    caption: "certified main character behaviour",
  },
} as const satisfies Record<string, ApplyReaction>;

export type ApplyReactionKey = keyof typeof APPLY_REACTIONS;
