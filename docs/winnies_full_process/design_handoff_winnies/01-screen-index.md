# 01 · Screen index

Every screen and state, named **Surface · State · mode**. Every state exists in **light and dark** unless noted. Each row gives the board file and the frame ID, so you can find it in `reference/prototype/` (open the board `.dc.html` file in a browser, then search for the ID badge). Every frame is a working prototype running its real motion: you can click, type, drag and open menus.

Static images of every row below are in `screenshots/` (same IDs).

Widths: Workspace, Shared View, Landing, Changelog at **1440**. Overlay at **1920 × 1080** on a transparent page, always previewed over a gameplay stand-in. Mobile is out of scope.

Scope labels: **Core** = the functionality brief, build now. **6a** = planned features with full designs. **6b** = future proposals (design direction only, rules not final).

## Workspace (`/`, signed in) · dialect Workspace · Core
Board: `Workspace States.dc.html` (frames 01–12) and `Modals and Sign-in.dc.html` (13–16). Implementation reference: `WinniesWorkspace.dc.html` (prop `scenario`).

| ID | Name | What it shows |
|---|---|---|
| 01 | Workspace · Loading · light / dark | Skeleton summary + rows with shimmer. Only shown if a load takes longer than 200 ms. |
| 02 | Workspace · No Winnies yet · light / dark | First sign-in welcome: “Welcome, kittyspeedruns!”, three numbered steps, leads straight to Create Winnie. |
| 03 | Workspace · No Challenges · light / dark | Fresh Winnie. Empty list card points to the add row (“Create your first Challenge”). |
| 04 | Workspace · Mid-run · light / dark | Sample data. Elden Ring Pinned + Running, Total Timer 14:32:07 ticking, 3 / 8 won · 38%, Nini at the fatigue stage of the longest-running Challenge. |
| 05 | Workspace · Everything paused · light / dark | Total Timer paused, “Paused” pill, faces and Nini asleep (Snooze). |
| 06a | Workspace · Inline edit, rename Winnie · light / dark | Title becomes an input. Enter saves, Esc cancels, counter of 30. |
| 06b | Workspace · Inline edit, Challenge · light / dark | Row expands into an edit card: Game, Win Condition, Target, Cancel / Save. |
| 06c | Workspace · Inline edit, field error · light / dark | Empty Game on save: Cherry ring, shake, “Add a game name to save this Challenge.” |
| 07 | Workspace · Dragging mid-reorder · light / dark | Lifted row (tilt + scale), dashed drop slot, siblings making room. |
| 08a | Workspace · Menu, Winnie picker · light / dark | 5 Winnies, name + created date dd.mm.yy, running marker, current ticked. |
| 08b | Workspace · Menu, Share · light / dark | Shared View and Overlay URLs, each with Copy and Open in a new tab; copy → “Copied”. |
| 08c | Workspace · Menu, Account · light / dark | Avatar, “Signed in as kittyspeedruns”, Theme (Light / Dark / Match system), Language, Settings, Sign out. |
| 08d | Workspace · Menu, Winnie overflow · light / dark | Rename, Duplicate Winnie, Reset all timers, Delete Winnie. |
| 08e | Workspace · Menu, Challenge overflow · light / dark | Edit, Add/Remove counter, Pin/Unpin, Reset timer, Duplicate, Delete. |
| 09 | Workspace · Limit reached · light / dark | 50 / 50 Challenges, add row locked with an explanation and a link to start a new Winnie. Tall frame (full list). |
| 10 | Workspace · Complete · light / dark | All Won, timers stopped, celebration fired once, Butter completion area (“Every Challenge Won!”, Share the win, Run it again), space reserved for statistics (see 6a · 05). |
| 11 | Workspace · Toasts in context · light / dark | Success, info, sticky error and the offline banner together. |
| 12 | Workspace · Long content · light / dark | ~80-character game and Win Condition, 30-character Winnie name. Wrapping and truncation rules. |
| 13a | Workspace · Create Winnie modal · light / dark | Empty field, placeholder, today’s quota. Enter submits, Esc cancels. |
| 13b | Workspace · Create Winnie, name required · light / dark | Submitted empty: field shakes, message says what to do. |
| 13c | Workspace · Create Winnie, name too long · light / dark | 39 / 30: counter turns Cherry while typing, message on submit. |
| 13d | Workspace · Create Winnie, daily quota reached · light / dark | 10 per 24 h used: the form is replaced by an explanation and “Got it”. |
| 13e | Workspace · Create Winnie, busy · light / dark | Field and buttons locked, spinner in the primary (“Creating…”). |
| 14a | Workspace · Delete Winnie modal · light / dark | “Delete Kitty vs. the world?” + “This also deletes its 8 Challenges. This cannot be undone.” |
| 14b | Workspace · Delete Winnie, busy · light / dark | Esc, scrim and Cancel locked until it finishes (“Deleting…”). |
| 14c | Workspace · Delete Winnie, error · light / dark | Nothing removed; primary becomes Try again. |
| 15a | Sign-in · Signed out · light / dark | Discord sign-in card in the app shell (used when a signed-in route is opened while signed out). |
| 15b | Sign-in · Redirecting · light / dark | Button pressed, spinner, “Redirecting to Discord…”. |
| 15c | Sign-in · Two providers · light / dark | Twitch beside Discord; while one redirects the other dims. |
| 16a | Error page · Not found · light / dark | “This page wandered off.” Unknown URL, shown with the signed-in header. |
| 16b | Error page · Something went wrong · light / dark | Server error. “Something broke on our side.” with error ref and Try again. |

