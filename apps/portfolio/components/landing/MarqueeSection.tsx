const capabilities = [
  "Portfolio demo",
  "Custom meta title",
  "VeriWorkly subdomain",
  "Live template previews",
  "One-time content updates",
  "Template switching",
  "Project sections",
  "Privacy-first analytics",
];

const MarqueeSection = () => {
  return (
    <section
      className="bg-accent scale-105 rotate-1 overflow-hidden border-y-2 border-[#11110f] py-4 text-white"
      aria-label="Portfolio features"
    >
      <div data-marquee className="flex w-max gap-5 will-change-transform">
        {[...capabilities, ...capabilities, ...capabilities].map((item, index) => (
          <span
            className="flex items-center gap-5 pr-4 text-sm font-black whitespace-nowrap"
            key={`${item}-${index}`}
          >
            <i className="size-1.5 rounded-full bg-white" aria-hidden="true" />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
};

export default MarqueeSection;
