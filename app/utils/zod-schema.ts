import type { TypedSchema } from "vee-validate";
import type { z, ZodType } from "zod";

/**
 * Adapts a Zod schema to vee-validate's typed-schema contract.
 * @param schema Any Zod schema
 * @returns A typed schema returning the parsed values, or errors grouped by field path.
 */
export function zodSchema<T extends ZodType>(schema: T): TypedSchema<z.input<T>, z.output<T>> {
  return {
    __type: "VVTypedSchema",
    async parse(values) {
      const result = await schema.safeParseAsync(values);

      if (result.success)
        return { value: result.data, errors: [] };

      // Zod reports one issue per problem; vee-validate wants them grouped per field.
      const byPath = new Map<string, string[]>();

      for (const issue of result.error.issues) {
        const path = issue.path.map(String).join(".");
        byPath.set(path, [...byPath.get(path) ?? [], issue.message]);
      }

      return { errors: [...byPath].map(([path, errors]) => ({ path, errors })) };
    },
  };
}
