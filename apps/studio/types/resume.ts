import type { DocumentSyncState } from "@/types";
import type { SyncStatus } from "@/features/documents/services/sync-engine";

export type ResumeSectionId =
  | "basics"
  | "links"
  | "summary"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications"
  | "awards"
  | "publications"
  | "languages"
  | "interests"
  | "volunteer"
  | "references"
  | "achievements"
  | "custom";

export interface ResumeSection {
  id: ResumeSectionId;
  label: string;
  visible: boolean;
  order: number;
}

export interface ResumeBasics {
  fullName: string;
  role: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkEmail: boolean;
  linkPhone: boolean;
  linkLocation: boolean;
}

export type ResumeLinkType =
  | "github"
  | "linkedin"
  | "dribbble"
  | "twitter"
  | "portfolio"
  | "behance"
  | "medium"
  | "youtube"
  | "custom";

export type ResumeLinkDisplayMode = "icon" | "url" | "icon-username";

export interface ResumeLinkItem {
  id: string;
  type: ResumeLinkType;
  label: string;
  url: string;
}

export interface ResumeLinks {
  displayMode: ResumeLinkDisplayMode;
  items: ResumeLinkItem[];
}

export interface ResumeExperienceItem {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  summary: string;
  highlights: string[];
}

export interface ResumeEducationItem {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
  summary: string;
}

export interface ResumeProjectItem {
  id: string;
  name: string;
  role: string;
  link: string;
  linkLabel: string;
  showLinkAsText: boolean;
  summary: string;
  highlights: string[];
  skills: string[];
}

export interface ResumeSkillGroup {
  id: string;
  name: string;
  keywords: string[];
}

export interface ResumeLanguage {
  id: string;
  language: string;
  fluency: "elementary" | "limited" | "professional" | "fluent" | "native";
}

export interface ResumeInterest {
  id: string;
  name: string;
  keywords: string[];
}

export interface ResumeAward {
  id: string;
  title: string;
  awarder: string;
  date: string;
  website?: string;
  description: string;
  showLink: boolean;
}

export interface ResumeCertificate {
  id: string;
  title: string;
  issuer: string;
  date: string;
  website?: string;
  description: string;
  showLink: boolean;
}

export interface ResumePublication {
  id: string;
  title: string;
  publisher: string;
  date: string;
  website?: string;
  description: string;
  showLink: boolean;
}

export interface ResumeVolunteer {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  location: string;
  summary: string;
}

export interface ResumeReference {
  id: string;
  name: string;
  title: string;
  organization: string;
  email?: string;
  phone?: string;
  relationship: string;
}

export interface ResumeAchievement {
  id: string;
  title: string;
  description: string;
}

export type ResumeAdditionalSectionKind =
  | "certifications"
  | "awards"
  | "publications"
  | "languages"
  | "interests"
  | "volunteer"
  | "references"
  | "achievements"
  | "custom";

export interface ResumeAdditionalItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  link: string;
  referenceId: string;
  description: string;
  details: string[];
}

export interface ResumeCustomSection {
  id: string;
  kind: ResumeAdditionalSectionKind;
  title: string;
  items: ResumeAdditionalItem[];
  editableTitle?: boolean;
}

export interface ResumeCustomization {
  fontFamily: string;
  theme?: string;
  accentColor: string;
  textColor: string;
  mutedTextColor: string;
  pageBackgroundColor: string;
  sectionBackgroundColor: string;
  borderColor: string;
  sectionHeadingColor: string;
  sectionSpacing: number;
  pagePadding: number;
  bodyLineHeight: number;
  headingLineHeight: number;
}

export type ResumeSyncStatus = SyncStatus;

export type ResumeSyncState = DocumentSyncState;

export interface ResumeData {
  id: string;
  templateId: string;
  title?: string;
  basics: ResumeBasics;
  links: ResumeLinks;
  summary: string;
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  projects: ResumeProjectItem[];
  skills: ResumeSkillGroup[];
  customSections: ResumeCustomSection[];
  sections: ResumeSection[];
  customization: ResumeCustomization;
  sync: ResumeSyncState;
  updatedAt: string;
}

export interface MasterProfileData {
  templateId: string;
  basics: ResumeBasics;
  links: ResumeLinks;
  summary: string;
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  projects: ResumeProjectItem[];
  skills: ResumeSkillGroup[];
  languages: ResumeLanguage[];
  interests: ResumeInterest[];
  awards: ResumeAward[];
  certificates: ResumeCertificate[];
  publications: ResumePublication[];
  volunteer: ResumeVolunteer[];
  references: ResumeReference[];
  achievements: ResumeAchievement[];
  customSections: ResumeCustomSection[];
  sections: ResumeSection[];
  customization: ResumeCustomization;
  updatedAt?: string;
}

export type MasterProfile = MasterProfileData;
