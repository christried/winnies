# 03 · Component inventory

Every component is custom (no component library). Names are kebab-case and map 1:1 to Vue SFCs (`<WButton>` → `w-button.vue`, or your own prefix). The plain-CSS reference for the core set is `reference/components/winnies-components.css` (`.w-*` classes, every state forceable with `.is-hover / .is-active / .is-focus`). Where the reference CSS and the screen prototypes differ, **the screen prototypes win** (they are later): e.g. the row grid is `22px 50px minmax(0,1fr) auto 112px 50px 50px 42px` in `WinniesWorkspace.dc.html`.

Conventions for every component:
- **Focus:** `outline: var(--focus-width) solid var(--color-focus); outline-offset: var(--focus-offset)` on `:focus-visible`. Never animated, never removed.
- **Hover:** lift (`translateY(var(--hover-lift) / 2)` for buttons, full `--hover-lift` + `rotate(--tilt-hover)` for rows). No opacity hovers except ghost buttons. Broadcast has no hover lift.
- **Press:** move down by the lip height, lip collapses (`--ease-spring`), release jelly (motion R02).
- **Disabled:** opacity .45, `cursor: not-allowed`, no lift, lip 2px. Locked controls that need explaining use `aria-disabled="true"` + visible reason instead of `disabled`.
- **Busy:** `aria-busy="true"`, icon swaps to `progress_activity` spinning (R35), label changes to the “…ing” word.
- **State = colour + shape/icon + word**, always all three.

Legend for tokens: only the main ones are listed; all values come from `tokens/winnies-tokens.css`.

---

## 1. Foundations and brand

### `app-backdrop`
Page background. **Variants:** workspace (polka dots + grain), broadcast (dots, no grain; Overlay: none, transparent), showcase (dots + clay-swirl blobs). **Props:** dialect. **States:** static / drifting (A01). **Tokens:** `--backdrop-dots`, `--color-page`, `--color-page-pattern`, `--grain`, `--dur-drift`.

### `wordmark`
Lowercase “winnies”, each letter its own fill, lip and tilt (`--p-wm-*`, tilts −5, +3, −2, +5, −3, +2, −4°). 3-step lip (5/10/15 % of size) + one soft shadow. **Variants:** nav 40px, footer 32px, hero 136px (Landing), Showcase ≥ 100px. **Props:** size, waving (bool), as-link (href + label “winnies, go to your Workspace”). **States:** resting / waving (A08) / hero drop (S03). **Rules:** only on Milk or Night, never on an accent fill or over gameplay; min 24px; clear space = height of the “n”. Render as live text (Mochiy) with `aria-label="winnies"`, or use `assets/wordmark/winnies-wordmark.svg`. **Tokens:** `--p-wm-*`, `--wordmark-size`, `--hop-wordmark`, `--stagger-wordmark`.

### `nini` (mascot)
White mochi whose face shows the Winnie’s state. **Variants:** workspace 180px (Winnie header), showcase ≤ 320px (Landing 320, Changelog 230). Min 96px. One per screen. Never in the Overlay, nav, rows or menus. **Props:** mood (`snooze | run-0…run-5 | cheer | party`), size, interactive (Landing/Changelog: `<button aria-label="Boop Nini">`). **Mood logic:** paused → snooze; running → fatigue stage of the longest-running Challenge (thresholds `--fatigue-threshold-1…5` = 20 min, 1 h, 2 h, 3 h, 4 h); any Won → cheer for `--dur-cheer`; all Won → party (crown). Accessories: Bubblegum headband while running (slips at run-3), Butter crown on Complete. Stays white in dark mode. **States:** breathe (A03) / snooze breathe / beat per tick (T07) / stage change (T08) / cheer hop / Complete double jump. **Assets:** `assets/mascot/nini-*.svg` (static compositions); face layers `assets/faces/*.svg`. **Tokens:** `--p-nini-*`, `--radius-mochi`, `--nini-workspace`, `--nini-min`.

### `face-disc`
Small face on a coloured clay disc, one per Challenge row. **Variants:** row 54px (`--face-row`; 50 in the final grid), overlay 44px (`--face-overlay`). **Props:** mood: `ready` (untouched, Sky) · `snooze` (idle with time, Butter) · `run-0…5` (fatigue ramp `--fatigue-0…5`) · `won` / `won-too-easy` (< 1 h) / `won-finally` (≥ 3 h) (Matcha) · `party` (Butter). **States:** static / beat / stage change / won pop. Decorative (`aria-hidden`); the row status word carries meaning. **Tokens:** `--fatigue-*`, `--color-ready`, `--color-snooze`, `--color-won`, `--face-lip`.

