import { ApiError } from "#lib/errors";

/**
 * Refuses a destructive admin action whose typed confirmation (V-082) does not match the
 * identifier the admin list shows for the target. Exact after trimming: no case folding, since
 * the point is that the admin read the row they are about to destroy. An absent confirmation
 * passes until the studio always sends one.
 */
export function assertConfirmation(
  provided: string | undefined,
  expected: string,
  identifier: string,
): void {
  if (provided === undefined || provided.trim() === expected.trim()) return;

  throw new ApiError(400, `The confirmation does not match this ${identifier}.`, {
    code: "CONFIRMATION_MISMATCH",
    field: "confirm",
  });
}
