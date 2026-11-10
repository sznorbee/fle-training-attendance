export type RawSearchParams = Record<string, string | string[] | undefined>;

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parses a positive integer id from a query-string value. */
export function idParam(value: string | string[] | undefined): number | undefined {
  const id = Number(firstValue(value));
  return Number.isInteger(id) && id > 0 ? id : undefined;
}
