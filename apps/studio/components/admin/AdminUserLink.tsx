import type { ReactNode } from "react";
import Link from "next/link";

import type { AdminUserRef } from "@/features/admin/types/admin-types";

/**
 * Billing and affiliate rows outlive the account they belonged to. The server sends such a row's
 * user as a placeholder (`deleted: true`, id `"deleted"`) or, on older lists, as `null`.
 */
export function isDeletedAccount(user: AdminUserRef | null | undefined) {
  return !user || user.deleted === true;
}

/** The account a row belongs to, linked to its admin page; a deleted account links nowhere. */
const AdminUserLink = ({
  user,
  href,
  detail,
  emptyLabel = "Deleted account",
}: {
  user: AdminUserRef | null;
  /** Defaults to the user's admin page. */
  href?: string;
  /** The second line; defaults to the email. */
  detail?: ReactNode;
  /** Said for a row with no account at all; a deleted account's placeholder is always "Deleted account". */
  emptyLabel?: string;
}) => {
  if (!user) return <span className="text-muted text-xs">{emptyLabel}</span>;
  if (isDeletedAccount(user)) return <span className="text-muted text-xs">Deleted account</span>;

  return (
    <div className="min-w-0">
      <Link
        href={href ?? `/admin/users/${encodeURIComponent(user.id)}`}
        className="text-foreground font-medium hover:underline"
      >
        {user.name || user.email}
      </Link>
      <p className="text-muted truncate text-xs">{detail ?? user.email}</p>
    </div>
  );
};

export default AdminUserLink;
