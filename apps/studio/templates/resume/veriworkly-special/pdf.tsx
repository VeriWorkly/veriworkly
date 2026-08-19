"use client";

import React from "react";
import { Text, View } from "@react-pdf/renderer";

import type { ResumePdfContext } from "../shared/pdf";

import { cleanResumeText } from "@/features/documents/rendering/resume-rendering";
import { pxToPt } from "@/features/resume/constants/resume-layout";
import { PdfContactRow, PdfLinkRow, createResumePdfTemplate } from "../shared/pdf";
import { pdfFixedWidth } from "@/templates/shared/box";
import { veriworklySpecialGeometry as geometry, veriworklySpecialScale } from "./skin";

function Header(ctx: ResumePdfContext) {
  const { model, resume, style, styles } = ctx;

  return (
    <View
      style={{
        borderBottomColor: style.accentColor,
        borderBottomWidth: pxToPt(geometry.headerRuleHeight),
        marginBottom: pxToPt(geometry.headerGap),
        paddingBottom: pxToPt(geometry.headerPadBottom),
      }}
    >
      {model.showBasics && (
        <>
          <Text style={[styles.name, { color: style.textColor }]}>
            {cleanResumeText(resume.basics.fullName) || "Your Name"}
          </Text>

          {(resume.basics.headline || resume.basics.role) && (
            <Text
              style={[
                styles.role,
                {
                  color: style.accentColor,
                  marginTop: pxToPt(geometry.roleTop),
                  textTransform: "uppercase",
                },
              ]}
            >
              {cleanResumeText(resume.basics.headline || resume.basics.role)}
            </Text>
          )}

          <PdfContactRow ctx={ctx} style={{ marginTop: pxToPt(geometry.contactTop) }} />
        </>
      )}

      <PdfLinkRow ctx={ctx} style={{ marginTop: pxToPt(geometry.linksTop) }} />
    </View>
  );
}

function SectionHeading(title: string, ctx: ResumePdfContext) {
  const { scale, style, styles } = ctx;

  return (
    <View
      style={{
        alignItems: "center",
        columnGap: pxToPt(geometry.markGap),
        flexDirection: "row",
        marginBottom: pxToPt(scale.headingGap),
      }}
    >
      <View
        style={{
          ...pdfFixedWidth(geometry.markSize),
          backgroundColor: style.accentColor,
          height: pxToPt(geometry.markSize),
        }}
      />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export const VeriworklySpecialPdf = createResumePdfTemplate({
  renderHeader: Header,
  renderSectionHeading: SectionHeading,
  scale: veriworklySpecialScale,
});
