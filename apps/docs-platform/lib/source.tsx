import { icons } from "lucide-react";
import { createElement } from "react";
import { loader } from "fumadocs-core/source";
import { docs, api } from "collections/server";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),

  icon(icon) {
    if (!icon) {
      return;
    }

    if (icon in icons) return createElement(icons[icon as keyof typeof icons]);
  },
});

export const apiSource = loader({
  baseUrl: "/api-reference",
  source: api.toFumadocsSource(),

  icon(icon) {
    if (!icon) {
      return;
    }

    if (icon in icons) return createElement(icons[icon as keyof typeof icons]);
  },

  plugins: [
    {
      transformPageTree: {
        file(node, path) {
          if (!path) return node;

          const file = this.storage.read(path);
          if (!file) return node;

          const data = file.data as { _openapi?: { method: string }; new?: boolean };
          const method = data._openapi?.method;
          const isNew = data.new === true;

          const badge = method
            ? createElement(
                "span",
                {
                  key: "method-badge",
                  className: `text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${getMethodColor(method)}`,
                },
                method,
              )
            : isNew
              ? createElement(
                  "span",
                  {
                    key: "new-badge",
                    className:
                      "text-[10px] font-bold text-red-500 border border-red-500/20 px-1 rounded bg-red-500/10",
                  },
                  "NEW",
                )
              : null;

          if (badge) {
            node.name = createElement(
              "span",
              {
                key: `sidebar-label-${path}`,
                className: "inline-flex items-center justify-between w-full gap-2",
              },
              createElement("span", { key: "name" }, node.name as string),
              badge,
            );
          }

          return node;
        },
      },
    },
  ],
});

export function getMethodColor(method: string) {
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    case "POST":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "PUT":
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
    case "DELETE":
      return "bg-red-400/10 text-red-600 dark:text-red-400 border-red-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
  }
}

export function getPageImage(page: (typeof source)["$inferPage"]) {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}

export function getApiPageImage(page: (typeof apiSource)["$inferPage"]) {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url: `/og/api/${segments.join("/")}`,
  };
}
