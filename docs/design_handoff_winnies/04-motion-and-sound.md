# 04 · Motion spec and sound cues (final)

Motion is a headline feature. Everything here is **CSS + Web Animations API only** (no libraries). The reference engine is `reference/motion/winnies-motion.js` (≈320 lines, framework-free): port it as a Nuxt composable (`useWinniesMotion()`), keep its recipe names. Durations, easings and the five motion knobs are read from the tokens at runtime, so **the CSS file stays the source of truth**.

## Rules that apply to every moment
1. **Three tiers**, all on everywhere at full strength: **Ambient** (idle life, infinite loops), **Responsive** (input, data, the per-second tick), **Celebratory** (Won, Complete). Each tier can be switched off independently (prototype tweak; product setting later).
2. **Only `transform`, `opacity` and `filter` animate.** Lists use FLIP (capture rects → state change → animate the delta). No layout properties, no box-shadow animation (glows animate the opacity of a pre-drawn layer).
3. **Reduced motion** (`prefers-reduced-motion: reduce` OR `<html data-motion="reduce">`) zeroes every `--dur-*`, sets `--motion-gain: 0`, `--particle-count: 0`, `--ambient-motion: paused`. The engine's `m.on(tier)` returns false, so **no animation is created at all** and every moment lands on the "Reduced end state" column below. Nothing is hidden behind motion: every state also has a colour + icon/shape + word.
4. **Dialect = five knobs** read from tokens: `--motion-gain` (amplitude multiplier), `--tick-hop`, `--tick-squash`, `--amb-rate` (playbackRate of ambient loops), `--particle-count`. Workspace 1 / −6px / .04 / 1 / 24 · Broadcast 1.25 / −10px / 0 / 1 / 28 · Showcase 1.6 / −14px / .1 / 1.4 / 48 · Overlay Calm preset .6 / −4px / 0 / .5 / 0.
5. **Ticks never stack:** tick animations are clamped to 95% of the real tick interval. Above a 16× clock (dev/demo), per-second ticks are skipped and only minute/hour rollovers animate.
6. **Focus rings never animate** (R32). Direct manipulation (dragging) is never animated, only the pickup/drop.
7. Particles live in one `pointer-events:none` layer per surface (`z-index: var(--z-confetti)`), count capped by `--particle-count`, each removes itself on finish.
8. Ambient loops pause when the tab is hidden and when the element is off-screen (IntersectionObserver). The Overlay runs for hours: loops use `iterations: Infinity` on the compositor; no per-frame JS.
9. Every ticking second animates: only the digit slots that changed hop (fixed-width slots mean nothing shifts).

## Easings (copy exactly)
| Token | Value | Use |
|---|---|---|
| `--ease-spring` | `cubic-bezier(.3, 1.7, .5, 1)` | presses, small pops |
| `--ease-hover` | `cubic-bezier(.3, 1.8, .5, 1)` | hover lifts |
| `--ease-out` | `cubic-bezier(.15, .7, .3, 1)` | entrances, jellies, particles |
| `--ease-in` | `cubic-bezier(.55, 0, .75, .2)` | exits only |
| `--ease-in-out` | `cubic-bezier(.45, 0, .55, 1)` | loops, arcs |
| `--ease-standard` | `cubic-bezier(.2, 0, 0, 1)` | colour/filter fades |
| `--ease-stepped` | `steps(6, end)` | steam, vibrate ("on twos", stop-motion feel) |
| `--spring-snappy` | `linear(0, .2 4%, .6 10%, .88 16%, 1.02 22%, 1.06 28%, 1.04 36%, 1 46%, .995 60%, 1)` | FLIP travel, inline edit, drag |
| `--spring-bouncy` | `linear(0, .3 6%, .8 13%, 1.1 20%, 1.15 25%, 1.1 30%, .97 40%, .95 46%, 1 56%, 1.02 64%, 1 78%, 1)` | menus, modals, toasts, stamps, rollovers |
| `--spring-soft` | `linear(0, .12 5%, .4 14%, .7 24%, .92 34%, 1.02 44%, 1.03 52%, 1.01 66%, 1)` | large slow settles |

Fallback: if `CSS.supports('transition-timing-function','linear(0, 1)')` is false, springs fall back to `--ease-spring` (the engine does this).

## Durations
`--dur-instant 90` · `fast 160` · `base 240` · `hover 300` · `toast 360` · `flick 380` · `modal 420` · `page-x 460` · `tick 480` · `travel 560` · `theme 560` · `land 600` · `jelly 700` · `minute 720` · `stamp 900` · `droop 950` · `burst 1300` (Broadcast 1000) · `hour 1400` · `cheer 1800` · `breathe 2200` · `celebrate 2400` · `wave 2600` · `highlight 3000` · `float 4800` · `shimmer 9000` · `page 10000` · `drift 60000` (ms). Staggers: wordmark 110, burst 60, list 40, digit 50, menu 30.

## Keyframe library
Written as WAAPI keyframe arrays (identical to CSS @keyframes percentages). `g` = `--motion-gain`, `hop` = `--tick-hop`, `sq` = `--tick-squash`.

