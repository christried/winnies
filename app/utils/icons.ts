/** Every icon the app is allowed to render. */
export const ICONS = {
  plus: "tabler:plus",
  play: "tabler:player-play",
  pause: "tabler:player-pause",
  check: "tabler:check",
  more: "tabler:dots-vertical",
  grip: "tabler:grip-vertical",
  pin: "tabler:pin",
  share: "tabler:share",
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
} as const;

/** Union of the local keys in {@link ICONS}. */
export type IconName = keyof typeof ICONS;
