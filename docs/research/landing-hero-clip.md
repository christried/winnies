# Landing hero clip: tooling options

**Ticket:** #192 "Landing hero clip: tooling options" (child of map #166). Blocks #193.
**Scope:** how to make the muted, looping 16:9 clip for the Landing `video-frame` slot (board 19c) for this Nuxt 4 + Vue app; what each option costs; comparison of Remotion, HyperFrames and scripted Playwright capture in the pinned image from ADR-0004.
**Commit:** main at `e996e82` (working tree uncommitted; this file is new).
**Date:** 2026-10-17.

**Method.** Read-only on the repo. Local facts come from `docs/design_handoff_winnies/` (board 19c in `reference/prototype/Landing.dc.html`), ADR-0003 and ADR-0004. Web facts come from official docs, repos and license text (URLs in Sources). Where a claim comes only from a search snippet or a vendor page I could not fetch, it is marked **unverified**. No tool was installed and nothing was rendered; every number for file size is an estimate from the spec cap, not a measurement.

---

## The target (from the handoff)

From `reference/prototype/Landing.dc.html`, board 19c:

- `<video autoplay muted loop playsinline preload="metadata" poster="…">`, in a 16:9 well with `aspect-ratio` so there is no layout shift.
- **Files:** 1920 × 1080, 20–45 s seamless loop. MP4 (H.264) plus WebM (VP9 or AV1), each at most 6 MB.
- **Poster:** AVIF and JPEG, identical to frame 1, so the swap is invisible.
- **Sound:** muted always. If voice-over ever arrives, ship a captions track.
- **Reduced motion:** no autoplay; the poster shows with a Play button. Pressing Play still plays.
- **Content:** the Overlay's mid-WON! stamp over real gameplay, with Nini reacting. No baked-in text (German would need a second video).

Derived budget: 6 MB over 30 s is about 1.6 Mbps as the ceiling for each file. The 45 s upper bound pushes that down to about 1.07 Mbps. Both figures are arithmetic from the spec, not measurements.

Pause and WCAG 2.2.2 (`07-accessibility.md`) are page features, not encoder features, so they apply to every option.

---

## Option 1: Remotion

