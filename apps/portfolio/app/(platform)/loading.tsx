import Image from "next/image";

/** A plain loading state for the marketing pages: no made-up progress or status lines. */
export default function RootLoading() {
  return (
    <div
      className="bg-paper flex min-h-screen items-center justify-center p-6"
      role="status"
      aria-label="Loading"
    >
      <Image
        src="/veriworkly-logo-128.png"
        width={40}
        height={40}
        alt=""
        priority
        className="motion-safe:animate-pulse"
      />
    </div>
  );
}