Not drawn as separate frames but specified: browser tab title + favicon (see 04 · T09 and `assets/favicon/`), the theme wipe (R28), the Winnie switch transition (R26).

## Shared View (`/shared/:id`) · dialect Broadcast · Core
Board: `Shared View.dc.html`. Implementation reference: `SharedView.dc.html`.

| ID | Name | What it shows |
|---|---|---|
| 17a | Shared View · Loading · light / dark | Skeleton summary and rows, spinner in the freshness line. Copy link already works. |
| 17b | Shared View · Mid-run, Updated just now · light / dark | Sample data, “View only” marker, no controls. Silent snapshot every 5 s keeps it “just now”. |
| 17c | Shared View · New data arrives · light / dark | B01: gold ring + chip saying what changed (87 → 88, Started, Paused). Ring fades over 3 s. |
| 17d | Shared View · Updated 47s ago (stale) · light / dark | No snapshot for a while: Butter clock; timers keep counting from the last snapshot. |
| 17e | Shared View · Reconnecting… · light / dark | B02 banner over the header, content desaturates. Retry now → B03 “Back live” → catch-up highlight. |
| 17f | Shared View · Copy link, Copied! · light / dark | Button morphs to Matcha with a check and sparks; reverts after 2 s. |
| 17g | Shared View · Clipboard failure · light / dark | Link gets selected and ringed; sticky error toast with the original copy. |
| 17h | Shared View · No Challenges · light / dark | Winnie exists but is empty: “Nothing to watch yet”, Total 00:00, no state pill. |
| 17i | Shared View · Complete · light / dark | C05 on load: banner unfurls, rain, Total digits wave, gold ring. Fires once. |
| 17j | Shared View · Gone · light / dark | Deleted Winnie: “This Winnie doesn’t exist. / Does it? / Did it?” (the last two hop in turn), Make your own Winnie. |

## Overlay (`/shared/:id/overlay`) · dialect Broadcast · Core
Board: `Overlay.dc.html`. Implementation reference: `OverlayFrame.dc.html` (props `scenario`, `placement` corner|sidebar, `bg` bright|dark|busy, `theme`, `reduced`). Every state is drawn in **2 placements × 3 gameplay backgrounds**. The card is **light by default**; the dark card is a Tweak on the board (Owner setting later).

