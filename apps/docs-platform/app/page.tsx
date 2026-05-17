import { Container } from "@veriworkly/ui";

import { docsFaqs } from "../data/faq";

import { MainLayout } from "@/components/layout/MainLayout";

import { DocsHero } from "../features/landing/components/DocsHero";
import { FAQSection } from "../features/landing/components/FAQSection";
import { CTASection } from "../features/landing/components/CTASection";
import { CorePillars } from "../features/landing/components/CorePillars";
import { UniversalSearch } from "../features/landing/components/UniversalSearch";
import { DeveloperSection } from "../features/landing/components/DeveloperSection";

const HomePage = () => {
  return (
    <MainLayout>
      <Container className="space-y-12 py-14 md:space-y-20 md:py-20">
        <DocsHero />
        <CorePillars />
        <DeveloperSection />
        <UniversalSearch />
        <FAQSection faqs={docsFaqs} />
        <CTASection />
      </Container>
    </MainLayout>
  );
};

export default HomePage;
