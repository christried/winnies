import type { FetchError } from "ofetch";

interface ApiErrorBody {
  message?: string;
  statusMessage?: string;
}

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";
const OFFLINE_MESSAGE = "You appear to be offline — that change was not saved.";

/**
 * Extracts a human-readable sentence out of whatever a failed request threw.
 *
 * @param error The thrown value from a catch block.
 * @param fallback Shown when the response carried nothing readable.
 * @returns The message to show the user.
 */
export function apiErrorMessage(error: unknown, fallback = FALLBACK_MESSAGE): string {
  const fetchError = error as FetchError<ApiErrorBody> | undefined;

  // funny check to see if user is offline
  if (!fetchError?.response && import.meta.client && !navigator.onLine)
    return OFFLINE_MESSAGE;

  return fetchError?.data?.message
    ?? fetchError?.data?.statusMessage
    ?? fallback;
}

/**
 * Reports a failed request to the user as an error toast.
 *
 * @param error The thrown value from a catch block.
 * @param fallback Shown when the response carried nothing readable.
 */
export function toastApiError(error: unknown, fallback = FALLBACK_MESSAGE): void {
  useToast().error(apiErrorMessage(error, fallback));
}