| ID | Name | What it shows |
|---|---|---|
| 18·0 | Overlay · Placement and phone test | Corner widget (660 wide, bottom-right, 48 px safe margin) vs full-height sidebar (520 wide). Scaled to a portrait and a fullscreen phone to prove the glance layer reads. Type-size table. |
| 18a | Overlay · Loading · corner / sidebar | Skeleton header and rows, spinner + “Loading…” in the Total well. Card enters with B07. |
| 18b | Overlay · Single page (≤ 5 Challenges) · corner / sidebar | No page dots, nothing rotates. Running row: pink ring + timer badge, fatigue face. |
| 18c | Overlay · Page 1 of 2 and rotation · corner / sidebar | 8 Challenges, 5 per page. Active dot fills over 10 s, rows flip (B04). |
| 18d | Overlay · A Challenge just Won · corner / sidebar | Card hop, row jelly + fountain, WON! stamp, won count 3 → 4, Total stops, row sorts down. Rotation holds while the stamp shows. |
| 18e | Overlay · Complete, entrance · corner / sidebar | C03: banner drops, card jellies, side cannons, full-canvas rain, Total turns Matcha. Once per Winnie. |
| 18f | Overlay · Complete, sustained · corner / sidebar | Rest of the session: gold ring breathes, sparkles, banner wobble, trophy Total. Pages keep rotating through the Won list. |
| 18g | Overlay · Calm preset · corner / sidebar | `data-motion-preset="calm"`: no float, no row ticks, fades instead of flips, no particles. Total still hops 4 px. |
| 18h | Overlay · Gone · corner / sidebar | “This Winnie doesn’t exist (anymore).” Mist card, dashed outline, keyline kept. Sidebar collapses to the top. |
| 18i | Overlay · Long game names · corner / sidebar | ~80 chars: names wrap to 2 lines then ellipsize; Win Conditions 1 line; timers and counters never shrink. |

## Landing (`/`, signed out) · dialect Showcase · Core
Board: `Landing.dc.html`. Implementation: `LandingPage.dc.html`, link previews `OGCard.dc.html`.

| ID | Name | What it shows |
|---|---|---|
| 19a | Landing · light / dark | Nav, hero + Nini (320 px) + 136 px wordmark, video slot, How it works, example run (Workspace card, Overlay over gameplay, Shared View, all synced), Made for going live, final CTA, footer. ~6900 px tall. |
| 19b | Landing · reduced motion · light / dark | Every animation off, video doesn’t autoplay, demo still changes data without movement. |
| 19c | Landing · Hero video slot | Video spec (files, poster, controls, WCAG 2.2.2 pause, muted). |
| 19d | Link-preview cards (og:image) | 1200 × 630: Landing light/dark, Shared Winnie running / Complete dark / 30-char name. |
| 19e | Landing · Motion and sound notes | S03–S06 moments (see 04). |

## Changelog (`/changelog`) · dialect Showcase · Core
Board: `Changelog.dc.html` (frames are labelled 18a/18b in that file; called CL-a/CL-b here to avoid clashing with the Overlay). Implementation: `ChangelogPage.dc.html`.

| ID | Name | What it shows |
|---|---|---|
| CL-a | Changelog · Releases · light / dark | Hero + Nini, sticky rail with scroll spy, “What’s next?”, release cards 0.9.2 / 0.9.0 / 0.4.0. Markdown element spec on the board. |
| CL-b | Changelog · Not found · light / dark | Markdown failed to load. Try again fails once with a shake, then succeeds. |

## Planned features · 6a
Board: `P6a Planned Features.dc.html`. Implementations: `WorkspaceP6.dc.html`, `WinnieSettings.dc.html`, `CompletionStats.dc.html`, `SharedViewP6.dc.html`, `OverlayFrameP6.dc.html`. All light + dark.

