import { fetchApiData } from "@/utils/fetchApiData";

export function enrollAffiliate() {
  return fetchApiData("/affiliates/enroll", { method: "POST", body: "{}" });
}
export function requestWithdrawal(amountCents: number) {
  return fetchApiData("/affiliates/withdrawals", { method: "POST", body: JSON.stringify({ amountCents }) });
}
