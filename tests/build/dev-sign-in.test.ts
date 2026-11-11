import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEV_SIGN_IN_ROUTE } from "../../stage";

// The dev sign-in (server/dev/sign-in.ts) is for `pnpm dev` and the staging build (#235): the production
// build must not register its route anywhere. Run `pnpm build` first, then `pnpm test:build`; CI builds
// production. Which build carries it is carriesDevSignIn in stage.ts, covered in stage.test.ts.
const SERVER = resolve(import.meta.dirname, "../../.output/server");

// The route comes from stage.ts, where nuxt.config.ts takes it too, so renaming it cannot leave this test
// looking for the old name. The email domain is the handler's own code: a build that still carries the
// handler under another route would show it.
const MARKERS = [DEV_SIGN_IN_ROUTE, "dev.winnies.invalid"];

describe("dev sign-in in the production build", () => {
  it.each(MARKERS)("carries no %s anywhere in .output/server", (marker) => {
    // Every file, whatever its extension: a route can survive in a map or a manifest too.
    const files = readdirSync(SERVER, { recursive: true, encoding: "utf8" })
      .filter(file => statSync(join(SERVER, file)).isFile());
    // A missing build must fail loudly, never pass on nothing.
    expect(files.length).toBeGreaterThan(0);

    const carriers = files.filter(file => readFileSync(join(SERVER, file), "utf8").includes(marker));
    expect(carriers, `${marker} is in the build. Was it built with WINNIES_STAGE=staging (in the shell or in .env)? That build carries the dev sign-in on purpose: unset it and run \`pnpm build\` again.`).toEqual([]);
  });
});
