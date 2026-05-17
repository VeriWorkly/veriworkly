import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { notFound } from "next/navigation";

import { getTemplateById, templateSummaries } from "@/config/templates";

import { Card, Button, Container } from "@veriworkly/ui";

import { buildEditorUrl } from "../components/utils";
import { TemplateDetailHeader } from "../components/TemplateHeader";

interface Props {
  params: Promise<{ template: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { template } = await params;

  const data = getTemplateById(template);

  if (!data) return { title: "Template Not Found" };

  return {
    title: `${data.name} Template | VeriWorkly`,
    description: data.description,
  };
}

export function generateStaticParams() {
  return templateSummaries.map((t) => ({ template: t.id }));
}

export default async function TemplatePreviewPage({ params }: Props) {
  const { template } = await params;

  const templateDefinition = getTemplateById(template);

  if (!templateDefinition) {
    notFound();
  }

  const editorUrl = buildEditorUrl(templateDefinition.id, templateDefinition.documentType);

  return (
    <Container className="space-y-16 pt-28 pb-12 lg:pt-36">
      <TemplateDetailHeader template={templateDefinition} />

      <section aria-label="Template Preview" className="space-y-8">
        <Card className="overflow-hidden border-none bg-transparent p-0 shadow-none md:p-0">
          <div className="border-border bg-card relative mx-auto aspect-3/4 w-full max-w-4xl overflow-hidden rounded-xl border shadow-2xl">
            {templateDefinition.previewImage ? (
              <Image
                fill
                priority
                className="object-cover object-top"
                src={templateDefinition.previewImage}
                alt={`${templateDefinition.name} preview`}
              />
            ) : (
              <div className="text-muted flex h-full items-center justify-center">
                Preview not available
              </div>
            )}

            <div className="absolute inset-0 flex items-end justify-center bg-linear-to-t from-black/60 via-transparent to-transparent pb-12 opacity-0 transition-opacity duration-300 hover:opacity-100">
              <Button asChild size="lg" variant="primary">
                <Link href={editorUrl}>Use this template</Link>
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex justify-center pt-4">
          <Button
            asChild
            size="lg"
            variant="primary"
            className="h-14 rounded-full px-10 text-lg shadow-lg transition-all hover:shadow-xl"
          >
            <Link href={editorUrl}>Start Building with {templateDefinition.name}</Link>
          </Button>
        </div>
      </section>
    </Container>
  );
}
