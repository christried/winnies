import type { ZodType } from "zod";
import { z } from "zod";

/**
 * Adapts a Zod schema to what vee-validate's validationSchema expects.
 * (Clankered this one because vee validate doesn't seem to be up to date with Zod 4 which i am using here)
 * @param schema Any Zod schema, usually one derived from a Drizzle table.
 * @returns A validator returning parsed values, or errors keyed by field path.
 */
export function zodSchema<T extends ZodType>(schema: T) {
  return async (values: unknown) => {
    const result = await schema.safeParseAsync(values);

    if (result.success)
      return { values: result.data, errors: {} };

    // flattenError gives Record<string, string[]>, which is the shape
    // vee-validate and setErrors both accept.
    return { values: {}, errors: z.flattenError(result.error).fieldErrors };
  };
}
