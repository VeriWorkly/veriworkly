import { Preview } from "./Preview";
import { SocialCard } from "./SocialCard";

export interface SettingsPreviewsProps {
  url: string;
  title: string;
  description: string;
  socialImage?: { url: string } | null;
}

export function SettingsPreviews({ url, title, description, socialImage }: SettingsPreviewsProps) {
  return (
    <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
      <Preview title="Google search preview">
        <div className="py-2">
          <p className="text-sm text-[#202124] dark:text-[#bdc1c6]">{url}</p>
          <p className="mt-1 text-xl font-medium text-[#1a0dab] hover:underline dark:text-[#8ab4f8]">
            {title}
          </p>
          <p className="mt-1 text-sm leading-5 text-[#4d5156] dark:text-[#bdc1c6]">{description}</p>
        </div>
      </Preview>
      <Preview title="LinkedIn and Facebook preview">
        <SocialCard image={socialImage?.url} title={title} description={description} url={url} />
      </Preview>
      <Preview title="X card preview">
        <SocialCard image={socialImage?.url} title={title} url={url} />
      </Preview>
    </aside>
  );
}
