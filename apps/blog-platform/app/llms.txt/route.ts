import { buildLlmsIndex } from "@/lib/llms";

/** Content only changes on deploy, so the index is generated once at build time. */
export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsIndex(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
