// The test-only driver configuration, one source of truth for both places that need it: the server
// under test (through neon-local-preload.mjs) and the test process (tests/support/db.ts).
//
// Why it exists: the Neon `Pool` at its defaults always dials wss://<host>/v2 on port 443. Neither
// local proxy image answers there, so the test database (Postgres plus the proxy of
// compose.test.yaml) needs the driver pointed at it. Nothing under server/ does this and no shipped
// build can load this file.

const PROXY_PORT = 4444;

// The only two hosts a test run may name, and where the proxy for each one is. A run empties the
// database it connects to, so it must only ever dial the local proxy, never a real database (#196).
//   localhost   the compose database (`pnpm test:db:up`): the proxy's published port, on this machine.
//   neon-proxy  the CI service of the container job (`e2e`), reached by its service name.
// The proxy ignores the host in the connection string; the host only decides which proxy is dialled.
const PROXIES = { "localhost": "127.0.0.1", "neon-proxy": "neon-proxy" };

/**
 * The proxy that belongs to a database host of TEST_DATABASE_URL
 *
 * @param host the host of the connection string
 * @returns the proxy's `host:port`, without protocol and path
 */
export function proxyAddress(host) {
  if (!Object.hasOwn(PROXIES, host)) {
    const allowed = Object.keys(PROXIES).map(name => `"${name}"`).join(" and ");
    throw new Error(`Refusing to dial "${host}": a test run only talks to the local test database, so the host of TEST_DATABASE_URL must be ${allowed}.`);
  }
  return `${PROXIES[host]}:${PROXY_PORT}`;
}

/**
 * Points a Neon driver's `neonConfig` at the local proxy.
 *
 * @param neonConfig the `neonConfig` export of the driver module instance that is to be configured
 */
export function applyNeonLocalConfig(neonConfig) {
  neonConfig.useSecureWebSocket = false;
  neonConfig.wsProxy = host => `${proxyAddress(host)}/v1`;
}
