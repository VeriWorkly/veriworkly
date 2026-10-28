"use client";

import { createOpenAPIPage } from "fumadocs-openapi/ui";

/**
 * The OpenAPI renderer used by generated API-reference pages. It is a client component: the page
 * passes it the spec through `preloaded`, sliced to the page's own operations by `slicePreloaded`.
 */
export const OpenAPIPage = createOpenAPIPage();
