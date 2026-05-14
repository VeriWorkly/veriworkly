import type { Metadata } from "next";

import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Editor",
  description: "Open and edit your resume drafts in VeriWorkly Studio.",
  robots: { index: false, follow: false },
};

const EditorPage = () => {
  redirect("/");
};

export default EditorPage;
