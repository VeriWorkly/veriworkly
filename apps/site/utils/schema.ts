import { siteConfig } from "@/config/site";

/** Pages reference these `@id`s from the root layout instead of re-declaring an Organization or Person. */
export const SCHEMA_IDS = {
  website: `${siteConfig.url}/#website`,
  organization: `${siteConfig.url}/#organization`,
  person: `${siteConfig.url}/#gautam-raj`,
  app: `${siteConfig.url}/#app`,
} as const;

export const webSiteRef = { "@id": SCHEMA_IDS.website } as const;
export const organizationRef = { "@id": SCHEMA_IDS.organization } as const;
export const appRef = { "@id": SCHEMA_IDS.app } as const;
