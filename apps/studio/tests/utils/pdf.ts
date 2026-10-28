import { join } from "node:path";

import { createElement } from "react";
import { Font, pdf } from "@react-pdf/renderer";
import layoutDocument from "@react-pdf/layout";

import type { ComponentType, ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";

import { FONT_REGISTRY } from "@/features/documents/constants/fonts";
import { registerPdfHyphenation } from "@/templates/pdf/fonts";

/** The shape `@react-pdf/layout` returns. `top`/`left` are parent-relative. */
export interface LayoutNode {
  type: "DOCUMENT" | "PAGE" | "VIEW" | "TEXT" | "IMAGE" | "LINK" | string;
  box?: { top?: number; left?: number; width?: number; height?: number };
  style?: Record<string, unknown>;
  children?: LayoutNode[];
}

let fontsRegistered = false;

/**
 * Registers the same font files `app/globals.css` declares as `@font-face`, so
 * both engines shape text with one build of each family.
 */
export function registerPdfTestFonts() {
  if (fontsRegistered) return;

  // The same rule the browser export installs, or the measurement is of a
  // document nobody downloads.
  registerPdfHyphenation();

  for (const font of Object.values(FONT_REGISTRY)) {
    Font.register({
      family: font.primaryFamily,
      fonts: font.pdfFonts.map((face) => ({
        src: join(process.cwd(), "public", face.src),
        fontWeight: face.fontWeight,
      })),
    });
  }

  fontsRegistered = true;
}

/**
 * `@react-pdf/layout` as the export runs it: imported through the bundler (a transitive
 * dependency, inlined by the vitest config), so its textkit is the one
 * `templates/pdf/textkit.ts` replaces. `N` is the slice of the node shape the caller reads.
 */
export function resolveLayoutEngine<N = LayoutNode>() {
  return layoutDocument as unknown as (document: N, fontStore: unknown) => Promise<N>;
}

export async function layoutPages<P extends object>(
  Component: ComponentType<P>,
  props: P,
): Promise<LayoutNode[]> {
  registerPdfTestFonts();

  const element = createElement(Component, props) as unknown as ReactElement<DocumentProps>;
  const instance = pdf(element) as unknown as {
    container: { document: LayoutNode };
    toBuffer: () => Promise<unknown>;
  };

  // The layout engine mutates the tree, so the document must be built first.
  await instance.toBuffer();

  const laidOut = await resolveLayoutEngine()(instance.container.document, Font);
  return laidOut.children ?? [];
}
