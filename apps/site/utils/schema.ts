import { siteConfig } from "@/config/site";

/**
 * The four entities every page's JSON-LD hangs off. The root layout defines them once with
 * these `@id`s; pages reference them instead of re-declaring an Organization or Person with a
 * different shape. One graph, one product name, one founder.
 */
export const SCHEMA_IDS = {
  website: `${siteConfig.url}/#website`,
  organization: `${siteConfig.url}/#organization`,
  person: `${siteConfig.url}/#gautam-raj`,
  app: `${siteConfig.url}/#app`,
} as const;

export const webSiteRef = { "@id": SCHEMA_IDS.website } as const;
export const organizationRef = { "@id": SCHEMA_IDS.organization } as const;
export const personRef = { "@id": SCHEMA_IDS.person } as const;
export const appRef = { "@id": SCHEMA_IDS.app } as const;
