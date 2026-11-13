import type {
  FatigueStage,
  LoopName,
  LoopOptions,
  MaybeEl,
  MotionEnv,
  MotionOptions,
  MotionState,
  ParticleShape,
  RainOptions,
  TickBeat,
  TickKind,
  Tokens,
  WinniesMotion,
} from "./types";
// Winnies motion engine: the handoff's `winnies-motion.js` ported to TypeScript, line for line (ADR-0003).
// Plain Web Animations API; every recipe animates transform, opacity or filter. Durations and easings come from the CSS
// tokens, read again when the theme, the dialect or the motion preference changes, so the token file stays the source
// of truth. Nothing here touches a browser global at import: the server imports this module too.
import { browserEnv } from "./env";
import { CALM_OFF, LOOPS, loopTier } from "./loops";
import { defaultTokens, readTokens } from "./tokens";

export { browserEnv } from "./env";

// Particle colours are var(--token) strings, resolved by the particle layer's own cascade.
const C1 = "var(--confetti-1)";
const C2 = "var(--confetti-2)";
const C3 = "var(--confetti-3)";
const C4 = "var(--confetti-4)";
const C5 = "var(--confetti-5)";
const CONF = [C1, C2, C3, C4, C5];
const P_WHITE = "var(--p-white)";
const P_BUTTER_300 = "var(--p-butter-300)";
const P_PINK_150 = "var(--p-pink-150)";
const P_MIST_300 = "var(--p-mist-300)";
const P_MIST_100 = "var(--p-mist-100)";
const SHAPES: ParticleShape[] = ["text:♥", "text:★", "circle", "text:✿"];

// The fatigue-stage beats (0 to 5) as keyframes plus the duration and easing the reference gives them.
type BeatRecipe = () => [Keyframe[], { duration: number; easing: string }];

// Indexing a list by a running counter cannot be undefined here: the counter is taken modulo the length.
function cycle<T>(list: readonly T[], i: number): T {
  return list[i % list.length] as T;
}

/**
 * Builds the motion engine for one surface. It reads no token at construction (the root does not exist yet on the
 * server): `T()` reads them from the root on the first call that has one, and gives the handoff's defaults until then.
 * `refresh()` reads them again, which `watch()` does whenever the page's theme, dialect or motion preference changes.
 *
 * @param o the surface: the element tokens are read from, the particle layer, the live config and an optional sound
 * cue hook
 * @returns the engine, every recipe ready, its tokens the surface's own from the first call, the defaults where it has no root
 */
