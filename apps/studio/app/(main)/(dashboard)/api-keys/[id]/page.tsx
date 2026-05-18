import type { Metadata } from "next";

import { headers } from "next/headers";
import { notFound } from "next/navigation";

import type { ApiKeyDetailRecord } from "@/features/api-keys/components/ApiKeyTypes";

import { backendApiUrl } from "@/lib/constants";

import ApiKeyDetailView from "@/features/api-keys/components/details/ApiKeyDetailView";

export const metadata: Metadata = {
  title: "API Key Details",
  robots: { index: false, follow: false },
};

async function fetchKeyDetails(id: string): Promise<ApiKeyDetailRecord | null> {
  try {
    const requestHeaders = await headers();
    const cookie = requestHeaders.get("cookie");

    const response = await fetch(backendApiUrl(`/api-keys/${id}`), {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    return json.data as ApiKeyDetailRecord;
  } catch {
    return null;
  }
}

export default async function ApiKeyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const keyDetails = await fetchKeyDetails(id);

  if (!keyDetails) {
    notFound();
  }

  return <ApiKeyDetailView initialData={keyDetails} />;
}
