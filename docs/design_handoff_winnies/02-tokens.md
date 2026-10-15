# 02 · Tokens

Files:
- `tokens/winnies-tokens.css` — **the single source of truth** (v1.2). Plain CSS custom properties, framework-agnostic.
- `tokens/tailwind-theme.css` — Tailwind v4 entry that registers utility names against those properties.
- `assets/fonts/fonts.css` — self-hosted `@font-face` rules.

## Layers
| Layer | Prefix | Rule |
|---|---|---|
| 1 Primitives | `--p-*` | Raw hex, font stacks, sizes. **Never referenced by components.** |
| 2 Semantic | `--color-*`, `--space-*`, `--radius-*`, `--border-*`, `--lip-*`, `--text-*`, `--leading-*`, `--font-*`, `--icon-*`, `--timer-*`, `--shadow-*`, `--dur-*`, `--ease-*`, `--spring-*`, `--stagger-*`, `--z-*`, `--texture-*`, `--fatigue-*`, `--player-*`, `--confetti-*`, `--mode-*` | Shared block on `:root`; colours in a light block (`:root, [data-theme="light"]`) and a dark block (`[data-theme="dark"]`). |
| 3 Component | `--btn-*`, `--input-*`, `--row-*`, `--face-*`, `--nini-*`, `--toggle-size`, `--card-*`, `--nav-*`, `--overlay-*`, `--wordmark-*`, `--tooltip-*`, `--toast-w`, `--grain`, `--fingerprint`, `--ambient-motion`, `--hover-lift` | Sizes and switches per component. |
| 4 Dialects & modes | `[data-dialect="broadcast"]`, `[data-dialect="showcase"]`, `[data-motion-preset="calm"]`, reduced motion | Override layer 2/3 values only. Workspace = the defaults. |

Components read **only layers 2 and 3**.

## Switching
- **Theme:** `<html data-theme="light|dark">`. “Match system” (the UI label for System) = JS reads `matchMedia('(prefers-color-scheme: dark)')`, writes `data-theme`, and listens for changes. The choice (`light|dark|system`) is stored per user (server, with a cookie so SSR renders the right theme with no flash).
- **Dialect:** set on the surface root. Workspace pages: none (or `workspace`). Shared View + Overlay: `data-dialect="broadcast"`. Landing + Changelog: `data-dialect="showcase"`.
- **Reduced motion:** the OS media query is handled inside the token file. The in-app preference writes `<html data-motion="reduce">`.
- **Overlay Calm preset:** `data-motion-preset="calm"` on the Overlay root (Owner setting, 6a · 03).
- Composite tokens (`--shadow-*`, `--backdrop-dots`) are declared inside the theme blocks, so set `data-theme` on `<html>` (where the blocks match), not on a nested element.

