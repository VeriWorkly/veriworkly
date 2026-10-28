import { ENGINE_VERSION } from "@veriworkly/ats-engine";

import { siteConfig } from "@/config/site";
import { getEnginePagesInOrder } from "@/lib/source";

export const revalidate = false;

/** An llmstxt.org index of the ATS Engine docs: every page, with its description. */
export function GET() {
  const pages = getEnginePagesInOrder().map((page) => {
    const { title, description } = page.data;
    return `- [${title}](${siteConfig.url}${page.url})${description ? `: ${description}` : ""}`;
  });

  const body = `# VeriWorkly ATS Engine

> Open-source ATS resume checker and parser for TypeScript and JavaScript (\`@veriworkly/ats-engine\`, engine ${ENGINE_VERSION}, MIT). It reads a resume (PDF, DOCX, HTML, text, JSON Resume) the way an applicant tracking system does, recovers the fields an ATS stores, scores it 0-100 with a published deterministic rubric, and matches it to a job posting requirement by requirement. No AI is involved in the score. The core makes no network calls and runs in a browser, at the edge or in Node.js. Built for candidates checking their own resume, not for ranking applicants.

Every page in full, as Markdown: ${siteConfig.url}/ats-engine/llms-full.txt

## Docs

${pages.join("\n")}

## Elsewhere

- [Product page](${siteConfig.links.main}/ats-engine)
- [Repository](https://github.com/VeriWorkly/ats-engine)
- [npm package](https://www.npmjs.com/package/@veriworkly/ats-engine)
- [MCP server on npm](https://www.npmjs.com/package/@veriworkly/ats-engine-mcp)
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