```js
// JELLY (C01 row, R24 counter, hero jelly). a = amplitude (1 Workspace, .8 Overlay rows, .5 small)
jelly(a) = [ {transform:'scale(1,1)'}, {transform:`scale(${1+.07*a},${1-.12*a})`, offset:.18},
  {transform:`scale(${1-.06*a},${1+.08*a})`, offset:.42}, {transform:`scale(${1+.03*a},${1-.03*a})`, offset:.68},
  {transform:'scale(1,1)'} ]                                   // --dur-jelly, --ease-out
// BUTTON RELEASE (R02, after the press collapses the lip)
release = [ {transform:'scale(1,1)'}, {transform:`scale(${1+.06*g},${1-.06*g})`, offset:.3},
  {transform:`scale(${1-.03*g},${1+.03*g})`, offset:.65}, {transform:'scale(1,1)'} ]   // 420ms, --ease-spring
// TOTAL TIMER SECOND TICK (T01/T05) — only changed digit slots
tickTotal = [ {transform:'none'}, {transform:`translateY(${hop}px) scale(${1-sq},${1+sq})`, offset:.35},
  {transform:`translateY(0) scale(${1+sq},${1-sq})`, offset:.7}, {transform:'none'} ]  // --dur-tick (≤95% of interval), --ease-out
// ROW TIMER TICK (T02/T06). tilt = 5*g Workspace, 0 Broadcast, 8 Showcase
tickRow = [ {transform:'none'}, {transform:`translateY(${hop*.6}px) rotate(${-tilt}deg)`, offset:.4}, {transform:'none'} ]  // --dur-flick, --ease-spring
// MINUTE / HOUR ROLLOVER (T03/T04). k = 1.6 minute, 2.2 hour. Digits right→left, delay i*50ms
rollover = [ {transform:'none'}, {transform:`translateY(${hop*k}px) scale(.94,1.08)`, offset:.35},
  {transform:'scale(1.06,.95)', offset:.65}, {transform:'none'} ]   // --dur-minute / --dur-hour, --spring-bouncy, fill:backwards
wellMinute = [ {transform:'scale(1)'}, {transform:'scale(1.03)', offset:.3}, {transform:'scale(1)'} ]
wellHour   = [ {transform:'scale(1)'}, {transform:'scale(1.06,.94)', offset:.3}, {transform:'scale(.97,1.03)', offset:.6}, {transform:'scale(1)'} ]
// FATIGUE BEATS (T07), one per tick on running faces + Nini
beat0 hop     = [none, {translateY(-8g px) scale(.94,1.07)} @.35, {scale(1.07,.93)} @.7, none]          420ms ease-out
beat1 nod     = [none, {translateY(2px) rotate(-5g deg)} @.4, none]                                      420ms ease-in-out
beat2 rock    = [rotate(0), rotate(-11g deg) @.3, rotate(9g deg) @.65, rotate(0)]                        520ms ease-in-out
beat3 droop   = [none, translateY(3px) scale(1.07,.88) @.45, same @.7, none]                             --dur-droop ease-in-out
beat4 shiver  = [none, translateX(-4px) @.2, 4px @.4, -3px @.6, 2px @.8, none]                           380ms linear
beat5 vibrate = [none, translateX(-4px) scale(1.06), 4px 1.06, -4px 1.06, 3px 1.04, none]                460ms --ease-stepped
// FATIGUE STAGE CHANGE (T08)
stage = [ {transform:'scale(1)'}, {transform:'scale(1.25,.8)', offset:.2}, {transform:'scale(.9,1.12)', offset:.5}, {transform:'scale(1)'} ]  // --dur-jelly --ease-out + 6 white/pink puff particles
// MENU (R04/R05)
menuIn  = [ {transform:'scale(.6) translateY(-8px)', opacity:0}, {transform:'none', opacity:1, offset:.4}, {transform:'none', opacity:1} ]  // --dur-toast --spring-bouncy, origin at trigger
menuItem= [ {transform:'translateY(6px)', opacity:0}, {transform:'none', opacity:1} ]   // --dur-base --ease-out, delay 40 + i*30
menuOut = [ {transform:'none', opacity:1}, {transform:'scale(.9) translateY(-4px)', opacity:0} ]   // --dur-fast --ease-in
// MODAL (R06/R07). s = .85 (.7 Showcase)
modalIn = [ {transform:`translateY(40px) scale(${s})`, opacity:0}, {transform:'none', opacity:1, offset:.3}, {transform:'none', opacity:1} ]  // --dur-modal --spring-bouncy; scrim opacity 0→1 --dur-base --ease-out
modalOut= [ {transform:'none', opacity:1}, {transform:'translateY(24px) scale(.92)', opacity:0} ]   // --dur-base --ease-in
// TOAST (R08/R09)
toastIn = [ {transform:'translateY(120%) scale(.9)', opacity:0}, {transform:'none', opacity:1, offset:.35}, {transform:'none', opacity:1} ]  // --dur-toast --spring-bouncy, then jelly(.5) for 490ms (error: shake)
toastOut= [ {transform:'none', opacity:1}, {transform:'translateX(30px)', opacity:0} ]   // --dur-fast --ease-in; remaining toasts FLIP --dur-travel --spring-snappy
// TOOLTIP (R10) — after 450ms hover/focus
tipIn = [ {transform:'translate(-50%,-100%) translateY(4px) scale(.7)', opacity:0}, {transform:'translate(-50%,-100%)', opacity:1} ]  // --dur-fast --ease-spring
// INLINE EDIT (R11/R12)
editIn = [ {transform:'scale(.96)'}, {transform:'scale(1)'} ]          // --dur-base --spring-snappy
hopText= [ {transform:'none'}, {transform:`translateY(${-5*g}px)`, offset:.4}, {transform:'none'} ]   // --dur-flick --ease-spring
// SHAKE (R33)
shake = [0, -6, 6, -4, 3, 0].map(x => ({transform:`translateX(${x}px)`}))   // --dur-flick linear
// ROW ENTER / EXIT (R13/R14)
enterRow = [ {transform:'translateY(-48px) scale(.9,1.1)', opacity:0}, {transform:'translateY(0) scale(1.06,.92)', opacity:1, offset:.55},
  {transform:'scale(.98,1.02)', offset:.78}, {transform:'none'} ]       // --dur-land --ease-out
exitRow  = [ {transform:'none', opacity:1}, {transform:'scale(1.04,.86)', opacity:1, offset:.3}, {transform:'scale(.6)', opacity:0} ]  // --dur-toast --ease-in + 8 mist particles at 30%
// FLIP (siblings, R13–R21)
flip(dy) = [ {transform:`translateY(${dy}px)`}, {transform:'none'} ]  // --dur-travel --spring-snappy
// ARC (R16 pin, R17 Won travel). tilt = dy>0 ? -2 : 2
arc(dy) = [ {transform:`translateY(${dy}px)`}, {transform:`translateY(${dy*.5}px) scale(1.04) rotate(${tilt}deg)`, offset:.5}, {transform:'none'} ]  // --dur-travel×1.3 --ease-in-out
land    = [ {transform:'scale(1.08,.9)'}, {transform:'scale(.97,1.04)', offset:.5}, {transform:'none'} ]   // --dur-land --ease-out
// DUPLICATE (R15)
clone(pitch) = [ {transform:`translateY(${-pitch}px) scale(.96)`, opacity:.4}, {transform:'translateY(0) scale(1.03,.97)', opacity:1, offset:.7}, {transform:'none', opacity:1} ]  // --dur-travel --spring-bouncy
// PIN TAPE (R16) — delay --dur-travel
tape = [ {transform:'rotate(-30deg) scale(1.6)', opacity:0}, {transform:'rotate(-10deg) scale(1)', opacity:.92} ]   // --dur-land --spring-bouncy
// WON STICKER (C01, after landing)
sticker = [ {transform:'rotate(40deg) scale(2.2)', opacity:0}, {transform:'rotate(12deg) scale(1)', opacity:1} ]  // --dur-land --spring-bouncy
// DRAG (R19/R21/R22). r = -1.2deg (-2 Showcase)
pick = [ {transform:'none'}, {transform:`scale(1.04) rotate(${r}deg)`} ]   // --dur-base --spring-snappy, fill:forwards
drop = [ {transform:`scale(1.04) rotate(${r}deg)`}, {transform:'scale(.97,1.03)', offset:.45}, {transform:'none'} ]  // 420ms --spring-snappy
revert = flyback [translateY(dy)→none] (--dur-travel --spring-bouncy) then [rotate 0,-3,3,-2,0 deg] (--dur-flick linear)
// COUNTER (R23/R24). dir = +1 up, -1 down
roll(dir) = [ {transform:`translateY(${dir*70}%)`, opacity:.15}, {transform:`translateY(${-dir*8}%)`, opacity:1, offset:.6}, {transform:'none', opacity:1} ]  // --dur-flick --spring-snappy
full = jelly(1) on the well (.5 on Overlay/Calm) + 8 Butter/Matcha sparks
// ICON MORPH (R25 play⇄pause, R31 link→check)
morph = [ {transform:'scale(.3) rotate(-120deg)', opacity:0}, {transform:'scale(1.15) rotate(10deg)', opacity:1, offset:.6}, {transform:'none', opacity:1} ]  // --dur-flick --spring-bouncy
ringIn = [ {transform:'scale(.94)', opacity:0}, {transform:'scale(1.02)', opacity:1, offset:.6}, {transform:'none', opacity:1} ]  // --dur-land --ease-out
wave(k) per digit i  = [none, {translateY(-10*g*k px)} @.4, none]   // --dur-land, delay i*40, --spring-bouncy
droop per digit i    = [none, {translateY(4px) scale(1.02,.96)} @.5, none]  // --dur-droop, delay i*20, --ease-in-out
// WINNIE SWITCH / SKELETON → CONTENT (R26/R30)
stagOut per el i = [ {transform:'none', opacity:1}, {transform:'translateY(12px)', opacity:0} ]  // --dur-fast, delay i*20, --ease-in
stagIn  per el i = [ {transform:'translateY(24px) scale(.96)', opacity:0}, {transform:'none', opacity:1, offset:.4}, {transform:'none', opacity:1} ]  // --dur-land, delay i*40, --spring-bouncy
// PAGE TRANSITION (R27). dir = ±1
pageOut = [ {transform:'none', opacity:1}, {transform:`translateX(${-dir*60}px) scale(.97)`, opacity:0} ]   // --dur-fast --ease-in
pageIn  = [ {transform:`translateX(${dir*80}px) scale(.97)`, opacity:0}, {transform:'none', opacity:1} ]   // --dur-page-x --spring-snappy
// PROGRESS (R29) — fill is a full-width bar moved with translateX(pct-100 %)
progress = [ {transform:`translateX(${from}%)`}, {transform:`translateX(${to}%)`} ]  // --dur-land --spring-bouncy; label pop scale(1.3)→1 --dur-flick --ease-spring
// THEME WIPE (R28): fixed circle in the NEXT page colour, radius = farthest viewport corner from the picker
wipe = [ {transform:'scale(0)'}, {transform:'scale(1)'} ]   // --dur-theme --ease-in-out → set data-theme → circle opacity 1→0 --dur-base --ease-out → remove
// BROADCAST
highlight (B01) = [ {opacity:0, transform:'scale(1.04)', easing:--ease-out}, {opacity:1, transform:'scale(1)', offset:.1},
  {opacity:1, offset:.6, easing:--ease-in-out}, {opacity:0} ]      // --dur-highlight linear, on a gold ring layer
bannerIn  = [ {transform:'translateY(-120%)'}, {transform:'none'} ]  // --dur-toast --spring-snappy
bannerOut = [ {transform:'none'}, {transform:'translateY(-140%)'} ]  // --dur-base --ease-in
mute (B02) = [ {filter:'saturate(1)', opacity:1}, {filter:'saturate(.55)', opacity:.85} ]   // --dur-base --ease-standard, fill forwards
pageFlipOut (B04) per row i = [ {transform:'none', opacity:1}, {transform:'translateY(-14px) rotateX(70deg)', opacity:0} ]  // --dur-base, delay i*70, --ease-in  (Calm: opacity only)
pageFlipIn  per row i = [ {transform:'translateY(14px) rotateX(-70deg)', opacity:0}, {transform:'none', opacity:1, offset:.45}, {transform:'none', opacity:1} ]  // --dur-land, delay i*70, --spring-bouncy
cardEnter (B07) = [ {transform:'translateY(140%) rotate(4deg)'}, {transform:'translateY(-4%) rotate(-1deg)', offset:.7}, {transform:'none'} ]  // --dur-land×1.3 --spring-bouncy (Calm: opacity --dur-base)
stampIn (B05) = [ {transform:'translate(-50%,-50%) scale(2.4) rotate(-20deg)', opacity:0}, {transform:'translate(-50%,-50%) scale(.9) rotate(-8deg)', opacity:1, offset:.55},
  {transform:'translate(-50%,-50%) scale(1.05) rotate(-8deg)', offset:.75}, {transform:'translate(-50%,-50%) rotate(-8deg)'} ]   // --dur-stamp --ease-out
stampOut = [ {..rotate(-8deg), opacity:1}, {..scale(1.2) rotate(-8deg), opacity:0} ]   // --dur-base --ease-in
cardHop  = [ {transform:'none'}, {transform:`translateY(${-10*g}px) scale(1.02)`, offset:.35}, {transform:'scale(.99,1.01)', offset:.7}, {transform:'none'} ]  // --dur-jelly --ease-out
// CELEBRATORY
wonFace  = [ {transform:'scale(1)'}, {transform:'scale(1.3)', offset:.3}, {transform:'scale(1)'} ]   // --dur-jelly --ease-spring
niniJump = [ {transform:'translateY(0) scale(1,1)'}, {transform:'translateY(0) scale(1.2,.8)', offset:.15},
  {transform:`translateY(${-90*g}px) scale(.9,1.15) rotate(-10deg)`, offset:.45}, {transform:'translateY(0) scale(1.15,.85)', offset:.75}, {transform:'none'} ]  // 1100ms --ease-in-out, 2 iterations
niniHop  = [ {transform:'none'}, {transform:`translateY(${-24*g}px) scale(.95,1.06)`, offset:.4}, {transform:'scale(1.06,.94)', offset:.75}, {transform:'none'} ]  // --dur-jelly --ease-out
unfurl   = [ {transform:'scaleY(0)', opacity:0}, {transform:'scaleY(1)', opacity:1, offset:.35}, {transform:'scaleY(1)', opacity:1} ]   // --dur-land×1.2 --spring-bouncy
flash    = [ {filter:'brightness(1.35)'}, {filter:'brightness(1)'} ]   // --dur-celebrate×.5 --ease-out
bannerDrop (C03) = [ {transform:'translateY(-220px) rotate(-12deg)', opacity:0}, {transform:'translateY(0) rotate(3deg)', opacity:1, offset:.45},
  {transform:'translateY(-14px) rotate(-1deg)', offset:.65}, {transform:'none'} ]   // --dur-land×1.5 --ease-out (Calm: opacity --dur-base)
// PARTICLES
burst particle = [ {transform:'translate(-50%,-50%) scale(.2) rotate(0)', opacity:1},
  {transform:`translate(calc(-50% + dx), calc(-50% + dy)) scale(1) rotate(r)`, opacity:1, offset:.55},
  {transform:`translate(calc(-50% + 1.15dx), calc(-50% + dy + gravity)) scale(.7) rotate(1.4r)`, opacity:0} ]
  // dur --dur-burst × (0.75–1.25 random), --ease-out, delay 0–60ms. dist = spread·√g·(0.35–1), cone ±1 rad around up. gravity 80px
  // shapes cycle ♥ ★ ● ✿ (text glyphs, M PLUS Rounded 800) · colours cycle --confetti-1…5
rain particle = from y −40 → 55% H (sway ±80px) @.6 → H+60 (opacity .2), rotate ±360°   // --dur-celebrate×1.4 × (0.7–1.3), cubic-bezier(.3,.2,.6,1), delay 0–900ms
```