export function createMotionEngine(o: MotionOptions): WinniesMotion {
  const env: MotionEnv = {
    ...browserEnv(),
    ...o.env,
  };
  // Null until the tokens are read. They are read on the first call that needs them if the surface has a root by then,
  // so a recipe of a first render (a child's `mounted`, before its layout starts the surface) runs on the surface's
  // own tokens (#335). Where there is no root (the server) they stay the handoff's defaults, and a call that finds a root
  // later reads it then. `refresh()` is the re-read.
  let read: Tokens | null = null;
  const defaults = defaultTokens();
  const tk = (): Tokens => {
    if (!read) {
      const root = o.root();
      if (!root)
        return defaults;
      read = readTokens(root, env);
    }
    return read;
  };
  const m = {} as WinniesMotion;
  const loops = new Set<Animation>();
  const subscribers = new Set<(s: MotionState) => void>();

  // Reduced motion is read live on every call: the config, the media query and <html data-motion>. So gating holds
  // before watch() starts and while a token is stale.
  const isReduced = () => o.cfg().reduced || env.mediaReduced() || env.htmlMotion() === "reduce";
  const g = () => tk().C.gain;
  const dia = () => o.cfg().dialect;
  const calm = () => !!o.cfg().calm;

  m.T = tk;
  m.refresh = (el) => {
    const from = el ?? o.root();
    if (!from)
      return;
    read = readTokens(from, env);
    loops.forEach((a) => {
      a.playbackRate = read!.C.rate;
    });
  };
  m.on = tier => !isReduced() && o.cfg()[tier] !== false && !(tier === "amb" && tk().C.ambientPaused);
  m.play = (tier, el, kf, opt) => (el && m.on(tier)
    ? el.animate(kf, opt)
    : null);
  m.done = a => (a
    ? a.finished.catch(() => {})
    : Promise.resolve());
  m.wait = ms => new Promise((r) => {
    setTimeout(r, isReduced()
      ? 0
      : ms);
  });
  m.cue = (name, id, at = 0) => {
    const hook = o.cue;
    if (!hook)
      return;
    setTimeout(hook, isReduced()
      ? 0
      : at, name, id);
  };

  // ---------- listening and loops ----------
  m.stopLoop = (a) => {
    a.cancel();
    loops.delete(a);
  };
  m.stopLoops = () => {
    loops.forEach(a => a.cancel());
    loops.clear();
  };
  m.subscribe = (cb) => {
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  };
  m.watch = () => {
    const onChange = () => {
      m.refresh();
      const reduced = isReduced();
      if (reduced)
        m.stopLoops();
      [...subscribers].forEach(cb => cb({ reduced }));
    };
    // Silent: whatever a first render asked for was built from the tokens the root already had (`tk()` reads them on the
    // first call), so there is nothing to tell the subscribers.
    m.refresh();
    const stopMedia = env.onMediaChange(onChange);
    const stopAttrs = env.onAttrChange(onChange);
    return () => {
      stopMedia();
      stopAttrs();
    };
  };
  const recipe = (name: LoopName) => LOOPS[name]({
    D: tk().D,
    E: tk().E,
    gain: g(),
    calm: calm(),
  });
  // The keyframes and timing a loop is baked from; `playbackRate` is not in them, a refresh sets it on a running loop.
  m.loopKey = name => JSON.stringify(recipe(name));
  // Replaces the reference's per-element syncLoops body: v-loop decides when to start, restart and pause.
  m.loop = (el: HTMLElement, name: LoopName, opt: LoopOptions = {}) => {
    if (!m.on(loopTier(name)))
      return null;
    if (calm() && CALM_OFF.has(name) && el.closest("[data-motion-preset=\"calm\"]"))
      return null;
    const [kf, timing] = recipe(name);
    const a = el.animate(kf, { iterations: Infinity, ...timing, delay: opt.delay ?? 0 });
    a.playbackRate = tk().C.rate;
    loops.add(a);
    return a;
  };

  // ---------- particles ----------
  function origin(el: MaybeEl, ox = 0.5, oy = 0.5) {
    const L = o.fx();
    if (!L || !el)
      return null;
    const lr = L.getBoundingClientRect();
    const sc = lr.width / (L.offsetWidth || 1) || 1;
    const er = el.getBoundingClientRect();
    return { L, x: (er.left + er.width * ox - lr.left) / sc, y: (er.top + er.height * oy - lr.top) / sc };
  }
  function spawn(L: HTMLElement, x: number, y: number, shape: ParticleShape, col: string, sz: number) {
    const p = L.ownerDocument.createElement("div");
    Object.assign(p.style, {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: `${sz}px`,
      height: `${sz}px`,
      pointerEvents: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 1,
      willChange: "transform, opacity",
    });
    if (shape === "circle") {
      Object.assign(p.style, { borderRadius: "50%", background: col });
    }
    else if (shape === "spark") {
      Object.assign(p.style, { background: col, clipPath: "polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)" });
    }
    else if (shape.startsWith("text:")) {
      Object.assign(p.style, {
        color: col,
        fontSize: `${sz}px`,
        fontFamily: "'M PLUS Rounded 1c'",
        fontWeight: 800,
        width: "auto",
        height: "auto",
      });
      p.textContent = shape.slice(5);
    }
    L.appendChild(p);
    return p;
  }
  m.burst = (tier, el, opt = {}) => {
    if (!m.on(tier))
      return;
    const n = Math.round((opt.n ?? tk().C.particles) * (opt.k ?? 1));
    if (n <= 0)
      return;
    const at = origin(el, opt.ox, opt.oy);
    if (!at)
      return;
    const shapes = opt.shapes || SHAPES;
    const colors = opt.colors || CONF;
    for (let i = 0; i < n; i++) {
      const sz = (opt.size || 22) * (0.6 + Math.random() * 0.8);
      const p = spawn(at.L, at.x, at.y, cycle(shapes, i), cycle(colors, i), sz);
      const ang = opt.up === false
        ? Math.random() * Math.PI * 2
        : (opt.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (opt.cone || 2);
      const dist = (opt.spread || 220) * g() ** 0.5 * (0.35 + Math.random() * 0.65);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist;
      const r = (Math.random() - 0.5) * (opt.spin ?? 240);
      p.animate([
        { transform: "translate(-50%,-50%) scale(.2) rotate(0deg)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${r}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + (opt.gravity ?? 80)}px)) scale(.7) rotate(${r * 1.4}deg)`, opacity: 0 },
      ], { duration: (opt.dur || tk().D.burst) * (0.75 + Math.random() * 0.5), easing: tk().E.out, delay: Math.random() * (opt.stagger || 60) }).onfinish = () => p.remove();
    }
  };
  m.rain = (tier, opt: RainOptions = {}) => {
    if (!m.on(tier))
      return;
    const L = o.fx();
    if (!L)
      return;
    const W = L.offsetWidth;
    const H = L.offsetHeight;
    const n = Math.round((opt.n ?? tk().C.particles * 2) * (opt.k ?? 1));
    for (let i = 0; i < n; i++) {
      const sz = (opt.size || 26) * (0.6 + Math.random() * 0.8);
      const x = Math.random() * W;
      const p = spawn(L, x, -40, cycle(SHAPES, i), cycle(CONF, i), sz);
      const sway = (Math.random() - 0.5) * 160;
      const r = (Math.random() - 0.5) * 720;
      p.animate([
        { transform: "translate(-50%,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(calc(-50% + ${sway}px), ${H * 0.55}px) rotate(${r * 0.5}deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(calc(-50% + ${-sway * 0.4}px), ${H + 60}px) rotate(${r}deg)`, opacity: 0.2 },
      ], { duration: (opt.dur || tk().D.celebrate * 1.4) * (0.7 + Math.random() * 0.6), easing: "cubic-bezier(.3,.2,.6,1)", delay: Math.random() * (opt.spread || 900) }).onfinish = () => p.remove();
    }
  };

  // ---------- tick ----------
  // kind: total | row | ov-total | ov-row · beat: sec | min | hour
  m.tick = (digits: HTMLElement[], kind: TickKind, beat: TickBeat, well) => {
    if (!m.on("resp") || !digits.length)
      return;
    const iv = o.cfg().interval;
    const clamp = (d: number) => Math.min(d, iv * 0.95);
    const ov = kind.startsWith("ov");
    const total = kind.endsWith("total");
    const bc = ov || dia() === "broadcast";
    if (ov && kind === "ov-row" && calm())
      return;
    const hop = tk().C.hop;
    const sq = tk().C.squash;
    const tilt = bc
      ? 0
      : 5 * g();
    // Below a 120 ms interval every beat takes the per-second shape (the reference's quirk): rollovers then get a
    // plain tick and never reach the well, the burst or the cue.
    if (beat === "sec" || iv < 120) {
      if (iv < 60 && beat === "sec")
        return; // > 16× clock: seconds blur together, keep the rollovers
      digits.forEach((el) => {
        if (total) {
          el.animate([
            { transform: "none" },
            { transform: `translateY(${hop}px) scale(${1 - sq},${1 + sq})`, offset: 0.35 },
            { transform: `translateY(0) scale(${1 + sq},${1 - sq})`, offset: 0.7 },
            { transform: "none" },
          ], {
            duration: clamp(tk().D.tick),
            easing: tk().E.out,
          });
        }
        else {
          el.animate([
            { transform: "none" },
            { transform: `translateY(${hop * 0.6}px) rotate(${-tilt}deg)`, offset: 0.4 },
            { transform: "none" },
          ], {
            duration: clamp(tk().D.flick),
            easing: tk().E.spring,
          });
        }
      });
      return;
    }
    const big = beat === "hour";
    const k = big ? 2.2 : 1.6;
    const dur = clamp(big
      ? tk().D.hour
      : tk().D.minute) || 1;
    const ordered = [...digits].sort((a, b) => Number(a.dataset.pos) - Number(b.dataset.pos));
    // The reference clamps the duration alone, so a late slot could still be moving when the next beat ticks it
    // (#337). Counting the stagger delay into the 95% keeps every slot's rollover inside its beat.
    ordered.forEach((el, i) => {
      const delay = Math.min(i * 50, iv * 0.3);
      el.animate([
        { transform: "none" },
        { transform: `translateY(${hop * k * (total ? 1 : 0.6)}px) scale(.94,1.08)`, offset: 0.35 },
        { transform: "scale(1.06,.95)", offset: 0.65 },
        { transform: "none" },
      ], {
        duration: Math.max(1, Math.min(dur, iv * 0.95 - delay)),
        delay,
        easing: tk().E.bouncy,
        fill: "backwards",
      });
    });
    if (well && total) {
      if (!(calm() && ov)) {
        well.animate(big
          ? [
              { transform: "scale(1)" },
              { transform: "scale(1.06,.94)", offset: 0.3 },
              { transform: "scale(.97,1.03)", offset: 0.6 },
              { transform: "scale(1)" },
            ]
          : [
              { transform: "scale(1)" },
              { transform: "scale(1.03)", offset: 0.3 },
              { transform: "scale(1)" },
            ], { duration: dur, easing: tk().E["in-out"] });
      }
      if (big) {
        m.burst("resp", well, {
          n: ov
            ? 14
            : dia() === "showcase"
              ? 24
              : 10,
          shapes: ["spark", "circle"],
          colors: [C2, C1, P_WHITE],
          size: 16,
          spread: 160,
          k: calm()
            ? 0
            : 1,
        });
        m.cue("chime.hour", "T04", dur * 0.3);
      }
      else {
        if (dia() === "showcase") {
          m.burst("resp", well, {
            n: 6,
            shapes: ["spark"],
            colors: [C2, C1],
            size: 14,
            spread: 120,
          });
        }
        m.cue("tick.minute", "T03", dur * 0.35);
      }
    }
  };
  const BEATS: Record<FatigueStage, BeatRecipe> = {
    0: () => [
      [
        { transform: "none" },
        { transform: `translateY(${-8 * g()}px) scale(.94,1.07)`, offset: 0.35 },
        { transform: "scale(1.07,.93)", offset: 0.7 },
        { transform: "none" },
      ],
      { duration: 420, easing: "ease-out" },
    ],
    1: () => [
      [
        { transform: "none" },
        { transform: `translateY(2px) rotate(${-5 * g()}deg)`, offset: 0.4 },
        { transform: "none" },
      ],
      { duration: 420, easing: "ease-in-out" },
    ],
    2: () => [
      [
        { transform: "rotate(0)" },
        { transform: `rotate(${-11 * g()}deg)`, offset: 0.3 },
        { transform: `rotate(${9 * g()}deg)`, offset: 0.65 },
        { transform: "rotate(0)" },
      ],
      { duration: 520, easing: "ease-in-out" },
    ],
    3: () => [
      [
        { transform: "none" },
        { transform: "translateY(3px) scale(1.07,.88)", offset: 0.45 },
        { transform: "translateY(3px) scale(1.07,.88)", offset: 0.7 },
        { transform: "none" },
      ],
      { duration: tk().D.droop, easing: "ease-in-out" },
    ],
    4: () => [
      [
        { transform: "none" },
        { transform: "translateX(-4px)", offset: 0.2 },
        { transform: "translateX(4px)", offset: 0.4 },
        { transform: "translateX(-3px)", offset: 0.6 },
        { transform: "translateX(2px)", offset: 0.8 },
        { transform: "none" },
      ],
      { duration: 380, easing: "linear" },
    ],
    5: () => [
      [
        { transform: "none" },
        { transform: "translateX(-4px) scale(1.06)" },
        { transform: "translateX(4px) scale(1.06)" },
        { transform: "translateX(-4px) scale(1.06)" },
        { transform: "translateX(3px) scale(1.04)" },
        { transform: "none" },
      ],
      { duration: 460, easing: tk().E.stepped },
    ],
  };
  m.beat = (el, stage, minuteOnly) => {
    // A stage outside 0 to 5 has no beat.
    const recipe: BeatRecipe | undefined = BEATS[stage];
    if (!m.on("resp") || !el || !recipe)
      return;
    const iv = o.cfg().interval;
    if (iv < 200 && !minuteOnly)
      return;
    const [kf, opt] = recipe();
    el.animate(kf, {
      ...opt,
      duration: Math.min(opt.duration, Math.max(iv, 300) * 0.95),
    });
  };
  m.stageChange = (el) => {
    m.play("resp", el, [
      { transform: "scale(1)" },
      { transform: "scale(1.25,.8)", offset: 0.2 },
      { transform: "scale(.9,1.12)", offset: 0.5 },
      { transform: "scale(1)" },
    ], { duration: tk().D.jelly, easing: tk().E.out });
    if (!calm()) {
      m.burst("resp", el, {
        n: 6,
        shapes: ["circle"],
        colors: [P_WHITE, P_PINK_150],
        size: 12,
        spread: 70,
        up: false,
        gravity: 0,
      });
    }
    m.cue("face.stage", "T08");
  };

  // ---------- responsive ----------
  const jellyKf = (a = 1): Keyframe[] => [
    { transform: "scale(1,1)" },
    { transform: `scale(${1 + 0.07 * a},${1 - 0.12 * a})`, offset: 0.18 },
    { transform: `scale(${1 - 0.06 * a},${1 + 0.08 * a})`, offset: 0.42 },
    { transform: `scale(${1 + 0.03 * a},${1 - 0.03 * a})`, offset: 0.68 },
    { transform: "scale(1,1)" },
  ];
  m.jelly = (tier, el, a = 1, dur) => m.play(tier, el, jellyKf(a * g()), { duration: dur || tk().D.jelly, easing: tk().E.out });
  m.release = el => m.play("resp", el, [
    { transform: "scale(1,1)" },
    { transform: `scale(${1 + 0.06 * g()},${1 - 0.06 * g()})`, offset: 0.3 },
    { transform: `scale(${1 - 0.03 * g()},${1 + 0.03 * g()})`, offset: 0.65 },
    { transform: "scale(1,1)" },
  ], { duration: tk().D.jelly * 0.6, easing: tk().E.spring });
  m.menuIn = (el) => {
    if (!el)
      return;
    m.play("resp", el, [
      { transform: "scale(.6) translateY(-8px)", opacity: 0 },
      { transform: "none", opacity: 1, offset: 0.4 },
      { transform: "none", opacity: 1 },
    ], { duration: tk().D.toast, easing: tk().E.bouncy });
    [...el.children].forEach((c, i) => m.play("resp", c, [
      { transform: "translateY(6px)", opacity: 0 },
      { transform: "none", opacity: 1 },
    ], {
      duration: tk().D.base,
      delay: 40 + i * 30,
      easing: tk().E.out,
      fill: "backwards",
    }));
    m.cue("menu.open", "R04");
  };
  m.menuOut = (el) => {
    m.cue("menu.close", "R05");
    return m.done(m.play("resp", el, [
      { transform: "none", opacity: 1 },
      { transform: "scale(.9) translateY(-4px)", opacity: 0 },
    ], { duration: tk().D.fast, easing: tk().E.in, fill: "forwards" }));
  };
  m.modalIn = (scrim, card) => {
    m.play("resp", scrim, [
      { opacity: 0 },
      { opacity: 1 },
    ], { duration: tk().D.base, easing: tk().E.out });
    const s = dia() === "showcase"
      ? 0.7
      : 0.85;
    m.play("resp", card, [
      { transform: `translateY(40px) scale(${s})`, opacity: 0 },
      { transform: "none", opacity: 1, offset: 0.3 },
      { transform: "none", opacity: 1 },
    ], { duration: tk().D.modal, easing: tk().E.bouncy });
    m.cue("modal.in", "R06", tk().D.modal * 0.25);
  };
  m.modalOut = (scrim, card) => {
    m.cue("modal.out", "R07");
    m.play("resp", scrim, [
      { opacity: 1 },
      { opacity: 0 },
    ], { duration: tk().D.base, easing: tk().E.in, fill: "forwards" });
    return m.done(m.play("resp", card, [
      { transform: "none", opacity: 1 },
      { transform: "translateY(24px) scale(.92)", opacity: 0 },
    ], { duration: tk().D.base, easing: tk().E.in, fill: "forwards" }));
  };
  m.toastIn = (el, error) => {
    const a = m.play("resp", el, [
      { transform: "translateY(120%) scale(.9)", opacity: 0 },
      { transform: "none", opacity: 1, offset: 0.35 },
      { transform: "none", opacity: 1 },
    ], { duration: tk().D.toast, easing: tk().E.bouncy });
    if (a) {
      a.finished.then(() => (error
        ? m.shake(el)
        : m.jelly("resp", el, 0.5, tk().D.jelly * 0.7))).catch(() => {});
    }
    m.cue(error ? "toast.error" : "toast.in", "R08", tk().D.toast * 0.6);
  };
  m.toastOut = el => m.done(m.play("resp", el, [
    { transform: "none", opacity: 1 },
    { transform: "translateX(30px)", opacity: 0 },
  ], { duration: tk().D.fast, easing: tk().E.in, fill: "forwards" }));
  m.tipIn = el => m.play("resp", el, [
    { transform: "translate(-50%,-100%) translateY(4px) scale(.7)", opacity: 0 },
    { transform: "translate(-50%,-100%)", opacity: 1 },
  ], { duration: tk().D.fast, easing: tk().E.spring });
  m.editIn = el => m.play("resp", el, [
    { transform: "scale(.96)" },
    { transform: "scale(1)" },
  ], { duration: tk().D.base, easing: tk().E.snappy });
  m.hopText = el => m.play("resp", el, [
    { transform: "none" },
    { transform: `translateY(${-5 * g()}px)`, offset: 0.4 },
    { transform: "none" },
  ], { duration: tk().D.flick, easing: tk().E.spring });
  m.shake = el => m.play("resp", el, [
    { transform: "translateX(0)" },
    { transform: "translateX(-6px)" },
    { transform: "translateX(6px)" },
    { transform: "translateX(-4px)" },
    { transform: "translateX(3px)" },
    { transform: "translateX(0)" },
  ], { duration: tk().D.flick, easing: "linear" });
  m.enterRow = (el) => {
    m.play("resp", el, [
      { transform: "translateY(-48px) scale(.9,1.1)", opacity: 0 },
      { transform: "translateY(0) scale(1.06,.92)", opacity: 1, offset: 0.55 },
      { transform: "scale(.98,1.02)", offset: 0.78 },
      { transform: "none" },
    ], { duration: tk().D.land, easing: tk().E.out });
    if (dia() === "showcase") {
      setTimeout(() => m.burst("resp", el, {
        n: 8,
        ox: 0.1,
        shapes: ["circle"],
        colors: [P_PINK_150, C4],
        size: 12,
        spread: 90,
      }), tk().D.land * 0.5);
    }
    m.cue("add.plop", "R13", tk().D.land * 0.55);
  };
  m.exitRow = (el) => {
    // Scheduled even when reduced; burst() then gates itself.
    setTimeout(() => m.burst("resp", el, {
      n: 8,
      ox: 0.5,
      shapes: ["circle"],
      colors: [P_MIST_300, P_MIST_100, P_WHITE],
      size: 18,
      spread: 120,
      up: false,
      gravity: -20,
    }), tk().D.toast * 0.3);
    m.cue("delete.poof", "R14", tk().D.toast * 0.3);
    return m.done(m.play("resp", el, [
      { transform: "none", opacity: 1 },
      { transform: "scale(1.04,.86)", opacity: 1, offset: 0.3 },
      { transform: "scale(.6)", opacity: 0 },
    ], { duration: tk().D.toast, easing: tk().E.in, fill: "forwards" }));
  };
  // FLIP: prev = Map(key → DOMRect) captured before the state change. special(key, el, dy) may return true if it animated.
  m.capture = (els) => {
    const mp = new Map<string, DOMRect>();
    els.forEach(([k, el]) => mp.set(k, el.getBoundingClientRect()));
    return mp;
  };
  m.flip = (prev, els, sc = 1, special) => {
    els.forEach(([k, el]) => {
      const p = prev.get(k);
      if (!p)
        return;
      const r = el.getBoundingClientRect();
      const dy = (p.top - r.top) / sc;
      if (special && special(k, el, dy))
        return;
      if (Math.abs(dy) < 1)
        return;
      m.play("resp", el, [
        { transform: `translateY(${dy}px)` },
        { transform: "none" },
      ], { duration: tk().D.travel, easing: tk().E.snappy });
    });
  };
  m.arc = (el, dy, after) => {
    const tilt = dy > 0
      ? -2
      : 2;
    el.style.zIndex = "15";
    const a = m.play("resp", el, [
      { transform: `translateY(${dy}px)` },
      { transform: `translateY(${dy * 0.5}px) scale(1.04) rotate(${tilt}deg)`, offset: 0.5 },
      { transform: "none" },
    ], { duration: tk().D.travel * 1.3, easing: tk().E["in-out"] });
    m.done(a).then(() => {
      el.style.zIndex = "";
      after?.();
    });
    return a;
  };
  m.land = el => m.play("resp", el, [
    { transform: "scale(1.08,.9)" },
    { transform: "scale(.97,1.04)", offset: 0.5 },
    { transform: "none" },
  ], { duration: tk().D.land, easing: tk().E.out });
  m.clone = (el, pitch) => {
    m.play("resp", el, [
      { transform: `translateY(${-pitch}px) scale(.96)`, opacity: 0.4 },
      { transform: "translateY(0) scale(1.03,.97)", opacity: 1, offset: 0.7 },
      { transform: "none", opacity: 1 },
    ], { duration: tk().D.travel, easing: tk().E.bouncy });
    m.cue("dup.clone", "R15");
  };
  m.tape = (el) => {
    m.play("resp", el, [
      { transform: "rotate(-30deg) scale(1.6)", opacity: 0 },
      { transform: "rotate(-10deg) scale(1)", opacity: 0.92 },
    ], {
      duration: tk().D.land,
      easing: tk().E.bouncy,
      fill: "backwards",
      delay: tk().D.travel,
    });
    m.cue("pin.tape", "R16", tk().D.travel + tk().D.land * 0.6);
  };
  m.sticker = (el, delay = 0) => m.play("cel", el, [
    { transform: "rotate(40deg) scale(2.2)", opacity: 0 },
    { transform: "rotate(12deg) scale(1)", opacity: 1 },
  ], {
    duration: tk().D.land,
    easing: tk().E.bouncy,
    delay,
    fill: "backwards",
  });
  m.pick = el => m.play("resp", el, [
    { transform: "none" },
    { transform: `scale(1.04) rotate(${dia() === "showcase"
      ? -2
      : -1.2}deg)` },
  ], { duration: tk().D.base, easing: tk().E.snappy, fill: "forwards" });
  m.drop = el => m.play("resp", el, [
    { transform: `scale(1.04) rotate(${dia() === "showcase"
      ? -2
      : -1.2}deg)` },
    { transform: "scale(.97,1.03)", offset: 0.45 },
    { transform: "none" },
  ], { duration: tk().D.jelly * 0.6, easing: tk().E.snappy });
  m.revert = (outer, mid, dy) => {
    const a = m.play("resp", outer, [
      { transform: `translateY(${dy}px)` },
      { transform: "none" },
    ], { duration: tk().D.travel, easing: tk().E.bouncy });
    m.done(a).then(() => m.play("resp", mid, [
      { transform: "rotate(0)" },
      { transform: "rotate(-3deg)" },
      { transform: "rotate(3deg)" },
      { transform: "rotate(-2deg)" },
      { transform: "rotate(0)" },
    ], { duration: tk().D.flick, easing: "linear" }));
    m.cue("drag.revert", "R22", tk().D.travel * 0.8);
  };
  m.roll = (el, dir) => m.play("resp", el, [
    { transform: `translateY(${dir * 70}%)`, opacity: 0.15 },
    { transform: `translateY(${-dir * 8}%)`, opacity: 1, offset: 0.6 },
    { transform: "none", opacity: 1 },
  ], { duration: tk().D.flick, easing: tk().E.snappy });
  m.full = (well, ov) => {
    m.jelly("resp", well, ov || calm()
      ? 0.5
      : 1);
    if (!ov) {
      m.burst("resp", well, {
        n: 8,
        shapes: ["spark", "circle"],
        colors: [P_BUTTER_300, C3, C2],
        size: 14,
        spread: 110,
      });
    }
    m.cue("counter.full", "R24", tk().D.jelly * 0.2);
  };
  m.morph = el => m.play("resp", el, [
    { transform: "scale(.3) rotate(-120deg)", opacity: 0 },
    { transform: "scale(1.15) rotate(10deg)", opacity: 1, offset: 0.6 },
    { transform: "none", opacity: 1 },
  ], { duration: tk().D.flick, easing: tk().E.bouncy });
  m.ringIn = el => m.play("resp", el, [
    { transform: "scale(.94)", opacity: 0 },
    { transform: "scale(1.02)", opacity: 1, offset: 0.6 },
    { transform: "none", opacity: 1 },
  ], { duration: tk().D.land, easing: tk().E.out });
  m.wave = (digits, k = 1) => [...digits].forEach((el, i) => m.play("resp", el, [
    { transform: "none" },
    { transform: `translateY(${-10 * g() * k}px)`, offset: 0.4 },
    { transform: "none" },
  ], {
    duration: tk().D.land,
    delay: i * 40,
    easing: tk().E.bouncy,
    fill: "backwards",
  }));
  m.droop = digits => [...digits].forEach((el, i) => m.play("resp", el, [
    { transform: "none" },
    { transform: "translateY(4px) scale(1.02,.96)", offset: 0.5 },
    { transform: "none" },
  ], { duration: tk().D.droop, delay: i * 20, easing: tk().E["in-out"] }));
  m.stagOut = els => Promise.all([...els].map((el, i) => m.done(m.play("resp", el, [
    { transform: "none", opacity: 1 },
    { transform: "translateY(12px)", opacity: 0 },
  ], {
    duration: tk().D.fast,
    delay: i * 20,
    easing: tk().E.in,
    fill: "forwards",
  }))));
  m.stagIn = els => [...els].forEach((el, i) => {
    el.getAnimations().forEach((a) => {
      if (a.effect && a.effect.getComputedTiming().fill === "forwards")
        a.cancel();
    });
    m.play("resp", el, [
      { transform: "translateY(24px) scale(.96)", opacity: 0 },
      { transform: "none", opacity: 1, offset: 0.4 },
      { transform: "none", opacity: 1 },
    ], {
      duration: tk().D.land,
      delay: i * 40,
      easing: tk().E.bouncy,
      fill: "backwards",
    });
  });
  m.pageOut = (el, dir) => m.done(m.play("resp", el, [
    { transform: "none", opacity: 1 },
    { transform: `translateX(${-dir * 60}px) scale(.97)`, opacity: 0 },
  ], { duration: tk().D.fast, easing: tk().E.in, fill: "forwards" }));
  m.pageIn = (el, dir) => {
    if (!el)
      return;
    el.getAnimations().forEach(a => a.cancel());
    m.play("resp", el, [
      { transform: `translateX(${dir * 80}px) scale(.97)`, opacity: 0 },
      { transform: "none", opacity: 1 },
    ], { duration: tk().D["page-x"], easing: tk().E.snappy });
  };
  m.progress = (fill, fromX, toX) => m.play("resp", fill, [
    { transform: `translateX(${fromX}%)` },
    { transform: `translateX(${toX}%)` },
  ], { duration: tk().D.land, easing: tk().E.bouncy });
  // The switch knob's slide (#316). The reference's `.w-switch::after` transitions `left` over --dur-fast with
  // --ease-spring; rule 2 allows only transform, so it is `translateX` with the same timing (the human, 2026-11-13).
  // The moment has no ID in 04-motion-and-sound.md, which is the handoff's copy and stays as it is.
  m.switchSlide = (knob, fromX, toX) => m.play("resp", knob, [
    { transform: `translateX(${fromX}%)` },
    { transform: `translateX(${toX}%)` },
  ], { duration: tk().D.fast, easing: tk().E.spring });
  m.pop = (el, s = 1.3) => m.play("resp", el, [
    { transform: `scale(${1 + (s - 1) * g()})` },
    { transform: "none" },
  ], { duration: tk().D.flick, easing: tk().E.spring });
  // theme wipe: circle in the next page colour grows from (x,y), swap at the end, fade out
  m.themeWipe = (layer, x, y, color, swap) => {
    const view = layer?.ownerDocument.defaultView;
    if (!m.on("resp") || !layer || !view) {
      swap();
      return;
    }
    const W = view.innerWidth;
    const H = view.innerHeight;
    const r = Math.hypot(Math.max(x, W - x), Math.max(y, H - y));
    const c = layer.ownerDocument.createElement("div");
    // 90 sits above the particle layer (--z-confetti: 80).
    Object.assign(c.style, {
      position: "fixed",
      left: `${x - r}px`,
      top: `${y - r}px`,
      width: `${2 * r}px`,
      height: `${2 * r}px`,
      borderRadius: "50%",
      background: color,
      pointerEvents: "none",
      zIndex: 90,
      transform: "scale(0)",
    });
    layer.appendChild(c);
    c.animate([
      { transform: "scale(0)" },
      { transform: "scale(1)" },
    ], { duration: tk().D.theme, easing: tk().E["in-out"], fill: "forwards" }).onfinish = () => {
      swap();
      view.requestAnimationFrame(() => {
        c.animate([
          { opacity: 1 },
          { opacity: 0 },
        ], { duration: tk().D.base, easing: tk().E.out, fill: "forwards" }).onfinish = () => c.remove();
      });
    };
  };

  // ---------- broadcast ----------
  m.highlight = (el) => {
    if (!el)
      return null;
    el.getAnimations().forEach(a => a.cancel());
    return m.play("resp", el, [
      { opacity: 0, transform: "scale(1.04)", easing: tk().E.out },
      { opacity: 1, transform: "scale(1)", offset: 0.1 },
      { opacity: 1, offset: 0.6, easing: tk().E["in-out"] },
      { opacity: 0 },
    ], { duration: tk().D.highlight, easing: "linear", fill: "forwards" });
  };
  m.bannerIn = el => m.play("resp", el, [
    { transform: "translateY(-120%)" },
    { transform: "none" },
  ], { duration: tk().D.toast, easing: tk().E.snappy });
  m.bannerOut = el => m.done(m.play("resp", el, [
    { transform: "none" },
    { transform: "translateY(-140%)" },
  ], { duration: tk().D.base, easing: tk().E.in, fill: "forwards" }));
  // The one place the port leaves the reference (line 278): under reduced motion no animation is created, so the
  // muted look is landed as inline styles with the reference's own values. Every call clears both first, so un-muting
  // works whichever way the look was landed.
  m.mute = (el, on) => {
    if (!el)
      return;
    el.getAnimations().forEach(a => a.cancel());
    el.style.filter = "";
    el.style.opacity = "";
    if (!on)
      return;
    if (!m.on("resp")) {
      el.style.filter = "saturate(.55)";
      el.style.opacity = "0.85";
      return;
    }
    el.animate([
      { filter: "saturate(1)", opacity: 1 },
      { filter: "saturate(.55)", opacity: 0.85 },
    ], { duration: tk().D.base, easing: tk().E.standard, fill: "forwards" });
  };
  // Tier amb, as in the reference: --ambient-motion: paused also stops page flips.
  m.pageFlipOut = (rows) => {
    if (calm()) {
      return Promise.all([...rows].map(el => m.done(m.play("amb", el, [
        { opacity: 1 },
        { opacity: 0 },
      ], { duration: tk().D.base, fill: "forwards" }))));
    }
    return Promise.all([...rows].map((el, i) => m.done(m.play("amb", el, [
      { transform: "none", opacity: 1 },
      { transform: "translateY(-14px) rotateX(70deg)", opacity: 0 },
    ], {
      duration: tk().D.base,
      delay: i * 70,
      easing: tk().E.in,
      fill: "forwards",
    }))));
  };
  m.pageFlipIn = rows => [...rows].forEach((el, i) => {
    el.getAnimations().forEach(a => a.cancel());
    if (calm()) {
      m.play("amb", el, [
        { opacity: 0 },
        { opacity: 1 },
      ], { duration: tk().D.base });
      return;
    }
    m.play("amb", el, [
      { transform: "translateY(14px) rotateX(-70deg)", opacity: 0 },
      { transform: "none", opacity: 1, offset: 0.45 },
      { transform: "none", opacity: 1 },
    ], {
      duration: tk().D.land,
      delay: i * 70,
      easing: tk().E.bouncy,
      fill: "backwards",
    });
  });
  m.cardEnter = el => calm()
    ? m.play("resp", el, [
        { opacity: 0 },
        { opacity: 1 },
      ], { duration: tk().D.base })
    : m.play("resp", el, [
        { transform: "translateY(140%) rotate(4deg)" },
        { transform: "translateY(-4%) rotate(-1deg)", offset: 0.7 },
        { transform: "none" },
      ], { duration: tk().D.land * 1.3, easing: tk().E.bouncy });
  m.stampIn = (el) => {
    m.cue("overlay.won", "B05", tk().D.stamp * 0.55);
    if (calm()) {
      return m.play("cel", el, [
        { opacity: 0 },
        { opacity: 1 },
      ], { duration: tk().D.base, fill: "backwards" });
    }
    return m.play("cel", el, [
      { transform: "translate(-50%,-50%) scale(2.4) rotate(-20deg)", opacity: 0 },
      { transform: "translate(-50%,-50%) scale(.9) rotate(-8deg)", opacity: 1, offset: 0.55 },
      { transform: "translate(-50%,-50%) scale(1.05) rotate(-8deg)", offset: 0.75 },
      { transform: "translate(-50%,-50%) rotate(-8deg)" },
    ], { duration: tk().D.stamp, easing: tk().E.out });
  };
  m.stampOut = el => m.done(m.play("cel", el, [
    { transform: "translate(-50%,-50%) rotate(-8deg)", opacity: 1 },
    { transform: "translate(-50%,-50%) scale(1.2) rotate(-8deg)", opacity: 0 },
  ], { duration: tk().D.base, easing: tk().E.in, fill: "forwards" }));
  m.cardHop = (el) => {
    if (!calm()) {
      m.play("cel", el, [
        { transform: "none" },
        { transform: `translateY(${-10 * g()}px) scale(1.02)`, offset: 0.35 },
        { transform: "scale(.99,1.01)", offset: 0.7 },
        { transform: "none" },
      ], { duration: tk().D.jelly, easing: tk().E.out });
    }
  };

  // ---------- celebratory ----------
  m.won = (mid, face, ov) => {
    m.jelly("cel", mid, ov ? 0.8 : 1);
    m.play("cel", face, [
      { transform: "scale(1)" },
      { transform: "scale(1.3)", offset: 0.3 },
      { transform: "scale(1)" },
    ], { duration: tk().D.jelly, easing: tk().E.spring });
    m.burst("cel", face || mid, {
      ox: 0.5,
      size: 24,
      spread: 240,
      cone: 2,
      k: ov && calm()
        ? 0
        : 1,
    });
    m.cue("won.yay", "C01", tk().D.jelly * 0.18);
  };
  // Winniebert's celebratory jump; the recipe keeps its handoff name.
  m.niniJump = (el, n = 2) => m.play("cel", el, [
    { transform: "translateY(0) scale(1,1)" },
    { transform: "translateY(0) scale(1.2,.8)", offset: 0.15 },
    { transform: `translateY(${-90 * g()}px) scale(.9,1.15) rotate(-10deg)`, offset: 0.45 },
    { transform: "translateY(0) scale(1.15,.85)", offset: 0.75 },
    { transform: "none" },
  ], { duration: 1100, easing: tk().E["in-out"], iterations: n });
  m.niniHop = el => m.play("cel", el, [
    { transform: "none" },
    { transform: `translateY(${-24 * g()}px) scale(.95,1.06)`, offset: 0.4 },
    { transform: "scale(1.06,.94)", offset: 0.75 },
    { transform: "none" },
  ], { duration: tk().D.jelly, easing: tk().E.out });
  m.unfurl = el => m.play("cel", el, [
    { transform: "scaleY(0)", opacity: 0 },
    { transform: "scaleY(1)", opacity: 1, offset: 0.35 },
    { transform: "scaleY(1)", opacity: 1 },
  ], { duration: tk().D.land * 1.2, easing: tk().E.bouncy });
  m.flash = el => m.play("cel", el, [
    { filter: "brightness(1.35)" },
    { filter: "brightness(1)" },
  ], { duration: tk().D.celebrate * 0.5, easing: tk().E.out });
  m.bannerDrop = el => calm()
    ? m.play("cel", el, [
        { opacity: 0 },
        { opacity: 1 },
      ], { duration: tk().D.base })
    : m.play("cel", el, [
        { transform: "translateY(-220px) rotate(-12deg)", opacity: 0 },
        { transform: "translateY(0) rotate(3deg)", opacity: 1, offset: 0.45 },
        { transform: "translateY(-14px) rotate(-1deg)", offset: 0.65 },
        { transform: "none" },
      ], { duration: tk().D.land * 1.5, easing: tk().E.out });

  return m;
}
