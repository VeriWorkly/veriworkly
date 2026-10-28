import { buildLlmsFull } from "@/lib/llms";

/** Content only changes on deploy, so the full text is generated once at build time. */
export const dynamic = "force-static";

export async function GET() {
  return new Response(await buildLlmsFull(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
