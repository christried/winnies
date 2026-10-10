import { describe, expect, it } from "vitest";
import { themePreferenceSchema } from "../schemas/user";
import { nextThemePreference, themeAttribute } from "./theme";

describe("themeAttribute", () => {
  it("leaves the attribute off for system so the media query decides", () => {
    expect(themeAttribute("system")).toBeUndefined();
  });

  it("maps light and dark to their daisyUI themes", () => {
    expect(themeAttribute("light")).toBe("winter");
    expect(themeAttribute("dark")).toBe("abyss");
  });
});

describe("nextThemePreference", () => {
  it("cycles system → light → dark → system", () => {
    expect(nextThemePreference("system")).toBe("light");
    expect(nextThemePreference("light")).toBe("dark");
    expect(nextThemePreference("dark")).toBe("system");
  });
});

describe("themePreferenceSchema", () => {
  it("accepts system | light | dark", () => {
    for (const value of ["system", "light", "dark"])
      expect(themePreferenceSchema.safeParse(value).success).toBe(true);
  });

  it("rejects anything else", () => {
    expect(themePreferenceSchema.safeParse("purple").success).toBe(false);
    expect(themePreferenceSchema.safeParse("").success).toBe(false);
  });
});
