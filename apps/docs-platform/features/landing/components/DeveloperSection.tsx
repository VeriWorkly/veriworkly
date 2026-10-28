import Link from "next/link";

import { Button } from "@veriworkly/ui";

export const DeveloperSection = () => {
  return (
    <section className="relative overflow-hidden rounded-4xl border border-white/5 bg-zinc-950 p-8 md:p-12">
      <div className="pointer-events-none absolute top-0 right-0 h-full w-1/2 bg-linear-to-l from-blue-500/10 to-transparent" />

      <div className="relative grid items-center gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <p className="text-xs font-semibold tracking-[0.24em] text-blue-400 uppercase">
            For Developers
          </p>

          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Built for <span className="text-blue-400">Developers.</span>
          </h2>

          <p className="text-lg leading-relaxed font-medium text-zinc-400">
            Build with the same stack we use in production: a local-first resume app, an Express
            API, and dedicated docs you can run or self-host.
          </p>

          <ul className="space-y-4">
            {[
              "RESTful API endpoints",
              "OpenAPI-powered API reference",
              "Optional sync and public share links",
              "Self-host friendly Docker setup",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3 font-medium text-zinc-300">
                <div className="size-1.5 rounded-full bg-blue-500" />
                {feature}
              </li>
            ))}
          </ul>

          <Button
            asChild
            className="mt-4 h-12 rounded-2xl bg-white px-8 font-bold text-black hover:bg-zinc-200"
          >
            <Link href="/docs/getting-started/local-setup">Read Quickstart</Link>
          </Button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-2 shadow-2xl">
          <div className="overflow-x-auto rounded-2xl bg-zinc-900 p-6 font-mono text-sm text-zinc-300">
            <div className="mb-4 flex gap-2">
              <div className="size-3 rounded-full bg-red-500/50" />
              <div className="size-3 rounded-full bg-amber-500/50" />
              <div className="size-3 rounded-full bg-emerald-500/50" />
            </div>

            <p className="text-blue-400"># Example: call the API server</p>

            <p>
              <span className="text-emerald-400">curl</span> -X GET{" "}
              <span className="text-zinc-400">&quot;http://localhost:8080/api/v1/health&quot;</span>
            </p>

            <br />

            <p className="text-blue-400"># Docs + API reference</p>

            <p>
              <span className="text-purple-400">open</span>{" "}
              <span className="text-zinc-400">
                &quot;https://docs.veriworkly.com/api-reference&quot;
              </span>
            </p>

            <p className="pl-4">
              <span className="text-zinc-400"># Browse endpoints and payloads</span>
            </p>

            <p className="pl-4">
              <span className="text-zinc-400"># Test locally or in your own deployment</span>
            </p>
            <p />
          </div>
        </div>
      </div>
    </section>
  );
};
