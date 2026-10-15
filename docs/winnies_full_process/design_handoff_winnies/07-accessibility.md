# 07 · Accessibility

Targets (from the brief, final): WCAG 2.2 AA for all text and controls. **Stricter** for timers, the Overlay and focus rings: timers and all Overlay text ≥ 7:1 (AAA), focus ring ≥ 4.5:1 against every surface it can sit on, control boundaries ≥ 3:1. Decoration and motion never carry meaning alone.

## Contrast (computed from `tokens/winnies-tokens.css` v1.2)
Ratios are WCAG 2.x relative-luminance ratios, foreground / background hex shown. All pairs pass.

| Foreground on background | Use | Target | Light | Dark |
|---|---|---|---|---|
| `color-text` on `color-surface` | Body text on cards | 4.5 | **11.82** pass (#4A2B3A / #FFF8FB) | **13.21** pass (#FFEEF5 / #352230) |
| `color-text` on `color-page` | Body text on page | 4.5 | **10.28** pass (#4A2B3A / #FFE3EC) | **15.67** pass (#FFEEF5 / #231520) |
| `color-text` on `color-surface-sunken` | Text in wells / inputs | 4.5 | **10.28** pass (#4A2B3A / #FFE3EC) | **15.00** pass (#FFEEF5 / #2A1823) |
| `color-text` on `color-surface-raised` | Menus, toasts, popovers | 4.5 | **12.37** pass (#4A2B3A / #FFFFFF) | **9.88** pass (#FFEEF5 / #4A3644) |
| `color-text-muted` on `color-surface` | Secondary text on cards | 4.5 | **6.05** pass (#7A5566 / #FFF8FB) | **7.06** pass (#CFA9BB / #352230) |
| `color-text-muted` on `color-page` | Secondary text on page | 4.5 | **5.26** pass (#7A5566 / #FFE3EC) | **8.37** pass (#CFA9BB / #231520) |
| `color-text-muted` on `color-surface-sunken` | Placeholder, counter target | 4.5 | **5.26** pass (#7A5566 / #FFE3EC) | **8.02** pass (#CFA9BB / #2A1823) |
| `color-text-muted` on `color-surface-raised` | Menu meta, toast secondary | 4.5 | **6.33** pass (#7A5566 / #FFFFFF) | **5.28** pass (#CFA9BB / #4A3644) |
| `color-text-accent` on `color-surface` | Links, accent text on cards | 4.5 | **6.44** pass (#B0175A / #FFF8FB) | **8.88** pass (#FFB3D2 / #352230) |
| `color-text-accent` on `color-page` | Links on page | 4.5 | **5.60** pass (#B0175A / #FFE3EC) | **10.53** pass (#FFB3D2 / #231520) |
| `color-running-text` on `color-running-surface` | Running row timer (AAA rule) | 7 | **7.56** pass (#80103F / #FFD2E5) | **8.01** pass (#FFB3D2 / #4A2238) |
| `color-running-text` on `color-surface-sunken` | Running Total Timer in its well (AAA rule) | 7 | **8.46** pass (#80103F / #FFE3EC) | **10.08** pass (#FFB3D2 / #2A1823) |
| `color-won-text` on `color-won-surface` | Won row timer (AAA rule) | 7 | **7.78** pass (#1F5233 / #D6F5E0) | **9.32** pass (#A8EFC2 / #1E3A2A) |
| `color-won-text` on `color-surface-sunken` | Complete Total Timer (AAA rule) | 7 | **7.54** pass (#1F5233 / #FFE3EC) | **12.60** pass (#A8EFC2 / #2A1823) |
| `color-text` on `color-running-surface` | Game name on running row | 7 | **9.19** pass (#4A2B3A / #FFD2E5) | **11.92** pass (#FFEEF5 / #4A2238) |
| `color-text` on `color-won-surface` | Game name on Won row | 7 | **10.60** pass (#4A2B3A / #D6F5E0) | **11.10** pass (#FFEEF5 / #1E3A2A) |
| `color-text` on `color-surface-sunken` | Paused Total Timer (AAA rule) | 7 | **10.28** pass (#4A2B3A / #FFE3EC) | **15.00** pass (#FFEEF5 / #2A1823) |
| `color-text` on `color-surface` | Overlay text on card (AAA rule) | 7 | **11.82** pass (#4A2B3A / #FFF8FB) | **13.21** pass (#FFEEF5 / #352230) |
| `color-pinned-text` on `color-surface` | Pinned glyph + word | 4.5 | **6.11** pass (#6A44C9 / #FFF8FB) | **8.36** pass (#CDB8FF / #352230) |
| `color-danger-text` on `color-danger-surface` | Error toast / message | 4.5 | **6.28** pass (#A3123F / #FFE0E6) | **6.96** pass (#FF8FB8 / #4A1426) |
| `color-danger-text` on `color-surface` | Field error message | 4.5 | **7.39** pass (#A3123F / #FFF8FB) | **6.94** pass (#FF8FB8 / #352230) |
| `color-gone-text` on `color-gone-surface` | Gone state | 4.5 | **5.84** pass (#66575F / #F3ECF0) | **6.84** pass (#BBA9B3 / #2C2329) |
| `color-offline-text` on `color-offline-surface` | Offline banner | 4.5 | **5.44** pass (#7A5566 / #F3ECF0) | **7.28** pass (#CFA9BB / #2C2329) |
| `color-text` on `color-complete-surface` | Complete area | 4.5 | **11.23** pass (#4A2B3A / #FFF4CC) | **11.63** pass (#FFEEF5 / #3A3018) |
| `color-on-accent` on `color-accent` | Primary button, Running pill | 4.5 | **4.79** pass (#4A2B3A / #FF6FAE) | **4.79** pass (#4A2B3A / #FF6FAE) |
| `color-on-accent` on `color-won` | Won toggle, Won pill | 4.5 | **8.27** pass (#4A2B3A / #9BE3B4) | **8.27** pass (#4A2B3A / #9BE3B4) |
| `color-on-accent` on `color-pinned` | Pinned pill, avatar | 4.5 | **7.01** pass (#4A2B3A / #CDB8FF) | **7.01** pass (#4A2B3A / #CDB8FF) |
| `color-on-accent` on `color-complete` | Complete banner | 4.5 | **10.67** pass (#4A2B3A / #FFEFA1) | **10.67** pass (#4A2B3A / #FFEFA1) |
| `color-on-accent` on `color-ready` | Info toast icon, untouched | 4.5 | **8.57** pass (#4A2B3A / #A8DEFF) | **8.57** pass (#4A2B3A / #A8DEFF) |
| `color-on-accent` on `color-highlight-gold` | Overshoot sticker | 4.5 | **7.68** pass (#4A2B3A / #FFC23D) | **7.68** pass (#4A2B3A / #FFC23D) |
| `tooltip-text` on `tooltip-bg` | Tooltip | 4.5 | **11.82** pass (#FFF8FB / #4A2B3A) | **11.82** pass (#4A2B3A / #FFF8FB) |
| `color-control-lip` on `color-surface` | Control boundary (lip) on card · non-text | 3 | **3.66** pass (#B86A8E / #FFF8FB) | **3.92** pass (#A07890 / #352230) |
| `color-control-lip` on `color-page` | Control boundary on page · non-text | 3 | **3.18** pass (#B86A8E / #FFE3EC) | **4.65** pass (#A07890 / #231520) |
| `color-running-ring` on `color-surface` | Running ring on card · non-text | 3 | **3.85** pass (#D9478A / #FFF8FB) | **5.72** pass (#FF6FAE / #352230) |
| `color-running-ring` on `color-page` | Running ring on page · non-text | 3 | **3.34** pass (#D9478A / #FFE3EC) | **6.78** pass (#FF6FAE / #231520) |
| `color-focus` on `color-page` | Focus ring on page (stricter rule) | 4.5 | **5.32** pass (#6A44C9 / #FFE3EC) | **9.92** pass (#CDB8FF / #231520) |
| `color-focus` on `color-surface` | Focus ring on card (stricter rule) | 4.5 | **6.11** pass (#6A44C9 / #FFF8FB) | **8.36** pass (#CDB8FF / #352230) |
| `color-focus` on `color-surface-sunken` | Focus ring on wells | 4.5 | **5.32** pass (#6A44C9 / #FFE3EC) | **9.49** pass (#CDB8FF / #2A1823) |
| `color-focus` on `color-running-surface` | Focus ring on running row | 4.5 | **4.75** pass (#6A44C9 / #FFD2E5) | **7.54** pass (#CDB8FF / #4A2238) |
| `color-focus` on `color-won-surface` | Focus ring on Won row | 4.5 | **5.48** pass (#6A44C9 / #D6F5E0) | **7.02** pass (#CDB8FF / #1E3A2A) |


| Player | Fill | Ink | Ratio |
|---|---|---|---|
| P1 | #FF7A1A | #4A2B3A | **4.74** |
| P2 | #0A7F86 | #FFFFFF | **4.78** |
| P3 | #3B5BFF | #FFFFFF | **5.09** |
| P4 | #8A3FFC | #FFFFFF | **5.00** |
| P5 | #9C5A22 | #FFFFFF | **5.39** |
| P6 | #5C7A12 | #FFFFFF | **4.94** |
| P7 | #4E5D7A | #FFFFFF | **6.62** |
| P8 | #C2298A | #FFFFFF | **5.28** |


Notes:
- Accents always take Cocoa ink (`--color-on-accent`), in both modes. Never white text on pastel.
- Muted text is only used ≥ 13px/800 or ≥ 15px/500.
- Disabled controls (opacity .45) are exempt from contrast per WCAG, but every disabled control that needs explaining uses `aria-disabled` + a visible reason instead (add row at 50, Twitch “Soon”, locked event switches).
- **Overlay over gameplay:** the card is opaque, so all text pairs above apply. The light card (default) separates from any footage: Cocoa keyline vs white footage 12.4:1, Milk card vs black footage 20.07:1. **Dark card caveat:** on very dark footage the Night card (#352230) vs black is only 1.42:1, and the black keyline doesn’t help. Content still reads (AAA text), but the card edge doesn’t. Proposed fix (not in the prototypes): in dark, add an outer 2px ring in `--color-control-lip` (#A07890, 5.58:1 on black). See Q7.
- Players: always colour + number/initial; over gameplay a 3px surface ring + 1px keyline.

## Non-colour cues (every state has a shape/icon/word)
Idle: raised pill, Ready/Snooze face, `play_arrow`, word “Idle” for screen readers · Running: pink ring + `timer` badge + Running pill + pink timer · Won: Matcha, `check_circle`, filled check, ★ sticker, sorted last, word “Won” · Pinned: tape + `push_pin` + sorted first + “Pinned” · Complete: Butter banner, `emoji_events`, “Complete” · Gone: dashed outline, no lip, `link_off` · Error: Cherry ring + `error` + message · Offline: `cloud_off` + freshness line · Loading: spinner + `aria-busy` + “Loading…”.

## Motion and timing
- `prefers-reduced-motion` **and** an in-app toggle (`data-motion="reduce"`) turn all animation off; every moment lands on a readable end state (04 · reduced column).
- Anything that moves for more than 5 s has a pause: the Landing demo has an Autoplay switch and the video has Pause (WCAG 2.2.2). The Overlay is exempt (not interactive; it is the content being broadcast), but the Owner can choose Calm.
- No flashes faster than 3 per second (2.3.1). The Timeboxed vignette pulses once per second at most.
- Toasts: success 4 s, info 5 s, both pause on hover/focus; errors are sticky. Nothing important exists only in a timed toast (Undo also lives in the row menu / Ctrl+Z proposal).

## Screen readers
- Timers: `role="timer"` with a static label (“Total Timer”, “Challenge Timer, {game}”); digits `aria-hidden`; a visually hidden copy updates once per minute and on start/pause so readers aren’t told every second.
- Live regions (one polite region per page): Won and Complete (“Elden Ring Won. 4 / 8 won.”), Winnie paused/started, copy results, keyboard reorder steps (“Super Mario 64 picked up. Position 2 of 8.” … “Dropped at position 3.”), Shared View state changes (Reconnecting / Back live, not the seconds counter).
- Icon-only buttons have `aria-label` + tooltip. Decorative icons, faces, Nini (except when it is a button), confetti, sparkles and the backdrop are `aria-hidden`.
- Win toggle: `role="switch"` + `aria-checked`. Menus: `role="menu"` + `menuitem` (share menu is `role="dialog"` because it contains inputs/links). Modals: `role="dialog" aria-modal="true" aria-labelledby`.
- Wordmark: `aria-label="winnies"`; the nav wordmark link: “winnies, go to your Workspace”.
- `lang` on `<html>` follows the language setting (en / de).

## Focus order · Workspace (`/`, signed in)
Skip link first (“Skip to Challenges”, proposal), then document order:
1. **Nav:** wordmark link → Switch Winnie (opens picker) → Report an issue → Create Winnie → Share (opens share menu) → Account (opens account menu).
2. **Winnie summary:** Winnie title (button; Enter = rename, also double-click) → Start/Pause Winnie → More Winnie options.
   *(Complete: Share the win → Run it again replace Start/Pause.)*
3. **Add row:** Game → Win Condition → counter switch → Target (when on) → Add Challenge. At 50: inputs skipped (`aria-disabled` stays focusable only for the explanation link “start a new Winnie”).
4. **Challenge list,** top to bottom in sorted order (Pinned, open, Won). Per row: drag handle (6a keyboard reorder) → game name (click-to-edit button) → Decrease → count (input) → Increase → Start/Pause → Mark Won → More options for {game}. Rows are `<li>`; Tab moves between controls, not rows.
5. **Footer:** Imprint → Privacy Policy → Changelog → GitHub.
6. **Toasts** are not in the tab sequence until they contain an action; sticky error toasts with an action receive focus only if triggered by the user’s own action (e.g. failed save after pressing Save). F6 (proposal) cycles nav → main → toasts.

Rules: after adding a Challenge focus stays in the Game input (cleared) for fast entry · after deleting a row focus moves to the next row’s More button (or the previous, or the add row) · after Won travel focus follows the row to its new position · after reordering by keyboard focus stays on the grip · menus return focus to their trigger on close.

## Focus order · Menus
Open with Enter/Space/ArrowDown on the trigger; focus goes to the current or first item. ArrowUp/Down move (wrap), Home/End jump, type-ahead by first letter, Enter/Space activate, Esc closes and returns focus to the trigger, Tab closes and moves on. Share menu (dialog): Shared View Copy → Open in a new tab → Overlay Copy → Open in a new tab; Esc closes. Account menu: theme radiogroup uses arrow keys within the group.

## Focus order · Modals
- **Create Winnie:** focus lands in “Winnie name” → Cancel → Create Winnie (→ close ✕ if shown). Enter in the field submits, Esc cancels. Trap focus; return focus to the Create Winnie trigger on close. Quota state: focus lands on “Got it”. Busy: field + buttons `disabled`, focus stays on the primary (`aria-busy`), Esc ignored.
- **Delete Winnie:** focus lands on **Cancel** (the safe action) → Delete Winnie. Esc = Cancel. Busy: everything locked, Esc ignored. Error: message is announced (`role="alert"`), primary becomes Try again and receives focus. After a successful delete, focus goes to the Winnie picker trigger.
- **Delete Challenge:** same as Delete Winnie.
- Scrim click = Cancel except while busy. Background gets `inert`.

## Keyboard shortcuts (proposals, not in prototypes)
Space on a focused row = start/pause · W = Mark Won · P = Pin · N = focus Game input. Only when focus is inside the list, never while typing.
