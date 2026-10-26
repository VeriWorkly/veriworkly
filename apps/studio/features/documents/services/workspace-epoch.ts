/**
 * Counts how often this tab's workspace was cleared (sign-out, account deletion, a clear in
 * another tab). An async sync or cloud pull reads it before its first await and drops its
 * writes when it has changed since: a reply that lands after sign-out belongs to the previous
 * user and must not repopulate the device.
 */
let epoch = 0;

export function getWorkspaceEpoch() {
  return epoch;
}

export function bumpWorkspaceEpoch() {
  epoch += 1;
}
