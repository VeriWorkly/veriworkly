import type { ResumeLinkType } from "@/types/resume";

import { SOCIAL_ICON_PATH_BY_TYPE } from "./social-icons";

/**
 * A link's icon in the preview: the same path the PDF draws (`templates/pdf/SocialIcon.tsx`),
 * filled with the same colour. Inline rather than an `<img>` of an SVG file, which draws
 * black whatever the template's colours (invisible on a dark page) and points the exported
 * HTML at this site, so the file loses its icons offline.
 */
export function WebSocialIcon({
  color,
  size,
  type,
}: {
  color: string;
  size: number;
  type: ResumeLinkType;
}) {
  const icon = SOCIAL_ICON_PATH_BY_TYPE[type] || SOCIAL_ICON_PATH_BY_TYPE.custom;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size}
      style={{ display: "block", flexShrink: 0 }}
      viewBox={icon.viewBox}
      width={size}
    >
      <path d={icon.path} fill={color} />
    </svg>
  );
}