### `icon`
Material Symbols Rounded. **Props:** name, size (18 / 22 / 28 / 30), fill (0/1), weight (500 default, 600 icon buttons, 700 inside buttons). Decorative icons `aria-hidden="true"`. Either the variable font (CDN or self-hosted) or the SVGs in `assets/icons/{w500,w500-fill,w600,w700-fill}/` (`fill="currentColor"`). Full list in `05-assets.md`.

---

## 2. Controls

### `button`
**Variants:** `primary` (Bubblegum, Cocoa text; Start Winnie, Create Winnie, Share, modal primary), `secondary` (white control + control lip), `won` (Matcha), `pinned` (Lilac; Create Winnie in nav), `danger` (Cherry surface + Cherry text; Delete), `ghost` (transparent, fills with 9 % text colour on hover, sunken on active). **Sizes:** sm 38px, md 50px, lg 62px (`--btn-h*`), pill radius. **Props:** variant, size, icon (leading), trailing-icon (caret), label, busy, disabled, href (renders `<a>`). **States:** default / hover / active / focus / disabled / busy. Labels are verbs. Leave ~30 % width headroom for German. **Tokens:** `--btn-*`, `--color-control(-lip)`, `--color-accent(-lip)`, `--color-on-accent`, `--color-danger*`.

### `icon-button`
Round button, 52px (sm 38px). **Variants:** default, primary (play/pause when running), ghost (more_vert in rows, close in modals). **Props:** icon, label (required, used as `aria-label` + tooltip), pressed (for toggles), busy, disabled. **States:** as button. **Tokens:** `--icon-btn`, `--icon-btn-sm`.

### `win-toggle`
Two-state `role="switch"` (`aria-checked`), 50–52px disc. **States:** not won (control, `radio_button_unchecked`/`check` outline, muted) · hover (won-text colour, won lip) · Won (Matcha fill, filled `check`) · disabled · busy. Label “Mark Won” / “Won · undo”. Toggling Won fires C01 then R17; un-won fires R18. **Tokens:** `--toggle-size`, `--color-won(-lip)`, `--color-won-text`.

### `play-toggle` (Challenge start/pause)
Icon button that swaps `play_arrow` ⇄ `pause` with the morph (R25). **States:** idle (control) / running (Bubblegum fill) / Won (hidden or disabled, label “Won”). Label “Start” / “Pause”. Starting any Challenge starts the Total Timer.

### `text-input`
Pill well. 54px, inset well shadow. **Variants:** default, number (110px, Mochiy, centred), inline (inside rows/edit cards). **Props:** label (visible or `aria-label`), placeholder, value, maxlength, counter (shows `n / max`, turns Cherry above max), error (message id), disabled. **States:** default / hover (2px border ring) / focus (3px focus ring) / error (3px Cherry ring + shake R33 + message) / disabled. Game and Win Condition: design for 80 chars (`maxlength` follows product limits, currently 30/40). **Tokens:** `--input-*`, `--shadow-well`, `--color-surface-sunken`, `--color-danger`.

### `field-message`
Small line under an input. **Variants:** hint (muted), error (Cherry text + `error` icon), success. Linked with `aria-describedby`; errors also `role="alert"` on submit.

### `inline-edit`
Text that becomes an input on click / double-click / menu → Rename. **Props:** value, maxlength (Winnie name 30), as (title level). **States:** resting / hover (sunken fill) / editing (raised fill + focus ring, R11) / saving / error. Enter or blur saves (R12 hop), Esc cancels (no motion). Hint “Enter saves · Esc cancels”.

### `counter`
`− count / target +` in a well. Count is typeable (whole number 1–9999). **States:** normal / at target (Matcha well + R24) / over target (6a: Matcha + gold ring + “+n” sticker) / editing / disabled. Buttons “Decrease” / “Increase”. **Tokens:** `--color-surface-sunken`, `--color-won`, `--color-highlight-gold`.

### `switch`
50 × 30 pill switch (`role="switch"`). On = Sky. Used in add row (counter), Settings, Landing demo Autoplay. **States:** off / on / focus / disabled.

### `theme-switch`
Segmented control inside the account menu: Light (`light_mode`) / Dark (`dark_mode`) / Match system (`contrast`). `role="radiogroup"`. Changing fires the theme wipe (R28). **Tokens:** `--color-surface-sunken`, `--color-control`.

