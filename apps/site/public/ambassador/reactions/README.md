# Ambassador apply - reaction media

Drop meme images / GIFs for the apply flow in this folder, then point at them from
`apps/site/features/ambassador/apply-reactions.ts`:

```ts
college: {
  src: "/ambassador/reactions/college.gif", // was: null
  emoji: "🏫",
  caption: "campus rivalry starts now",
  alt: "A student dramatically pointing at their campus tote bag",
},
```

Until `src` is set, the question renders an animated emoji sticker instead - the flow is
fully functional with zero assets in this folder, so add them at your leisure.

## Rules

- **Self-hosted only.** `next.config.ts` whitelists just `images.unsplash.com` and
  `avatars.githubusercontent.com` for remote images, and the CSP sets `frame-src 'none'`,
  so hotlinked Giphy/Tenor URLs and Giphy iframe embeds are both blocked. Download the
  file and commit it here.
- **Keep them small.** Target < 500 KB each. These load on a mobile signup flow. Prefer
  animated `.webp` over `.gif` - usually 5–10× smaller for identical output.
- **Check the rights.** Reaction GIFs from film/TV are not automatically cleared for
  commercial marketing use. Safest options are assets you make, licensed stock, or
  clearly-licensed open media.
- **Write real `alt` text.** It describes the joke for someone who cannot see it. The
  caption is decorative and sits underneath; the alt text is not optional.
- **Respect reduced motion.** `ReactionMedia` already hides animated media and falls back
  to the static emoji sticker under `prefers-reduced-motion: reduce`, so an animated file
  will not ambush anyone who asked the OS for stillness.

## Suggested filenames

`intro`, `college`, `year`, `why`, `superpower`, `funfact`, `vibe`, `social`, `review`,
`success` - matching the keys in `apply-reactions.ts`.
