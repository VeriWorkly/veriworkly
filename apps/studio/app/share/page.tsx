import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Share",
  description: "Access shared resume links and collaboration views in VeriWorkly Studio.",
  robots: { index: false, follow: false },
};

const SharePage = () => {
  redirect("/");
};

export default SharePage;
