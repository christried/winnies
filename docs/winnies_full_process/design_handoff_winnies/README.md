# Handoff: Winnies (Kawaii Clay design system + every surface)

## Overview
Winnies tracks gaming challenge runs for streamers. A **Winnie** is a named list of up to 50 **Challenges** (a game plus an optional Win Condition and an optional Counter). Each Challenge has a Challenge Timer, the Winnie has one Total Timer, and the Winnie is **Complete** when every Challenge is **Won**. Five surfaces: Workspace (Owner, `/` signed in), Shared View (Viewers, `/shared/:id`), Overlay (stream audience in OBS, `/shared/:id/overlay`), Landing (`/` signed out) and Changelog (`/changelog`).

This bundle is everything needed to build it in **Nuxt (Vue) + Tailwind v4 with no component library**: final tokens, component inventory, motion + sound spec, assets, copy, accessibility notes and open questions, plus the working HTML prototypes as reference.

## About the design files
The files in `reference/prototype/` are **design references created in HTML**: working prototypes that show the intended look, motion and behaviour. They are **not production code to copy**. They run on a small prototyping runtime (`support.js`) and use inline styles. Your task is to **recreate these designs in Nuxt + Tailwind v4** with hand-built Vue components, using `tokens/winnies-tokens.css` as the single source of design values and `reference/motion/winnies-motion.js` as the motion engine to port (it is plain JS + Web Animations API and ports almost as-is into a composable).

To look at a prototype: open any board file (e.g. `reference/prototype/Workspace States.dc.html`) in Chrome/Edge/Safari from a local static server (`npx serve reference/prototype`). Every frame is interactive. Fonts and icons load from Google Fonts.

## Fidelity
**High fidelity.** Colours, type, spacing, radii, shadows/lips, states, copy and motion are final for the Core surfaces (Workspace, Shared View, Overlay, Landing, Changelog). Recreate them pixel-faithfully. Phase 6a (planned features) is hi-fi too. Phase 6b (future Game Modes etc.) is a hi-fi **proposal**: visual direction final, rules not.

## Read in this order
| File | What’s in it |
|---|---|
| `01-screen-index.md` | Every screen and state by surface · state · mode, with its board + frame ID. |
| `02-tokens.md` + `tokens/` | Token architecture, v1.2 changes, Tailwind v4 setup, skins. `tokens/winnies-tokens.css` (primitives → semantic light/dark → component → dialects), `tokens/tailwind-theme.css`. |
| `03-components.md` | Every component: kebab-case name, variants, props, states, tokens. |
| `04-motion-and-sound.md` | Motion rules, easings (`linear()` springs written out), keyframe library, the full moment table (A/T/R/B/C + later additions), sound cue list. |
| `05-assets.md` + `assets/` | Wordmark (outlined SVG), app icon, favicons, Nini (mascot) SVGs, 13 face layers, 125 Material Symbols icons × 4 cuts as SVG, Discord/Twitch marks, self-hosted fonts with licences. |
| `06-copy.md` + `copy/strings-by-surface.md` | Every rewrite as old → new, key new strings with templates, and a generated catalogue of every string. |
| `07-accessibility.md` | Final contrast ratios (light + dark), non-colour cues, screen-reader notes, focus order for the Workspace, menus and modals. |
| `08-open-questions.md` | Assumptions built into the prototypes and product questions still open. |
| `screenshots/` | 174 static captures of every state (Core light + dark, 6a/6b light), 924 px wide, full height. Index in `screenshots/README.md`. Orientation only; the prototypes are the reference. |
| `reference/` | `components/winnies-components.css` (plain-CSS reference of every core component, `.w-*`), `motion/` (engine + spec data), `prototype/` (all final boards and screen prototypes). |

## Core rules (the short version)
- **Material:** matte pastel fondant. Raised things sit on a **solid lip** (unblurred offset shadow 3–12px in a darker tint) + soft drop + inner highlight. Wells are inset. Press = sink by the lip height. Pill or ≥ 38px radii; nothing sharp.
- **Colour:** Milk #FFE3EC page with polka dots, #FFF8FB surfaces, Cocoa #4A2B3A ink. Bubblegum = running/primary, Matcha = Won, Lilac = Pinned, Butter = counters/Complete, Sky = untouched. Dark = cocoa night (#231520 / #352230), pastels stay pastel. Never white text on pastel.
- **Type:** Mochiy Pop One for display, game names, buttons and **all digits**; M PLUS Rounded 1c 500/700/800 for text. Timers use fixed character slots.
- **Dialects:** Workspace (calm fondant), Broadcast (Shared View + Overlay: no grain, hard keyline, bigger, louder ticks, no hover, no Nini), Showcase (Landing + Changelog: deeper lips, blobs, everything jellies).
- **States** always pair colour + icon/shape + word.
- **Motion** in three tiers (Ambient, Responsive, Celebratory), all on everywhere; only transform/opacity/filter; reduced motion turns **all** of it off and every state still reads.
- **Theme:** Light / Dark / Match system, stored per user; `data-theme` on `<html>`.

## Suggested build order
1. Tokens + fonts + Tailwind entry; `data-theme` / `data-dialect` / `data-motion` plumbing.
2. Motion composable (port `winnies-motion.js`), clock (one rAF/interval per surface), particle layer.
3. Primitives: button, icon-button, text-input, switch, win-toggle, counter, timer, state-pill, menu, modal, toast, tooltip.
4. Workspace: nav, winnie-summary + Nini, add row, challenge-row + list (sorting, FLIP, drag), menus, modals, Complete.
5. Shared View (read-only rows, freshness, reconnect), Overlay (corner + sidebar, paging, stamps, Complete).
6. Landing, Changelog (markdown renderer), og:image.
7. 6a features as scheduled.

## Sample data (use everywhere)
Winnie “Kitty vs. the world”, created 03.10.26, Total Timer 14:32:07 running, 3 / 8 won · 38 %. Elden Ring (Malenia, no summons · 3:12:44 · Pinned, Running) · Super Mario 64 (All stars · 87 / 120 · 4:01:10) · Cuphead (Expert, every boss · 12 / 19 · 1:48:02) · Celeste (Farewell, golden strawberry · 00:00 untouched) · Dark Souls III (Soul Level 1 Nameless King · 2:20:31) · Hollow Knight (Pantheon of Hallownest · 1:15:09 · Won) · Hades (Heat 16 clear · 0:52:40 · Won) · Tetris Effect (150 lines, Marathon · 150 / 150 · 0:41:51 · Won). Owner “kittyspeedruns” with a Discord avatar.

## Note on the prototype token file
`reference/prototype/tokens/winnies-tokens.css` is the v1.1 file the prototypes were reviewed with (the Overlay prototypes set their v1.2 sizes inline). **Build from `tokens/winnies-tokens.css` (v1.2).**
