import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

import { veriworklyProductLinks } from "@/config/site";

const products = [
  {
    name: "Studio",
    href: veriworklyProductLinks.studio,
    copy: "Build resumes, cover letters, and professional documents.",
  },

  {
    name: "Docs",
    href: veriworklyProductLinks.docs,
    copy: "Read product guides, API notes, and implementation docs.",
  },

  {
    name: "Blog",
    href: veriworklyProductLinks.blog,
    copy: "Follow product thinking, releases, and builder notes.",
  },

  {
    name: "Portfolio",
    href: "/",
    copy: "Create a public website from one reusable profile.",
  },
];

const PortfolioPublicFooter = () => {
  return (
    <footer className="dark:bg-panel bg-[#11110f] text-[#f5f4ef]">
      <div className="mx-auto grid w-[min(1360px,calc(100%-48px))] gap-12 py-16 max-sm:w-[min(calc(100%-30px),1360px)] lg:grid-cols-[1.1fr_1.4fr]">
        <div>
          <Link href="/" className="flex items-center gap-3 text-sm font-medium tracking-[-.04em]">
            <Image src="/veriworkly-logo.png" width={30} height={30} alt="VeriWorkly Logo" />
            VeriWorkly Portfolio
          </Link>

          <h2 className="mt-8 max-w-xl text-[clamp(2.7rem,5vw,5.5rem)] leading-none font-medium tracking-tighter">
            One profile, many ways to present your work.
          </h2>

          <p className="mt-6 max-w-md text-sm leading-6 text-[#f5f4ef]/55">
            Portfolio is part of the VeriWorkly ecosystem for building documents, publishing proof,
            and keeping your professional presence current.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((product) => {
            const content = (
              <>
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-bold">{product.name}</h3>
                  <ArrowUpRight
                    className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </div>

                <p className="mt-4 max-w-xs text-sm leading-6 text-[#f5f4ef]/55 group-hover:text-[#f5f4ef]/80">
                  {product.copy}
                </p>
              </>
            );

            return (
              <Link
                key={product.name}
                href={product.href}
                className="group hover:text-accent-ink hover:border-accent hover:bg-accent max-h-[180px] overflow-hidden rounded-3xl border border-white/12 bg-white/4 p-5 transition duration-300 hover:-translate-y-1"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mx-auto flex w-[min(1360px,calc(100%-48px))] flex-wrap items-center justify-between gap-4 border-t border-white/10 py-6 text-xs text-[#f5f4ef]/45 max-sm:w-[min(calc(100%-30px),1360px)]">
        <span>&copy; {new Date().getFullYear()} VeriWorkly</span>

        <div className="flex flex-wrap gap-5">
          <Link href="/templates">Templates</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/editor">Editor</Link>
        </div>
      </div>
    </footer>
  );
};

export default PortfolioPublicFooter;
