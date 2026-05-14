import type { Metadata } from "next";
import Link from "next/link";

import { Card, Badge, Button } from "@veriworkly/ui";

import RoadmapFeatureForm from "@/app/admin/roadmap/components/RoadmapFeatureForm";

export const metadata: Metadata = {
  title: "Create Roadmap Item",
  description: "Create a new roadmap item with full metadata and public-ready details.",
  robots: { index: false, follow: false },
};

const AdminRoadmapCreatePage = () => {
  return (
    <div className="space-y-6">
      <Card className="rounded-4xl p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Badge className="bg-background/70">Roadmap Create</Badge>

            <h2 className="text-foreground text-2xl font-semibold md:text-3xl">
              Create Roadmap Item
            </h2>

            <p className="text-muted text-sm md:text-base">
              Fill complete roadmap metadata including narrative fields and structured details JSON.
            </p>
          </div>

          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/roadmap">Back to Roadmap</Link>
          </Button>
        </div>
      </Card>

      <RoadmapFeatureForm mode="create" />
    </div>
  );
};

export default AdminRoadmapCreatePage;
