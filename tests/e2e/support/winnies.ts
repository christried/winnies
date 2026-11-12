import type { Page } from "@playwright/test";
import { seedWinnie } from "../../support/owner-api";

/** A Winnie with one Speedrun Challenge, made as the Owner: the smallest thing with a Shared View and an Overlay. */
export function seedSpeedrunWinnie(ownerPage: Page, name: string) {
  return seedWinnie(ownerPage.request, {
    name,
    challenges: [
      { game: "Speedrun" },
    ],
  });
}
