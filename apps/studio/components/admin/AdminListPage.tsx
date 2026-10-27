import type { ReactNode } from "react";

import AdminFilterBar, {
  type AdminFilterDate,
  type AdminFilterSelect,
} from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPagination from "@/components/admin/AdminPagination";
import AdminTable, { type AdminTableColumn } from "@/components/admin/AdminTable";
import Panel from "@/components/admin/Panel";

interface AdminListPageProps<T> {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  /** Stat cards and summary panels, between the header and the filters. */
  summary?: ReactNode;
  /** A side form; the list moves into the main column beside it. */
  aside?: { title: string; description: string; form: ReactNode };
  /** Path without a query string, e.g. `/admin/users`. */
  basePath: string;
  /** The page's `toSingleValueParams` result, re-emitted by the pagination links. */
  params: Record<string, string>;
  searchPlaceholder?: string;
  filters?: AdminFilterSelect[];
  dateFilters?: AdminFilterDate[];
  page: { items: T[]; total: number; limit: number; offset: number };
  columns: Array<AdminTableColumn<T>>;
  rowKey: (row: T) => string;
  emptyMessage: string;
  caption?: ReactNode;
}

/** The scaffold every admin list page shares: header, filters, table, pagination. */
export default function AdminListPage<T>({
  eyebrow,
  title,
  description,
  actions,
  summary,
  aside,
  basePath,
  params,
  searchPlaceholder,
  filters,
  dateFilters,
  page,
  columns,
  rowKey,
  emptyMessage,
  caption,
}: AdminListPageProps<T>) {
  const list = (
    <>
      <AdminFilterBar
        basePath={basePath}
        searchPlaceholder={searchPlaceholder}
        selects={filters}
        dates={dateFilters}
      />

      <AdminTable
        columns={columns}
        rows={page.items}
        rowKey={rowKey}
        emptyMessage={emptyMessage}
        caption={caption}
      />

      <AdminPagination
        total={page.total}
        limit={page.limit}
        offset={page.offset}
        basePath={basePath}
        params={params}
      />
    </>
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />

      {summary}

      {aside ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">{list}</div>

          <Panel className="h-fit space-y-4 rounded-xl p-4">
            <div>
              <h3 className="text-foreground font-semibold tracking-tight">{aside.title}</h3>
              <p className="text-muted mt-1 text-xs leading-5">{aside.description}</p>
            </div>

            {aside.form}
          </Panel>
        </div>
      ) : (
        list
      )}
    </div>
  );
}
