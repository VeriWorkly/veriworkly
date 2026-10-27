/** Next passes a repeated query key (`?search=a&search=b`) as an array, whatever the page's type says. */
export type SearchParamValue = string | string[] | undefined;

export function firstParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
