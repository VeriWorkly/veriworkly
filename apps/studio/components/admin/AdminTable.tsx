import type { ReactNode } from "react";

import { cn } from "@veriworkly/ui";

export interface AdminTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  /** Applied to both the header cell and every body cell in the column. */
  className?: string;
  /** Hidden below `md`. Use for columns that are useful but not load-bearing on mobile. */
  hideOnMobile?: boolean;
  /** Right-aligns and applies tabular figures. Use for every numeric or currency column. */
  numeric?: boolean;
}

interface AdminTableProps<T> {
  columns: Array<AdminTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  /** Rendered under the empty message — usually "clear filters" or a link to create something. */
  emptyAction?: ReactNode;
  caption?: ReactNode;
}

/**
 * The one table used by every admin list page.
 *
 * The wrapper scrolls horizontally rather than letting a wide table push the page body wide —
 * an admin table with ten columns will always overflow on a laptop, and a horizontally
 * scrolling *page* makes the nav unreachable. The header does not stick: a horizontal scroll
 * container is the sticky boundary, and it never scrolls vertically.
 */
function AdminTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage,
  emptyAction,
  caption,
}: AdminTableProps<T>) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          {caption ? (
            <caption className="border-border text-muted border-b px-4 py-2.5 text-left text-xs">
              {caption}
            </caption>
          ) : null}

          <thead className="bg-admin-inset">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "admin-label text-muted border-border border-b px-4 py-2.5 whitespace-nowrap",
                    column.hideOnMobile && "hidden md:table-cell",
                    column.numeric && "text-right",
                    column.className,
                  )}
                >
                  {/* A blank header still names its column for a screen reader (the row actions). */}
                  {column.header === "" ? <span className="sr-only">Actions</span> : column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <p className="text-foreground text-sm font-medium">
                    {emptyMessage ?? "Nothing to show yet."}
                  </p>

                  {emptyAction ? <div className="mt-3">{emptyAction}</div> : null}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-border hover:bg-admin-inset border-b transition-colors last:border-b-0"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-2.5 align-middle",
                        column.hideOnMobile && "hidden md:table-cell",
                        column.numeric && "admin-numeric text-right",
                        column.className,
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminTable;
