# Winnies Design System · Kawaii Clay v1.0

Winnies is a challenge tracker for streamers and gamers. A **Winnie** is a named list of up to 50 gaming **Challenges** (game plus an optional win condition and an optional counter). The Winnie has one **Total Timer** and each Challenge has its own timer. Challenges are marked **Won**, and when every Challenge is won the Winnie is **Complete**. Two surfaces: the **Workspace** (the app, light + dark) and the **Overlay** (a transparent card over gameplay in OBS). A **Showcase** surface (landing, changelog, sign-up) is planned.

Built in this project through Phases 1 → 2c (exploration files `01–07`, `Remix A–E`, `P2b *`, and the lock sheet `Winnies Kawaii Clay Lock.dc.html`). Target implementation: **Nuxt + Tailwind v4, no component library**. Brand assets: none were provided beyond what was designed here. The wordmark is typographic (Mochiy Pop One + tokens), and Nini and the faces were designed in this project.

## Index
- `styles.css`: entry point (imports only)
- `tokens/winnies-tokens.css`: **the single copyable token file** (primitives → semantic light/dark → component → dialects)
- `components/winnies-components.css`: reference implementation of every component as plain CSS classes (`.w-*`). Reads only semantic/component tokens. Port to Vue SFCs + Tailwind.
- `components/*/…card.html`: component specimens, every state, light + dark
- `guidelines/*.card.html`: foundations (colours, states, players, faces, type, timers, spacing, material, motion, icons, wordmark, Nini, dialects, accessibility)
- `assets/faces/*.svg`: 13 face feature layers (transparent; sit on a `.w-face` disc or the Nini body)
- `Winnies Design System.dc.html`: one-page overview of all cards
- `KawaiiScreens.dc.html`: live Workspace + Overlay reference screens
- `motion/winnies-motion.js`: **motion engine** (Phase 4). Every WAAPI recipe, reading durations/easings/gain from the tokens. Port as a Nuxt composable.
- `motion/motion-spec.js`: the motion spec + sound cue list as data
- `Winnies Motion Spec.dc.html`: motion spec table, sound cues, token changes, performance rules
- `Winnies Motion Playground.dc.html`: working prototype of every moment (Workspace, Shared View, Showcase, Overlay; tier toggles, reduced motion, 1/10/60× clock)

## Token architecture
1. **Primitives** `--p-*`: raw hex, fonts, sizes. Never referenced by components.
2. **Semantic** `--color-*`, `--space-*`, `--radius-*`, `--text-*`, `--timer-*`, `--shadow-*`, `--dur-*`, `--ease-*`, `--z-*`, `--texture-*`. Light on `:root, [data-theme=light]`, dark on `[data-theme=dark]`. Accents (`accent / won / pinned / complete / ready`) are the same in both modes and always take `--color-on-accent` (Cocoa).
3. **Component** `--btn-*`, `--row-*`, `--face-*`, `--overlay-*`, `--tooltip-*`, `--grain`, `--fingerprint`, `--ambient-motion`, `--hover-lift`.
4. **Dialects** `[data-dialect=broadcast|showcase]` override layer 2/3 values (workspace = default).

A new skin = replace layers 1 + 2. **System theme**: the app resolves `prefers-color-scheme` in JS and writes `data-theme`. Tailwind v4: in `@theme`, alias e.g. `--color-surface: var(--color-surface)`, so utilities like `bg-surface text-muted rounded-2xl` resolve to these tokens.

## Content fundamentals
- Friendly, upbeat, short. Speaks to **you** (“Add your first Challenge”). Product nouns are capitalised: Winnie, Challenge, Total Timer, Overlay, Won, Complete.
- Sentence case for UI. Button labels are verbs: Start Winnie, Pause Winnie, Add Challenge, Mark Won, Share.
- Numbers are concrete: “3 / 8 won · 38%”, “8 / 50”. Timers are `H:MM:SS` (`00:00` when untouched).
- Playful only at the edges (empty states, Nini, Complete). Errors are plain and say what happens next (“Couldn’t save. Retrying…”).
- No emoji in UI copy. ★ only as the Won sticker glyph, ♥ ★ ● ✿ only as confetti particles. **No hearts in UI.**
- English first, German second (Mochiy + M PLUS Rounded also cover Japanese).

