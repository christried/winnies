import { afterEach, describe, expect, it, vi } from "vitest";
import { readTestEnv } from "../tests/support/env";
import { applyNeonLocalConfig, proxyAddress } from "../tests/support/neon-local.mjs";

// A test run empties the database it connects to, so it may only ever dial the local proxy (#196).
// Lives here because `pnpm test` is the one run that does not need the database or the build.
describe("the test database address", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("dials the published proxy for the compose database", () => {
    expect(proxyAddress("localhost")).toBe("127.0.0.1:4444");
  });

  it("dials the proxy service by name for the CI database", () => {
    expect(proxyAddress("neon-proxy")).toBe("neon-proxy:4444");
  });

  it("refuses any other host and names it and the two that are allowed", () => {
    expect(() => proxyAddress("ep-cool-darkness-123456.eu-central-1.aws.neon.tech")).toThrow(
      /ep-cool-darkness-123456\.eu-central-1\.aws\.neon\.tech.*"localhost".*"neon-proxy"/,
    );
  });

  it("hands the driver the same answer", () => {
    const neonConfig = {};
    applyNeonLocalConfig(neonConfig);
    expect(neonConfig.useSecureWebSocket).toBe(false);
    expect(neonConfig.wsProxy("neon-proxy", 5432)).toBe("neon-proxy:4444/v1");
    expect(() => neonConfig.wsProxy("example.com", 5432)).toThrow(/example\.com/);
  });

  it("stops a run before anything is emptied when TEST_DATABASE_URL names another host", () => {
    vi.stubEnv("TEST_DATABASE_URL", "postgres://user:password@ep-cool-darkness-123456.neon.tech/winnies_test");
    expect(() => readTestEnv()).toThrow(/ep-cool-darkness-123456\.neon\.tech/);
  });

  it("accepts both allowed hosts", () => {
    vi.stubEnv("TEST_DATABASE_URL", "postgres://postgres:postgres@localhost:5432/winnies_test");
    expect(() => readTestEnv()).not.toThrow();
    vi.stubEnv("TEST_DATABASE_URL", "postgres://postgres:postgres@neon-proxy:5432/winnies_test");
    expect(() => readTestEnv()).not.toThrow();
  });
});
