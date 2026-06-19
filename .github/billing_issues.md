# Issue 1: Checkout lock persists when user cancels checkout on Dodo Payments page

**Affected Apps / Packages**
- Studio (apps/studio)
- Server (apps/server)

**Description**
When a user clicks checkout, a lock key (`billing:checkout:userId`) is set in Redis to prevent double submissions. If the user cancels the checkout directly on the Dodo Payments page instead of returning to our app, this Redis key is never deleted. Consequently, the user is locked out of starting any new checkout process indefinitely, facing the error message "A billing checkout is already active. Complete it or try again soon." There is currently no check or automated expiry to release this lock if the session is abandoned or cancelled at the provider's side.

**Steps to Reproduce**
1. Log in and go to the billing page in Studio.
2. Select a plan and click checkout.
3. Once redirected to the Dodo Payments checkout page, click the cancel/return button on Dodo's page to abort.
4. Go back to the billing page in Studio and try to click checkout again.
5. Notice that you are blocked by the active checkout lock error message.

**Expected Behavior**
If a user cancels the payment on the external provider page or abandons the checkout session, the lock should be released. Alternatively, we should provide a way to clear the lock (either via a retry button on the UI, or by letting the lock expire automatically in Redis after a short duration).

**Proposed Fix / Suggestions**
- Set a TTL (e.g., 5-10 minutes) on the Redis checkout lock key `billing:checkout:userId` when creating a checkout session so it automatically expires.
- Provide a "Try again" or "Reset checkout" button in the Billing UI that makes a call to a new backend endpoint (like `POST /billing/cancel-checkout`) to manually delete the Redis lock key.

---

# Issue 2: Incorrect billing cycle updates and pricing catalog mismatches

**Affected Apps / Packages**
- Server (apps/server)

**Description**
There are two main issues with the subscription billing period calculations and catalog alignment:
1. When a user subscribes to an Annual plan, the system registers the next billing date for the next month instead of the next year. This happens because the date calculation in the backend defaults to adding 1 month regardless of the interval type.
2. The pricing database catalog does not match the actual business rules specified in `pricing.md` (e.g., correct pricing and credit allowances for the 1-Day, 7-Day, Monthly, and Annual plans). The webhook event handling also relies on hardcoded provider product IDs rather than metadata keys, which causes issues when using shared sandbox product IDs.

**Steps to Reproduce**
1. Select the Annual plan and complete the checkout.
2. Inspect the user profile page.
3. Observe that the next billing cycle/renewal date is set to 30 days out instead of 1 year out.
4. Inspect the granted AI credits and prices, and note that they do not match the values listed in `pricing.md`.

**Expected Behavior**
1. Annual subscriptions should set the next billing date to exactly one year from the start date.
2. Product catalog definitions (price and credit allowance) for all tiers (including 1-Day Pass, 7-Day Sprint, Monthly, and Annual Pro/Bundle) must match the specs in `pricing.md`.
3. Webhook handling should use metadata tags (`veriworkly_product` and `veriworkly_interval`) to resolve the product key and interval, rather than falling back solely to product IDs which might be identical in development/sandbox environments.

**Proposed Fix / Suggestions**
- Update the date utility calculations in `billingService.ts` to properly add years/months/days depending on the subscription interval (`ANNUAL`, `MONTHLY`, `SEVEN_DAY`, `ONE_DAY`).
- Update `productCatalog.ts` prices and credits to align with `pricing.md`.
- Read product metadata from the Dodo Payments webhook payload to identify the purchased plan and interval safely.
