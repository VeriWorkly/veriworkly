import type { Metadata } from "next";
import Link from "next/link";
import { Calendar } from "lucide-react";

import { Card, Badge, Button } from "@veriworkly/ui";

import type { RoadmapStatus } from "@/features/roadmap/services/roadmap-backend";
import { fetchAdminRoadmapServer } from "@/features/admin/services/admin-server";

import DeleteRoadmapButton from "@/app/admin/roadmap/components/DeleteRoadmapButton";

const statusConfig: Record<RoadmapStatus, { label: string; dot: string; bg: string }> = {
  todo: { label: "To Do", dot: "bg-slate-400", bg: "bg-slate-50/50" },
  "in-progress": {
    label: "In Progress",
    dot: "bg-blue-500",
    bg: "bg-blue-50/50",
  },
  done: { label: "Done", dot: "bg-emerald-500", bg: "bg-emerald-50/50" },
};

export const metadata: Metadata = {
  title: "Admin Roadmap",
  description: "Create, update, and organize public roadmap items from admin panel.",
  robots: { index: false, follow: false },
};

const AdminRoadmapPage = async () => {
  const items = (await fetchAdminRoadmapServer()) ?? [];

  const grouped: Record<RoadmapStatus, typeof items> = {
    todo: [],
    "in-progress": [],
    done: [],
  };

  items.forEach((item) => {
    if (grouped[item.status]) {
      grouped[item.status].push(item);
    }
  });

  return (
    <div className="space-y-6">
      <Card className="rounded-4xl p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Badge className="bg-background/70 border-amber-200 text-amber-700">Admin Only</Badge>

            <h2 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
              Roadmap Management
            </h2>

            <p className="text-muted max-w-2xl text-sm md:text-base">
              Organize feature requests and development progress. These items are visible on the
              public roadmap page.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin">Dashboard</Link>
            </Button>

            <Button asChild size="sm">
              <Link href="/admin/roadmap/new">Create Feature</Link>
            </Button>
          </div>
        </div>
      </Card>

      <section className="grid gap-6 lg:grid-cols-3">
        {(Object.keys(grouped) as RoadmapStatus[]).map((status) => (
          <div key={status} className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${statusConfig[status].dot}`} />

                <h3 className="text-foreground text-sm font-bold tracking-wider uppercase">
                  {statusConfig[status].label}
                </h3>
              </div>

              <Badge className="rounded-full px-2">{grouped[status].length}</Badge>
            </div>

            <div
              className={`min-h-100 flex-1 rounded-3xl p-2 ${statusConfig[status].bg} border-border/60 border border-dashed`}
            >
              {grouped[status].length === 0 ? (
                <div className="border-border bg-background/50 flex h-32 items-center justify-center rounded-2xl border border-dashed">
                  <p className="text-muted text-xs">No tasks found</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {grouped[status].map((item) => (
                    <Card
                      key={item.id}
                      className="group border-border bg-background rounded-2xl p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-foreground group-hover:text-accent text-base font-semibold transition-colors">
                            {item.title}
                          </h4>

                          <p className="text-muted mt-1 line-clamp-2 text-sm leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        {item.timeline && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <Calendar className="h-3 w-3" />

                            {item.timeline}
                          </div>
                        )}

                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map((tag) => (
                              <Badge
                                key={`${item.id}-${tag}`}
                                className="bg-background/50 border-slate-200 py-0 text-xs font-medium capitalize"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 border-t border-slate-50 pt-2">
                          <Button size="sm" asChild variant="ghost" className="h-7 text-xs">
                            <Link href={`/admin/roadmap/${item.id}/edit`}>Edit</Link>
                          </Button>

                          <DeleteRoadmapButton id={item.id} title={item.title} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default AdminRoadmapPage;