**What it is.** A React framework that renders videos by stepping through frames of React components. Its docs say it "renders a video on multiple threads and opens the website multiple times" ([Remotion random docs](https://www.remotion.dev/docs/random)).

**Can it render our Vue components?** No. Remotion's own Vue guide says the scenes must be React. Its bridge is a Vue wrapper that embeds Remotion's React components; it does not run Vue components inside a Remotion composition. It also requires `jsx: "react"` in the Vue tsconfig and the React plugin in Vite ([Remotion Vue guide](https://www.remotion.dev/docs/vue)). So either:

- every Landing scene is rebuilt in React as a Remotion composition, or
- the Vue page is loaded as a website Remotion opens, which Remotion's model does not describe (**unverified** that it can drive a live Nuxt page).

**Output formats and codecs** ([Remotion encoding docs](https://www.remotion.dev/docs/encoding/)):

| Codec | Containers | Quality control |
|---|---|---|
| H.264 (default) | .mp4, .mov, .mkv | CRF (1–51, default 18) or bitrate |
| H.265 | .mp4, .hevc | CRF (default 23) or bitrate |
| VP8 | .webm | CRF (4–63, default 9) or bitrate |
| VP9 | .webm | CRF (0–63, default 28) or bitrate |
| AV1 | .mp4, .webm, .mkv | CRF (0–63, default 30) or bitrate |

Both spec formats (H.264 MP4, VP9 WebM) are supported. Bitrate and CRF are mutually exclusive, and CRF cannot be used with hardware acceleration. File size: **estimate only**, about 1–3 Mbps at 1080p for flat UI motion, so roughly 4–11 MB for 30 s before tuning. Tuning to fit 6 MB is needed; Remotion gives the knobs but no size number.

**Seamless loop.** Remotion's `<Loop />` repeats an animation within a composition ([Remotion Loop docs](https://www.remotion.dev/docs/loop)). The docs do not say whether it is seamless, and do not mention video output. Looping is an authoring choice: if every element is a function of `frame % durationInFrames`, the last frame and frame 0 match by construction. This is reasoning from the frame model, not a documented guarantee.

**Deterministic re-rendering.** Strong by design. `random()` is seeded and "If the seed is the same, the output is always the same"; `Math.random()` triggers an ESLint warning because it "leads to bugs in rendering" ([Remotion random docs](https://www.remotion.dev/docs/random)). Re-rendering after a UI change means re-authoring the React scene, because the UI is not the source of the frames.

**Poster frame.** Not verified. Remotion can export stills, and a frame-0 still would match the video exactly, but I did not find the still-export page in this pass. **Unverified.**

**Licensing** ([Remotion license, GitHub LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)):

- Free License covers "an individual", "a for-profit organization with up to 3 employees", non-profits, and anyone "evaluating whether Remotion is a good fit, and are not yet using it in a commercial way".
- Everyone else "is required to obtain a Company License".
- Disallowed: copying or modifying Remotion code to sell, rent, license or sublicense your own derivative.
- The license says "In Remotion 5.0, the license will slightly change." I did not open the linked pull request, so the change is **unverified**.
- Pricing (from a search snippet, **unverified** against the pricing page, which renders client-side): Creators $25 per seat per month; Automators $0.01 per render with a $100/month minimum; Enterprise from $500/month ([Remotion pricing](https://www.remotion.dev/docs/pricing)).
- Whether Winnies needs a company license depends on headcount: a team of four or more "involved with the project" is the threshold in a third-party review (not verified against the license text). **This is a decision for the owner.**

**Fit with the WAAPI engine (ADR-0003).** Poor. ADR-0003 already rejects Remotion for live motion ("they render video files, not live interface motion") and keeps it only as a candidate for the Landing video. Using it means the hero clip's motion is a second motion system written in React, not the `winnies-motion` recipes. The recipes would not run unchanged, and the spec's `linear()` spring curves would need re-encoding in Remotion's model. It is a devDependency only, so the Overlay bundle is untouched.

---

## Option 2: HyperFrames

**What it is.** HeyGen's open-source HTML-to-video framework. The README describes a "Seekable page-to-video capture engine using Puppeteer and FFmpeg" that "seeks each frame in headless Chrome and encodes the result with FFmpeg", with the claim "same input, same frames, same output" ([HyperFrames repo](https://github.com/heygen-com/hyperframes)).

**Can it capture the real Nuxt pages?** Not documented. The README describes local HTML compositions: "an `index.html` composition plays as-is and can be previewed directly in the browser". It does not say whether a URL is accepted or whether a live Nuxt or Vue app works. The only realistic path is a static build of the app (`nuxi generate`) served locally, with the composition driving its timeline. Whether a hand-rolled WAAPI engine can be seeked this way is **unverified**. The general technique is `document.getAnimations()` and setting `currentTime`, but I did not confirm HyperFrames does that.

**Output formats and codecs.** The README documents MP4 ("deterministic MP4 videos") and a transparent-overlay mode in a skill description. It does not mention WebM, VP9, bitrate or CRF. A WebM output would need a second FFmpeg step; **unverified** whether that is supported or how.

**Requirements.** Node.js 22+ and FFmpeg ([HyperFrames repo](https://github.com/heygen-com/hyperframes)). Headless Chrome is implied by the capture method but not listed.

**Seamless loop and poster.** Neither is documented. Frame-identical loop points would follow from seeking to `T mod duration`, but this is **unverified**. The poster would be frame 0 from the same pipeline; the mechanism is **unverified**.

**Deterministic re-rendering.** Claimed by the vendor ("Built for CI, regression tests, and automated rendering"). Re-rendering after a UI change means editing the composition or re-running a static build; the composition is separate from the app, so drift is possible.

**Licensing.** Apache-2.0, "with no per-render fees or commercial-use thresholds" ([HyperFrames repo](https://github.com/heygen-com/hyperframes)). Good for this project.

**Maturity.** Young. A secondary article cites version 0.4.41 and conflicting star counts (4,351 and 23,000+) taken at different times. **Unverified** beyond the repo page.

**Fit with the WAAPI engine.** Better than Remotion in principle, since HyperFrames renders HTML and CSS rather than React, so the motion could stay in the DOM. It still needs a seekable timeline, and the engine would need a seek hook. ADR-0003 names HyperFrames as a candidate but does not commit to it.

---

## Option 3: Scripted Playwright capture in the pinned image (ADR-0004)

**What it is.** A Playwright script drives the real Nuxt app in `mcr.microsoft.com/playwright:v<X.Y.Z>-noble`, the image ADR-0004 already pins for visual regression. The script seeds a Winnie, steps the clock and captures frames or a screencast, and ffmpeg encodes the result.

**Can it capture the real Nuxt pages?** Yes. It runs the app itself, so the WAAPI engine runs unchanged, and the signed-out Landing needs no auth. Demo data would be a seeded fixture (the Landing's example run is already synthetic per the handoff).

**Determinism.** Playwright's `page.clock` overrides `Date`, `setTimeout`, `setInterval`, `requestAnimationFrame` and `performance`. `clock.pauseAt` "stops the timers", and `setFixedTime` alone fakes only `Date` ([Playwright clock docs](https://playwright.dev/docs/clock)). That gives control over JS-driven timing. Whether CSS and WAAPI animations follow the controlled clock is **unverified**; the usual approach is to set `currentTime` on each animation through `document.getAnimations()`, which I did not verify against this app.

**Capture paths:**

- **`page.screencast`** (Playwright 1.59+; start with `path`): saves a video, and the default size is the viewport scaled to fit 800×800. `fps` defaults to 25 and applies only when `path` is set. It is realtime, so frame timing is not exact ([Playwright screencast API](https://playwright.dev/docs/api/class-screencast)).
- **`recordVideo`**: the same realtime recorder, with the default size scaled to 800×800 ([Playwright videos docs](https://playwright.dev/docs/videos)).
- **Frame-exact path**: step `page.clock` by one frame, take a screenshot or `onFrame` JPEG, and encode with ffmpeg. Slower, but every frame is a deterministic function of the script. This is the path I'd use for a seamless loop, since the last frame can be the exact state at `T`.

**Output formats and codecs.** Playwright's recorder writes WebM with VP9 via libvpx-vp9, with `-crf 8`, `-deadline realtime`, `-cpu-used 8`, `-lag-in-frames 0`, default 25 fps and a bitrate scaled from the pixel rate (1000k at 800×450 and 25 fps) ([Playwright videoRecorder.ts, main branch](https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/videoRecorder.ts)). That is the source of the built-in recorder and not a documented setting. The quality is high but the size is not controlled. For the MP4 and the size cap, the frame-exact path encodes with ffmpeg at explicit CRF or bitrate, so H.264 MP4 and VP9 WebM can both be produced. ffmpeg availability inside the Playwright image is **unverified**.

**Size.** Estimate only: with ffmpeg at the same bitrate targets as Option 1, a flat UI clip fits the 6 MB cap. Unmeasured.

**Seamless loop.** Achievable with the frame-exact path: capture `T = 0 .. duration-1` and make the state at `duration` equal the state at 0 by construction (a looping scenario). This depends on the scenario, not the tool. **Unverified** in practice.

**Poster.** Frame 0 from the same run, saved as JPEG. AVIF production is not documented here; Playwright screenshot formats (`png`, `jpeg`) are **unverified** from primary docs in this pass, so AVIF would come from an ffmpeg or image step (**unverified**).

**Re-rendering after UI changes.** Re-run the script in the pinned image. ADR-0004 already governs that image, so the hero clip sits in the same pipeline as visual regression: same version bumps, same host-independence.

**Licensing.** Playwright's license and the ffmpeg license were not checked in this pass. **Unverified.** Both are commonly open source; the owner should confirm before shipping.

**Fit with the WAAPI engine (ADR-0003).** Best. The clip is recorded from the shipped motion code, so there is no second motion system and no rebuild. The engine's `prefers-reduced-motion` behaviour and token-driven knobs apply without changes.

---

## Comparison

| | Remotion | HyperFrames | Playwright in pinned image |
|---|---|---|---|
| Renders Vue / Nuxt as-is | No (React only) | Not documented; static build unverified | Yes (real app) |
| WebM / MP4 | Both (VP8/VP9/AV1 webm; H.264 mp4) | MP4 documented; WebM unverified | Both via ffmpeg (WebM native; MP4 by ffmpeg) |
| Quality control | CRF or bitrate | Not documented | CRF/bitrate via ffmpeg; built-in recorder fixed |
| Seamless loop | By authoring (frame modulo) | Unverified | By scenario and frame-exact capture |
| Deterministic re-render | Strong (seeded, frame-based) | Claimed; composition drifts from app | Strong with `page.clock` + frame stepping; CSS/WAAPI unverified |
| Poster frame | Unverified | Unverified | Frame 0; AVIF step unverified |
| Licensing | Free for individuals and orgs of 3 or fewer; company licence otherwise (**owner decision**) | Apache-2.0, no fees | Unverified |
| WAAPI engine fit (ADR-0003) | Poor: rebuild in React | Partial: DOM-based, needs seek hook | Best: unchanged |

---

## Recommendation

**Use scripted Playwright capture of the real Landing in the ADR-0004 pinned image.** It is the only option that renders the shipped Nuxt app and its WAAPI engine unchanged, and it reuses the image and version pins that already govern visual regression. The frame-exact path (step `page.clock`, capture each frame, encode with ffmpeg to H.264 MP4 and VP9 WebM at explicit CRF or bitrate targeting 6 MB or less) gives a seamless loop and a deterministic re-render. The poster is frame 0 from the same run.

Remotion is rejected: it cannot render the Vue components, so every scene would be rebuilt in React, and its free license stops at three employees. HyperFrames is the fallback if a designed composition is needed without the app. It is Apache-2.0 and deterministic in its own frame model, but its URL capture, WebM output and loop behaviour are not documented.

**Open items before #193:**

1. Confirm `page.clock` plus `document.getAnimations()` drives the app's WAAPI recipes to exact frames (a spike on the current Landing).
2. Confirm ffmpeg is available in the pinned Playwright image, or add it to the image.
3. Measure real sizes at 20 s and 45 s and tune CRF to the 6 MB cap.
4. Check the Playwright and ffmpeg licences in the pinned versions.
5. Owner decision: whether Winnies needs a Remotion company licence (only relevant if Remotion is chosen).

---

## Sources

- Board 19c, video spec: `docs/design_handoff_winnies/reference/prototype/Landing.dc.html` (local)
- ADR-0003 motion engine: `docs/adr/0003-motion-is-a-hand-rolled-waapi-engine.md` (local)
- ADR-0004 pinned Playwright image: `docs/adr/0004-visual-regression-is-self-hosted-in-a-pinned-playwright-image.md` (local)
- Remotion license (GitHub): https://github.com/remotion-dev/remotion/blob/main/LICENSE.md
- Remotion license page: https://www.remotion.dev/license (redirects to the GitHub file)
- Remotion pricing: https://www.remotion.dev/docs/pricing (client-rendered; tier figures are from a search snippet, **unverified**)
- Remotion Vue guide: https://www.remotion.dev/docs/vue
- Remotion encoding: https://www.remotion.dev/docs/encoding/
- Remotion random: https://www.remotion.dev/docs/random
- Remotion Loop: https://www.remotion.dev/docs/loop
- HyperFrames repo: https://github.com/heygen-com/hyperframes
- Playwright clock: https://playwright.dev/docs/clock
- Playwright videos: https://playwright.dev/docs/videos
- Playwright screencast API: https://playwright.dev/docs/api/class-screencast
- Playwright recorder source (main branch, not the pinned version): https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/videoRecorder.ts
