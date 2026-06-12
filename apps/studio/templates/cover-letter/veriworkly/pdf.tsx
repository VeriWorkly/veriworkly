import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { CoverLetterContent } from "@/features/cover-letter/types";
import { FONT_REGISTRY, normalizeFontFamilyId } from "@/features/documents/constants/fonts";

import {
  buildCoverLetterFlowContent,
  buildVeriworklyFlowItems,
  getCoverLetterFlowSenderName,
  getVeriworklyFlowItemWeight,
  keepVeriworklyProofHeadingWithNext,
  paginateWeightedItems,
  pt,
  PX_TO_PT,
  getCoverLetterLinks,
  getCoverLetterLinkDisplayMode,
  isCoverLetterSectionVisible,
  type VeriworklyFlowItem,
} from "../shared";

import {
  normalizeLinkHref,
  getLinkDisplayText,
} from "@/features/documents/rendering/resume-rendering";
import { PdfSocialIcon } from "@/templates/pdf/SocialIcon";

const PDF_PAGE_WIDTH = pt(794);
const PDF_PAGE_HEIGHT = pt(1123);

const styles = StyleSheet.create({
  page: {
    width: PDF_PAGE_WIDTH,
    height: PDF_PAGE_HEIGHT,
    minHeight: PDF_PAGE_HEIGHT,
    padding: 0,
    fontSize: pt(14.5),
    lineHeight: 1.55,
    color: "#111827",
  },

  shell: { flexDirection: "row", height: PDF_PAGE_HEIGHT, minHeight: PDF_PAGE_HEIGHT },

  sidebar: {
    width: pt(214),
    height: PDF_PAGE_HEIGHT,
    paddingHorizontal: pt(24),
    paddingVertical: pt(36),
    backgroundColor: "#111827",
    color: "#020618",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },

  main: { flex: 1, height: PDF_PAGE_HEIGHT, padding: pt(44), backgroundColor: "#ffffff" },

  railLabel: {
    fontSize: pt(10),
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: pt(12),
  },

  name: { fontSize: pt(26), fontWeight: 600, lineHeight: 1.08, color: "#0f172a" },

  title: { marginTop: pt(8), fontSize: pt(14), color: "#45556c", lineHeight: 1.5 },

  rule: { width: pt(48), height: 1, marginTop: pt(32), marginBottom: pt(32) },

  railBlock: { marginTop: 0 },

  railText: { color: "#45556c", marginBottom: pt(8), fontSize: pt(12), lineHeight: 1.5 },

  contactLinkDivider: {
    width: pt(48),
    height: 1,
    marginTop: pt(16),
    marginBottom: pt(16),
  },

  railLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    fontWeight: 500,
    marginTop: pt(8),
    marginBottom: pt(6),
  },

  railLink: {
    color: "#0f766e",
    paddingBottom: pt(2),
    fontSize: pt(12),
    lineHeight: 1.6,
  },

  railLinkIcon: { marginRight: pt(4), width: pt(14), height: pt(14) },
  railLinkText: { color: "#0f766e", fontSize: pt(12), lineHeight: 1.2 },

  targetBlock: {
    marginTop: "auto",
    paddingTop: pt(28),
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },

  targetLabel: {
    fontSize: pt(10),
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: 700,
  },

  targetJobTitle: {
    fontWeight: 600,
    fontSize: pt(14),
    lineHeight: 1.25,
    color: "#0f172a",
    marginTop: pt(8),
    marginBottom: pt(4),
  },

  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: pt(24),
    marginBottom: pt(32),
  },

  metaLeft: { flex: 1, fontSize: pt(14), lineHeight: 1.5, color: "#475569", marginBottom: pt(4) },

  metaDate: {
    marginLeft: pt(24),
    fontSize: pt(12),
    fontWeight: 600,
    letterSpacing: 1.2,
    color: "#62748e",
    textTransform: "uppercase",
  },

  subject: {
    borderLeftWidth: 2,
    paddingLeft: pt(20),
    paddingVertical: pt(4),
    marginBottom: pt(32),
  },

  label: { fontSize: pt(10), letterSpacing: 1.4, fontWeight: 700, textTransform: "uppercase" },

  subjectText: {
    fontSize: pt(22),
    fontWeight: 600,
    color: "#0f172a",
  },

  body: { fontSize: pt(15), color: "#27272a", marginBottom: pt(24) },

  greeting: { fontWeight: 600, color: "#020618" },

  paragraph: { color: "#314158", marginBottom: pt(16) },

  proofLabel: {
    fontSize: pt(10),
    fontweight: 700,
    color: "#62748e",
    letterSpacing: 1.5,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    textTransform: "uppercase",
    paddingTop: pt(24),
    marginBottom: pt(8),
  },

  proofItem: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: pt(8),
    marginBottom: pt(8),
  },

  proofIndex: { width: pt(48), fontSize: pt(12), fontWeight: 700 },

  proofText: { flex: 1, color: "#314158" },

  bullets: { backgroundColor: "#f4f4f5", paddingHorizontal: pt(20), paddingVertical: pt(16) },
  bulletRow: { flexDirection: "row", marginBottom: pt(8) },
  bulletDot: { width: pt(14) },
  bulletText: { flex: 1 },

  closingSection: { marginTop: pt(16) },

  closing: { color: "#314158", marginBottom: pt(4), letterSpacing: 0.4 },

  signature: { paddingTop: pt(4), fontWeight: 600, color: "#020618", fontSize: pt(16) },

  postscript: {
    marginTop: pt(16),
    paddingTop: pt(12),
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    color: "#52525c",
  },
});

