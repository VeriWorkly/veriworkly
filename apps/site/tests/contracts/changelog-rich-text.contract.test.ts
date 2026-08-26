import { describe, expect, it } from "vitest";
import React from "react";
import { renderInlineMarkdown } from "@/features/changelog/components/detail/ChangelogRichText";

describe("ChangelogRichText inline markdown parser", () => {
  it("parses bold text", () => {
    const nodes = renderInlineMarkdown("This is **bold** text");
    expect(nodes.length).toBe(3);
    expect(nodes[0]).toBe("This is ");
    expect(React.isValidElement(nodes[1])).toBe(true);
    expect((nodes[1] as React.ReactElement).type).toBe("strong");
    expect(nodes[2]).toBe(" text");
  });

  it("parses inline code", () => {
    const nodes = renderInlineMarkdown("Call `normalizeMasterProfile()` here");
    expect(nodes.length).toBe(3);
    expect(nodes[0]).toBe("Call ");
    expect(React.isValidElement(nodes[1])).toBe(true);
    expect((nodes[1] as React.ReactElement).type).toBe("code");
    expect((nodes[1] as React.ReactElement<{ children?: string }>).props.children).toBe(
      "normalizeMasterProfile()",
    );
    expect(nodes[2]).toBe(" here");
  });

  it("parses markdown links", () => {
    const nodes = renderInlineMarkdown("See [Documentation](https://veriworkly.com/docs) for info");
    expect(nodes.length).toBe(3);
    expect(nodes[0]).toBe("See ");
    expect(React.isValidElement(nodes[1])).toBe(true);
    expect((nodes[1] as React.ReactElement<{ href?: string }>).props.href).toBe(
      "https://veriworkly.com/docs",
    );
    expect(nodes[2]).toBe(" for info");
  });

  it("handles complex real-world changelog line with bold prefix and code chips", () => {
    const text =
      "**@veriworkly/profile-core (new package)**: Shared workspace package containing canonical `MasterProfile` Zod schema and `validateMasterProfile`.";
    const nodes = renderInlineMarkdown(text);
    expect(nodes.length).toBeGreaterThan(2);

    const boldNode = nodes[0] as React.ReactElement;
    expect(React.isValidElement(boldNode)).toBe(true);
    expect(boldNode.type).toBe("strong");

    const codeNode = nodes.find(
      (n) => React.isValidElement(n) && n.type === "code",
    ) as React.ReactElement<{ children?: string }>;
    expect(codeNode).toBeDefined();
    expect(codeNode.props.children).toBe("MasterProfile");
  });

  it("parses GitHub PR auto-references like #195", () => {
    const nodes = renderInlineMarkdown("Fixed bug in PR #195 today");
    expect(nodes.length).toBeGreaterThanOrEqual(3);
    const prNode = nodes.find(
      (n) => React.isValidElement(n) && (n.props as { href?: string }).href?.includes("/pull/195"),
    );
    expect(prNode).toBeDefined();
  });

  it("parses GitHub contributor mentions like @Gautam25Raj", () => {
    const nodes = renderInlineMarkdown("Contributed by @Gautam25Raj in this release");
    expect(nodes.length).toBeGreaterThanOrEqual(3);
    const mentionNode = nodes.find(
      (n) => React.isValidElement(n) && (n.props as { href?: string }).href === "https://github.com/Gautam25Raj",
    );
    expect(mentionNode).toBeDefined();
  });

  it("converts raw GitHub pull request URLs to clean #PR link pills", () => {
    const nodes = renderInlineMarkdown(
      "Fix issue in https://github.com/VeriWorkly/veriworkly/pull/195 properly",
    );
    expect(nodes.length).toBe(3);
    const prNode = nodes[1] as React.ReactElement<{ children?: string; href?: string }>;
    expect(React.isValidElement(prNode)).toBe(true);
    expect(prNode.props.children).toBe("#195");
    expect(prNode.props.href).toBe("https://github.com/VeriWorkly/veriworkly/pull/195");
  });

  it("parses scoped package names like @veriworkly/profile-core without cutting off at slash", () => {
    const nodes = renderInlineMarkdown(
      "New @veriworkly/profile-core monorepo package with shared schema",
    );
    expect(nodes.length).toBeGreaterThanOrEqual(3);
    const pkgNode = nodes.find(
      (n) => React.isValidElement(n) && (n.props as { children?: string }).children === "@veriworkly/profile-core",
    );
    expect(pkgNode).toBeDefined();
  });

  it("handles empty or null safely", () => {
    expect(renderInlineMarkdown("")).toEqual([]);
  });
});
