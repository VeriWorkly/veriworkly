"use client";

import {
  Eye,
  Key,
  Trash2,
  Loader2,
  KeyRound,
  Calendar,
  RefreshCw,
  ShieldOff,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge, Button, Card, Menu, MenuItem, MenuSeparator } from "@veriworkly/ui";

import type { ApiKeyRecord } from "./ApiKeyTypes";

type ApiKeyListProps = {
  keys: ApiKeyRecord[];
  page: number;
  totalPages: number;
  hasMore: boolean;
  loading: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onRotate: (key: ApiKeyRecord) => void;
  onDelete: (key: ApiKeyRecord) => void;
  onRevoke: (key: ApiKeyRecord) => void;
};

export default function ApiKeyList({
  keys,
  page,
  totalPages,
  hasMore,
  loading,
  onPrevPage,
  onNextPage,
  onRotate,
  onDelete,
  onRevoke,
}: ApiKeyListProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-accent/50 h-8 w-8 animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="border-accent/20 bg-accent/5 rounded-xl border border-dashed py-12 text-center">
          <Key className="text-muted-foreground/30 mx-auto mb-3 h-12 w-12" />
          <p className="text-muted-foreground">No API keys found. Generate one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {keys.map((key) => {
            const href = `/api-keys/${key.id}`;
            const statusClass = key.isActive
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300";

            return (
              <Card
                key={key.id}
                className={`border-border/70 hover:border-accent/30 flex flex-col justify-between overflow-visible rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${
                  key.isActive
                    ? "bg-card"
                    : "border-red-500/20 bg-red-500/3 opacity-85 hover:border-red-500/30"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex min-w-0 items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          key.isActive
                            ? "bg-accent/10 text-accent"
                            : "bg-red-500/10 text-red-600 dark:text-red-300"
                        }`}
                      >
                        <KeyRound className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={href}
                          className="text-foreground hover:text-accent line-clamp-2 text-sm leading-5 font-bold"
                        >
                          {key.name}
                        </Link>

                        <p className="text-muted-foreground mt-1 font-mono text-xs">
                          {key.keyPrefix} <span className="ml-1.5">...</span>
                        </p>
                      </div>
                    </div>

                    <Menu
                      size="sm"
                      panelClassName="z-50"
                      trigger={({ open, toggle }) => (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={toggle}
                          aria-expanded={open}
                          className="hover:bg-muted/5 h-8 w-8 shrink-0 p-0"
                        >
                          <span className="sr-only">Open actions for {key.name}</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      )}
                    >
                      {({ close }) => (
                        <>
                          <MenuItem
                            onClick={() => {
                              close();
                              router.push(href);
                            }}
                          >
                            <Eye className="h-4 w-4" /> View details
                          </MenuItem>

                          {key.isActive && (
                            <>
                              <MenuItem
                                onClick={() => {
                                  close();
                                  onRotate(key);
                                }}
                              >
                                <RefreshCw className="h-4 w-4" /> Rotate
                              </MenuItem>
                              <MenuItem
                                onClick={() => {
                                  close();
                                  onRevoke(key);
                                }}
                              >
                                <ShieldOff className="h-4 w-4" /> Revoke
                              </MenuItem>
                            </>
                          )}

                          <MenuSeparator />

                          <MenuItem
                            onClick={() => {
                              close();
                              onDelete(key);
                            }}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </MenuItem>
                        </>
                      )}
                    </Menu>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </div>

                    <div className="text-muted-foreground">
                      {key.lastUsed
                        ? `Last used ${new Date(key.lastUsed).toLocaleDateString()}`
                        : "Never used"}
                    </div>
                  </div>
                </div>

                {!key.isActive && (
                  <p className="mt-2 rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
                    Disabled. Cannot authenticate requests.
                  </p>
                )}

                <div className="border-border/60 mt-3 flex items-center justify-between gap-3 border-t pt-2">
                  <Badge className={`shrink-0 px-2 py-0 text-[10px] ${statusClass}`}>
                    {key.isActive ? "Active" : "Revoked"}
                  </Badge>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2 text-xs"
                    onClick={() => router.push(href)}
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && keys.length > 0 && (
        <div className="border-border/40 mt-6 flex items-center justify-between border-t pt-4">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Page {page} of {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={onPrevPage}>
              Previous
            </Button>

            <Button size="sm" variant="ghost" disabled={!hasMore} onClick={onNextPage}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
