/**
 * Test stub for `next/font/google`.
 *
 * The real module is a build-time transform: Next rewrites each loader call
 * into a self-hosted font declaration during compilation, so under plain
 * Vitest the exports are not callable and importing any template that loads a
 * font throws `X is not a function`.
 *
 * Each loader below returns the same shape the real one does — a
 * `className` / `variable` / `style` object — with deterministic values, so
 * rendered markup stays stable across runs.
 *
 * Adding a typeface to a template's `fonts.ts` means adding it here too; the
 * `template-library.test.tsx` render tests fail loudly if it's forgotten.
 */
interface FontOptions {
  variable?: string;
  subsets?: string[];
  weight?: string[];
  style?: string[];
  display?: string;
}

interface StubFont {
  className: string;
  variable: string;
  style: { fontFamily: string };
}

function loader(family: string) {
  return (options: FontOptions = {}): StubFont => ({
    className: `__stub_${family}`,
    variable: options.variable ?? `--stub-${family}`,
    style: { fontFamily: family },
  });
}

// Signal
export const Outfit = loader("Outfit");
export const Space_Mono = loader("Space_Mono");

// Atelier
export const Playfair_Display = loader("Playfair_Display");
export const Inter = loader("Inter");

// Nimbus
export const Fraunces = loader("Fraunces");
export const DM_Mono = loader("DM_Mono");

// Cipher
export const JetBrains_Mono = loader("JetBrains_Mono");

// @veriworkly/ui (its index loads the shared fonts, so any component imported from it does)
export const Geist = loader("Geist");
export const Geist_Mono = loader("Geist_Mono");