### Ambient loops (iterations: Infinity, playbackRate = --amb-rate)
| Name | Keyframes | Duration · easing | Off in Calm |
|---|---|---|---|
| drift | translate(0,0) → translate(52px,52px) | --dur-drift · linear | yes |
| blob1 / blob2 | translate(0,0) scale(1) ↔ translate(40px,30px) scale(1.08) / scale(1.04) ↔ translate(−36px,−24px) scale(.92), alternate | drift×.3 / ×.37 · in-out | — |
| breathe (Nini) | scale(1,1) → (1+.04g, 1−.04g) → (1−.02g, 1+.03g) → 1 | --dur-breathe · in-out | — |
| snooze (Nini paused) | scale(1,1) → (1+.03g, 1−.03g) → 1 | breathe×1.45 · in-out | — |
| shimmer (gloss) | translateX(−150%) skewX(−18°) → 350% at 16% → rest | --dur-shimmer (×2 Calm) · in-out | Overlay yes |
| ring (running glow) | opacity .25 → .85 → .25 | --dur-breathe · in-out | — |
| sheen (Showcase rows) | translateX(−120%) → 520% at 30% → rest | --dur-float · in-out | yes |
| stripes (progress) | translateX(0 → 28.28px) | --dur-breathe · linear | — |
| float (Overlay card) | translateY(0 → −3g px → 0) | --dur-float · in-out | yes |
| hop (wordmark letters) | none → scale(1.12,.88) @8% → translateY(−14g) scale(.92,1.1) @20% → scale(1.1,.9) @32% → 1 @42% → rest | --dur-wave · in-out, delay i×110 | — |
| bob (Showcase rows) | translateY(0 → −3g → 0) | --dur-wave · in-out | yes |
| stick (Won sticker) | rotate(12°) scale(1) → rotate(4°) scale(1.08) → back | --dur-wave · in-out | — |
| wobble (Complete banner) | rotate(−2° → 2° → −2°) | --dur-wave · in-out | yes |
| glow (Complete keyline) | opacity .5 → 1 → .5 | --dur-breathe · in-out | yes (static) |
| twinkle (sparkles) | scale(.6) rotate(0) o.4 → scale(1.15) rotate(20°) o1 → back | 1600ms · in-out | yes |
| spin (R35) | rotate(0 → 360°) | 900ms · linear | Responsive tier |
| skel (shimmer) | translateX(−100% → 100%) | 1400ms · in-out | Responsive tier |
| drip / vein / steam / zzz (face accents) | translateY(0→5px@70%→0) / scale(1→1.3@15%→1@30%) / translateY(2px) scale(.9) ↔ (−6px, 1.08) / translate(0,0) o.3 → (4px,−6px) o1 | 1400 ease-in / 900 / 700 steps(4,end) / 2400 in-out | yes |

