"use client";

import React from "react";

import type { ResumeWebContext } from "../shared/web";

import { cleanResumeText } from "@/features/documents/rendering/resume-rendering";
import { WebContactRow, WebLinkRow, createResumeWebTemplate, px } from "../shared/web";
import { webText } from "../shared/tokens";
import {
  precisionAtsGeometry as geometry,
  precisionAtsPagePadding,
  precisionAtsScale,
  precisionAtsSectionSpacing,
} from "./skin";

function Header(ctx: ResumeWebContext) {
  const { model, resume, scale, style, tokens } = ctx;

  return (
    <header
      style={{
        borderBottom: `${scale.hairline}px solid ${style.borderColor}`,
        display: "flex",
        flexDirection: "column",
        marginBottom: px(geometry.headerGap),
        paddingBottom: px(geometry.headerPadBottom),
      }}
    >
      {model.showBasics && (
        <>
          {/* Stacked, never side by side: text extractors read glyphs sharing a
              baseline as one line, so a headline beside the name became part of
              it and the ATS lost the name. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              rowGap: px(geometry.nameGapY),
            }}
          >
            <h1 style={webText(tokens.name)}>
              {cleanResumeText(resume.basics.fullName) || "Your Name"}
            </h1>

            {(resume.basics.headline || resume.basics.role) && (
              <p style={webText(tokens.role)}>
                {cleanResumeText(resume.basics.headline || resume.basics.role)}
              </p>
            )}
          </div>

          <WebContactRow ctx={ctx} style={{ marginTop: px(geometry.contactTop) }} />
        </>
      )}

      <WebLinkRow ctx={ctx} style={{ marginTop: px(geometry.linksTop) }} />
    </header>
  );
}

function SectionHeading(title: string, ctx: ResumeWebContext) {
  const { scale, style, tokens } = ctx;

  return (
    <div
      style={{
        ...webText(tokens.sectionTitle),
        borderBottom: `${scale.hairline}px solid ${style.borderColor}`,
        marginBottom: px(scale.headingGap),
        paddingBottom: px(geometry.headingPadBottom),
        textTransform: "uppercase",
      }}
    >
      {title}
    </div>
  );
}

export const CompactAtsWeb = createResumeWebTemplate({
  pagePadding: precisionAtsPagePadding,
  renderHeader: Header,
  renderSectionHeading: SectionHeading,
  scale: precisionAtsScale,
  sectionSpacing: precisionAtsSectionSpacing,
});
