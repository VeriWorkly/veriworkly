import type { TemplateId } from "@/templates/catalog/templates";
import { templatesRegistry } from "@/template-library/registry";

export interface TemplateSystemOverview {
  genre: string;
  canvas: string;
  anchorHue: string;
  description: string;
}

export interface TemplateSystemTargetProfession {
  role: string;
  why: string;
}

export interface TemplateSystemFeature {
  name: string;
  description: string;
}

export interface TemplateSystemColors {
  brand: {
    accentDark: string;
    accentLight: string;
    accentHoverDark?: string;
    accentHoverLight?: string;
    textDark?: string;
    textLight?: string;
  };
  surface: {
    paperDark?: string;
    paperLight?: string;
    cardBgDark?: string;
    cardBgLight?: string;
    bgDark?: string;
    bgLight?: string;
    raisedDark?: string;
    raisedLight?: string;
  };
}

export interface TemplateSystemTypographyHierarchy {
  token: string;
  size: string;
  weight: string;
  use: string;
}

export interface TemplateSystemTypography {
  fonts: {
    primary: string;
    utility?: string;
  };
  hierarchy: TemplateSystemTypographyHierarchy[];
}

export interface TemplateSystemLayout {
  baseGridUnit?: string;
  sectionPadding?: string;
  asymmetricSplit?: string;
  containerLimit?: string;
  windowMargin?: string;
  chrome?: string;
  iconRailWidth?: string;
}

export interface TemplateSystemShapes {
  cardRadius?: string;
  itemRadius?: string;
  buttonRadius?: string;
  badgeRadius?: string;
  windowRadius?: string;
  tabRadius?: string;
  chipRadius?: string;
}

export interface TemplateSystemBreakpoint {
  name: string;
  width: string;
  behavior: string;
}

export interface TemplateSystemResponsive {
  breakpoints: TemplateSystemBreakpoint[];
}

export interface TemplateSystemComponent {
  name: string;
  treatment: string;
}

export interface TemplateSystemSpec {
  overview: TemplateSystemOverview;
  targetProfessions?: TemplateSystemTargetProfession[];
  features?: TemplateSystemFeature[];
  colors: TemplateSystemColors;
  typography: TemplateSystemTypography;
  layout?: TemplateSystemLayout;
  shapes?: TemplateSystemShapes;
  responsive?: TemplateSystemResponsive;
  components?: Record<string, TemplateSystemComponent>;
}

export type TemplateDetails = {
  positioning: string;
  fonts: string;
  motion: string;
  palette: string;
  layout: string;
  componentLanguage: string;
  contentModel: string[];
  colorScheme: Array<{ name: string; value: string; className: string }>;
  bestFor: string[];
  designNotes: string[];
  system?: TemplateSystemSpec;
  faqs?: Array<{ question: string; answer: string }>;
  guidelines?: { do: string[]; dont: string[] };
};

export const templateDetails: Record<TemplateId, TemplateDetails> = Object.fromEntries(
  Object.entries(templatesRegistry).map(([id, entry]) => [id, entry.design]),
) as unknown as Record<TemplateId, TemplateDetails>;