## Moment table (71 moments, Phase 4 IDs; still final)
| ID | Moment | Tier | Trigger | Elements | Properties | Duration | Easing | Dialects | Reduced end state | Sound |
|---|---|---|---|---|---|---|---|---|---|---|
| A01 | Backdrop drift | Ambient | Always, on any page with a backdrop | Dots layer (inset −52px, behind content) | transform: translate(0,0 → 52px,52px), seamless loop | --dur-drift (60s per tile) | linear | Workspace + Shared View: 1 tile per minute. Overlay: none (no backdrop). Showcase: rate 1.4 plus A02. | Dots stay still | — |
| A02 | Clay-swirl blobs | Ambient | Showcase only | 2 blob layers | transform: translate ±40px, scale .92 → 1.08, alternate | --dur-drift × .3 / × .37 (18s / 22s) | --ease-in-out | Showcase only | Blobs sit still | — |
| A03 | Nini breathe | Ambient | Nini is visible and not mid-beat | Nini outer wrapper (beats live on the inner one) | transform: scale(1+.04g, 1−.04g) → (.98, 1.03) → 1 | --dur-breathe (Snooze × 1.45) | --ease-in-out | Workspace g 1. Showcase g 1.6, rate 1.4. Broadcast has no Nini. | Nini still, showing the current mood face | — |
| A04 | Face accents | Ambient | Face mood has an accent | Face SVG layers: zzz, sweat drops, veins, steam, sparkles | transform, opacity | zzz 2400 · drop 1400 · vein 900 · steam 700 · sparkle 1100ms | --ease-in-out · steam --ease-stepped | Same everywhere (they read at 44px). Calm: off. | Accents visible and still, so the mood still reads | — |
| A05 | Material gloss sweep | Ambient | Hero card always. Total well while running. Overlay card. | Gloss band inside a clipped layer | transform: translateX(−150% → 350%) in the first 16%, then rests | --dur-shimmer (9s period) | --ease-in-out | Workspace: hero + well. Overlay: card. Calm: off. Showcase: every card, rate 1.4. | No gloss | — |
| A06 | Running row presence | Ambient | Row is Running | Ring glow layer inside the row | opacity .25 ↔ .85 (ring stays at 4px; only the glow breathes) | --dur-breathe | --ease-in-out | Workspace: breathe. Overlay: brighter glow, Calm rate .5. Showcase: plus a sheen band every --dur-float. | Static 4px pink ring + pink timer + Running face | — |
| A07 | Summary presence | Ambient | Winnie is running | Progress stripes layer, Total gloss (A05), Nini headband | transform: translateX(0 → 28.28px) seamless loop (one stripe period) | --dur-breathe per stripe | linear | All. Showcase rate 1.4. Paused: stripes stop. | Stripes still. Pink Total + Pause button say Running. | — |
| A08 | Wordmark wave | Ambient | Nav and Showcase | 7 letter wrappers | transform: translateY(--hop-wordmark) with squash/stretch | --dur-wave, stagger --stagger-wordmark | --ease-in-out | Nav −14px. Showcase −22px. Overlay: no wordmark. | Letters rest at their tilts | — |
| A09 | Won sticker wobble | Ambient | Row is Won | ★ sticker | transform: rotate(12° → 4°) scale(1.08) | --dur-wave | --ease-in-out | Workspace, Shared View, Showcase. Overlay has no sticker. | Sticker at 12° | — |
| A10 | Showcase row bob | Ambient | Showcase, every row | Row mid wrapper | transform: translateY(0 → −3g px), phase offset per index | --dur-wave, delay −index × --stagger-wordmark | --ease-in-out | Showcase only | Rows still | — |
| A11 | Overlay idle float | Ambient | Overlay is visible | Overlay card | transform: translateY(0 → −3g px) | --dur-float | --ease-in-out | Standard −3.75px. Calm: off. | Card still | — |
| T01 | Total Timer second tick | Responsive | Every running second | Only the digit slots that changed | transform: translateY(--tick-hop) scale(1−sq, 1+sq) → squash (1+sq, 1−sq) → rest | --dur-tick, clamped to 95% of the real tick interval | --ease-out | Workspace −6px, sq .04 (fine for hours). Broadcast −10px, no squash. Showcase −14px, sq .1. Calm −4px. | Digits change in place. Fixed slots mean nothing shifts. | tick.soft (opt-in) |
| T02 | Row timer tick | Responsive | Every running second, per running row | Changed row digit slots | transform: translateY(hop × .6) rotate(−5g°) → rest | --dur-flick | --ease-spring | Workspace tilt 5°. Broadcast no tilt. Showcase 8°. | Digits change | shares tick.soft (never two ticks per second) |
| T03 | Minute rollover | Responsive | :59 → :00 | All changed digits (right to left) + the well | Digits hop × 1.6, staggered by --stagger-digit. Well scale(1.03) → 1. | --dur-minute | --spring-bouncy | All. Overlay: Total only. Showcase adds 6 sparkles. | Digits change | tick.minute |
| T04 | Hour rollover | Responsive | 59:59 → 1:00:00 (and every hour) | Digits, well, sparkles, Nini | Digits wave × 2.2, well jelly, 10 sparkles from the well, Nini hop | --dur-hour | --spring-bouncy · particles --ease-out | Overlay 14 sparkles. Showcase 24. Calm: wave only. | Digits change. The new hour digit is the signal. | chime.hour |
| T05 | Overlay Total tick | Responsive | Every running second on the Overlay | Overlay Total digit slots | As T01 with Broadcast values (taller hop, no squash, no tilt) | --dur-tick | --ease-out | Standard −10px. Calm −4px. | Digits change | none on stream |
| T06 | Overlay row tick | Responsive | Every running second, Overlay rows | Overlay row digits | transform: translateY(−6g px), no tilt | --dur-flick | --ease-spring | Calm: off (only the Total ticks). | Digits change | — |
| T07 | Fatigue beat | Responsive | Every tick, running faces + Nini | Face beat wrapper, Nini inner | Per stage: 0 hop · 1 nod · 2 rock · 3 droop · 4 shiver · 5 vibrate | 420 / 420 / 520 / --dur-droop / 380 / 460ms | ease-out · in-out · linear · --ease-stepped | Overlay rows × .8. Showcase × 1.6. Above 10× clock: only on the minute. | Face shows the stage | — |
| T08 | Fatigue stage change | Responsive | Running time crosses a threshold token | Face beat wrapper | Jelly scale(1.25, .8) → (.9, 1.12) → 1 + 6-particle puff | --dur-jelly | --ease-out | All. Calm: no puff. | The new face | face.stage |
| T09 | Tab title + favicon (spec only) | Responsive | Winnie running, any tab state | document.title, <link rel=icon> | Title "▶ 1:02:03 · Kitty vs. the world", rewritten once per second. Favicon: 32px canvas with the Bubblegum w and a pink ring that fills with the seconds (60 steps), redrawn once per second. Paused: "❚❚" prefix, ring empty. Complete: crown favicon, "✿ Complete". | 1s steps | steps | Workspace. Shared View: "● Live · …". Overlay: n/a. | Title still updates (it is content). Favicon is static with a pink dot. | — |
| R01 | Button hover | Responsive | Pointer enters | Button | transform: translateY(--hover-lift / 2) | --dur-hover | --ease-hover | Workspace −2px. Overlay: none. Showcase −4px + rotate(−1°). | No lift. Cursor change only. | — |
| R02 | Button press | Responsive | pointerdown, Enter, Space | Button + lip | Press: translateY(lip), lip collapses. Release: jelly scale(1.06, .94) → (.97, 1.03) → 1. | press --dur-instant · release 420ms (--dur-jelly × .6) | --ease-spring | Showcase × 1.6 | Pressed state shows instantly | press.pop |
| R03 | Row hover | Responsive | Pointer enters a row | Row inner, grip | transform: translateY(--hover-lift) rotate(−.4°). Grip opacity 0 → 1. | --dur-hover | --ease-hover | Workspace −4px. Showcase −8px. Shared View: none. | Grip visible, no lift | — |
| R04 | Menu open | Responsive | More button, Winnie switcher | Menu panel, items | Panel scale(.6 → 1) translateY(−8px → 0) opacity, origin at the trigger. Items translateY(6px → 0) opacity, staggered. | --dur-toast (panel) · --dur-base (items), stagger --stagger-menu | --spring-bouncy · --ease-out | Showcase overshoots × 1.6 | Menu appears | menu.open |
| R05 | Menu close | Responsive | Select, Esc, click outside | Menu panel | scale(1 → .9) opacity → 0 | --dur-fast | --ease-in | All | Menu removed | menu.close |
| R06 | Modal in | Responsive | Destructive confirm, settings | Scrim, card | Scrim opacity 0 → 1. Card translateY(40px) scale(.85) → rest. | --dur-base (scrim) · --dur-modal (card) | --ease-out · --spring-bouncy | Showcase card from scale .7 | Modal appears | modal.in |
| R07 | Modal out | Responsive | Cancel, confirm, Esc | Card, scrim | Card translateY(24px) scale(.92) opacity 0. Scrim → 0. | --dur-base | --ease-in | All | Modal removed | modal.out |
| R08 | Toast in | Responsive | Save, copy, error | Toast | translateY(120%) scale(.9) → rest, then a small jelly. Error toast adds R33 shake. | --dur-toast | --spring-bouncy | All | Toast appears | toast.in · toast.error |
| R09 | Toast out | Responsive | Info after 3.2s. Error is sticky until closed. | Toast, remaining toasts | translateX(30px) opacity 0. Remaining toasts slide into place (FLIP). | --dur-fast · stack --dur-travel | --ease-in · --spring-snappy | All | Toast removed | — |
| R10 | Tooltip | Responsive | Hover or focus for 450ms | Tooltip | scale(.7) translateY(4px) opacity → rest. Out: removed instantly. | --dur-fast | --ease-spring | Overlay: none | Tooltip appears after the same delay | — |
| R11 | Inline edit enter | Responsive | Click the name, or Edit in the menu | Input well | scale(.96 → 1) | --dur-base | --spring-snappy | All | Input appears with the focus ring (focus is never animated) | — |
| R12 | Inline edit exit | Responsive | Enter or blur saves. Esc cancels. | Name label | Save: translateY(−5g px) → rest hop. Cancel: no motion. | --dur-flick | --ease-spring | All | Label shows the new name | edit.save |
| R13 | Challenge added | Responsive | Add Challenge | New row outer, rows below | New: translateY(−48px) scale(.9, 1.1) opacity 0 → squash (1.06, .92) → rest. Rows below: FLIP from their old slot. | --dur-land · siblings --dur-travel | --ease-out · --spring-snappy | Showcase adds an 8-particle plop | Row appears in place | add.plop (at the squash, 55%) |
| R14 | Challenge deleted | Responsive | Confirm Delete | Row outer, rows below | scale(1.04, .86) → scale(.6) opacity 0 + 8 mist puff particles. Rows below close the gap (FLIP). | --dur-toast · siblings --dur-travel | --ease-in · --spring-snappy | All | Row removed, list closes up | delete.poof (at 30%) |
| R15 | Duplicated | Responsive | Duplicate | Clone outer, original mid | The clone starts on top of the original (translateY(−pitch) scale .96, opacity .4) and slides into the slot below. Original gets a half jelly. Rows below FLIP. | --dur-travel | --spring-bouncy | All | Clone appears below with "(copy)" | dup.clone |
| R16 | Pinned | Responsive | Pin | Row outer, tape, siblings | FLIP arc to the top: translateY with scale 1.04 and rotate ±2° at midpoint. Tape slaps on: rotate(−30°) scale(1.6) → (−10°, 1). | --dur-travel × 1.3 · tape --dur-land | --ease-in-out · --spring-bouncy | All | Row at the top with tape + pin glyph | pin.tape (tape lands) |
| R17 | Won travel | Responsive | After the C01 jelly | Row outer, mid | FLIP arc down to the Won group, then land squash (1.08, .9) → (.97, 1.04) → rest | --dur-travel × 1.3 + --dur-land | --ease-in-out · --ease-out | Overlay: the row holds its slot until the B05 stamp leaves | Row in the Won group | won.land |
| R18 | Un-won | Responsive | Toggle Won off | Row outer | FLIP back up. No celebration. | --dur-travel | --spring-snappy | All | Row back in its group | — |
| R19 | Drag pickup | Responsive | pointerdown on the grip | Row outer (z-index), mid | Mid scale(1.04) rotate(−1.2°), held while dragging. Outer follows the pointer with translateY. | --dur-base | --spring-snappy | Showcase rotate(−2°) | Row follows the pointer flat (direct manipulation is not animation) | drag.lift |
| R20 | Drag over | Responsive | Target slot changes | Siblings between origin and target | translateY(± pitch) via CSS transition | --dur-base | --spring-snappy | All | Siblings jump to their new slots | drag.over |
| R21 | Drop | Responsive | pointerup on a valid slot | Row outer, mid | FLIP from the pointer position into the slot. Mid squash (.97, 1.03) → rest. | --dur-travel · squash 420ms | --spring-snappy | All | Row in its new slot | drag.drop |
| R22 | Revert on error | Responsive | Drop in another group, or save fails | Row outer, mid, siblings | Row flies back translateY(dy → 0), then shakes rotate(−3°, 3°, −2°, 0). Siblings return. Sticky error toast. | --dur-travel + --dur-flick | --spring-bouncy · linear | All | Row back in its slot + error toast | drag.revert |
| R23 | Counter step | Responsive | − or + | Count number | translateY(±70%) opacity .15 → small overshoot → rest. Rolls up on +, down on −. | --dur-flick | --spring-snappy | All | Number changes | counter.step (pitch rises with the count) |
| R24 | Counter reaches target | Responsive | count = target | Counter well, + button | Well jelly, turns Matcha, 8 Butter/Matcha sparkles | --dur-jelly | --ease-out | Overlay + Calm: well flash only | Matcha well "120 / 120" | counter.full |
| R25 | Timer start / pause morph | Responsive | Play/pause on a row or the Winnie | Icon, ring layer, digits, Nini | Icon scale(.3) rotate(−120°) → 1.15 → 1. Ring scale(.94) → 1 + opacity. Start: digits wave up. Pause: digits droop translateY(4px), Nini → Snooze. | --dur-flick · --dur-land · --dur-droop | --spring-bouncy · --ease-in-out | All | Icon swaps, ring on/off, timer colour changes | timer.start · timer.pause |
| R26 | Winnie switch | Responsive | Pick a Winnie in the switcher | Hero, add bar, rows | Out: translateY(12px) opacity 0, staggered. In: translateY(24px) scale(.96) opacity → rest, staggered. Hero jelly. | --dur-fast out · --dur-land in, stagger --stagger-list | --ease-in · --spring-bouncy | All | Content swaps | winnie.swap |
| R27 | Page transition | Responsive | Workspace ↔ Changelog | Page content (nav stays put) | Out: translateX(∓60px) scale(.97) opacity 0. In: translateX(±80px) → rest. | --dur-fast · --dur-page-x | --ease-in · --spring-snappy | Showcase: wordmark hops once | Page swaps | page.whoosh |
| R28 | Theme switch | Responsive | Theme picker | Full-viewport circle in the next page colour | scale(0 → 1) from the button. data-theme swaps at the end, then the circle fades out. | --dur-theme + --dur-base | --ease-in-out | All | Theme swaps instantly | theme.swap (at the swap) |
| R29 | Progress update | Responsive | Won count changes | Progress fill, % label, won pill | Fill translateX(old → new) with overshoot. Label scale(1.3 → 1). | --dur-land | --spring-bouncy | All | New fill width and number | — |
| R30 | Skeleton → content | Responsive | Load, reload, Winnie fetch | Skeleton rows, then rows | Shimmer translateX loop. Content rows stagger in as in R26. | 1400ms loop · --dur-land | --ease-in-out · --spring-bouncy | All | Flat skeleton blocks, then content | — |
| R31 | Copy-link confirmation | Responsive | Share → copy | Share button, icon, label | Button jelly. Icon morphs link → check. 6 sparkles. Label "Link copied" for 2s. | 420ms · --dur-flick | --spring-bouncy | All | Label + check icon for 2s | copy.ok |
| R32 | Focus ring | Responsive | Keyboard focus | Outline | None. Appears instantly, never delayed. | 0 | — | All | Same | — |
| R33 | Error shake | Responsive | Invalid input, revert, failed save | Element | translateX(−6, 6, −4, 3, 0 px) | --dur-flick | linear | All | Cherry ring + message | toast.error |
| R34 | Reset timer | Responsive | Reset timer in the menu | Row digits, face | Every digit hops × 1.6, staggered. Face jelly. | --dur-minute | --spring-bouncy | All | 00:00 + Ready face | timer.reset |
| R35 | Spinner | Responsive | aria-busy, Reconnecting | progress_activity icon | rotate(360°) loop | 900ms | linear | All | Still icon + "Loading…" / "Reconnecting…" | — |
| B01 | Shared View receives data | Responsive | New snapshot (push or ≤ 5s poll) | Changed rows, digits, counts, Total | Gold ring opacity 0 → 1 in 10%, holds, fades out. scale(1.04 → 1). "Updated" chip pops. Changed digits hop (T03 recipe). Counts roll (R23). | --dur-highlight | --ease-out | Shared View only | Gold ring + "Updated" chip stay until the next update | shared.update |
| B02 | Reconnecting… | Responsive | Connection lost for > 2s | Top banner, content; Overlay: header chip | Banner translateY(−120% → 0). Content filter saturate(1 → .55). Spinner (R35). Overlay: cloud_off chip scale-pops in, timers keep counting locally. | --dur-toast · --dur-base | --spring-snappy · --ease-standard | Shared View: banner. Overlay: chip only (never a banner over gameplay). | Banner + muted content + "Last update 0:42 ago" | reconnect.lost |
| B03 | Back live | Responsive | Reconnected | Banner, content | Banner turns Matcha "Back live", icon morph, holds 1.6s, slides out. Filter → 1. Then a B01 catch-up highlight. | --dur-toast | --spring-bouncy · --ease-in | All | Banner gone, content full colour | reconnect.found |
| B04 | Overlay page rotation | Ambient | Every --dur-page when there are more than 5 Challenges | 5 Overlay rows, page dots | Out: rotateX(0 → 70°) translateY(−14px) opacity 0, stagger 70ms. In: rotateX(−70° → 0). Active dot scale(1.6 → 1). | --dur-base out · --dur-land in | --ease-in · --spring-bouncy | Calm: plain crossfade --dur-base, no stagger | Rows swap, dots update | page.flip (off on stream by default) |
| B05 | Overlay notices a new Won | Celebratory | A Challenge becomes Won | Card, row, WON stamp, particles, won pill | Card hop −10g px. Row jelly + Matcha. Stamp scale(2.4) rotate(−20°) → (1, −8°). Particles from the card top. Pill rolls. Holds, stamp exits scale(1.2) opacity 0, then the row re-sorts. | --dur-stamp · hold --dur-cheer · --dur-burst | --ease-out · --spring-bouncy | If the row is on another page, flip to it first (B04). Calm: no hop, no particles, stamp fades in over --dur-base. | Matcha row + "WON · Elden Ring" stamp held 2.2s | overlay.won (stamp lands, 55%) |
| B06 | Overlay Calm preset | Ambient | Owner picks Calm (future setting) | Every Overlay moment | [data-motion-preset=calm]: gain .6, hop −4px, rate .5, particles 0. A05, A11, T06 off. | — | — | Overlay only | — | — |
| B07 | Overlay card enter | Responsive | Browser source becomes visible, page load | Card | translateY(140%) rotate(4°) → (−4%, −1°) → rest | --dur-land × 1.3 | --spring-bouncy | Calm: opacity fade over --dur-base | Card present | — |
| C01 | Challenge Won (Workspace) | Celebratory | Mark Won | Row mid, face, sticker, Nini, progress | Jelly (1.07, .88) → (.94, 1.08) → (1.03, .97) → 1. Face pop. Fountain of ♥ ★ ● ✿ (--particle-count) from the face. Nini Cheer for 1.8s + hop. Then R17 travel. Sticker slaps rotate(40°) scale(2.2) → (12°, 1) after landing. | --dur-jelly · --dur-burst · --dur-land | --ease-out · --spring-bouncy | Workspace 24 particles. Shared View 28, no Nini. Showcase 48 + Nini spin. | Matcha row, ★ sticker, filled check, in the Won group, "3 / 8 won" | won.yay (jelly peak, 18%) → won.land |
| C02 | Winnie Complete (Workspace) | Celebratory | Last Challenge Won. Fires once per Winnie: the flag is stored with the Winnie, so it never replays on reopen or reload. | Nini, banner, effects layer, progress, Total well | Nini double jump −90g px with crown. Banner unfurls scaleY(0 → 1). Confetti rain across the viewport (2 × particle count) + 50-particle Nini burst. Progress filter brightness(1.35 → 1). Well pulse. | --dur-celebrate | --spring-bouncy · --ease-out | Showcase: 3 rain waves | Butter banner "Complete!", Nini Party + crown, 8 / 8 · 100% | complete.fanfare (Nini first apex) |
| C03 | Winnie Complete on the Overlay: entrance | Celebratory | Complete while the Overlay is live. Not on source reload. | Card, COMPLETE banner, cannons, rain | Card jelly scale(1.06, .94). Banner drops translateY(−220px) rotate(−12°) → lands with a bounce. Two cannons from the card top corners. Rain over the whole 1920 canvas. | --dur-celebrate | --spring-bouncy · --ease-out | Calm: banner fades in, one small cannon, no rain | Banner + gold keyline | overlay.complete (banner lands) |
| C04 | Overlay Complete: sustained | Celebratory | While the Winnie stays Complete | Banner, gold keyline glow, 4 sparkles, gloss | Banner rotate(−2° ↔ 2°). Glow opacity .5 ↔ 1. Sparkles scale/opacity loop, staggered. A05 sweep. | --dur-wave · --dur-breathe · 1600ms | --ease-in-out | Calm: glow static, no sparkles, sweep off | Static banner + gold keyline | — |
| C05 | Shared View Complete | Celebratory | Complete snapshot received | Banner, rain, Total | Banner unfurls. Rain. Total digits wave. Gold ring on the hero. | --dur-celebrate | --spring-bouncy | No Nini | Banner + 100% | shared.complete |
| P01 | Gauntlet reset | Celebratory | A Gauntlet Challenge is lost, so the whole Winnie is wiped | All rows, progress, Total, Nini | 1) All rows shake together (R33). 2) Rows melt scaleY(1 → .92) translateY(6px) + saturate(.3), bottom-up, 30ms stagger. 3) Progress drains (translateX → −100%). 4) Total digits roll back to 00:00 (T03 recipe reversed). 5) Rows spring back to Idle. Nini Fuming → Snooze. | ≈ --dur-celebrate in total | --ease-in, then --spring-bouncy | Overlay: card shake + Cherry "RESET" stamp (B05 recipe). Calm: stamp only. | All rows Idle at 00:00 + Cherry toast "Gauntlet reset. Back to zero." | gauntlet.wipe |
| P02 | Confirmation failed | Responsive | A confirm step is rejected (e.g. a second confirmation fails) | Control, row, message | Toggle un-fills scale(1 → .8 → 1) + R33 shake. Row stays put. Cherry message translateY(−4px) → 0. | --dur-flick | linear · --spring-snappy | All | Cherry ring + message | confirm.fail |
| P03 | Timeboxed run lost | Celebratory | Countdown hits zero | Row digits, row, face, TIME stamp | Last 10s: digits pulse Cherry and hop × 1.3 each second. At 0: row deflates scale(1.04, .9) → (.98, 1.02). Face → Fuming. "TIME" stamp. Mist particles. | --dur-tick per second · --dur-stamp | --ease-out | Overlay: stream-scale stamp (B05 recipe in Cherry). Calm: stamp only. | Lost state (cancel icon + "Time's up") | timebox.tick (last 10s) → timebox.lost |
| P04 | Randomizer wheel spin + land | Celebratory | Spin | Wheel, pointer, chosen segment, chosen row | Wheel rotate(0 → N × 360° + θ) with a long deceleration. Pointer flicks rotate(−18° → 0) on each segment pass. Land: −4° overshoot, then settle. Winning segment scale 1.1 + jelly. Chosen row pulses (A06). | 4–5.2s spin · 90ms flick · --dur-jelly land | linear(0, .5 8%, .8 20%, .95 45%, 1) · --ease-spring | Overlay: the wheel can take over the card (stream moment). Calm: 2s spin. | Chosen Challenge highlighted + "Up next" chip | wheel.tick (each segment) → wheel.land |

