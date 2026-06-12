import { usePortfolioStore } from "@/store/portfolio-store";

export function WorkspaceNotice() {
  const message = usePortfolioStore((state) => state.message);
  return message ? (
    <p
      className="fixed right-4 bottom-4 z-50 max-w-sm rounded-sm bg-[#171717] px-4 py-3 text-xs font-bold text-white shadow-xl"
      role="status"
    >
      {message}
    </p>
  ) : null;
}
