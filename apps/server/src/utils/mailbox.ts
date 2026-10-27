/** Providers that ignore dots in the local part: `j.o.e@gmail.com` reaches `joe@gmail.com`. */
const DOTLESS_DOMAINS: Record<string, string> = {
  "gmail.com": "gmail.com",
  "googlemail.com": "gmail.com",
};

/**
 * The mailbox an address delivers to, for throttle keys only (never for sending or for matching
 * accounts). Lowercased and trimmed; a `+tag` is dropped on every domain, since the big providers
 * deliver it to the untagged box; Gmail dots are dropped and googlemail.com folds into gmail.com
 * (V-253). Folding two real mailboxes together only makes the throttle stricter.
 */
export function canonicalMailbox(email: string): string {
  const address = email.trim().toLowerCase();
  const at = address.lastIndexOf("@");
  if (at <= 0) return address;

  let local = address.slice(0, at);
  let domain = address.slice(at + 1);

  local = local.split("+")[0] || local;
  const dotless = DOTLESS_DOMAINS[domain];
  if (dotless) {
    domain = dotless;
    local = local.replace(/\./g, "") || local;
  }

  return `${local}@${domain}`;
}
