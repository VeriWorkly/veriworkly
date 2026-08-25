/**
 * Single-colour VeriWorkly mark, inlined so it inherits `currentColor`.
 *
 * The downloadable file at /brand/logo/veriworkly-logo-mono.svg carries the same
 * geometry. An <img> or next/image cannot inherit text colour, so anywhere the
 * mark has to change colour with its surroundings - reversed out of a dark
 * ground, on a photo, in a button - use this component instead of the file.
 */
interface LogoMarkMonoProps {
  /** Rendered size in px. Square. */
  size?: number;
  className?: string;
  /** Set when the mark is decorative and a nearby label already names it. */
  decorative?: boolean;
}

export const LogoMarkMono = ({ size = 48, className, decorative }: LogoMarkMonoProps) => (
  <svg
    viewBox="0 0 512 512"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
    role={decorative ? undefined : "img"}
    aria-hidden={decorative ? true : undefined}
    aria-label={decorative ? undefined : "VeriWorkly"}
  >
    <path d="M66 117H156l57.2 137.6L236.1 200h39.8l22.9 54.6L356 117h90L322 395h-35.6L256 324l-30.4 71H190Z" />
    <circle cx="256" cy="381.8" r="12.3" />
  </svg>
);

export default LogoMarkMono;