P01–P04 were Phase 4 placeholders. Their final designs are in the "Future features (Phase 6b)" table below, which supersedes them where they differ.

## Moments added after Phase 4
S01–S06 come from the Landing and Changelog boards. **† = first written down in this handoff**: the prototypes show the behaviour, but no spec existed, so values are read from the prototypes or proposed. Treat † values as adjustable.

| ID | Moment | Tier | Surface | Description | Reduced end state | Sound |
|---|---|---|---|---|---|---|
| S01 | Latest chip stamp | Celebratory | Changelog | Latest chip stamps in: rotate(−30°) scale(2) → rotate(−3°) scale(1), --dur-stamp --ease-out, + 10 sparks. Once, when the latest release card is 12% visible. | Chip at −3° | changelog.latest |
| S02 | Boop Nini | Responsive | Landing, Changelog | Click/Enter on Nini: niniHop + 14–18 confetti, face → Cheer for --dur-cheer. Nini is a `<button aria-label="Boop Nini">`. | Face swaps to Cheer and back | nini.boop |
| S03 | Hero wordmark drop | Responsive (once) | Landing | Each letter falls from translateY(−200px), squashes scale(1.15,.85) on landing, bounces, 80ms stagger, then 26 sparkles. Once per page load. | Wordmark present | hero.drop |
| S04 | Hero parallax chips | Ambient | Landing | Five clay chips (timer, Won, Counter, Pinned, Complete) translate toward the pointer at depths .02–.08 (rAF-throttled, transform only) and bob on their own loop (--dur-wave, phase-offset). | Chips still | — |
| S05 † | Sign-in nudge | Ambient | Landing | The hero Sign in button wiggles (rotate −4°, 4°, −2°, 0 over 600ms) every 8s unless hovered or focused. | No wiggle | — |
| S06 | Demo reset | Responsive | Landing | Example-run rows stagOut, data resets to the sample, rows stagIn. | Data swaps | demo.reset |
| B08 † | Overlay Gone | Responsive | Overlay | Card enters (B07), link_off disc jelly, “(anymore).” waves every 5s. Sidebar collapses to the top. | Static gone card | — |
| T10 † | Shared View stale | Responsive | Shared View | After 30s without a snapshot the freshness dot turns Butter and the clock icon pops (scale 1.3 → 1). Timers keep counting locally. | Butter dot + “Updated 47s ago” | — |

