// The test-only driver configuration, one source of truth for both places that need it: the server
// under test (through neon-local-preload.mjs) and the Vitest process (tests/support/db.ts).
//
// Why it exists: the Neon `Pool` at its defaults always dials wss://<host>/v2 on port 443. Neither
// local proxy image answers there, so the test database (Postgres plus the proxy of
// compose.test.yaml) needs the driver pointed at it. Nothing under server/ does this and no shipped
// build can load this file.

// The proxy's published port on the host (compose.test.yaml). The host in the connection string is
// ignored by this proxy, so TEST_DATABASE_URL uses localhost and needs no DNS.
const PROXY_ADDRESS = "127.0.0.1:4444";

/**
 * Points a Neon driver's `neonConfig` at the local proxy.
 *
 * @param neonConfig the `neonConfig` export of the driver module instance that is to be configured
 */
export function applyNeonLocalConfig(neonConfig) {
  neonConfig.useSecureWebSocket = false;
  neonConfig.wsProxy = () => `${PROXY_ADDRESS}/v1`;
}
