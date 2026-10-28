import { ApiError } from "#lib/errors";

/**
 * Refuses a destructive admin action without the typed confirmation (V-082), or whose
 * confirmation does not match the identifier the admin list shows for the target. Exact after
 * trimming: no case folding, since the point is that the admin read the row they are about to
 * destroy. Callers run it before anything changes.
 */
export function assertConfirmation(
  provided: string | undefined,
  expected: string,
  identifier: string,
): void {
  if (provided === undefined || provided.trim() === "") {
    throw new ApiError(400, `Type this ${identifier} to confirm.`, {
      code: "CONFIRMATION_REQUIRED",
      field: "confirm",
    });
  }

  if (provided.trim() === expected.trim()) return;

  throw new ApiError(400, `The confirmation does not match this ${identifier}.`, {
    code: "CONFIRMATION_MISMATCH",
    field: "confirm",
  });
}
