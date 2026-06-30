"use client";

import { Code, Eye } from "lucide-react";
import { useState, useRef } from "react";

import type { TemplateDetails } from "../data/template-details";
import type { TemplateSummary } from "@/templates/catalog/templates";

import TemplateCta from "./TemplateCta";
import TemplateFaqs from "./TemplateFaqs";
import TemplateBestFit from "./TemplateBestFit";
import TemplateDetailHero from "./TemplateDetailHero";
import TemplateStyleGuide from "./TemplateStyleGuide";
import TemplateDetailCards from "./TemplateDetailCards";
import TemplatePreviewSection from "./TemplatePreviewSection";
import TemplateFullSystemSpec from "./TemplateFullSystemSpec";

type ContainerProps = {
  template: TemplateSummary;
  details: TemplateDetails;
};

const TemplateDetailContainer = ({ template, details }: ContainerProps) => {
  const [devMode, setDevMode] = useState(false);

  const specAnchorRef = useRef<HTMLDivElement>(null);

  const handleEnableDevMode = () => {
    setDevMode(true);

    setTimeout(() => {
      specAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleToggleDevMode = () => {
    if (!devMode) {
      setDevMode(true);

      setTimeout(() => {
        specAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } else setDevMode(false);
  };

  return (
    <main className="relative">
      <TemplateDetailHero template={template} details={details} />
      <TemplatePreviewSection template={template} details={details} />
      <TemplateDetailCards details={details} />
      <TemplateStyleGuide template={template} details={details} />

      <div ref={specAnchorRef} className="scroll-mt-28" />

      <div className={devMode ? "block" : "hidden"}>
        <TemplateFullSystemSpec details={details} templateId={template.id} />
      </div>

      <div className={devMode ? "hidden" : "block"}>
        <section className="mx-auto w-[min(1200px,calc(100%-48px))] py-12 md:py-16">
          <div className="border-ink-2/10 bg-panel mx-auto max-w-2xl rounded-3xl border p-8 text-center shadow-sm md:p-12">
            <span className="bg-accent/8 text-accent mb-4 inline-block rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase">
              Developer Spec Sheet
            </span>

            <h3 className="text-ink-2 mb-3 text-2xl font-bold tracking-tight">
              Building or customizing this template?
            </h3>

            <p className="text-ink-2/65 mx-auto mb-8 max-w-md text-sm leading-relaxed">
              Turn on Developer Mode to inspect styling tokens, layout padding values, shape
              border-radii, responsive queries, and the raw specs JSON.
            </p>

            <button
              onClick={handleEnableDevMode}
              className="bg-ink-2 hover:bg-ink-soft text-paper mx-auto flex cursor-pointer items-center gap-2 rounded-full px-6 py-3 text-xs font-bold shadow-sm transition-all hover:shadow active:scale-95"
            >
              <Code size={14} /> Enable Developer Mode
            </button>
          </div>
        </section>
      </div>

      <TemplateBestFit template={template} details={details} />

      {details.faqs && <TemplateFaqs faqs={details.faqs} templateName={template.name} />}

      <TemplateCta template={template} />

      <div className="fixed bottom-8 left-8 z-80 hidden md:block">
        <button
          onClick={handleToggleDevMode}
          title={devMode ? "Switch to Regular Preview" : "Switch to Developer Specs"}
          className={`flex cursor-pointer items-center gap-2.5 rounded-full border px-5 py-3 font-['Outfit'] text-xs font-bold shadow-lg transition-all duration-300 active:scale-95 ${
            devMode
              ? "bg-accent border-accent hover:bg-accent-hover text-white"
              : "text-ink-2 border-ink-2/10 bg-panel hover:bg-panel-2"
          }`}
        >
          {devMode ? (
            <>
              <Eye size={14} /> User View
            </>
          ) : (
            <>
              <Code size={14} /> Developer Mode
            </>
          )}

          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${devMode ? "bg-white" : "bg-accent"}`}
            ></span>
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${devMode ? "bg-white" : "bg-accent"}`}
            ></span>
          </span>
        </button>
      </div>

      <div className="fixed bottom-4 left-1/2 z-80 w-[calc(100%-32px)] max-w-sm -translate-x-1/2 md:hidden">
        <button
          onClick={handleToggleDevMode}
          className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border py-3.5 font-['Outfit'] text-xs font-bold shadow-lg transition-all duration-300 active:scale-95 ${
            devMode ? "bg-accent border-accent text-white" : "text-ink-2 border-ink-2/10 bg-panel"
          }`}
        >
          {devMode ? (
            <>
              <Eye size={14} /> Switch to User View
            </>
          ) : (
            <>
              <Code size={14} /> View Developer Mode
            </>
          )}
        </button>
      </div>
    </main>
  );
};

export default TemplateDetailContainer;
