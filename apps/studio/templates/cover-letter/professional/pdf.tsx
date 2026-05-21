import { Document, Link, Page, StyleSheet, Text, View, Svg, Circle } from "@react-pdf/renderer";

import type { CoverLetterContent } from "@/features/cover-letter/types";
import { FONT_REGISTRY, normalizeFontFamilyId } from "@/features/documents/constants/fonts";

import {
  pt,
  PX_TO_PT,
  splitParagraphs,
  splitMarkdownLines,
  getCoverLetterLinks,
  splitRichTextBlocks,
  getCoverLetterLinkDisplayMode,
} from "../shared";

import {
  getLinkDisplayText,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";
import { PdfSocialIcon } from "@/templates/pdf/SocialIcon";

const styles = StyleSheet.create({
  page: {
    padding: pt(44),
    fontSize: pt(15),
    lineHeight: 1.55,
    color: "#18181b",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#e4e4e7",
    paddingBottom: pt(28),
  },

  headerIdentity: { flex: 1 },

  headerContact: { width: pt(230), marginLeft: pt(32), alignItems: "flex-end" },

  name: { fontSize: pt(34), lineHeight: 1.25, fontWeight: 600, color: "#09090b" },

  title: { marginTop: pt(8), fontSize: pt(14), color: "#52525b", fontWeight: 600 },

  contact: { marginBottom: pt(6), fontSize: pt(14), lineHeight: 1.25, color: "#52525b" },

  link: {
    color: "#09090b",
    marginBottom: pt(6),
    fontSize: pt(14),
    lineHeight: 1.25,
    fontWeight: 700,
    textDecoration: "underline",
  },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: pt(6),
  },

  linkIcon: { marginRight: pt(3), width: pt(11), height: pt(11) },

  linkText: {
    color: "#09090b",
    fontSize: pt(14),
    lineHeight: 1.1,
    fontWeight: 700,
  },

  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: pt(36),
    color: "#3f3f46",
  },

  metaLeft: { flex: 1, fontSize: pt(14), lineHeight: 1.25 },

  metaLeftText: { marginBottom: pt(4) },

  metaDate: {
    width: pt(180),
    marginLeft: pt(32),
    textAlign: "right",
    fontSize: pt(14),
    lineHeight: 1.25,
    fontWeight: 600,
    fontColor: "#71717b",
  },

  subject: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e4e4e7",
    marginTop: pt(32),
    paddingVertical: pt(16),
  },

  label: {
    fontSize: pt(10),
    letterSpacing: 1.25,
    color: "#71717a",
    textTransform: "uppercase",
    fontWeight: 700,
  },

  subjectText: {
    marginTop: pt(8),
    fontSize: pt(20),
    lineHeight: 1.375,
    fontWeight: 600,
    color: "#09090b",
  },

  body: { marginTop: pt(28), fontSize: pt(15), color: "#27272a" },

  paragraph: {},

  bullets: { backgroundColor: "#fafafa", paddingHorizontal: pt(20), paddingVertical: pt(16) },

  bullet: { marginBottom: pt(8) },

  bulletRow: { flexDirection: "row", marginBottom: pt(8) },

  bulletDot: { width: pt(22), paddingTop: pt(3) },

  bulletText: { flex: 1 },

  closing: { color: "#09090b", marginTop: pt(16) },

  signature: { paddingTop: pt(4), fontWeight: 600, color: "#09090b" },

  postscript: {
    marginTop: pt(20),
    paddingTop: pt(12),
    fontSize: pt(14),
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    lineHeight: 1.5,
    color: "#52525c",
  },
});

