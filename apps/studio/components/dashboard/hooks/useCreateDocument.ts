"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { DocumentType } from "@/features/documents/core/document-types";
import type { BillingSummary } from "@/features/billing/types";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import {
  listDocuments,
  createDocumentFromMasterProfile,
} from "@/features/documents/services/document-workspace-service";
import { fetchApiData } from "@/utils/fetchApiData";
import { useUserStore } from "@/store/useUserStore";

export function useCreateDocument() {
  const router = useRouter();
  const { user } = useUserStore();

  const createNewDocument = async (type: DocumentType) => {
    const existingDocs = listDocuments(type);

    let isPaid = false;
    if (user?.email) {
      try {
        const billingData = await fetchApiData<BillingSummary>("/billing/me");
        isPaid = billingData && billingData.plan !== "FREE";
      } catch {
        // ignore fetch failures and default to free rules
      }
    }

    if (!isPaid && existingDocs.length >= 1) {
      toast.error(
        `Free/guest users can only have 1 active ${type.toLowerCase().replace("_", " ")} at a time. Upgrade to Creator Pro to create unlimited documents.`,
      );
      return;
    }

    const document = await createDocumentFromMasterProfile(type);
    router.push(getDocumentEditorPath(type, document.id));
  };

  return { createNewDocument };
}
