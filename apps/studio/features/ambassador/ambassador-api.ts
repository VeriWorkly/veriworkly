import { fetchApiData } from "@/utils/fetchApiData";

export function applyAmbassador(collegeName: string, graduationYear: string) {
  return fetchApiData("/ambassador/apply", {
    method: "POST",
    body: JSON.stringify({ collegeName, graduationYear }),
  });
}
