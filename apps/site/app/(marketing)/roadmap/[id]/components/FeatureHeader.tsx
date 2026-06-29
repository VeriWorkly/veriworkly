import type { RoadmapFeature } from "@/features/roadmap/services/roadmap-backend";

const FeatureHeader = ({ feature }: { feature: RoadmapFeature }) => {
  return (
    <div className="space-y-4">
      <h1 className="text-foreground -translate-x-px text-3xl leading-[1.1] font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
        {feature.title}
      </h1>

      <p className="text-muted max-w-3xl text-lg leading-relaxed font-medium">
        {feature.description}
      </p>

      {feature.tags && feature.tags.length > 0 && (
        <div className="pt-2">
          <div className="flex flex-wrap gap-1.5">
            {feature.tags.map((tag) => (
              <span
                key={tag}
                className="bg-foreground/5 text-muted border-border/30 rounded-lg border px-2.5 py-0.5 text-xs font-semibold"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureHeader;
