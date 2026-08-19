"use client";

import React from "react";

import type { ResumeWebContext } from "../shared/web";

import { cleanResumeText } from "@/features/documents/rendering/resume-rendering";
import { WebContactRow, WebLinkRow, createResumeWebTemplate, px } from "../shared/web";
import { webText } from "../shared/tokens";
import { veriworklySpecialGeometry as geometry, veriworklySpecialScale } from "./skin";

function Header(ctx: ResumeWebContext) {
  const { model, resume, style, tokens } = ctx;

  return (
    <header
      style={{
        borderBottom: `${geometry.headerRuleHeight}px solid ${style.accentColor}`,
        display: "flex",
        flexDirection: "column",
        marginBottom: px(geometry.headerGap),
        paddingBottom: px(geometry.headerPadBottom),
      }}
    >
      {model.showBasics && (
        <>
          <h1 style={{ ...webText(tokens.name), color: style.textColor }}>
            {cleanResumeText(resume.basics.fullName) || "Your Name"}
          </h1>

          {(resume.basics.headline || resume.basics.role) && (
            <p
              style={{
                ...webText(tokens.role),
                color: style.accentColor,
                marginTop: px(geometry.roleTop),
                textTransform: "uppercase",
              }}
            >
              {cleanResumeText(resume.basics.headline || resume.basics.role)}
            </p>
          )}

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
        columnGap: px(geometry.markGap),
        display: "flex",
        marginBottom: px(scale.headingGap),
      }}
    >
      <span
        aria-hidden="true"
        style={{
          backgroundColor: style.accentColor,
          display: "block",
          height: px(geometry.markSize),
          width: px(geometry.markSize),
        }}
      />
      <span style={{ ...webText(tokens.sectionTitle), textTransform: "uppercase" }}>{title}</span>
    </div>
  );
}

export const VeriworklySpecialWeb = createResumeWebTemplate({
  renderHeader: Header,
  renderSectionHeading: SectionHeading,
  scale: veriworklySpecialScale,
});
