import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { CoverLetterContent } from "@/features/cover-letter/types";
import type { CoverLetterPalette } from "../shared";
import type { CoverLetterTokens } from "../tokens";
import type { PageGeometry } from "@/templates/shared/page-geometry";

import { getPdfFontStack } from "@/features/documents/constants/fonts";
import { getPdfMetadata } from "@/templates/shared/pdf-metadata";
import { needsLastResortPdfFont } from "@/features/documents/export/pdf-unsupported-text";
import { pxToPt } from "@/features/resume/constants/resume-layout";
import { pdfFixedWidth } from "@/templates/shared/box";
import { pdfText } from "@/templates/shared/text-tokens";
import { COVER_LETTER_SCALE as S } from "../tokens";

import {
  buildProfessionalFlowItems,
  getCoverLetterState,
  type ProfessionalFlowItem,
} from "../shared";

import {
  getLinkDisplayText,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";
import { PdfSocialIcon } from "@/templates/pdf/SocialIcon";

/** Matches `./web.tsx`; see `../professional/pdf.tsx` for why px is stated in points. */
const MINIMAL_MARKER = "–";

/** The accent rule down the list's left edge, in CSS px (`borderLeft` in the preview). */
const LIST_RULE = 2;

function createStyles(
  palette: CoverLetterPalette,
  tokens: CoverLetterTokens,
  pageMargin: number,
  page: PageGeometry,
) {
  const contentWidth = page.widthPx - pageMargin * 2;
  // The list's accent rule sits inside its box, as in the preview: its rows lose that width
  // too, or every bullet line is set 2px wider than the preview's.
  const listWidth = contentWidth - S.listPadX * 2 - LIST_RULE;

  const column = (width: number) => ({ width: pxToPt(width), maxWidth: pxToPt(width) });

  return StyleSheet.create({
    page: { color: palette.text },

    /**
     * Full-width, stacked masthead — no fixed contact column. The border
     * reserves the same box height as every other template's header (see
     * `../professional/pdf.tsx`) while staying invisible, so page-count parity
     * with the browser preview holds without a visible rule.
     */
    header: {
      ...column(contentWidth),
      borderBottomColor: "transparent",
      borderBottomWidth: pxToPt(S.headerRule),
      paddingBottom: pxToPt(S.headerPadBottom),
    },
    // Untracked: Minimalist is sold as ATS-friendly, and tracked capitals extract as
    // "C O V E R  L E T T E R". The preview and the HTML match.
    label: {
      ...pdfText(tokens.label),
      ...column(contentWidth),
      letterSpacing: 0,
      marginBottom: pxToPt(6),
    },
    name: { ...pdfText(tokens.senderName), ...column(contentWidth), fontWeight: 600 },
    title: {
      ...pdfText(tokens.senderTitle),
      ...column(contentWidth),
      marginTop: pxToPt(S.subjectLabelGap),
    },

    contactRow: {
      ...column(contentWidth),
      columnGap: pxToPt(10),
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: pxToPt(S.headerRowGap * 2),
      rowGap: pxToPt(4),
    },
    contactItem: { alignItems: "center", columnGap: pxToPt(10), flexDirection: "row" },
    contactText: pdfText(tokens.contact),
    contactSep: { ...pdfText(tokens.contact), color: palette.soft },

    linksRow: {
      ...column(contentWidth),
      columnGap: pxToPt(16),
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: pxToPt(6),
      rowGap: pxToPt(4),
    },
    contactLink: { ...pdfText(tokens.contact), color: palette.strong, textDecoration: "none" },
    linkRow: { alignItems: "center", columnGap: pxToPt(4), flexDirection: "row" },
    linkIcon: { ...pdfFixedWidth(S.contact), height: pxToPt(S.contact) },

    /** Date-then-address, top to bottom — see the matching note in `./web.tsx`. */
    meta: { ...column(contentWidth), marginTop: pxToPt(S.metaTop) },
    metaDate: { ...pdfText(tokens.metaDate), ...column(contentWidth) },
    metaTo: { ...column(contentWidth), rowGap: pxToPt(S.metaRowGap) },
    metaLine: { ...pdfText(tokens.contact), ...column(contentWidth) },

    subject: {
      ...column(contentWidth),
      marginTop: pxToPt(S.subjectTop),
      paddingBottom: pxToPt(S.subjectPadY),
      paddingTop: pxToPt(S.subjectPadY),
    },
    subjectLabel: { ...pdfText(tokens.label), ...column(contentWidth), letterSpacing: 0 },
    subjectText: {
      ...pdfText(tokens.subject),
      ...column(contentWidth),
      fontWeight: 600,
      marginTop: pxToPt(S.subjectLabelGap),
    },

    body: { ...column(contentWidth), marginTop: pxToPt(S.bodyTop) },
    paragraph: { ...pdfText(tokens.body), ...column(contentWidth) },
    greeting: { ...pdfText(tokens.strong), ...column(contentWidth) },
    signature: { ...pdfText(tokens.strong), ...column(contentWidth) },

    list: {
      ...column(contentWidth),
      borderLeftColor: palette.accent,
      borderLeftWidth: pxToPt(LIST_RULE),
      paddingHorizontal: pxToPt(S.listPadX),
      paddingVertical: pxToPt(S.listPadY),
    },
    bulletRow: { ...column(listWidth), columnGap: pxToPt(S.bulletGap), flexDirection: "row" },
    bulletMarkerColumn: pdfFixedWidth(S.bulletIndent - S.bulletGap),
    bulletMarker: { ...pdfText(tokens.body), color: palette.soft, textAlign: "right" },
    bulletText: { ...pdfText(tokens.body), ...column(listWidth - S.bulletIndent) },

    postscript: {
      ...pdfText(tokens.postscript),
      ...column(contentWidth),
      borderTopColor: "transparent",
      borderTopWidth: pxToPt(S.hairline),
      marginTop: pxToPt(S.postscriptTop),
      paddingTop: pxToPt(S.postscriptPadTop),
    },
  });
}

export function MinimalistCoverLetterPdf({ content }: { content: CoverLetterContent }) {
  const state = getCoverLetterState(content);
  const {
    appearance,
    palette,
    tokens,
    senderName,
    senderTitle,
    contact,
    date,
    recipient,
    subject,
  } = state;
  const styles = createStyles(palette, tokens, appearance.pageMargin, state.page);

  const paragraphSpacing = { marginBottom: pxToPt(appearance.paragraphSpacing) };
  const links = state.renderedLinks;
  const linkDisplayMode = state.linkDisplayMode;

  const flowItems = buildProfessionalFlowItems(state.flow);

  /** Rows never split; the list breaks between them. See `../measure.ts`. */
  function renderList(items: string[], key: string) {
    return (
      <View key={key} style={[styles.list, paragraphSpacing]}>
        {items.map((item, index) => (
          <View
            key={index}
            style={[
              styles.bulletRow,
              index === 0 ? {} : { marginTop: pxToPt(S.bulletRowGap) },
            ].flat()}
            wrap={false}
          >
            <View style={styles.bulletMarkerColumn}>
              <Text style={styles.bulletMarker}>{MINIMAL_MARKER}</Text>
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
        <Text key={item.id} style={[styles.greeting, paragraphSpacing]} wrap={false}>
          {item.text}
        </Text>
      );
    }

    if (item.type === "paragraph") {
      return (
        <Text key={item.id} style={[styles.paragraph, paragraphSpacing]}>
          {item.text}
        </Text>
      );
    }

    if (item.type === "closing") {
      return (
        <Text key={item.id} style={[styles.paragraph, paragraphSpacing]} wrap={false}>
          {item.text}
        </Text>
      );
    }

    if (item.type === "body-list" || item.type === "proof-list") {
      return renderList(item.items, item.id);
    }

    if (item.type === "signature") {
      return (
        <Text key={item.id} style={styles.signature} wrap={false}>
          {item.text}
        </Text>
      );
    }

    return (
      <Text key={item.id} style={styles.postscript}>
        {item.text}
      </Text>
    );
  }

  return (
    <Document {...getPdfMetadata(state.senderName, "Cover Letter", content.language)}>
      <Page
        size={[state.page.widthPt, state.page.heightPt]}
        style={[
          styles.page,
          {
            backgroundColor: appearance.pageColor,
            fontFamily: getPdfFontStack(
              appearance.fontFamily,
              needsLastResortPdfFont({ type: "COVER_LETTER", content }),
            ),
            padding: pxToPt(appearance.pageMargin),
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.label}>Cover Letter</Text>
          {senderName ? <Text style={styles.name}>{senderName}</Text> : null}

          {senderTitle ? <Text style={styles.title}>{senderTitle}</Text> : null}

          {contact.length > 0 ? (
            <View style={styles.contactRow}>
              {contact.map((item, index) => (
                <View key={index} style={styles.contactItem}>
                  <Text style={styles.contactText}>{item}</Text>
                  {index < contact.length - 1 ? <Text style={styles.contactSep}>·</Text> : null}
                </View>
              ))}
            </View>
          ) : null}

          {links.length > 0 ? (
            <View style={styles.linksRow}>
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
          {date ? <Text style={styles.metaDate}>{date}</Text> : null}

          {recipient.length > 0 ? (
            <View
              style={[styles.metaTo, date ? { marginTop: pxToPt(S.metaRowGap * 2) } : {}].flat()}
            >
              {recipient.map((line, index) => (
                <Text key={index} style={styles.metaLine}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {subject ? (
          <View style={styles.subject}>
            <Text style={styles.subjectLabel}>Re</Text>
            <Text style={styles.subjectText}>{subject}</Text>
          </View>
        ) : null}

        <View style={styles.body}>{flowItems.map((item) => renderFlowItem(item))}</View>
      </Page>
    </Document>
  );
}
