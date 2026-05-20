export function getAutoSyncControlState({
  autoSync,
  isLoggedIn,
  loading,
}: {
  autoSync: boolean;
  isLoggedIn: boolean;
  loading: boolean;
}) {
  return {
    checked: isLoggedIn && autoSync,
    disabled: loading || !isLoggedIn,
    description: isLoggedIn
      ? "Manage background synchronization."
      : "Sign in to enable background synchronization.",
  };
}
