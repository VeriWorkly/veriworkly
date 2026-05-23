import fs from "fs";
import path from "path";

export function getReadingTime(filename: string): string {
  try {
    const fullPath = path.join(process.cwd(), "content", "blog", filename);

    const content = fs.readFileSync(fullPath, "utf-8");
    const words = content.trim().split(/\s+/).length;

    const minutes = Math.ceil(words / 200);

    return `${minutes} min read`;
  } catch (error) {
    console.error("Error reading post content for read time calculation:", error);
    return "5 min read";
  }
}
