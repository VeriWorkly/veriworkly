import { NextResponse } from "next/server";

import { parsePortfolioContent } from "@/lib/portfolio";

import { renderTemplate } from "@/templates/runtime/registry";

export async function POST(request: Request) {
  try {
    const project = parsePortfolioContent(await request.json());

    const element = await renderTemplate(project);

    const { renderToString } = await import("react-dom/server");
    const html = renderToString(element);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Failed to render preview template:", error);
    return new NextResponse("Error rendering template", { status: 500 });
  }
}
