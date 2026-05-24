import type { ResumeData } from "@/types/resume";
import type { TemplateComponent } from "@/types/template";

import { Card } from "@veriworkly/ui";

interface ResumeCanvasProps {
  sharePreviewId: string;
  templateComponent: TemplateComponent;
  resume: ResumeData;
}

const ResumeCanvas = ({
  sharePreviewId,
  templateComponent: Template,
  resume,
}: ResumeCanvasProps) => {
  return (
    <div className="mx-auto w-full max-w-310 px-4 pt-4 pb-12 md:px-6 md:pt-6 md:pb-20">
      <Card className="border-border relative mx-auto w-fit max-w-full overflow-hidden rounded-3xl bg-white p-0 shadow-2xl ring-1 ring-black/5">
        <div className="custom-scrollbar overflow-x-auto bg-white/50 p-3 backdrop-blur md:p-6">
          <div
            id={sharePreviewId}
            className="border-border/50 mx-auto max-w-212.5 min-w-175 rounded-4xl border text-black shadow-sm ring-1 ring-black/5 dark:ring-white/10"
          >
            <Template resume={resume} className="" />
          </div>
        </div>
      </Card>
    </div>
  );
};

export { ResumeCanvas };