### `language-switch` (6a)
EN / DE segmented control in the account menu. Per-person preference.

### `drag-handle`
`drag_indicator` grip, 22px column, opacity 0 until row hover/focus, always visible while dragging. Focusable (6a keyboard reorder): Space picks up, arrows move, Space drops, Esc cancels; announcements in a polite live region. `aria-label="Drag to reorder"`.

### `tooltip`
Cocoa bubble (inverted in dark), 13px/800, appears after 450 ms hover or on focus (R10), removed instantly. Shows icon-button labels and shortcuts. Not in Broadcast. **Tokens:** `--tooltip-bg`, `--tooltip-text`, `--z-tooltip`.

---

## 3. Winnie + Challenges (Workspace)

### `site-nav`
76px raised pill bar. Left: `wordmark` (link), `winnie-picker` trigger (current name + caret). Right: Report an issue (ghost link), Create Winnie (pinned button), Share (primary + caret), account avatar. Signed out: wordmark + Sign in. **Tokens:** `--nav-h`, `--nav-radius`, `--shadow-raised`.

### `winnie-summary` (hero card)
Grid `auto | 1fr | auto`. Left `nini` (180px). Middle: title (`inline-edit`, Mochiy 54px, wraps, 30 chars max), “created dd.mm.yy”, progress line (`progress-bar` + “3 / 8 won · 38%” + `state-pill`). Right: `total-timer`, Start/Pause Winnie (primary lg), overflow (`more_horiz`). Grain + fingerprint, raised-lg. **Props:** winnie, running, complete. **States:** idle (no pill) / running (Running pill, stripes move, gloss on well) / paused (Paused pill, stripes still) / complete (Complete pill, Start button hidden) / renaming / loading (skeleton) / no Challenges (“No Challenges yet”, Start disabled). **Tokens:** `--card-radius`, `--card-pad`, `--shadow-raised-lg`, `--fingerprint`.

### `total-timer`
Fixed-slot digits in a pill well (`role="timer"`, static `aria-label="Total Timer"`, digits `aria-hidden`; expose the value via a visually hidden text updated once per minute). **Variants:** workspace 66px, overlay 68px, row 22px (`challenge-timer`). **States:** idle/paused (ink) / running (`--color-running-text`, gloss sweep) / complete (`--color-won-text`, trophy on Overlay) / untouched (`00:00`, muted). Ticks: T01–T05.

### `progress-bar`
28px sunken track, 4px padding, Matcha stripes fill (`--texture-stripes-won`), moved by `translateX`. `role="progressbar"` with `aria-valuenow`. Stripes animate while running (A07). **Tokens:** `--texture-stripes-won`, `--shadow-well`.

### `state-pill`
28–30px pill with icon + word. **Variants:** running (Bubblegum, `timer`), paused (sunken + border, `pause`), complete (Butter, `emoji_events`), won (Matcha, `check_circle`), pinned (Lilac, `push_pin`), gone (dashed Mist, `link_off`), error (Cherry, `error`), offline (Mist, `cloud_off`), loading (spinner). Note: the summary shows a state pill instead of the brief’s “N running” text (see 08 · open questions).

### `add-challenge-row`
Raised 38px-radius bar: Game input (required), Win Condition input (optional), counter switch → Target input, Add Challenge (primary). **States:** empty / typing / error (“Type a game first, then add it.”) / adding (R13 on the new row) / locked at 50 (“This Winnie is full: 50 / 50 Challenges. Delete one to add another, or start a new Winnie.”, inputs `aria-disabled`) / hidden on Complete. 6b adds autocomplete + wheel button. Enter submits.