## Planned features (Phase 6a) — motion notes
The Phase 6a board describes these features but has no motion column. Everything in this table is †: reuse of existing recipes, proposed here. Sound cue names in this table are new (†).

| Feature | Motion | Sound |
|---|---|---|
| Settings tab switch | Tab underline-pill FLIP slides (--dur-travel --spring-snappy); panel stagIn. | — |
| Discord test sent / failed | Sent: send icon flies right translateX(24px) opacity 0 then morph to check. Failed: R33 shake + Cherry message translateY(−4px) → 0. | toast.in / toast.error |
| Play this myself! copy ready | Prompt card jelly + C01 fountain from the button (Shared View 28 particles). | won.yay |
| Completion statistics | Numbers count up over --dur-celebrate (rAF, ease-out), bars fill with progress recipe, staggered 60ms; #1 row twinkle sparkles; sort switch re-ranks rows with FLIP. | stats.reveal (soft marimba run) |
| Loss counter | Record a loss: heart_broken icon pops (scale 1.4 → 1), count rolls (R23), row R33 shake at .5 amplitude. Undo in the toast. | loss.record (low clonk) |
| Counter overshoot | Crossing the Target: R24 full; going past it: gold “+n” sticker slaps (sticker recipe). | counter.full |
| Players | Chip pickup/drop uses the drag recipes (R19–R21); dropping on the bench flies back with revert flyback (no shake). | drag.* |
| Challenge notes | Popover menuIn from the note button; hover preview after 300ms, click pins. | menu.open |
| Keyboard reorder | Same FLIP as drag; picked row shows pick() transform while held. Live region announces each step. | drag.lift / drag.over / drag.drop |

