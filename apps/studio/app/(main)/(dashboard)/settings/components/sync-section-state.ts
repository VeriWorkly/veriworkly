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
      ? "Back up new and changed documents to your account automatically."
      : "Sign in to back up your documents to your account.",
  };
}