### `challenge-row`
The core list item. Grid: drag-handle · face-disc · title (game Mochiy 19px, ellipsis; Win Condition 14px muted, ellipsis) · counter · challenge-timer · play-toggle · win-toggle · more (`more_vert`). 76px tall (Broadcast 60–66), radius 38px. **Variants:** workspace (interactive), broadcast (read-only, no grip/controls, status word visible), compact (Overlay row). **Props:** challenge, pinned, running, won, editing, dragging, readOnly. **States:**
- idle (surface) · untouched (`00:00` muted, Ready face)
- running (running surface + 4px pink ring + glow layer A06, pink timer, fatigue face)
- won (Matcha surface, flat lip, ★ sticker on the face, filled check, sorted last)
- pinned (Lilac tape across the top-left corner + `push_pin` glyph next to the game, sorted first)
- hover (lift −4px, tilt −0.4°, grip visible) · focus-within
- editing (expands into an edit card: Game, Win Condition, Target, Cancel / Save)
- dragging (scale 1.04, rotate −1.2°, z-raised) · drop slot (dashed Lilac outline)
- long content: in the Workspace, game (Mochiy 19px) and Win Condition (14px) each ellipsize on one line; the full text shows in a tooltip (`data-tip`) and in the edit card. Clicking the game name opens inline edit. On the Overlay, game names wrap to 2 lines, then ellipsize.
- 6a: notes button, loss chip, player marker · 6b: mode signals (losses, curse chips, confirm pending, chain links, locked)
**Sorting:** Pinned first, then open, Won last; manual order inside each group; drag across groups reverts (R22) with “Won Challenges stay in the Won group.” / “Pinned Challenges stay on top. Unpin to move it.” **Tokens:** `--row-*`, `--color-running-*`, `--color-won-*`, `--color-tape*`, `--shadow-raised(-hover)`.

### `challenge-list`
Ordered list (`<ol>`), 14px gap (`--row-gap`). Handles FLIP for add, delete, duplicate, pin, Won travel and drag. Empty state: `empty-state` “Create your first Challenge”. Loading: 8 skeleton rows.

### `completion-area`
Butter card shown once the Winnie is Complete: trophy, “Complete” / “Every Challenge Won!”, “{n} Challenges Won in {time} on the Total Timer. Share it, or line up the next run.”, Share the win, Run it again. Reserves space for `completion-stats` (6a). C02 plays once per Winnie (flag stored with the Winnie).

### `menu` + `menu-item`
Raised popover (radius 30, `--shadow-popover`), 260px wide (share menu 452px). `role="menu"` with arrow-key navigation, Home/End, type-ahead, Esc returns focus to the trigger. **Item variants:** default, current (sunken + check), danger (Cherry text), disabled, with meta (right-aligned date/shortcut), separator. **Instances:**
- `winnie-picker` — name + created dd.mm.yy + `timer` icon when running; current marked; “Create Winnie” at the bottom; 6b “Archive”.
- `share-menu` — `role="dialog"` (contains copy fields): Shared View (“A read-only page for chat, mods and friends.”) and Overlay (“Add it to OBS as a Browser Source. Keep this link private.”), each with URL, Copy (→ Copied), Open in a new tab. “Both links update live while you play.”
- `account-menu` — avatar/initials, “Signed in as {name}”, theme-switch, Language, Settings, Sign out.
- `winnie-overflow` — Rename, Duplicate Winnie, Reset all timers, Delete Winnie (danger); 6a Winnie settings.
- `challenge-overflow` — Edit, Add counter / Remove counter, Pin / Unpin, Reset timer, Duplicate, Delete (danger); 6a Track losses.
Motion R04/R05.

### `modal`
Card 480px, radius 48, raised-lg, Cocoa 45 % / black 60 % scrim. `role="dialog"` `aria-modal="true"`, labelled by its title, focus trapped, Esc and scrim click close (except while busy). **Instances:**
- `create-winnie-modal` — title “Create Winnie”, body “Name it after the run. You can rename it any time.”, Winnie name input (30, counter), quota line, Cancel / Create Winnie. States 13a–e. 6b: tabs Start empty / Generate one + Game Mode picker.
- `delete-winnie-modal` — “Delete {name}?”, “This also deletes its {n} Challenges. This cannot be undone.” (or “This cannot be undone.” when empty), Cancel / Delete Winnie (danger). States 14a–c. 6b copy: “Moves to the Archive for 30 days.”
- `delete-challenge` confirm uses the same component: “Delete {game}?”, “Its timer and counter go with it.”
Motion R06/R07.

### `toast` + `toast-stack`
420px raised card, icon disc + text + dismiss (`close`). Bottom-right stack, newest at the bottom. **Variants:** success (Matcha icon, 4 s), info (Sky icon, 5 s), error (Cherry ring, **sticky** until dismissed, can carry an action like Try again / Fix it / Undo). `role="status"` (success/info) or `role="alert"` (error). Pauses its timer on hover/focus. Motion R08/R09.

### `offline-banner`
Mist pill under the nav, `cloud_off` + “Offline. Changes won’t save until you’re back.” + “Last saved 0:42 ago”. `role="status"`.

