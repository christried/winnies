# 05 · Assets

Everything under `assets/`. All SVGs are hand-checked to render in a browser `<img>`; none depend on web fonts (the wordmark is outlined).

## Wordmark — `assets/wordmark/`
| File | Use |
|---|---|
| `winnies-wordmark.svg` | Primary. Seven letters outlined from Mochiy Pop One, each with its fixed fill, 3-step lip (5/10/15 % of the size) and tilt (−5, +3, −2, +5, −3, +2, −4°), plus the soft drop shadow. Same file on Milk and on Night. |
| `winnies-wordmark-noshadow.svg` | Same without the blurred shadow: small sizes (< 40px), og:image, email. |
| `winnies-app-icon.svg` | App icon / PWA / social avatar: the Bubblegum “w” with its lip on a Surface tile with a pink lip. Export 512/192/180 PNGs from it. |

In the UI, prefer the live-text wordmark (spans in Mochiy, so the nav/hero letters can wave — A08/S03); use the SVG where fonts can’t load (og:image, emails, favicons, README). Rules: only on Milk or Night, never on an accent fill or over gameplay, min 24px tall, clear space = height of the “n”, never redraw or recolour.

## Favicons — `assets/favicon/`
32 × 32 SVGs (T09). The running favicon is drawn at runtime on a 32px canvas: Surface disc, pink track ring (#FFD2E5) with a #D9478A arc that fills with the seconds (60 steps), Bubblegum “w”. The static files show each state.
| File | When |
|---|---|
| `favicon-idle.svg` | No Winnie running |
| `favicon-running.svg` | Running (arc shown at :45) |
| `favicon-paused.svg` | Paused (empty track) |
| `favicon-reduced-running.svg` | Running with reduced motion: static pink dot, no ticking arc |
| `favicon-complete.svg` | Winnie Complete (crown) |

## Mascot — `assets/mascot/`
Nini as static compositions (body + lip + face + accessory), 248 × 252 viewBox, body 200 × 172 at (0,0): `nini-snooze`, `nini-run-0` (Fired up) … `nini-run-5` (Fuming), `nini-cheer`, `nini-party` (crown). Running moods wear the Bubblegum headband (slips at run-3). Body tints: run-3 greyer, run-4/5 redder, party buttery. In the app, build Nini in HTML/CSS (body div with `--radius-mochi` + gradient + lip shadow, face SVG on top, accessories as separate layers) so the beats can animate layers independently; the reference implementation is `reference/prototype/ClayFace.dc.html` (`mochi` + `mascot` props).

## Faces — `assets/faces/`
13 transparent face-feature layers, viewBox 0 0 100 100, Cocoa features. They sit on a coloured `face-disc` (rows, Overlay) or on Nini (placed at left 19 %, top 30 %, width 62 % of the body).
`ready` (untouched) · `snooze` (idle) · `run-0-fired-up` · `run-1-locked-in` · `run-2-sweating` · `run-3-fumes` · `run-4-grumpy` · `run-5-fuming` · `won-too-easy` (< 1 h) · `won` (1–3 h) · `won-finally` (≥ 3 h) · `cheer` · `party`.
Accent layers (zzz, sweat drops, veins, steam, sparkles) animate per A04; in the static SVGs they are part of the face. The prototype (`ClayFace.dc.html`) draws them as separate paths if you need to animate them individually.

## Brand marks — `assets/brand/`
Discord and Twitch from Simple Icons (CC0 icon data; the marks are trademarks of their owners — follow their brand guidelines). `*-official.svg` = brand colour, `*-cocoa.svg` = #4A2B3A. Never redraw them.

## Icons — `assets/icons/`
Material Symbols Rounded, 125 icons, each in 4 cuts, `viewBox="0 -960 960 960"`, `fill="currentColor"`:
- `w500/` — default (weight 500, outline): `.w-ico`
- `w500-fill/` — active/primary states (FILL 1)
- `w600/` — icon buttons (weight 600, outline)
- `w700-fill/` — inside text buttons (weight 700, FILL 1)
Sizes used: 18 / 22 / 28 / 30px. No custom icons, no emoji. Alternative: load the variable font (Google Fonts CDN or self-host) and use ligatures, as the prototypes do; then the SVGs are the fallback/reference. Source: fonts.gstatic.com Material Symbols SVG endpoint, downloaded 2026-10-15. Licence: Apache 2.0 (`assets/fonts/licences/MaterialSymbols-Apache-2.0.txt`).

| Icon | Meaning in Winnies | Used in |
|---|---|---|
| `add` | Add / Create | WinniesWorkspace, SharedView, LandingPage, WorkspaceP6, SharedViewP6, P6bWorkspace |
| `alarm` |  | P6bWorkspace, P6bShared |
| `archive` | Archive | P6bWorkspace |
| `arrow_back` |  | WinniesWorkspace, WorkspaceP6, P6bWorkspace |
| `arrow_forward` |  | SharedViewP6 |
| `arrow_upward` |  | WinniesWorkspace, WorkspaceP6 |
| `auto_awesome` |  | LandingPage |
| `bedtime` | Paused (6b) | P6bWorkspace |
| `block` | Timeboxed: lost | P6bWorkspace |
| `bolt` |  | SharedView, CompletionStats, SharedViewP6 |
| `bug_report` | Report an issue | WinniesWorkspace, ChangelogPage, WorkspaceP6 |
| `calendar_today` |  | LandingPage, ChangelogPage |
| `campaign` |  | ChangelogPage |
| `cancel` | Loss / Failed | CompletionStats, P6bWorkspace |
| `casino` | Randomizer / Generate | P6bWorkspace |
| `cast` |  | LandingPage, WinnieSettings |
| `celebration` |  | SharedViewP6, P6bWorkspace |
| `check` | Won toggle (outline), copied | WinniesWorkspace, SharedView, OverlayFrame, LandingPage, ChangelogPage, OGCard, WinnieSettings, WorkspaceP6, SharedViewP6, OverlayFrameP6, P6bWorkspace, P6bOverlay |
| `check_circle` | Won marker / pill | WinniesWorkspace, SharedView, OverlayFrame, LandingPage, OGCard, WinnieSettings, WorkspaceP6, SharedViewP6, OverlayFrameP6, P6bWorkspace, P6bShared, P6bOverlay |
| `close` | Close / dismiss | WinniesWorkspace, SharedView, LandingPage, ChangelogPage, WinnieSettings, WorkspaceP6, SharedViewP6, P6bWorkspace, P6bShared, P6bOverlay |
| `cloud` |  | WinnieSettings |
| `cloud_done` |  | LandingPage, WinnieSettings |
| `cloud_off` | Offline / reconnecting | WinniesWorkspace, SharedView, WorkspaceP6, SharedViewP6 |
| `content_copy` | Copy link | WinniesWorkspace, SharedView, LandingPage, WinnieSettings, WorkspaceP6, SharedViewP6, P6bShared |
| `contrast` | Theme: Match system | readme mapping |
| `control_point_duplicate` | Duplicate | WinniesWorkspace, WorkspaceP6 |
| `cyclone` |  | P6bWorkspace |
| `dark_mode` | Theme: Dark | WinniesWorkspace, SharedView, LandingPage, ChangelogPage, WorkspaceP6, SharedViewP6 |
| `delete` | Delete | WinniesWorkspace, WinnieSettings, WorkspaceP6 |
| `done` |  | SharedViewP6 |
| `donut_large` | Wheel | P6bWorkspace |
| `drag_indicator` | Drag handle | WinniesWorkspace, WorkspaceP6, P6bWorkspace |
| `edit` | Edit | WinniesWorkspace, WorkspaceP6, P6bWorkspace |
| `edit_note` |  | P6bWorkspace |
| `emoji_events` | Complete / trophy | WinniesWorkspace, SharedView, OverlayFrame, LandingPage, OGCard, WinnieSettings, WorkspaceP6, SharedViewP6, OverlayFrameP6, P6bWorkspace |
| `error` | Error | WinniesWorkspace, SharedView, ChangelogPage, WinnieSettings, WorkspaceP6, SharedViewP6 |
| `expand_less` | Caret (menu open) | WinniesWorkspace, WorkspaceP6 |
| `expand_more` | Caret (menu closed) | WinniesWorkspace, WorkspaceP6, P6bWorkspace |
| `explore` |  | ChangelogPage |
| `exposure_neg_1` | Counter −1 | WinniesWorkspace, WorkspaceP6 |
| `exposure_plus_1` | Counter +1 | WinniesWorkspace, CompletionStats, WorkspaceP6, P6bWorkspace |
| `exposure_zero` |  | SharedViewP6 |
| `fact_check` |  | WinnieSettings |
| `flag` | Standard mode (settings) | WinnieSettings |
| `format_list_bulleted` |  | WinniesWorkspace, WorkspaceP6, SharedViewP6 |
| `format_list_numbered` |  | LandingPage |
| `group` | Players | WinnieSettings |
| `group_off` |  | WinnieSettings |
| `heart_broken` | Loss counter | WorkspaceP6, SharedViewP6 |
| `help` | Confirmation prompt | P6bWorkspace |
| `history` |  | ChangelogPage |
| `home` |  | ChangelogPage |
| `hourglass_bottom` | Timeboxed / fastest-slowest | CompletionStats, P6bWorkspace, P6bOverlay |
| `hourglass_top` | Timeboxed mode | P6bWorkspace, P6bShared, P6bOverlay |
| `info` | Info toast | WinnieSettings, P6bWorkspace |
| `insights` | Statistics placeholder | WinniesWorkspace |
| `inventory_2` |  | P6bWorkspace |
| `light_mode` | Theme: Light | WinniesWorkspace, SharedView, LandingPage, ChangelogPage, WorkspaceP6, SharedViewP6 |
| `link` | Link | LandingPage, ChangelogPage, WinnieSettings, P6bWorkspace |
| `link_off` | Gone | WinniesWorkspace, SharedView, OverlayFrame, ChangelogPage, WinnieSettings, WorkspaceP6, SharedViewP6, OverlayFrameP6, P6bWorkspace |
| `local_fire_department` |  | WinnieSettings |
| `lock` | Locked / private | WinniesWorkspace, LandingPage, WinnieSettings, WorkspaceP6, P6bWorkspace, P6bShared, P6bOverlay |
| `logout` | Sign out | WinniesWorkspace, WorkspaceP6 |
| `manage_accounts` |  | WorkspaceP6 |
| `menu_book` |  | LandingPage |
| `more_horiz` | Card overflow | WinniesWorkspace, WorkspaceP6, P6bWorkspace |
| `more_vert` | Row overflow | WinniesWorkspace, WorkspaceP6, P6bWorkspace |
| `movie` |  | LandingPage |
| `new_releases` |  | ChangelogPage |
| `notifications` | Discord notifications | WinnieSettings |
| `open_in_new` | Open in a new tab | WinniesWorkspace, ChangelogPage, WinnieSettings, WorkspaceP6, SharedViewP6 |
| `pan_tool` |  | WorkspaceP6 |
| `pause` | Pause; Paused pill | WinniesWorkspace, LandingPage, WorkspaceP6, P6bWorkspace, P6bOverlay |
| `pause_circle` | Video pause | LandingPage |
| `person` | Avatar fallback | readme mapping |
| `person_add` |  | WinnieSettings |
| `person_pin` |  | WorkspaceP6 |
| `person_remove` |  | WinnieSettings |
| `play_arrow` | Start (Challenge / Winnie) | WinniesWorkspace, LandingPage, WorkspaceP6, P6bWorkspace, P6bOverlay |
| `play_circle` | Video play | LandingPage |
| `playlist_add` |  | P6bWorkspace |
| `priority_high` |  | WinnieSettings, WorkspaceP6 |
| `progress_activity` | Loading spinner | WinniesWorkspace, SharedView, OverlayFrame, LandingPage, ChangelogPage, WinnieSettings, WorkspaceP6, SharedViewP6, OverlayFrameP6 |
| `push_pin` | Pinned | WinniesWorkspace, SharedView, OverlayFrame, LandingPage, WorkspaceP6, SharedViewP6, OverlayFrameP6, P6bWorkspace, P6bShared |
| `radio_button_unchecked` | Not won | LandingPage, P6bWorkspace, P6bShared |
| `refresh` | Try again | WinniesWorkspace, ChangelogPage, WorkspaceP6 |
| `remove` | Decrease | WinniesWorkspace, LandingPage, WorkspaceP6, P6bWorkspace |
| `replay` |  | P6bWorkspace |
| `restart_alt` | Reset timer / Run it back | WinniesWorkspace, LandingPage, WinnieSettings, WorkspaceP6, SharedViewP6, P6bWorkspace, P6bShared, P6bOverlay |
| `restore_from_trash` | Restore | P6bWorkspace |
| `rocket_launch` | Latest release tag | ChangelogPage |
| `schedule` | Stale / created date | WinniesWorkspace, WorkspaceP6, SharedViewP6, P6bWorkspace, P6bShared |
| `science` | Closed alpha tag | ChangelogPage |
| `search` |  | P6bWorkspace |
| `sell` |  | ChangelogPage |
| `send` |  | WinnieSettings |
| `sensors` | Back live | SharedView |
| `sentiment_satisfied` |  | P6bWorkspace |
| `settings` | Settings | WinniesWorkspace, WinnieSettings, WorkspaceP6 |
| `share` | Share | WinniesWorkspace, WorkspaceP6, P6bWorkspace |
| `shield` | Gauntlet attempts | P6bWorkspace, P6bShared, P6bOverlay |
| `skull` | Cursed mode | P6bWorkspace, P6bShared |
| `south` |  | WorkspaceP6, P6bWorkspace, P6bShared |
| `spa` | Calm preset | LandingPage |
| `sports_esports` | Standard mode / game | LandingPage, WinnieSettings, WorkspaceP6, P6bWorkspace |
| `stadia_controller` | Game / Play this myself! | WinnieSettings, SharedViewP6, P6bWorkspace |
| `star` | Won sticker | LandingPage |
| `sticky_note_2` | Challenge note | WorkspaceP6, SharedViewP6 |
| `swap_horiz` |  | WinnieSettings |
| `swap_vert` |  | SharedViewP6 |
| `swords` | Gauntlet mode | P6bWorkspace, P6bShared, P6bOverlay |
| `sync_problem` |  | WinnieSettings |
| `timer` | Running | WinniesWorkspace, OverlayFrame, LandingPage, OGCard, CompletionStats, WorkspaceP6, OverlayFrameP6, P6bWorkspace, P6bOverlay |
| `today` |  | P6bWorkspace |
| `touch_app` |  | P6bWorkspace |
| `translate` | Language | WinniesWorkspace, WorkspaceP6 |
| `trending_up` |  | P6bWorkspace |
| `verified` | Confirmation mode | P6bWorkspace, P6bShared |
| `videocam` |  | LandingPage |
| `view_carousel` |  | LandingPage |
| `visibility` | View only | WinniesWorkspace, SharedView, LandingPage, WinnieSettings, WorkspaceP6, SharedViewP6, P6bWorkspace, P6bShared |
| `volume_off` | Video muted | LandingPage |
| `volume_up` | Video sound | LandingPage |
| `warning` | Warning | readme mapping |
| `weekend` |  | WinnieSettings, WorkspaceP6 |

## Fonts — `assets/fonts/`
| Family | Weights | Role | Source | Licence |
|---|---|---|---|---|
| **Mochiy Pop One** | 400 | Display: headings, game names, buttons, wordmark, **every digit** (timers, counters, percentages) | Google Fonts · github.com/google/fonts (ofl/mochiypopone) · by FONTDASU | SIL Open Font License 1.1 (`licences/MochiyPopOne-OFL.txt`) |
| **M PLUS Rounded 1c** | 500, 700, 800 | Body text, labels, menus, toasts | Google Fonts · github.com/coz-m/MPLUS_FONTS · by M+ Fonts Project | SIL Open Font License 1.1 (`licences/MPLUSRounded1c-OFL.txt`) |
| **Material Symbols Rounded** | variable (wght 400–700, FILL 0–1, opsz 20–48) | Icons | Google Fonts · github.com/google/material-design-icons | Apache License 2.0 (`licences/MaterialSymbols-Apache-2.0.txt`) |

Self-hosted files: Latin + Latin Extended `woff2` subsets for the two text fonts (covers English and German incl. ä ö ü ß), with `fonts.css` (`font-display: swap`). Japanese subsets are not included. Preload `MochiyPopOne-400-latin.woff2` and `MPLUSRounded1c-700-latin.woff2`. Timers need Mochiy before first paint of digits to avoid slot jumps: the fixed slots (`0.7em`) keep layout stable even with the fallback font. Material Symbols: use the SVGs, or self-host the variable woff2 from Google Fonts (≈ 3–4 MB full; subset with `&icon_names=` to the 125 names above).

## Imagery
None. Character comes from faces, Nini and the wordmark. Two image slots are placeholders for real material: the Landing hero video poster and the gameplay stand-in behind Overlay previews (`Gameplay.dc.html`).
