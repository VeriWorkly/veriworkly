import { FileText, BarChart3 } from "lucide-react";
import { ProductLink } from "./ProductLink";
import { veriworklyProductLinks } from "@/config/site";

export function DashboardProductLinks() {
  return (
    <section className="mt-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-muted text-xs font-extrabold">Across VeriWorkly</p>
          <h2 className="mt-1 text-xl font-black tracking-[-.04em]">Your career workspace</h2>
        </div>
        <a className="text-accent text-xs font-extrabold" href={veriworklyProductLinks.studio}>
          Open Studio
        </a>
      </div>
      <div className="border-line bg-line mt-4 grid gap-px overflow-hidden rounded-md border md:grid-cols-2">
        <ProductLink
          href={veriworklyProductLinks.studio}
          icon={<FileText size={17} />}
          title="Document builder"
          detail="Create and manage career documents"
        />
        <ProductLink
          href={veriworklyProductLinks.blog}
          icon={<BarChart3 size={17} />}
          title="Blog and guides"
          detail="Practical writing for better applications"
        />
      </div>
    </section>
  );
}