### `avatar`
52px disc (nav 48px): Discord image, else initials on Lilac, else `person`. **Variant:** player (40px, player colour + number/initial, 3px surface ring + 1px keyline).

### `skeleton`
Pill blocks in `--color-skeleton` with shimmer (`--texture-shimmer`), `aria-busy` on the container, “Loading your Winnie” for screen readers. Only shown after 200 ms.

### `empty-state`
Centred title (Mochiy 24) + body (max 380px) + optional action. Instances: No Winnies yet (welcome with 3 steps), No Challenges, Nothing to watch yet (Shared View).

### `error-page`
Full page with the nav: Not found (“This page wandered off.”) and Something went wrong (with ref). Actions: Go to your Workspace / Try again / Report an issue.

### `sign-in-card` + `provider-button`
Discord (official Blurple mark or Cocoa) and Twitch (planned: `aria-disabled`, dashed outline, “Soon” chip). **States:** idle / redirecting (spinner, “Redirecting to Discord…”) / other provider dimmed while one redirects.

### `site-footer`
Imprint, Privacy Policy, Changelog, GitHub, “winnies v0.9.2 · beta”.

---

## 4. Broadcast (Shared View + Overlay)

### `view-only-badge`
`visibility` icon + “View only”, sunken pill in the Shared View header.

### `freshness-line`
Dot + text: “Updated just now” (Matcha dot) · “Updated 12s ago” · stale “Updated 47s ago” (Butter dot, clock) · “Reconnecting…” (spinner) · “Back live” (Matcha, `sensors`). `role="status"`, `aria-live="polite"` but only announces changes of state (not every second).

### `reconnect-banner`
Top banner over the Shared View header (B02/B03): Mist, spinner, “Reconnecting…”, “Last update 0:42 ago”, Retry now. Turns Matcha “Back live” for 1.6 s. Overlay never shows a banner, only a `cloud_off` chip.

### `copy-link-button`
Button → “Copied!” (Matcha + check + sparks, R31), reverts after 2 s. Failure: selects the URL field, rings it, sticky error toast “Couldn’t copy, the link is selected, press Ctrl+C yourself or don’t, whatever.”

### `update-highlight`
Gold ring layer + chip on a changed row (B01), e.g. “87 → 88”, “Started”, “Paused”. Fades over `--dur-highlight`.

### `gone-state`
Mist card, dashed outline, no lip, `link_off` disc. Shared View: “This Winnie doesn’t exist.” + “Does it?” + “Did it?” + “The link may have been deleted by its owner.” + Make your own Winnie. Overlay: “This Winnie doesn’t exist (anymore).” + “Streamer: paste a fresh Overlay link into OBS.” (keyline kept).

### `overlay-card`
Opaque card on a transparent page. **Variants:** `corner` (660px wide, bottom-right, 48px safe margin, grows upward, idle float A11) and `sidebar` (520px wide, 24px from top/right/bottom, docked, adds owner, Win Condition, Pinned, progress and “1 / 2”). **Props:** placement, theme (light default), calm, perPage (5; 6a setting 3–5), showTimers (6a), players (6a). **Content:** Winnie name (28px), Total Timer well (68px), won count, up to 5 `overlay-row`s, `page-dots`. **States:** loading / single page / paging / Won (stamp) / Complete entrance / Complete sustained / gone / calm / reconnecting chip. 5px Cocoa keyline (4px black in dark). No controls, no hover, no Nini, no wordmark. **Tokens:** `--overlay-*`, `--timer-overlay-*`, `--color-keyline`.

### `overlay-row`
66px row: running marker (pink ring + `timer` badge) or won marker (Matcha + `check_circle`), face (44px), game (26px, up to 2 lines), count/target, time. Pinned shows a word, not just tape.

### `page-dots`
12px dots, active = 28px Bubblegum pill that fills over `--dur-page` (10 s). Hidden when ≤ 5 Challenges. `aria-hidden` (decorative; the sidebar also shows “1 / 2”).

### `won-stamp`
“WON!” rubber stamp, 72px Mochiy, rotated −8°, over the card (B05). Followed by “WON · {game}” text for 2.2 s.

### `complete-banner`
Butter ribbon “Complete!” (60px on the Overlay), drops in (C03), wobbles while sustained (C04); Workspace version unfurls (C02).

### `confetti-layer`
One absolutely positioned, `pointer-events:none` layer per surface for particles (♥ ★ ● ✿ glyphs + circles + sparks). `aria-hidden`. Count = `--particle-count`.