## Future features (Phase 6b, proposals) — motion notes
| Feature | Motion | Sound |
|---|---|---|
| Mode ribbon | Stamps in once on load: rotate(−12°) scale(1.6) → rotate(−1.5°), --spring-bouncy. Mode meter jellies when its value changes. | mode.stamp (soft rubber-stamp thunk) |
| Mode picker | Detail panel jelly; ribbon re-stamps on every switch. | mode.pick (Gauntlet anvil, Timeboxed tick-tock, Cursed organ chord) |
| Confirmation | Prompt slides out from under the row (--spring-bouncy). Confirmed = C01 fountain + sticker. Failed = row shake + face pop. | confirm.ask (question-mark boing) · confirm.yes (two-note chime) · confirm.no (deflating kazoo) |
| Gauntlet loss / last attempt | Row shake, cherry crumbs from the button, spent shield pops to a dashed ring. Last attempt: Nini Sweating. | gauntlet.loss (low wooden clonk) · gauntlet.last (heartbeat under the next 10s) |
| Gauntlet reset | Workspace: blocking card drops in with overshoot, banner slams from scale 2.4, page shakes, cherry confetti, ledger chips pop one by one. Shared View: banner slam, page shake, rows shudder in sequence. Overlay: centre-screen card for 8s (34 particles), then back to the corner; shields refill one by one. | gauntlet.over (brass wah-wah-waaah + glass crunch) |
| Timeboxed last minute | Per second: vignette opacity pulse + well shiver; last 10s double amplitude, chip and Nini pop. Zero: “Time’s up” stamp, page shake, rows sag one by one. | timebox.tick (from 60s, pitch rising under 10s) · timebox.zero (buzzer, then silence) |
| Timeboxed lost | One-time stamp + sag on arrival. Nothing loops afterwards (“lost things don’t breathe”). | timebox.lost (sad trombone, once) |
| Cursed level up | A lilac shiver runs down the list row by row, drips from each row, curse stickers pop. | curse.add (descending organ chord, one note deeper per level) |
| Randomizer wheel | Spin decelerates over 4.6s with `linear(0, .5 8%, .8 20%, .95 45%, 1)`; pointer flicks rotate(−18° → 0) 90ms on each slice; land −4° overshoot; result card jellies in under confetti. | wheel.spin (ratchet clicks slowing with the wheel) · wheel.land (slot-machine ding) |
| Linked chain break | Rail flashes cherry, link dots spin, rows shake in chain order, then everything resets in one step. | chain.break (metal snap + three thuds) |
| Autocomplete | Popover springs open from the field. Matches never animate while typing. | — |
| Generate a Winnie | Rows deal in from the right on every roll (translateX(60px) → 0, stagger 40ms); single reroll flips its row (rotateX); dice spins twice. | generate.roll (dice rattle) · generate.deal (card flicks) |
| Archive restore | Card squashes, then flies up toward the picker under a confetti puff; toast confirms. | archive.restore (rewind whoosh + pop) |