| ID | Name | What it shows |
|---|---|---|
| 01a | Workspace · Settings, Players | Settings is a second tab next to Challenges (never pushes the run off screen). |
| 01b | Workspace · Settings entry from the Winnie menu | ⋯ → Winnie settings jumps to the tab. |
| 01c | Workspace · Settings, Game Mode reserved | Standard only; Gauntlet and Confirmation shown locked. |
| 02a | Workspace · Discord, empty | No webhook yet; event switches locked. |
| 02b | Workspace · Discord, invalid URL | Invite link pasted by mistake; message says where the real URL lives. |
| 02c | Workspace · Discord, saved | Masked hint, Replace, Remove, Send test message. |
| 02d | Workspace · Discord, test sent | Both events on, preview of the posted message, delivery log. |
| 02e | Workspace · Discord, test failed | Discord answered 404; resend shakes. |
| 02f | Workspace · Discord, repeated failures (Workspace) | Sticky toast with Fix it + badge on the Settings tab. |
| 02g | Workspace · Discord, repeated failures (Settings) | Alert banner, badge on the section, failed deliveries in the log. |
| 03a | Workspace · Overlay settings with live preview | Per page, timers, Calm, placement; each control updates a 1920 × 1080 preview and saves on its own. |
| 03b | Overlay · Output, sidebar, 3 per page, Calm, Players | OBS output with those settings. |
| 03c | Overlay · Output, corner, timers off | Rows tighten. |
| 04a–i | Shared View · Play this myself! | Button in the header → prompt (signed in / signed out round trip / redirecting / back from sign-in / name too long / copying / copy ready / daily quota). |
| 05a | Workspace · Completion statistics | Total, every Challenge ranked, fastest/slowest, counter totals, losses; sort re-ranks with FLIP. |
| 05b | Shared View · Completion statistics | Broadcast dialect: thicker keylines, bigger numbers. |
| 06a | Workspace · Loss counter, recording a loss | Optional per Challenge, never affects completion; Undo in the toast. |
| 06b | Workspace · Loss counter, switching it on | Track losses / Stop tracking losses in the Challenge menu. |
| 07a | Workspace · Counter overshoot | At target (green) vs over target (132 / 120, gold sticker, different well). |
| 08a | Workspace · Players, bench and markers | Player chips from the player palette, bench for unassigned; keyboard “Put on…” menu. |
| 08b | Workspace · Players, dragging a Player | Dropping off the list returns them to the bench. |
| 08c | Workspace · Players off | Switch in Settings; Workspace looks exactly like Core. |
| 09a | Workspace · Challenge notes, editing | 200 chars, note field in the inline editor, note button on rows. |
| 09b | Shared View · Challenge notes, revealed | Hover previews, click pins, Esc/click outside closes. |
| 10a | Workspace · Keyboard reordering | Grip focus, Space picks up, arrows move, Space drops, Esc cancels; live region announces. |
| 11a–f | Workspace · Deutsch | Mid-run, Challenge menu, language switch, Discord settings, Overlay settings, Complete — proves +30 % text fits. |

## Future features · 6b (proposals)
Board: `P6b Future Features.dc.html`. Implementations: `P6bWorkspace.dc.html`, `P6bShared.dc.html`, `P6bOverlay.dc.html`. Light + dark via the board’s theme Tweak.

| ID | Name | What it shows |
|---|---|---|
| 00a–c | Game Mode identity · Workspace / Shared View / Overlay | Ribbon under the Winnie name, mode meter on the progress line, House rules band (Shared View), ribbon tab (Overlay). |
| 01a | Workspace · Create Winnie, Game Mode picker | Five modes as a radio list + detail panel. “Generate one” lives in the second tab. |
| 02a–b | Confirmation mode · Workspace / Shared View | One Challenge confirms every win and never counts toward progress. |
| 03a–d | Gauntlet mode · last attempt / reset (Workspace, Shared View, Overlay) | Winnie-wide attempt pool; last loss resets everything. |
| 04a–c | Timeboxed mode · last minute (Workspace, Overlay) / Lost | Total counts down; zero = lost for good. |
| 05a–b | Cursed Incremental · Workspace / Shared View | Curse level raises Targets and adds rules on open rows. |
| 06a | Workspace · Randomizer wheel | Opens from the add row; genres take slices; result card. |
| 07a | Workspace · Linked Challenges | Chain played back-to-back; a loss resets the chain. |
| 08a–b | Workspace · Autocomplete (game / Win Condition with average time) | Suggestions never block typing your own text. |
| 09a | Workspace · Generate a Winnie | Time budget + genres → named Winnie with estimates; reroll. |
| 10a | Workspace · Archive | Deleting moves a Winnie here for 30 days; Restore. |

## Reference boards (not screens)
- `Winnies Design System.dc.html` — every component and foundation card.
- `Winnies Motion Spec.dc.html` — motion table + sound cues (data in `reference/motion/motion-spec.js`).
- `Winnies Motion Playground.dc.html` — every moment playable with tier toggles, reduced motion and a 1 / 10 / 60× clock.