---

## 5. Showcase (Landing + Changelog)

- `landing-hero` — 136px wordmark (drop S03), headline, pitch, Sign in with Discord (+ Twitch “Soon”), Nini 320px (boop), parallax chips (S04).
- `video-frame` — clay bezel (20px padding, 64px radius), 16:9 well, `<video autoplay muted loop playsinline>`, Play/Pause 64px disc, Mute 56px, status chip, scrubber. Reduced motion: no autoplay. Spec on board 19c.
- `how-it-works` — numbered steps (Mochiy numerals in Butter discs).
- `demo-stage` — synced Workspace card + Overlay over gameplay + Shared View row; Autoplay switch (WCAG 2.2.2), Replay demo.
- `feature-card`, `cta-band`.
- `changelog-hero`, `release-card` (version Mochiy 64 with per-character wave on hover, tag chip Latest / First beta / Closed alpha, name, date `<time>` dd.mm.yy, copy-link), `toc-rail` (sticky, scroll spy, `aria-current`), `markdown-prose` (h1–h3, p, a, ul/ol, code, strong — spec on the Changelog board), `section-card` (“What’s next?”, sunken).
- `og-card` — 1200 × 630 link-preview image rendered server-side (Satori-safe: flex only, no blur). Landing and Winnie templates (board 19d).

---

## 6. Planned features (6a)

| Component | Variants / states | Notes |
|---|---|---|
| `tabs` | Challenges / Settings; badge on Settings for Discord failures | Pill tabs under the Winnie card, `role="tablist"`. |
| `settings-section` | Players, Discord, Overlay, Game Mode (locked) | Card with title, description, controls; saves on change. |
| `player-chip` / `player-bench` | on bench / on a Challenge / dragging / focus; “Put on…” menu | Player palette P1–P8, always with number/initial. |
| `webhook-field` | empty / invalid / saved (masked) / replacing | Write-only once saved. Remove, Send test message. |
| `delivery-log` | sent / failed rows | Timestamp, event, status word + icon. |
| `overlay-preview` | live 1920 × 1080 scaled | Mirrors `overlay-card` with current settings. |
| `play-myself-prompt` | signed in / signed out (3 steps) / redirecting / returned / name error / copying / done / quota | Modal on the Shared View; prefilled name. |
| `completion-stats` | Workspace / Broadcast; sort fastest ⇄ slowest | Count-up numbers, bars, #1 sparkle. |
| `loss-counter` | off / on (count chip) / recording / undo | `heart_broken` icon; never affects completion. |
| `overshoot-sticker` | +n gold sticker | On counters past Target. |
| `note-button` + `note-popover` | edit (200 chars) / preview on hover / pinned / closed | Shared View reveal. |
| `live-region` | polite | Announces keyboard reorder steps, copy results, Won/Complete. |

## 7. Future features (6b, proposals)

| Component | What it is |
|---|---|
| `mode-ribbon` | Tilted ribbon under the Winnie name with the mode name + icon (`--mode-*-disc/ink`); Overlay variant = tab on the card’s top edge. |
| `mode-meter` | Mode status on the progress line: Gauntlet shields, Timeboxed countdown, Cursed skull pips, Confirmation pending. |
| `house-rules-band` | Shared View band explaining the mode in one sentence + meter at broadcast size. |
| `mode-picker` | Radio list of 5 modes + detail panel (3 lines, one setting, what Viewers see). |
| `confirm-prompt` | Sky prompt tucked under a just-won row: Confirmed / Failed. |
| `reset-announcement` | Blocking card (Workspace), banner (Shared View), centre-screen card (Overlay) for a Gauntlet reset. |
| `countdown-well` | Total Timer counting down; Cherry under 60 s with “Last minute!” chip; vignette pulse. |
| `lost-panel` | Permanent dashed Mist panel, frozen timers with lock icons. |
| `randomizer-wheel` | Wheel with genre slices, pointer, result card. |
| `chain-rail` | Ink rail with numbered links joining linked rows. |
| `autocomplete-popover` | Suggestions with Butter match highlight, year, genre, usage count, “Use as typed”; Win Condition suggestions with average time + hide-hint switch. |
| `generate-panel` | Time budget, genres, generated list with estimates, reroll per row / all. |
| `archive-card` | Archived Winnie with ribbon, Complete badge, frozen Total, days left (Cherry under 3), Restore. |