## Sound cue list (final · planned, muted by default)
No audio files exist. Settings will offer **Off (default) / Subtle / Full**; the Overlay has its own switch and plays nothing unless the Owner turns it on (it would play through the OBS browser source). Cues never overlap the same cue (debounce 120ms); `tick.soft` plays at most once per second however many timers run. Reduced motion does not mute sound (separate preference).

| Cue | Moment IDs | Mood | Sync point |
|---|---|---|---|
| `tick.soft` | T01 T02 | dry wooden blip, very quiet | the frame the seconds digit changes (0ms). Once per second, however many rows run. Opt-in. |
| `tick.minute` | T03 | two-note marimba, rising | apex of the first digit hop (35% of --dur-minute ≈ 250ms) |
| `chime.hour` | T04 | three-note music box | well jelly peak (30% of --dur-hour) |
| `face.stage` | T08 | squeaky toy, lower each stage | face swap (0ms) |
| `press.pop` | R02 | soft rubber pop | bottom of the press (pointerdown) |
| `menu.open / menu.close` | R04 R05 | bubble up / bubble down | start of the animation |
| `modal.in` | R06 | mochi plop | card overshoot peak (25% of --dur-modal) |
| `modal.out` | R07 | soft whoosh | start |
| `toast.in` | R08 | tiny bell tap | toast lands (60%) |
| `toast.error` | R08 R33 | low double boop | first shake |
| `edit.save` | R12 | pencil tick | hop apex |
| `add.plop` | R13 | plop | landing squash (55% of --dur-land) |
| `delete.poof` | R14 | puff of air | particles spawn (30%) |
| `dup.clone` | R15 | bubble splitting | clone starts sliding |
| `pin.tape` | R16 | tape rip + slap | tape lands |
| `drag.lift / drag.over / drag.drop` | R19 R20 R21 | rubber stretch / faint tick / soft thunk | pickup / each slot change / drop squash |
| `drag.revert` | R22 | boing, falling pitch | row lands back in its slot |
| `counter.step` | R23 | click-clack, pitch rises with the count | roll start |
| `counter.full` | R24 | ding-ding | well jelly peak |
| `timer.start / timer.pause` | R25 | wind-up zip / deflate | icon swap |
| `timer.reset` | R34 | rewind chirp | first digit hop |
| `winnie.swap` | R26 | card shuffle | between out and in |
| `page.whoosh` | R27 | paper whoosh | out starts |
| `theme.swap` | R28 | light switch + shimmer | data-theme swap (end of the wipe) |
| `copy.ok` | R31 | sparkle tick | sparkles spawn |
| `won.yay` | C01 | triangle ding + tiny "yay" | jelly peak (18% of --dur-jelly) |
| `won.land` | R17 | plush thud | first landing squash in the Won group |
| `complete.fanfare` | C02 | kazoo + glockenspiel fanfare, 2.4s | Nini's first jump apex |
| `shared.update` | B01 | soft blip | highlight appears |
| `shared.complete` | C05 | short fanfare | banner unfurls |
| `reconnect.lost / reconnect.found` | B02 B03 | falling two-note / rising two-note | banner lands |
| `page.flip` | B04 | card riffle | first row flips (off on stream by default) |
| `overlay.won` | B05 | stamp thud + sparkle stinger | stamp lands (55% of --dur-stamp) |
| `overlay.complete` | C03 | big fanfare, 3s | banner lands (≈ 60%) |
| `gauntlet.wipe` | P01 | slide whistle down | rows start melting |
| `confirm.fail` | P02 | rubber squeak "nope" | shake |
| `timebox.tick / timebox.lost` | P03 | heartbeat tick / sad trombone wah | each of the last 10s / at zero |
| `wheel.tick / wheel.land` | P04 | clicker / bell ding | each segment pass / land |
| `changelog.latest` | S01 | bright sticker slap | stamp lands |
| `nini.boop` | S02 | soft squeak | hop start |
| `hero.drop` | S03 | seven rubbery plops in a rising scale | each letter lands |
| `demo.reset` | S06 | quick rewind zip | between out and in |
| `stats.reveal` | Completion statistics | soft marimba run | count-up start |
| `loss.record` | Loss counter | low wooden clonk | icon pop |
| `mode.stamp` / `mode.pick` | Mode ribbon / picker | rubber-stamp thunk / per-mode sting | ribbon lands |
| `confirm.ask` / `confirm.yes` / `confirm.no` | Confirmation | boing / two-note chime / deflating kazoo | prompt out / confirm / fail shake |
| `gauntlet.loss` / `gauntlet.last` / `gauntlet.over` | Gauntlet | clonk / heartbeat / brass wah-wah-waaah + glass crunch | loss / last-attempt start / banner slam |
| `timebox.tick` / `timebox.zero` / `timebox.lost` | Timeboxed | clock tick rising / buzzer / sad trombone | each second ≤60s / zero / lost arrives |
| `curse.add` | Cursed | descending organ chord | shiver start |
| `wheel.spin` / `wheel.land` | Randomizer | ratchet / slot ding | each slice / land |
| `chain.break` | Linked | metal snap + three thuds | rail flash |
| `generate.roll` / `generate.deal` | Generate | dice rattle / card flicks | roll / each row |
| `archive.restore` | Archive | rewind whoosh + pop | squash |

Phase 5 Overlay note (supersedes moods above for the stream): `page.flip` = soft card flick, `overlay.won` = rubber-stamp thunk + tiny crowd “yay”, `overlay.complete` = party horn into a confetti pop.

## Performance budget
- ≤ 1 rAF loop per surface (the clock). All animation is WAAPI on the compositor.
- Overlay: no backdrop, no blur, no box-shadow animation; ≤ 34 particles at once (Gauntlet reset), normally ≤ 28.
- Tab title rewrites once per second; favicon redraws a 32px canvas once per second and stops while the tab is hidden and paused.
- Off-screen frames/sections don't run ambient loops.
