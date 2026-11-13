/**
 * The tabler icons `UiTablerIcon` may render, until R3 deletes it. A new icon is a Material one: its name goes in
 * `MATERIAL_ICON_NAMES` (`app/utils/material-icons.ts`) and `UiIcon` draws it.
 */
export const ICONS = {
  plus: "tabler:plus",
  play: "tabler:player-play",
  pause: "tabler:player-pause",
  check: "tabler:check",
  more: "tabler:dots-vertical",
  grip: "tabler:grip-vertical",
  pin: "tabler:pin",
  share: "tabler:share-3",
  screenShare: "tabler:screen-share",
  cast: "tabler:cast",
  trophy: "tabler:trophy",
  eye: "tabler:eye",
  copy: "tabler:copy",
  chevron: "tabler:chevron-down",
  close: "tabler:x",
  minus: "tabler:minus",
  edit: "tabler:pencil",
  trash: "tabler:trash",
  duplicate: "tabler:copy-plus",
  reset: "tabler:rotate",
  bug: "tabler:bug",
  countOn: "tabler:abacus",
  countOff: "tabler:abacus-off",
  themeSystem: "tabler:device-desktop",
  themeLight: "tabler:sun",
  themeDark: "tabler:moon",
} as const;

/** Union of the local keys in {@link ICONS}. */
export type IconName = keyof typeof ICONS;
