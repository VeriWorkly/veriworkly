const RoadmapHeader = ({ title, description }: { title: string; description: string }) => {
  return (
    <div className="border-border/40 mb-12 flex flex-col gap-4 border-b pb-8">
      <div className="flex items-center gap-2">
        <span className="bg-accent h-1.5 w-1.5 animate-pulse rounded-full" />
        <span className="text-muted/90 font-mono text-[9px] font-bold tracking-widest uppercase">
          Development Pipeline
        </span>
      </div>

      <h1 className="text-foreground font-sans text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        {title}
      </h1>

      <p className="text-muted max-w-2xl text-sm leading-relaxed sm:text-base">{description}</p>
    </div>
  );
};

export default RoadmapHeader;