export function ProfessionalCoverLetterPdf({ content }: { content: CoverLetterContent }) {
  const bodyFontSize = pt(15);

  const appearance = content.appearance;
  const font = FONT_REGISTRY[normalizeFontFamilyId(appearance.fontFamily)];
  const bodyLineHeight = appearance.lineHeight;

  const paragraphStyle = {
    fontSize: bodyFontSize,
    lineHeight: bodyLineHeight,
    marginBottom: appearance.paragraphSpacing * PX_TO_PT,
  };

  const listStyle = {
    fontSize: bodyFontSize,
    lineHeight: bodyLineHeight,
    marginTop: appearance.paragraphSpacing * PX_TO_PT,
    marginBottom: appearance.paragraphSpacing * PX_TO_PT,
  };

  const senderName = content.senderName || content.signature || "Your Name";

  const contact = [
    content.senderEmail,
    content.senderPhone,
    content.senderLocation,
    content.senderWebsite,
  ].filter(Boolean);

  const links = getCoverLetterLinks(content);
  const linkDisplayMode = getCoverLetterLinkDisplayMode(content);

  const recipient = [
    content.recipientName,
    content.recipientTitle,
    content.companyName,
    content.companyLocation,
  ].filter(Boolean);

  const bodyBlocks = [
    ...splitParagraphs(content.opening).map((text) => ({ type: "paragraph" as const, text })),
    ...splitRichTextBlocks(content.body),
  ];

  const highlights = splitMarkdownLines(content.highlights);

  return (
    <Document>
      <Page
        size="A4"
        style={[
          styles.page,
          {
            color: appearance.textColor,
            backgroundColor: appearance.pageColor,
            padding: appearance.pageMargin * PX_TO_PT,
            fontFamily: font.primaryFamily,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerIdentity}>
            <Text style={styles.name}>{senderName}</Text>

            {content.senderTitle ? <Text style={styles.title}>{content.senderTitle}</Text> : null}
          </View>

          {contact.length > 0 || links.length > 0 ? (
            <View style={styles.headerContact}>
              {contact.map((item) => (
                <Text key={item} style={styles.contact}>
                  {item}
                </Text>
              ))}

              {links.map((link) => (
                <View key={link.id} style={styles.linkRow}>
                  {linkDisplayMode !== "url" ? (
                    <Link src={normalizeLinkHref(link.url)} style={styles.linkIcon}>
                      <PdfSocialIcon color="#09090b" size={pt(12)} type={link.type} />
                    </Link>
                  ) : null}

                  {linkDisplayMode !== "icon" ? (
                    <Link src={normalizeLinkHref(link.url)} style={styles.linkText}>
                      {getLinkDisplayText(link, linkDisplayMode)}
                    </Link>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.meta}>
          <View style={styles.metaLeft}>
            {recipient.map((line) => (
              <Text style={styles.metaLeftText} key={line}>
                {line}
              </Text>
            ))}
          </View>

          {content.date ? <Text style={styles.metaDate}>{content.date}</Text> : null}
        </View>

        {content.subject || content.jobTitle ? (
          <View style={styles.subject}>
            <Text style={[styles.label, { color: appearance.accentColor }]}>Re</Text>

            <Text style={styles.subjectText}>{content.subject || content.jobTitle}</Text>
          </View>
        ) : null}

        <View style={[styles.body, { fontSize: bodyFontSize, lineHeight: bodyLineHeight }]}>
          {content.greeting ? (
            <Text style={[styles.paragraph, paragraphStyle, { fontWeight: 600, color: "#09090b" }]}>
              {content.greeting}
            </Text>
          ) : null}

          {bodyBlocks.map((block, index) =>
            block.type === "list" ? (
              <View key={`list-${index}`} style={[styles.bullets, listStyle]}>
                {block.items.map((item, i) => (
                  <View
                    key={i}
                    style={[
                      styles.bulletRow,
                      i === block.items.length - 1 ? { marginBottom: 0 } : {},
                    ]}
                  >
                    <View style={styles.bulletDot}>
                      <Svg width={pt(8)} height={pt(8)} viewBox="0 0 8 8">
                        <Circle cx="4" cy="4" r="3.5" fill={appearance.accentColor} />
                      </Svg>
                    </View>

                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text key={`paragraph-${index}`} style={[styles.paragraph, paragraphStyle]}>
                {block.text}
              </Text>
            ),
          )}

          {highlights.length > 0 ? (
            <View style={[styles.bullets, listStyle]}>
              {highlights.map((highlight, i) => (
                <View
                  key={i}
                  style={[styles.bulletRow, i === highlights.length - 1 ? { marginBottom: 0 } : {}]}
                >
                  <View style={styles.bulletDot}>
                    <Svg width={pt(8)} height={pt(8)} viewBox="0 0 8 8">
                      <Circle cx="4" cy="4" r="3.5" fill="#09090b" />
                    </Svg>
                  </View>

                  <Text style={styles.bulletText}>{highlight}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {content.closing ? <Text style={styles.closing}>{content.closing}</Text> : null}

          <Text style={styles.signature}>{content.signature || senderName}</Text>

          {content.postscript ? (
            <Text style={styles.postscript}>P.S. {content.postscript}</Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}