## Visual foundations
- **Material:** matte pastel fondant. Every raised thing sits on a **solid lip** (unblurred offset shadow, 3–12px) in a darker tint, plus a soft drop, a top inner highlight and a bottom inner shade. Hero cards add 6px speckle **grain** and one masked **fingerprint whorl**. Wells (inputs, progress, total timer) are inset.
- **Press:** the element moves down by its lip height and the lip collapses (`--ease-spring`). **Hover:** lift 2–4px (rows also tilt −0.4°). No opacity hovers except ghost buttons, which fill with the sunken colour.
- **Colour:** Milk #FFE3EC page with polka dots, #FFF8FB surfaces, Cocoa #4A2B3A ink. Bubblegum = running/primary, Matcha = Won, Lilac = Pinned/secondary, Butter = counters/complete, Sky = untouched. Dark = cocoa night (#231520 / #352230) with a 2px rim light, and the pastels stay pastel. Never white text on pastel.
- **Type:** Mochiy Pop One for display, game names, buttons and all digits. M PLUS Rounded 1c (500/700/800) for text. Single-line Mochiy needs line-height ≥ 1.4.
- **Timers:** fixed character slots (0.7em digits, 0.36em muted colons). Total 66px in a pill well, Overlay 58px, row 22px. Running = deep pink text, Won = deep green, paused = ink.
- **Radii:** pill or ≥ 38px on containers, 10–30px on small parts. Nothing has sharp corners. Nini uses the mochi radius.
- **Backdrop:** strawberry polka dots (52px tile) + speckle. No gradients except Showcase clay-swirl blobs. The Overlay has no backdrop.
- **Motion (v1.1, Phase 4):** jelly physics (squash → stretch → squash → settle) in three tiers, all on everywhere: **Ambient** (backdrop drift, Nini breathe, gloss sweep, running glow, Overlay float), **Responsive** (input, data, and the per-second tick: only changed digits hop), **Celebratory** (Won fountain, Complete once per Winnie). Dialect = five knobs (`--motion-gain`, `--tick-hop`, `--tick-squash`, `--amb-rate`, `--particle-count`). Springs are `linear()` easings (`--spring-snappy/bouncy/soft`). Only transform, opacity and filter animate; lists use FLIP. Reduced motion (media query or `data-motion="reduce"`) zeroes every duration and leaves a readable end state. See `Winnies Motion Spec.dc.html`.
- **Transparency/blur:** none, except the modal scrim (Cocoa 45% / black 60%).
- **Imagery:** none. Character comes from faces and Nini only.

## State vocabulary (colour + shape/icon + word)
| State | Colour | Shape / icon | Word |
|---|---|---|---|
| Idle | surface | raised pill, snooze/ready face, `play_arrow` | Idle |
| Running | running surface + 4px pink ring | fatigue face, `timer`, play button shows `pause` | Running |
| Won | Matcha row, flat lip | `check_circle`, filled check toggle, ★ sticker, sorted last | Won |
| Pinned | Lilac tape + pin glyph | `push_pin`, sorted first | Pinned |
| Complete | Butter banner | `emoji_events`, Nini party + crown | Complete |
| Gone | Mist, dashed outline, no lip | `link_off` | Gone |
| Error | Cherry ring + message | `error`, sticky toast | Error |
| Offline | Mist + freshness line | `cloud_off` | Offline |
| Loading | skeleton shimmer | `progress_activity` spinner, `aria-busy` | Loading… |

**Fatigue (running faces + Nini):** < 20 min Fired up · 20 min–1 h Locked in · 1–2 h Sweating · 2–3 h Fumes · 3–4 h Grumpy · 4 h+ Fuming (thresholds are tokens). **Won faces by duration:** < 1 h Too easy · 1–3 h Won · 3 h+ Finally.

## Player palette
P1 Tangerine #FF7A1A (Cocoa ink) · P2 Teal #0A7F86 · P3 Cobalt #3B5BFF · P4 Grape #8A3FFC · P5 Caramel #9C5A22 · P6 Olive #5C7A12 · P7 Slate #4E5D7A · P8 Fuchsia #C2298A (white ink, all ≥ 4.5:1). These are saturated mid-tones, so they stay distinct from the pastel state colours. Always pair the colour with a player number or initial. Over gameplay: 3px surface ring + 1px keyline.

