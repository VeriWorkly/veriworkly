interface ReleaseTagsProps {
  tags: string[];
}

export const ReleaseTags = ({ tags }: ReleaseTagsProps) => {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="bg-muted/10 text-muted border-border/30 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-wide"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
};

export default ReleaseTags;
