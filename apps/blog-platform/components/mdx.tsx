import type { MDXComponents } from "mdx/types";

import Link from "fumadocs-core/link";
import { Heading } from "fumadocs-ui/components/heading";
import { ImageZoom } from "fumadocs-ui/components/image-zoom";
import { Pre, CodeBlock } from "fumadocs-ui/components/codeblock";

/** Only the elements the posts use: every registered client component ships with each post. */
export function getMDXComponents() {
  return {
    a: Link,
    h2: (props: React.ComponentProps<"h2">) => <Heading as="h2" {...props} />,
    h3: (props: React.ComponentProps<"h3">) => <Heading as="h3" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    img: (props: any) => <ImageZoom {...props} />,
    // Comparison tables are wide by nature. Scroll them in place so the page
    // body never scrolls horizontally on small screens.
    table: (props: React.ComponentProps<"table">) => (
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <table {...props} />
      </div>
    ),
    pre: (props: React.ComponentProps<"pre">) => (
      <CodeBlock {...props}>
        <Pre>{props.children}</Pre>
      </CodeBlock>
    ),
  } satisfies MDXComponents;
}
