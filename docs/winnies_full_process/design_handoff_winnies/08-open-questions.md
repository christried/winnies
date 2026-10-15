# 08 · Open questions and assumptions

Decisions the design made that the functionality brief didn’t settle. **A** = assumption built into the prototypes (implement as described unless product says otherwise). **Q** = needs a product decision before or during build.

## Timers and states (as built in the prototypes)
- **A1 · Several Challenges can run at once.** Each has its own Challenge Timer. The Total Timer is a single wall-clock stopwatch that runs while at least one Challenge runs and the Winnie isn’t paused (it is **not** the sum of the Challenge Timers).
- **A2 · Pause Winnie keeps each Challenge’s running flag.** Pausing freezes everything; Start Winnie resumes exactly the Challenges that were running. If none were running, Start Winnie starts the first open Challenge in sort order. Start Winnie is disabled with 0 Challenges.
- **A3 · Starting a Challenge while the Winnie is paused un-pauses the Winnie** (brief: “starting any Challenge starts it”).
- **A4 · Marking a Challenge Won stops its timer.** Un-winning keeps its time and leaves it paused; it travels back to its group (R18) without celebration.
- **A5 · Sort rank:** Pinned (0) → open (1) → Won (2); a Pinned Challenge that is Won sinks to the Won group but keeps its pin glyph. Manual order applies inside each group. Dragging across groups reverts with a message.
- **A6 · Counter range:** count is clamped to 0…Target in Core (the button shakes at the bounds); Target is a whole number 1–9999. 6a “Counter overshoot” lifts the upper clamp.
- **A7 · Complete fires once per Winnie.** The flag is stored with the Winnie (server), so it never replays on reload, on another device, or on the Shared View/Overlay reload. If a Challenge is un-won after Complete, the Winnie leaves Complete; completing it again does **not** fire the big celebration again (only the normal C01 Won). → **Q:** confirm, or allow a second celebration.
- **A8 · Timer formats:** Total `MM:SS` under an hour, `H:MM:SS` from an hour. Challenge Timers `00:00` until first started, then always `H:MM:SS`. Fixed-width digit slots everywhere.
- **A9 · Fatigue thresholds** (faces and Nini): 20 min, 1 h, 2 h, 3 h, 4 h of the *longest currently running* Challenge. Won faces by duration: < 1 h, 1–3 h, ≥ 3 h. Thresholds are tokens.

## Product questions
- **Q1 · “N running” vs state pill.** The brief puts “N running” in the summary; the design replaced it with a Running / Paused / Complete pill because each running row already shows a pink ring + word. If the count matters (several running at once), use “Running · 2”. Decide.
- **Q2 · A third modal.** The brief lists two modals (Create, Delete Winnie). The prototypes confirm **Delete Challenge** with the same modal (“Delete {game}? Its timer and counter go with it.”). Alternative: delete immediately with an Undo toast (no modal). Decide.
- **Q3 · Features added by design, not in the brief:** Winnie overflow gained **Duplicate Winnie** and **Reset all timers**; the Complete area has **Share the win** and **Run it again**; the nav has **Report an issue** (opens GitHub Issues) and a version chip; an **offline banner** with “Last saved”; account menu shows **Settings** and **Language** (6a). Keep, cut or defer each.
- **Q4 · Daily quota wording.** Brief: “max 10 per 24h”. Copy says “The count resets at midnight.” Rolling 24 h needs different copy (“Try again in 3 h 12 min”); midnight needs a timezone (the Owner’s). Decide which.
- **Q5 · Theme on the Shared View and Overlay.** Assumed: Shared View has its own Light / Dark / Match system control, stored per Viewer in localStorage (default system). Overlay card: light by default, dark as an Owner setting (OBS has no colour scheme). The Overlay theme isn’t yet in the 6a Overlay settings frame — add it there.
- **Q6 · Sign-in card (15a–c) vs Landing (19a).** Assumed: `/` signed out = Landing; the sign-in card appears when a signed-in-only route is opened while signed out, and as the sign-in step of “Play this myself!”. Confirm routing.
- **Q7 · Dark Overlay card on very dark footage.** The card edge is 1.42:1 against black (content is fine). Proposed: in dark, an outer 2px ring in `--color-control-lip` (5.58:1). Not in the prototypes; needs a quick visual check.
- **Q8 · Shared View freshness thresholds.** Assumed: push updates (or poll ≤ 5 s); “Updated {n}s ago” after 10 s; stale (Butter) after 30 s; Reconnecting… after 2 s of lost connection; timers keep counting locally from the last snapshot.
- **Q9 · Overlay paging.** 5 Challenges per page (6a makes it 3–5), every 10 s, same sort as the Workspace (running/Pinned on page 1). Rotation pauses while a WON! stamp shows; if the Won row is on another page, flip to it first. On Complete, pages rotate through the Won list.
- **Q10 · Favicon “won”.** The brief says the favicon reflects idle / running / won; interpreted as idle / running / paused / **Complete** (a crown). A per-Challenge Won flash in the favicon was not designed.
- **Q11 · Field lengths.** Designed for ~80 characters in Game and Win Condition (wrap/ellipsis rules in 01 · 12 and 18i). Current limits 30 / 40; Winnie name 30. Notes (6a) 200.
- **Q12 · Sound.** Planned, muted by default: Off / Subtle / Full in settings, separate Overlay switch. Cue list in 04. No audio files exist; the moods are briefs for a sound designer.
- **Q13 · 6b rules are proposals.** Gauntlet attempts 1–20 per Winnie; Timeboxed 30 min–48 h; Cursed step sizes; Archive 30 days; Shared View reset banner stays 20 s then folds into the summary; Overlay reset card 8 s centre-screen. All need product sign-off. Game Mode is chosen once at creation (picker in Create Winnie).
- **Q14 · Placeholder facts.** `winnies.app` URLs, GitHub repo `winnies-app/winnies`, issue numbers, version numbers (v0.9.2 · beta), release dates and the changelog content are invented.

## Implementation assumptions
- **I1 · Tailwind v4 mapping** uses `@theme inline` registrations that point at same-named runtime variables, with the token file imported unlayered (see 02). Verify against your exact Tailwind version; fallback described there.
- **I2 · Fonts** are self-hosted Latin/Latin-Ext subsets; no Japanese.
- **I3 · Wordmark SVG** is outlined from Mochiy Pop One glyphs without kerning (the live-text version is also unkerned because each letter is its own span). Identical shapes.
- **I4 · Nini SVGs** are static references; the animated mascot should be built from layers (see 05).
- **I5 · Prototype code** (`reference/prototype/*.dc.html`) is a design reference built on a small in-house runtime (`support.js`). Don’t port it; port the tokens, components and the motion engine.
- **I6 · Reduced motion** also stops the favicon’s ticking arc (static dot) but not the tab title, which is content.
- **I7 · Tab title** updates once per second (“▶ 1:02:03 · Kitty vs. the world”), including in background tabs where the browser allows.
- **I8 · Contrast** was computed from the token hex values; the visual material effects (inner highlights, grain at 5 % alpha) don’t sit under text in a way that lowers these ratios.
