import type { SignedInOwner } from "../support/owner";
import { describe, expect, it } from "vitest";
import { signInAsOwner } from "../support/owner";
import { api } from "./api";

function saveTheme(theme: unknown, as?: SignedInOwner) {
  return api("/api/user/theme", {
    as,
    method: "PUT",
    json: { theme },
  });
}

// The only read path is the session Better Auth hands out. Its cookie cache is on, yet a read right
// after a save shows the new value, so the read-back is not stale today.
async function readTheme(owner: SignedInOwner): Promise<string> {
  const session = await (await api("/api/auth/get-session", { as: owner })).json();
  return session.user.theme;
}

describe("the theme preference", () => {
  it("each of the three values saves and reads back", async () => {
    const owner = await signInAsOwner();

    for (const theme of ["light", "dark", "system"]) {
      const saved = await saveTheme(theme, owner);

      expect(saved.status).toBe(200);
      expect(await saved.json()).toEqual({ theme });
      expect(await readTheme(owner)).toBe(theme);
    }
  });

  it("a value outside the three is a validation error and the theme stays", async () => {
    const owner = await signInAsOwner();
    await saveTheme("dark", owner);

    const refused = await saveTheme("neon", owner);

    expect(refused.status).toBe(422);
    const body = await refused.json();
    expect(body.data.fieldErrors.theme).toHaveLength(1);
    expect(await readTheme(owner)).toBe("dark");
  });

  it("a body without a theme is a validation error and the theme stays", async () => {
    const owner = await signInAsOwner();
    await saveTheme("light", owner);

    const refused = await api("/api/user/theme", { as: owner, method: "PUT", json: {} });

    expect(refused.status).toBe(422);
    expect((await refused.json()).data.fieldErrors.theme).toHaveLength(1);
    expect(await readTheme(owner)).toBe("light");
  });

  it("a signed-out save is rejected and no Owner's theme changes", async () => {
    const owner = await signInAsOwner();
    await saveTheme("dark", owner);

    const rejected = await saveTheme("light");

    expect(rejected.status).toBe(401);
    expect(await rejected.text()).toContain("not signed in!");
    expect(await readTheme(owner)).toBe("dark");
  });

  it("one Owner's theme does not change another's", async () => {
    const owner = await signInAsOwner();
    const other = await signInAsOwner();
    await saveTheme("dark", other);

    await saveTheme("light", owner);

    expect(await readTheme(other)).toBe("dark");
  });
});