function paginateVeriworklyPdfItems(items: VeriworklyFlowItem[]) {
  return paginateWeightedItems(
    items,
    getVeriworklyFlowItemWeight,
    () => 24,
    keepVeriworklyProofHeadingWithNext,
  );
}

export function VeriworklyCoverLetterPdf({ content }: { content: CoverLetterContent }) {
  const appearance = content.appearance;
  const showProfile = isCoverLetterSectionVisible(content, "profile");
  const showLinks = isCoverLetterSectionVisible(content, "links");
  const showTarget = isCoverLetterSectionVisible(content, "target");
  const font = FONT_REGISTRY[normalizeFontFamilyId(appearance.fontFamily)];
  const bodyFontSize = pt(14.5);
  const bodyLineHeight = appearance.lineHeight;
  const paragraphStyle = {
    fontSize: bodyFontSize,
    lineHeight: bodyLineHeight,
    marginBottom: appearance.paragraphSpacing * PX_TO_PT,
  };
  const listStyle = {
    lineHeight: bodyLineHeight,
    marginTop: appearance.paragraphSpacing * PX_TO_PT,
    marginBottom: appearance.paragraphSpacing * PX_TO_PT,
    fontSize: bodyFontSize,
  };
  const senderName = getCoverLetterFlowSenderName(content);
  const contact = showProfile
    ? [
        content.senderEmail,
        content.senderPhone,
        content.senderLocation,
        content.senderWebsite,
      ].filter(Boolean)
    : [];
  const links = showLinks ? getCoverLetterLinks(content) : [];
  const linkDisplayMode = getCoverLetterLinkDisplayMode(content);
  const recipient = showTarget
    ? [
        content.recipientName,
        content.recipientTitle,
        content.companyName,
        content.companyLocation,
      ].filter(Boolean)
    : [];
  const flowItems = buildVeriworklyFlowItems(buildCoverLetterFlowContent(content), senderName);
  const pages = paginateVeriworklyPdfItems(flowItems);
  const renderPages = pages.length > 0 ? pages : [[]];

  function renderSidebar() {
    return (
      <View style={[styles.sidebar, { backgroundColor: appearance.sidebarColor }]}>
        <Text style={[styles.railLabel, { color: appearance.accentColor }]}>Candidate</Text>

        <Text style={styles.name}>{senderName}</Text>

        {content.senderTitle ? <Text style={styles.title}>{content.senderTitle}</Text> : null}

        <View style={[styles.rule, { backgroundColor: appearance.accentColor }]} />

        <View style={styles.railBlock}>
          {contact.map((item) => (
            <Text key={item} style={styles.railText}>
              {item}
            </Text>
          ))}

          {links.length > 0 && (
            <View
              style={[styles.contactLinkDivider, { backgroundColor: appearance.accentColor }]}
            />
          )}

          {links.map((link) => (
            <View key={link.id} style={styles.railLinkRow}>
              {linkDisplayMode !== "url" ? (
                <Link src={normalizeLinkHref(link.url)} style={styles.railLinkIcon}>
                  <PdfSocialIcon size={pt(14)} type={link.type} color="#000" />
                </Link>
              ) : null}

              {linkDisplayMode !== "icon" ? (
                <Link
                  src={normalizeLinkHref(link.url)}
                  style={[styles.railLinkText, { color: appearance.accentColor }]}
                >
                  {getLinkDisplayText(link, linkDisplayMode)}
                </Link>
              ) : null}
            </View>
          ))}
        </View>

        {showTarget ? (
          <View style={styles.targetBlock}>
            <Text style={[styles.targetLabel, { color: appearance.accentColor }]}>Target</Text>

            <Text style={styles.targetJobTitle}>
              {content.jobTitle || content.subject || "Open role"}
            </Text>

            {content.companyName ? (
              <Text style={styles.railText}>{content.companyName}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  function renderFlowItem(item: VeriworklyFlowItem) {
    if (item.type === "greeting") {
      return (
        <Text key={item.id} style={[styles.greeting, paragraphStyle]} wrap={false}>
          {item.text}
        </Text>
      );
    }

    if (item.type === "paragraph") {
      return (
        <Text key={item.id} style={[styles.paragraph, paragraphStyle]} wrap={false}>
          {item.text}
        </Text>
      );
    }

    if (item.type === "body-list") {
      return (
        <View key={item.id} style={[styles.bullets, listStyle]} wrap={false}>
          {item.items.map((listItem) => (
            <View key={listItem} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>-</Text>
              <Text style={styles.bulletText}>{listItem}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (item.type === "proof-heading") {
      return (
        <View key={item.id} wrap={false}>
          <Text style={styles.proofLabel}>Selected Proof</Text>
        </View>
      );
    }

    if (item.type === "proof-item") {
      return (
        <View
          key={item.id}
          style={[
            styles.proofItem,
            item.index === 0 ? { marginTop: pt(8) } : {},
            item.isLast ? { borderBottomWidth: 0 } : {},
          ]}
          wrap={false}
        >
          <Text style={[styles.proofIndex, { color: appearance.accentColor }]}>
            {String(item.index + 1).padStart(2, "0")}
          </Text>

          <Text style={styles.proofText}>{item.text}</Text>
        </View>
      );
    }

    if (item.type === "signoff") {
      return (
        <View key={item.id} style={styles.closingSection} wrap={false}>
          {item.closing ? <Text style={styles.closing}>{item.closing}</Text> : null}
          <Text style={styles.signature}>{item.signature}</Text>
        </View>
      );
    }

    return (
      <Text key={item.id} style={styles.postscript} wrap={false}>
        P.S. {item.text}
      </Text>
    );
  }

  return (
    <Document>
      {renderPages.map((pageItems, pageIndex) => (
        <Page
          key={pageIndex}
          size={[PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]}
          wrap={false}
          style={[
            styles.page,
            {
              backgroundColor: appearance.pageColor,
              color: appearance.textColor,
              fontFamily: font.primaryFamily,
            },
          ]}
        >
          <View style={styles.shell}>
            {renderSidebar()}

            <View style={[styles.main, { padding: appearance.pageMargin * PX_TO_PT }]}>
              {pageIndex === 0 ? (
                <>
                  <View style={styles.meta}>
                    <View style={styles.metaLeft}>
                      {recipient.map((line) => (
                        <Text key={line}>{line}</Text>
                      ))}
                    </View>

                    {content.date ? <Text style={styles.metaDate}>{content.date}</Text> : null}
                  </View>

                  {showTarget ? (
                    <View style={[styles.subject, { borderLeftColor: appearance.accentColor }]}>
                      <Text style={[styles.label, { color: appearance.accentColor }]}>
                        Cover Letter
                      </Text>

                      <Text style={styles.subjectText}>
                        {content.subject || content.jobTitle || "Application"}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}

              <View
                style={[
                  styles.body,
                  {
                    fontSize: bodyFontSize,
                    lineHeight: bodyLineHeight,
                    marginTop: pageIndex === 0 ? 0 : pt(32),
                  },
                ]}
              >
                {pageItems.map((item) => renderFlowItem(item))}
              </View>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
}
