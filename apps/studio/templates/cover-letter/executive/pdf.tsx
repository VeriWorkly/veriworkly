import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { CoverLetterContent } from "@/features/cover-letter/types";
import type { CoverLetterPalette } from "../shared";
import type { CoverLetterTokens } from "../tokens";

import { getPdfFontStack } from "@/features/documents/constants/fonts";
import { pxToPt } from "@/features/resume/constants/resume-layout";
import { pdfFixedWidth, pdfFlexible } from "@/templates/shared/box";
import { pdfText } from "@/templates/shared/text-tokens";
import { COVER_LETTER_SCALE as S, createCoverLetterTokens } from "../tokens";

import {
  buildCoverLetterFlowContent,
  buildProfessionalFlowItems,
  getCoverLetterFlowSenderName,
  getCoverLetterPalette,
  getCoverLetterLinks,
  getCoverLetterLinkDisplayMode,
  isCoverLetterSectionVisible,
  type ProfessionalFlowItem,
} from "../shared";

import {
  getLinkDisplayText,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";
import { PdfSocialIcon } from "@/templates/pdf/SocialIcon";

const PAGE_WIDTH_PT = pxToPt(S.pageWidth);
const PAGE_HEIGHT_PT = pxToPt(S.pageHeight);

const EXECUTIVE_MARKER = "—";

function createStyles(palette: CoverLetterPalette, tokens: CoverLetterTokens, pageMargin: number) {
  const contentWidth = S.pageWidth - pageMargin * 2;
  const identityWidth = contentWidth - S.headerContactWidth - S.headerColumnGap;
  const listWidth = contentWidth - S.listPadX * 2;

  const column = (width: number) => ({ width: pxToPt(width), maxWidth: pxToPt(width) });

  return StyleSheet.create({
    page: { color: palette.text },

    header: {
      ...column(contentWidth),
      borderBottomColor: palette.strong,
      borderBottomWidth: pxToPt(S.hairline),
      borderTopColor: palette.strong,
      borderTopWidth: pxToPt(S.hairline),
      flexDirection: "row",
      paddingBottom: pxToPt(S.headerPadBottom),
      paddingTop: pxToPt(S.subjectLabelGap),
    },
    headerIdentity: { ...pdfFlexible, ...column(identityWidth) },
    headerContact: {
      ...pdfFixedWidth(S.headerContactWidth),
      alignItems: "flex-end",
      marginLeft: pxToPt(S.headerColumnGap),
      rowGap: pxToPt(S.headerRowGap),
    },

    name: {
      ...pdfText(tokens.senderName),
      ...column(identityWidth),
      letterSpacing: 0.4,
      textAlign: "center",
    },
    title: {
      ...pdfText(tokens.senderTitle),
      ...column(identityWidth),
      marginTop: pxToPt(S.subjectLabelGap),
      textAlign: "center",
      textTransform: "uppercase",
    },
    contact: { ...pdfText(tokens.contact), ...column(S.headerContactWidth) },
    contactLink: { ...pdfText(tokens.contact), color: palette.strong, textDecoration: "none" },
    linkRow: { alignItems: "center", columnGap: pxToPt(4), flexDirection: "row" },
    linkIcon: { ...pdfFixedWidth(S.contact), height: pxToPt(S.contact) },

    /** Centered dateline over a left-aligned inside address; see `./web.tsx`. */
    meta: { ...column(contentWidth), marginTop: pxToPt(S.metaTop) },
    metaDate: { ...pdfText(tokens.metaDate), ...column(contentWidth), textAlign: "center" },
    metaTo: { ...column(contentWidth), rowGap: pxToPt(S.metaRowGap) },
    metaLine: { ...pdfText(tokens.contact), ...column(contentWidth) },

    subject: {
      ...column(contentWidth),
      borderBottomColor: palette.border,
      borderBottomWidth: pxToPt(S.hairline),
      marginTop: pxToPt(S.subjectTop),
      paddingBottom: pxToPt(S.subjectPadY),
    },
    label: {
      ...pdfText(tokens.label),
      ...column(contentWidth),
      letterSpacing: (tokens.label.letterSpacing ?? 0) + 1,
    },
    subjectText: {
      ...pdfText(tokens.subject),
      ...column(contentWidth),
      marginTop: pxToPt(S.subjectLabelGap),
    },

    body: { ...column(contentWidth), marginTop: pxToPt(S.bodyTop) },
    paragraph: { ...pdfText(tokens.body), ...column(contentWidth) },
    greeting: { ...pdfText(tokens.strong), ...column(contentWidth) },
    signature: { ...pdfText(tokens.strong), ...column(contentWidth) },

    list: {
      ...column(contentWidth),
      borderBottomColor: palette.border,
      borderBottomWidth: pxToPt(S.hairline),
      borderTopColor: palette.border,
      borderTopWidth: pxToPt(S.hairline),
      paddingHorizontal: pxToPt(S.listPadX),
      paddingVertical: pxToPt(S.listPadY),
    },
    bulletRow: { ...column(listWidth), columnGap: pxToPt(S.bulletGap), flexDirection: "row" },
    bulletMarkerColumn: pdfFixedWidth(S.bulletIndent - S.bulletGap),
    bulletMarker: { ...pdfText(tokens.body), color: palette.accent, textAlign: "right" },
    bulletText: { ...pdfText(tokens.body), ...column(listWidth - S.bulletIndent) },

    postscript: {
      ...pdfText(tokens.postscript),
      ...column(contentWidth),
      borderTopColor: palette.border,
      borderTopWidth: pxToPt(S.hairline),
      marginTop: pxToPt(S.postscriptTop),
      paddingTop: pxToPt(S.postscriptPadTop),
    },
  });
}

export function ExecutiveCoverLetterPdf({ content }: { content: CoverLetterContent }) {
  const appearance = content.appearance;
  const palette = getCoverLetterPalette(appearance);
  const tokens = createCoverLetterTokens(appearance, palette);
  const styles = createStyles(palette, tokens, appearance.pageMargin);

  const showProfile = isCoverLetterSectionVisible(content, "profile");
  const showLinks = isCoverLetterSectionVisible(content, "links");
  const showTarget = isCoverLetterSectionVisible(content, "target");

  const paragraphSpacing = { marginBottom: pxToPt(appearance.paragraphSpacing) };
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

  const flowItems = buildProfessionalFlowItems(buildCoverLetterFlowContent(content), senderName);

  function renderList(items: string[], key: string) {
    return (
      <View key={key} style={[styles.list, paragraphSpacing]}>
        {items.map((item, index) => (
          <View
            key={`${key}-${index}`}
            style={[
              styles.bulletRow,
              index === 0 ? {} : { marginTop: pxToPt(S.bulletRowGap) },
            ].flat()}
          >
            <View style={styles.bulletMarkerColumn}>
              <Text style={styles.bulletMarker}>{EXECUTIVE_MARKER}</Text>
            </View>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  function renderFlowItem(item: ProfessionalFlowItem) {
    if (item.type === "greeting") {
      return (
        <Text key={item.id} style={[styles.greeting, paragraphSpacing]}>
          {item.text}
        </Text>
      );
    }

    if (item.type === "paragraph" || item.type === "closing") {
      return (
        <Text key={item.id} style={[styles.paragraph, paragraphSpacing]}>
          {item.text}
        </Text>
      );
    }

    if (item.type === "body-list" || item.type === "proof-list") {
      return renderList(item.items, item.id);
    }

    if (item.type === "signature") {
      return (
        <Text key={item.id} style={styles.signature}>
          {item.text}
        </Text>
      );
    }

    return (
      <Text key={item.id} style={styles.postscript}>
        P.S. {item.text}
      </Text>
    );
  }

  return (
    <Document>
      <Page
        size={[PAGE_WIDTH_PT, PAGE_HEIGHT_PT]}
        style={[
          styles.page,
          {
            backgroundColor: appearance.pageColor,
            fontFamily: getPdfFontStack(appearance.fontFamily),
            padding: pxToPt(appearance.pageMargin),
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
                      <PdfSocialIcon
                        color={palette.strong}
                        size={pxToPt(S.contact)}
                        type={link.type}
                      />
                    </Link>
                  ) : null}

                  {linkDisplayMode !== "icon" ? (
                    <Link src={normalizeLinkHref(link.url)} style={styles.contactLink}>
                      {getLinkDisplayText(link, linkDisplayMode)}
                    </Link>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.meta}>
          {content.date ? <Text style={styles.metaDate}>{content.date}</Text> : null}

          {recipient.length > 0 ? (
            <View
              style={[
                styles.metaTo,
                content.date ? { marginTop: pxToPt(S.metaRowGap * 3) } : {},
              ].flat()}
            >
              {recipient.map((line) => (
                <Text key={line} style={styles.metaLine}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {showTarget && (content.subject || content.jobTitle) ? (
          <View style={styles.subject}>
            <Text style={styles.label}>Re</Text>
            <Text style={styles.subjectText}>{content.subject || content.jobTitle}</Text>
          </View>
        ) : null}

        <View style={styles.body}>{flowItems.map((item) => renderFlowItem(item))}</View>
      </Page>
    </Document>
  );
}
