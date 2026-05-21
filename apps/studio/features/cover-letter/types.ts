import type { ResumeLinkDisplayMode, ResumeLinkItem } from "@/types/resume";
import type { FontFamilyId } from "@/features/documents/constants/fonts";

export interface CoverLetterContent {
  senderName: string;
  senderTitle: string;
  senderEmail: string;
  senderPhone: string;
  senderLinks: string;
  senderWebsite: string;
  senderLocation: string;

  links: {
    displayMode: ResumeLinkDisplayMode;
    items: ResumeLinkItem[];
  };

  date: string;

  recipientName: string;
  recipientTitle: string;

  companyName: string;
  companyLocation: string;

  jobTitle: string;
  subject: string;
  greeting: string;
  opening: string;
  body: string;
  highlights: string;
  closing: string;
  signature: string;
  postscript: string;

  appearance: CoverLetterAppearance;
}

export type CoverLetterTemplateId = "professional" | "veriworkly-special";

export interface CoverLetterAppearance {
  fontFamily: FontFamilyId;
  pageMargin: number;
  paragraphSpacing: number;
  lineHeight: number;
  accentColor: string;
  sidebarColor: string;
  pageColor: string;
  textColor: string;
}
