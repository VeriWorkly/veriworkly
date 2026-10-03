"use client";

import React from "react";

import type { ResumeWebContext } from "../shared/web";

import { cleanResumeText } from "@/features/documents/rendering/resume-rendering";
import { WebContactRow, WebLinkRow, createResumeWebTemplate, px } from "../shared/web";
import { webText } from "../shared/tokens";
import { timelineFocusGeometry as geometry, timelineFocusScale } from "./skin";

function Header(ctx: ResumeWebContext) {
  const { model, resume, scale, style, tokens } = ctx;

  return (
    <header
      style={{
        borderBottom: `${scale.hairline * geometry.headerRule}px solid ${style.accentColor}`,
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
              <p style={{ ...webText(tokens.role), fontWeight: 400 }}>
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
        alignItems: "center",
        columnGap: px(geometry.headingRuleGap),
        display: "flex",
        marginBottom: px(scale.headingGap),
      }}
    >
      <span style={{ ...webText(tokens.sectionTitle), textTransform: "uppercase" }}>{title}</span>

      <span
        style={{
          backgroundColor: style.borderColor,
          flexGrow: 1,
          height: px(scale.hairline),
        }}
      />
    </div>
  );
}

export const TimelineFocusWeb = createResumeWebTemplate({
  itemLayout: "gutter",
  renderHeader: Header,
  renderSectionHeading: SectionHeading,
  scale: timelineFocusScale,
});