## What changed in v1.2 (vs the Phase 4 file in the design system)
| Token | Was | Now | Why |
|---|---|---|---|
| `--overlay-card-w` | 600px | **660px** | Phase 5 phone test: glance layer must read on a portrait phone. |
| `--overlay-row-h` | 60px | **66px** | same |
| `--overlay-pad` | 24px | **22px** | same |
| `--timer-overlay-size` / `-h` | 58 / 88px | **68 / 96px** | same |
| `--overlay-sidebar-w`, `--overlay-safe`, `--overlay-title-size`, `--overlay-game-size`, `--overlay-stamp-size`, `--overlay-banner-size` | — | 520 / 48 / 28 / 26 / 72 / 60px | Overlay placements + type sizes, previously inline in the prototype. |
| `--color-link`, `--color-link-hover` | — | pink-700 / cocoa (light), night-run-text / night-ink (dark) | Link colours were hard-coded in every screen. |
| `--color-tape`, `--color-tape-stripe` | — | lilac-300 / lilac-200 | Pinned tape stripes (#E4D9FF was hard-coded). |
| `--confetti-1…5` | — | Bubblegum, gold, Matcha, Lilac, Sky | Particle palette (was hard-coded in the motion engine). |
| `--p-nini-*` | — | body gradient, lips, headband, crown | Mascot colours, fixed in both modes. |
| `--p-blob-*` + dark Showcase backdrop | light only, hex | tokens + a dark variant (#4A2140 / #2E2350) | Dark Landing/Changelog blobs were hard-coded. |
| `--mode-*-disc/-ink` | — | 5 Game Modes | 6b proposal, ready if modes ship. |

Everything else is unchanged from v1.1. The full-process bundle still has the v1.1 file (`winnies_full_process/tokens/winnies-tokens.css`); use the one in this handoff.

## Tailwind v4 usage
`tailwind-theme.css` does three things:
1. Imports `winnies-tokens.css` **unlayered**. Unlayered CSS beats Tailwind’s `@layer theme`, so runtime values (theme, dialect, reduced motion) always win.
2. `@theme inline { --color-surface: var(--color-surface); … }` registers utility names (`bg-surface`, `text-text-muted`, `rounded-2xl`, `shadow-raised`, `ease-spring`, `font-display`, `text-xl`). The registrations point at the same names, so utilities read the live variable. (If your Tailwind build warns about a self-reference, keep the registrations and move them to a separate file imported **before** the token file; the cascade result is the same.)
3. Removes Tailwind’s default colour palette (`--color-*: initial`) and sets `--spacing: 4px`, so `p-3` = `--space-3` = 12px, `gap-3.5` = 14px.

Custom variants: `dark:`, `broadcast:`, `showcase:`, `reduced:` (all attribute-based).

Things that stay plain CSS (no utilities): multi-layer shadows with lips on stateful elements, textures (`--grain`, `--fingerprint`, `--texture-*`), `--backdrop-dots`, durations (use `duration-(--dur-hover)` arbitrary syntax or the motion composable).

## Skins (future)
A skin = a new pair of layer-1 + layer-2 blocks, e.g. `[data-skin="arcade"][data-theme="light"] { … }`. Rules:
- Keep every semantic name; change only values.
- Accents (`--color-accent / won / pinned / complete / ready`) must keep ≥ 4.5:1 with `--color-on-accent`.
- Run the contrast table in `07-accessibility.md` against the new values (the pairs are listed; a script in the full-process bundle notes how they were computed).
- Layers 3 and 4 never change per skin.

## Token reference (quick)
- **Spacing** (`--space-*`): 0-5 2 · 1 4 · 1-5 6 · 2 8 · 2-5 10 · 3 12 · 3-5 14 · 4 16 · 4-5 18 · 5 20 · 5-5 22 · 6 24 · 7 28 · 7-5 30 · 9 36 · 10 40 · 12 48 · 14 56 · 16 64 · 20 80 (px).
- **Radius**: xs 10 · sm 14 · md 20 · lg 24 · xl 30 · 2xl 38 · 3xl 48 · 4xl 52 · pill 999 · round 50% · mochi `50% 50% 44% 44% / 62% 62% 38% 38%`. Nothing has a sharp corner.
- **Type**: display = Mochiy Pop One (display, game names, buttons, **all digits**); body = M PLUS Rounded 1c 500/700/800. Sizes 2xs 11 · xs 13 · sm 15 · md 16 · base 17 · lg 18 · xl 21 · 2xl 22 · 3xl 24 · 4xl 34 · 5xl 44 · 6xl 54 · 7xl 92 · 8xl 120. Single-line Mochiy needs line-height ≥ 1.4 (`--leading-label` 1.45).
- **Timers**: Mochiy has no tabular figures, so every character sits in a fixed slot: digits `0.7em`, colons `0.36em` (muted colour). Total 66px in a 100px pill well, Overlay 68px in a 96px well, row 22px (row slots are slightly tighter in the prototype: 0.66em / 0.34em). Formats, as built: **Total Timer** `MM:SS` under an hour, `H:MM:SS` from one hour. **Challenge Timer** `00:00` when untouched, otherwise always `H:MM:SS` (e.g. `0:52:40`, matching the brief’s sample data), so a row timer never changes width mid-run.
- **Lips** (solid clay thickness, unblurred offset shadow): xs 3 · sm 4 · md 5 · lg 8 · xl 12 (Showcase 12/16). Press = move down by the lip height and collapse the lip.
- **Borders**: hairline 1 · thin 2 · ring 3 · state 4 (running ring) · keyline 5 (Overlay). Focus 3px + 3px offset.
- **Z-index**: base 0 · raised 1 · sticky 10 · dropdown 20 · popover 30 · scrim 40 · modal 50 · toast 60 · tooltip 70 · confetti 80 (theme wipe 90).
