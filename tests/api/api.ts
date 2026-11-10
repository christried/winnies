import type { SignedInOwner } from "../support/owner";
import { inject } from "vitest";

declare module "vitest" {
  export interface ProvidedContext {
    // The built server under test, started once by global-setup.ts.
    serverUrl: string;
  }
}

/**
 * A request to the server under test, optionally as a signed-in Owner. No assertions here.
 *
 * @param path the path on the server, such as `/api/winnies`
 * @param options the Owner to sign in as, the method, and a JSON body
 * @param options.as the Owner whose session cookie is sent
 * @param options.method the HTTP method, GET unless given
 * @param options.json a body, sent as JSON
 * @returns the raw response
 */
export function api(path: string, options: { as?: SignedInOwner; method?: string; json?: unknown } = {}): Promise<Response> {
  const headers = new Headers(options.as?.headers);
  if (options.json !== undefined) {
    headers.set("content-type", "application/json");
  }
  return fetch(new URL(path, inject("serverUrl")), {
    method: options.method,
    headers,
    body: options.json === undefined
      ? undefined
      : JSON.stringify(options.json),
  });
}
