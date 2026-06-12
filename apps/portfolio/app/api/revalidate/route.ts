import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { paths?: string[]; tags?: string[]; secret?: string };

  try {
    body = (await request.json()) as { paths?: string[]; tags?: string[]; secret?: string };
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const { paths, tags, secret } = body;
  const expectedSecret = process.env.PORTFOLIO_REVALIDATE_SECRET || "dev-revalidate-secret";

  if (secret !== expectedSecret) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      try {
        (revalidateTag as unknown as (tag: string) => void)(tag);
      } catch (err) {
        console.error(`Failed to revalidate tag: ${tag}`, err);
      }
    }
  }

  if (paths && Array.isArray(paths)) {
    for (const path of paths) {
      try {
        revalidatePath(path);
      } catch (err) {
        console.error(`Failed to revalidate path: ${path}`, err);
      }
    }
  }

  return NextResponse.json({ revalidated: true, paths, tags });
}
