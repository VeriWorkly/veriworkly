"use client";

import React from "react";
import { Text, View } from "@react-pdf/renderer";

import type { ResumePdfContext } from "../shared/pdf";

import { cleanResumeText } from "@/features/documents/rendering/resume-rendering";
import { pxToPt } from "@/features/resume/constants/resume-layout";
import { PdfContactRow, PdfLinkRow, createResumePdfTemplate } from "../shared/pdf";
import { timelineFocusGeometry as geometry, timelineFocusScale } from "./skin";

function Header(ctx: ResumePdfContext) {
  const { model, resume, scale, style, styles } = ctx;

  return (
    <View
      style={{
        borderBottomColor: style.accentColor,
        borderBottomWidth: pxToPt(scale.hairline * geometry.headerRule),
        marginBottom: pxToPt(geometry.headerGap),
        paddingBottom: pxToPt(geometry.headerPadBottom),
      }}
    >
      {model.showBasics && (
        <>
          {/* Stacked, never side by side: text extractors read glyphs sharing a
              baseline as one line, so a headline beside the name became part of
              it and the ATS lost the name. */}
          <View style={{ flexDirection: "column", rowGap: pxToPt(geometry.nameGapY) }}>
            <Text style={styles.name}>
              {cleanResumeText(resume.basics.fullName) || "Your Name"}
            </Text>

            {(resume.basics.headline || resume.basics.role) && (
              <Text style={[styles.role, { fontWeight: 400 }]}>
                {cleanResumeText(resume.basics.headline || resume.basics.role)}
              </Text>
            )}
          </View>

          <PdfContactRow ctx={ctx} style={{ marginTop: pxToPt(geometry.contactTop) }} />
        </>
      )}

      <PdfLinkRow ctx={ctx} style={{ marginTop: pxToPt(geometry.linksTop) }} />
    </View>
  );
}

function SectionHeading(title: string, ctx: ResumePdfContext) {
  const { scale, styles } = ctx;

  return (
    <View
      style={{
        alignItems: "center",
        columnGap: pxToPt(geometry.headingRuleGap),
        flexDirection: "row",
        marginBottom: pxToPt(scale.headingGap),
      }}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.rule} />
    </View>
  );
}

export const TimelineFocusPdf = createResumePdfTemplate({
  itemLayout: "gutter",
  renderHeader: Header,
  renderSectionHeading: SectionHeading,
  scale: timelineFocusScale,
});
