interface SkeletonLineProps {
  width?: string;
  height?: string;
  className?: string;
  animated?: boolean;
}

const SkeletonLine = ({
  width = "w-full",
  height = "h-2.5",
  className = "",
  animated = false,
}: SkeletonLineProps) => (
  <div
    className={`relative overflow-hidden rounded-sm bg-zinc-200/90 dark:bg-zinc-800/80 ${height} ${width} ${className}`}
  >
    {animated && (
      <div className="animate-shimmer absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
    )}
  </div>
);

export default SkeletonLine;
