import { blog } from "@/lib/source";

/**
 * Links shared before post cards became static files point here with the title in the query.
 * A post's own title redirects to that post's card; any other text gets the default card, so
 * this route never renders text it is handed.
 */
export function GET(request: Request) {
  const title = new URL(request.url).searchParams.get("title");
  const post = title ? blog.getPages().find((page) => page.data.title === title) : undefined;
  const card = post ? `/og/${post.slugs[0]}/image.png` : "/og/blog-page-og.png";

  return Response.redirect(new URL(card, request.url), 301);
}
