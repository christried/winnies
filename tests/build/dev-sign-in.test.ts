import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The dev sign-in (server/dev/sign-in.ts) is for `pnpm dev` and the staging build (#235): the production
// build must not register its route anywhere. Run `pnpm build` first, then `pnpm test:build`; CI builds
// production. Which build carries it is carriesDevSignIn in stage.ts, covered in stage.test.ts.
const SERVER = resolve(import.meta.dirname, "../../.output/server");

describe("dev sign-in in the production build", () => {
  it("has no /api/dev/sign-in route", () => {
    // Every file, whatever its extension: a route can survive in a map or a manifest too.
    const files = readdirSync(SERVER, { recursive: true, encoding: "utf8" })
      .filter(file => statSync(join(SERVER, file)).isFile());
    // A missing build must fail loudly, never pass on nothing.
    expect(files.length).toBeGreaterThan(0);

    const carriers = files.filter(file => readFileSync(join(SERVER, file), "utf8").includes("/api/dev/sign-in"));
    expect(carriers).toEqual([]);
  });
});
