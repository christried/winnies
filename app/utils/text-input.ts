/**
 * What the counter of a text input shows and whether it is over the limit. The length is the string's UTF-16 length,
 * as zod's `.max` counts it, so the counter turns Cherry exactly when the validation would refuse.
 * @param value the text in the input
 * @param limit the most characters the field allows
 * @returns the `n / limit` text and whether `n` is above the limit (at the limit is not over)
 */
export function counterState(value: string, limit: number): { text: string; over: boolean } {
  return { text: `${value.length} / ${limit}`, over: value.length > limit };
}

/**
 * The value a number input hands to `v-model`: a number when the raw text parses, else `""`. `""` is today's contract:
 * the add row's zod `preprocess` maps it to `undefined`.
 * @param raw the native input's `value`
 * @returns the number, or `""` for an empty or unparsable string
 */
export function numberValue(raw: string): number | "" {
  if (raw === "")
    return "";
  const n = Number(raw);
  return Number.isNaN(n)
    ? ""
    : n;
}
