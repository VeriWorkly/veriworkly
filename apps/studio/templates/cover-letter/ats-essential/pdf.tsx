import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { CoverLetterContent } from "@/features/cover-letter/types";
import type { CoverLetterPalette } from "../shared";
import type { CoverLetterTokens } from "../tokens";

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

const PAGE_WIDTH_PT = pxToPt(S.pageWidth);
const PAGE_HEIGHT_PT = pxToPt(S.pageHeight);

const ATS_MARKER = "-";

function createStyles(palette: CoverLetterPalette, tokens: CoverLetterTokens, pageMargin: number) {
  const contentWidth = S.pageWidth - pageMargin * 2;
  const listWidth = contentWidth - S.listPadX * 2;

  const column = (width: number) => ({ width: pxToPt(width), maxWidth: pxToPt(width) });

  return StyleSheet.create({
    page: { color: palette.text },

    /**
     * The classic block-letter format — every line left-aligned, no column
     * split anywhere on the page. See the matching note in `./web.tsx`.
     */
    header: {
      ...column(contentWidth),
      borderBottomColor: palette.border,
      borderBottomWidth: pxToPt(S.headerRule),
      paddingBottom: pxToPt(S.headerPadBottom),
    },
    name: { ...pdfText(tokens.senderName), ...column(contentWidth) },
    title: {
      ...pdfText(tokens.senderTitle),
      ...column(contentWidth),
      marginTop: pxToPt(S.subjectLabelGap),
    },

    contactBlock: {
      ...column(contentWidth),
      marginTop: pxToPt(S.headerRowGap),
      rowGap: pxToPt(4),
    },
    contactLine: { ...pdfText(tokens.contact), ...column(contentWidth) },

    linksBlock: { ...column(contentWidth), marginTop: pxToPt(6), rowGap: pxToPt(4) },
    contactLink: { ...pdfText(tokens.contact), color: palette.accent, textDecoration: "none" },
    linkRow: { alignItems: "center", columnGap: pxToPt(4), flexDirection: "row" },
    linkIcon: { ...pdfFixedWidth(S.contact), height: pxToPt(S.contact) },

    /** Date, then the inside address, both left-aligned. */
    meta: { ...column(contentWidth), marginTop: pxToPt(S.metaTop) },
    metaDate: { ...pdfText(tokens.metaDate), ...column(contentWidth) },
    metaTo: { ...column(contentWidth), rowGap: pxToPt(S.metaRowGap) },
    metaLine: { ...pdfText(tokens.contact), ...column(contentWidth) },

    /**
     * "Re: <subject>" as one plain line — no separate label row. The "Re:" is
     * the only accent-coloured element anywhere on the page.
     */
    subject: {
      ...pdfText(tokens.subject),
      ...column(contentWidth),
      marginTop: pxToPt(S.subjectTop),
    },
    subjectRe: { color: palette.accent },

    body: { ...column(contentWidth), marginTop: pxToPt(S.bodyTop) },
    paragraph: { ...pdfText(tokens.body), ...column(contentWidth) },
    greeting: { ...pdfText(tokens.strong), ...column(contentWidth) },
    signature: { ...pdfText(tokens.strong), ...column(contentWidth) },

    list: {
      ...column(contentWidth),
      paddingHorizontal: pxToPt(S.listPadX),
      paddingVertical: pxToPt(S.listPadY),
    },
    bulletRow: { ...column(listWidth), columnGap: pxToPt(S.bulletGap), flexDirection: "row" },
    bulletMarkerColumn: pdfFixedWidth(S.bulletIndent - S.bulletGap),
    bulletMarker: { ...pdfText(tokens.body), textAlign: "right" },
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

export function AtsEssentialCoverLetterPdf({ content }: { content: CoverLetterContent }) {
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
  const styles = createStyles(palette, tokens, appearance.pageMargin);

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
              <Text style={styles.bulletMarker}>{ATS_MARKER}</Text>
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
    <Document {...getPdfMetadata(state.senderName, "Cover Letter")}>
      <Page
        size={[PAGE_WIDTH_PT, PAGE_HEIGHT_PT]}
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
          {senderName ? <Text style={styles.name}>{senderName}</Text> : null}

          {senderTitle ? <Text style={styles.title}>{senderTitle}</Text> : null}

          {contact.length > 0 ? (
            <View style={styles.contactBlock}>
              {contact.map((item, index) => (
                <Text key={index} style={styles.contactLine}>
                  {item}
                </Text>
              ))}
            </View>
          ) : null}

          {links.length > 0 ? (
            <View style={styles.linksBlock}>
              {links.map((link) => (
                <View key={link.id} style={styles.linkRow}>
                  {linkDisplayMode !== "url" ? (
                    <Link src={normalizeLinkHref(link.url)} style={styles.linkIcon}>
                      <PdfSocialIcon
                        color={palette.accent}
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
          <Text style={styles.subject}>
            <Text style={styles.subjectRe}>Re:</Text> {subject}
          </Text>
        ) : null}

        <View style={styles.body}>{flowItems.map((item) => renderFlowItem(item))}</View>
      </Page>
    </Document>
  );
}
