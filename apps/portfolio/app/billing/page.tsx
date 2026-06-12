import { redirect } from "next/navigation";

export default async function BillingPage() {
  redirect(`${process.env.NEXT_PUBLIC_STUDIO_URL || "http://localhost:3001"}/billing`);
}
