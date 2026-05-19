export default function EditorPreviewLoading() {
  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="border-border bg-card h-20 animate-pulse rounded-2xl border" />
      <div className="border-border bg-card space-y-4 rounded-3xl border p-4 md:p-6">
        <div className="bg-border h-[62vh] w-full animate-pulse rounded-2xl" />
      </div>
    </div>
  );
}
