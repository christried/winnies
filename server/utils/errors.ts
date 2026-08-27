import type { ZodError } from "zod";
import { z } from "zod";

/**
 * Transforms a validation error into a proper 422 to send to the client.
 * @param error The error object generated from a request.
 */
export function throwValidationError(error: ZodError): never {
  const { fieldErrors } = z.flattenError(error);
  const summary = z.prettifyError(error);

  throw createError(
    {
      statusCode: 422,
      statusMessage: summary,
      data: {
        message: summary,
        fieldErrors,
      },
    },
  );
}
