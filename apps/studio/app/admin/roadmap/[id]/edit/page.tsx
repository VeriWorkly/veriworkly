import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, Badge, Button } from "@veriworkly/ui";

import { fetchAdminRoadmapFeatureServer } from "@/features/admin/services/admin-server";

import RoadmapFeatureForm from "@/app/admin/roadmap/components/RoadmapFeatureForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Edit Roadmap - ${id}`,
    description: "Edit roadmap feature details, status, tags, and timeline from admin panel.",
    robots: { index: false, follow: false },
  };
}

export default async function AdminRoadmapEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const feature = await fetchAdminRoadmapFeatureServer(id);

  if (!feature) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-4xl p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Badge className="bg-background/70">Roadmap Edit</Badge>
            <h2 className="text-foreground text-2xl font-semibold md:text-3xl">
              Edit {feature.title}
            </h2>
            <p className="text-muted text-sm md:text-base">
              Update all roadmap fields, including schema-backed detail columns and JSON content.
            </p>
          </div>

          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/roadmap">Back to Roadmap</Link>
          </Button>
        </div>
      </Card>

      <RoadmapFeatureForm mode="edit" feature={feature} />
    </div>
  );
}