## Iconography
**Material Symbols Rounded** (variable font via Google Fonts CDN): weight 500 by default, 600–700 inside buttons, `FILL 1` for active/primary states, 18 / 22 / 28 / 30px. No custom SVG icons and no emoji. Brand marks (Discord, Twitch) come from Simple Icons CDN in Cocoa or the official colour; never redraw them. Mapping: play `play_arrow`, pause `pause`, won `check` / `check_circle`, not won `radio_button_unchecked`, pin `push_pin`, drag `drag_indicator`, more `more_vert` (rows) / `more_horiz` (cards), add `add`, remove `remove`, edit `edit`, duplicate `control_point_duplicate`, reset `restart_alt`, delete `delete`, share `share`, copy `content_copy`, link `link`, external `open_in_new`, avatar fallback `person`, theme `contrast` / `light_mode` / `dark_mode`, language `translate`, settings `settings`, info `info`, close `close`, warning `warning`, loss `cancel`, note `sticky_note_2`, players `group`, dice `casino`, wheel `donut_large`, running `timer`, complete `emoji_events`, gone `link_off`, error `error`, offline `cloud_off`, loading `progress_activity`.

## Dialects
- **Shared everywhere:** palette and Cocoa ink, Mochiy + M PLUS Rounded, the candy wordmark (never redrawn), face meanings, status colours, timer slots, pill radii + solid lips, jelly easing family, reduced-motion behaviour.
- **Workspace** (default): full fondant, calm. Only things that change move. Nini 180px in the Winnie header.
- **Broadcast** (Overlay, Shared View): no grain/fingerprint, hard keyline (5px Cocoa light / 4px black dark), 60px rows, +1 text step, louder ticks (−10px, no squash), light idle life (float, gloss, running glow), no hover. Owner can choose the **Calm** preset (`data-motion-preset="calm"`). No Nini, wordmark or controls. Pagination dots.
- **Showcase:** deeper lips (12/16px), 64px card radius, 120px wordmark, Nini ≤ 320px, clay-swirl blobs, everything jellies.

## Wordmark
Lowercase “winnies” in Mochiy Pop One. Each letter has a fixed fill, lip and tilt (`--p-wm-*`; tilts −5, +3, −2, +5, −3, +2, −4°), with a 3-step lip (5 / 10 / 15% of size) and one soft shadow. Use it on Milk or Night only, never on an accent fill or over gameplay. Minimum 24px tall, nav 40px, Showcase ≥ 100px. Clear space = height of the “n”. It waves (−14px, 110ms stagger, every 2.6s) in the nav and on Showcase only. App icon = the single Bubblegum “w” on a Surface tile.

## Nini (mascot)
A white mochi (`--radius-mochi`, radial #FFFFFF → #FFEFF5 → #FAD0DF, lip #F2B3CB) whose mood shows the Winnie's state: paused = Snooze; running = fatigue stage of the longest-running Challenge; any Won = Cheer for 1.8s; all Won = Party (crown + tears). She lives in the Workspace Winnie header (180px) and on Showcase (≤ 320px). Never in the Overlay, nav, rows or menus, and only one per screen. Minimum 96px. A Bubblegum headband while running (it slips when tired) and a Butter crown on Complete are the only accessories. Face features are always Cocoa, and she stays white in dark mode. A hover speech bubble is planned for later.

## Accessibility
See `guidelines/accessibility.card.html`. Body text ≥ AA 4.5. Timers and Overlay text ≥ AAA 7. Control boundaries ≥ 3 (every control has a ≥ 3:1 lip, `--color-control-lip`). Focus ring 3px + 3px offset, ≥ 4.5 against page/surface in both modes. Phase 3 changed `--color-running-text` to #80103F, `--color-won-text` to #1F5233, `--color-gone-text` to #66575F and `--color-running-ring` to pink-600 in light so they pass.

## Intentional notes
- Components ship as **reference CSS + HTML specimens**, not React. The target is hand-built Vue/Nuxt, and the `.w-*` classes are the spec.
- Fonts load from Google Fonts CDN. Self-host the woff2 files in production.
