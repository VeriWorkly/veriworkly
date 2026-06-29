import Link from "next/link";

import SEOContentContainer from "@/components/SEOContentContainer";

const TemplatesSEOContent = () => {
  return (
    <SEOContentContainer>
      <h2 className="text-xl font-semibold">Choose the Right Resume Template</h2>

      <p className="text-muted text-sm leading-6">
        Our resume templates are designed to help you create a professional resume quickly. Whether
        you prefer a modern, minimal, or ATS-friendly layout, each template ensures readability and
        compatibility with hiring systems.
      </p>

      <p className="text-muted text-sm leading-6">
        All templates are completely free and require no login. Your data stays on your device,
        making VeriWorkly a privacy-first{" "}
        <Link href="/" className="text-accent underline">
          resume builder
        </Link>
        .
      </p>
    </SEOContentContainer>
  );
};

export default TemplatesSEOContent;
