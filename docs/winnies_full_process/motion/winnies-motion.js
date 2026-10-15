// Winnies motion library · Phase 4 · CSS + Web Animations API only.
// Every recipe animates transform / opacity / filter. Durations + easings are read from the CSS tokens
// (tokens/winnies-tokens.css) once per theme/dialect/preset change, so the CSS file stays the source of truth.
(function () {
  const D = { instant: 90, fast: 160, base: 240, hover: 300, toast: 360, flick: 380, modal: 420, 'page-x': 460, tick: 480, travel: 560, theme: 560, land: 600, jelly: 700, minute: 720, stamp: 900, droop: 950, burst: 1300, hour: 1400, cheer: 1800, breathe: 2200, celebrate: 2400, wave: 2600, highlight: 3000, float: 4800, shimmer: 9000, page: 10000, drift: 60000 };
  const E = {
    spring: 'cubic-bezier(.3,1.7,.5,1)', hover: 'cubic-bezier(.3,1.8,.5,1)', out: 'cubic-bezier(.15,.7,.3,1)', in: 'cubic-bezier(.55,0,.75,.2)',
    'in-out': 'cubic-bezier(.45,0,.55,1)', standard: 'cubic-bezier(.2,0,0,1)', stepped: 'steps(6,end)',
    snappy: 'linear(0, .2 4%, .6 10%, .88 16%, 1.02 22%, 1.06 28%, 1.04 36%, 1 46%, .995 60%, 1)',
    bouncy: 'linear(0, .3 6%, .8 13%, 1.1 20%, 1.15 25%, 1.1 30%, .97 40%, .95 46%, 1 56%, 1.02 64%, 1 78%, 1)',
    soft: 'linear(0, .12 5%, .4 14%, .7 24%, .92 34%, 1.02 44%, 1.03 52%, 1.01 66%, 1)',
  };
  const hasLinear = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)');
  const CONF = ['#FF6FAE', '#FFC23D', '#9BE3B4', '#CDB8FF', '#A8DEFF'];
  const SHAPES = ['text:♥', 'text:★', 'circle', 'text:✿'];

  function readTokens(el) {
    const cs = getComputedStyle(el), T = { D: { ...D }, E: { ...E }, C: { gain: 1, hop: -6, squash: 0.04, rate: 1, particles: 24 } };
    for (const k in D) { const v = cs.getPropertyValue('--dur-' + k).trim(); if (v) T.D[k] = parseFloat(v) * (v.endsWith('ms') ? 1 : 1000); }
    for (const k of ['spring', 'hover', 'out', 'in', 'in-out', 'standard', 'stepped']) { const v = cs.getPropertyValue('--ease-' + k).trim(); if (v) T.E[k] = v; }
    for (const k of ['snappy', 'bouncy', 'soft']) { const v = cs.getPropertyValue('--spring-' + k).trim(); T.E[k] = hasLinear && v ? v : E.spring; }
    const n = (name, d) => { const v = parseFloat(cs.getPropertyValue(name)); return isNaN(v) ? d : v; };
    T.C = { gain: n('--motion-gain', 1), hop: n('--tick-hop', -6), squash: n('--tick-squash', 0.04), rate: n('--amb-rate', 1), particles: Math.round(n('--particle-count', 24)) };
    return T;
  }

  function engine(o) {
    // o: { root(), fx(), cfg() → { amb, resp, cel, reduced, dialect, calm, interval }, cue(name, id) }
    let T = { D: { ...D }, E: { ...E }, C: { gain: 1, hop: -6, squash: 0.04, rate: 1, particles: 24 } };
    const m = { D, E };
    m.T = () => T;
    m.refresh = (el) => { T = readTokens(el || o.root()); };
    m.on = (tier) => { const c = o.cfg(); return !c.reduced && c[tier] !== false; };
    m.play = (tier, el, kf, opt) => (el && m.on(tier) ? el.animate(kf, opt) : null);
    m.done = (a) => (a ? a.finished.catch(() => {}) : Promise.resolve());
    m.wait = (ms) => new Promise((r) => setTimeout(r, o.cfg().reduced ? 0 : ms));
    m.cue = (name, id, at = 0) => { const c = o.cfg(); setTimeout(() => o.cue && o.cue(name, id), c.reduced ? 0 : at); };
    const g = () => T.C.gain, dia = () => o.cfg().dialect, calm = () => !!o.cfg().calm;

    // ---------- particles ----------
    function origin(el, ox = 0.5, oy = 0.5) {
      const L = o.fx(); if (!L || !el) return null;
      const lr = L.getBoundingClientRect(), sc = lr.width / (L.offsetWidth || 1) || 1, er = el.getBoundingClientRect();
      return { L, x: (er.left + er.width * ox - lr.left) / sc, y: (er.top + er.height * oy - lr.top) / sc };
    }
    function spawn(L, x, y, shape, col, sz) {
      const p = document.createElement('div');
      Object.assign(p.style, { position: 'absolute', left: x + 'px', top: y + 'px', width: sz + 'px', height: sz + 'px', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, willChange: 'transform, opacity' });
      if (shape === 'circle') Object.assign(p.style, { borderRadius: '50%', background: col });
      else if (shape === 'spark') Object.assign(p.style, { background: col, clipPath: 'polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)' });
      else if (shape.startsWith('text:')) { Object.assign(p.style, { color: col, fontSize: sz + 'px', fontFamily: "'M PLUS Rounded 1c'", fontWeight: 800, width: 'auto', height: 'auto' }); p.textContent = shape.slice(5); }
      L.appendChild(p); return p;
    }
    m.burst = (tier, el, opt = {}) => {
      if (!m.on(tier)) return;
      const n = Math.round((opt.n ?? T.C.particles) * (opt.k ?? 1)); if (n <= 0) return;
      const at = origin(el, opt.ox, opt.oy); if (!at) return;
      const shapes = opt.shapes || SHAPES, colors = opt.colors || CONF;
      for (let i = 0; i < n; i++) {
        const sz = (opt.size || 22) * (0.6 + Math.random() * 0.8), p = spawn(at.L, at.x, at.y, shapes[i % shapes.length], colors[i % colors.length], sz);
        const ang = opt.up === false ? Math.random() * Math.PI * 2 : (opt.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (opt.cone || 2);
        const dist = (opt.spread || 220) * g() ** 0.5 * (0.35 + Math.random() * 0.65), dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist, r = (Math.random() - 0.5) * (opt.spin ?? 240);
        p.animate([
          { transform: 'translate(-50%,-50%) scale(.2) rotate(0deg)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${r}deg)`, opacity: 1, offset: 0.55 },
          { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + (opt.gravity ?? 80)}px)) scale(.7) rotate(${r * 1.4}deg)`, opacity: 0 },
        ], { duration: (opt.dur || T.D.burst) * (0.75 + Math.random() * 0.5), easing: T.E.out, delay: Math.random() * (opt.stagger || 60) }).onfinish = () => p.remove();
      }
    };
    m.rain = (tier, opt = {}) => {
      if (!m.on(tier)) return;
      const L = (o.fxv || o.fx)(); if (!L) return;
      const W = L.offsetWidth, H = L.offsetHeight, n = Math.round((opt.n ?? T.C.particles * 2) * (opt.k ?? 1));
      for (let i = 0; i < n; i++) {
        const sz = (opt.size || 26) * (0.6 + Math.random() * 0.8), x = Math.random() * W;
        const p = spawn(L, x, -40, SHAPES[i % 4], CONF[i % 5], sz), sway = (Math.random() - 0.5) * 160, r = (Math.random() - 0.5) * 720;
        p.animate([
          { transform: 'translate(-50%,0) rotate(0deg)', opacity: 1 },
          { transform: `translate(calc(-50% + ${sway}px), ${H * 0.55}px) rotate(${r * 0.5}deg)`, opacity: 1, offset: 0.6 },
          { transform: `translate(calc(-50% + ${-sway * 0.4}px), ${H + 60}px) rotate(${r}deg)`, opacity: 0.2 },
        ], { duration: (opt.dur || T.D.celebrate * 1.4) * (0.7 + Math.random() * 0.6), easing: 'cubic-bezier(.3,.2,.6,1)', delay: Math.random() * (opt.spread || 900) }).onfinish = () => p.remove();
      }
    };

    // ---------- ambient + responsive loops ----------
    const LOOPS = {
      drift: () => [[{ transform: 'translate(0,0)' }, { transform: 'translate(52px,52px)' }], { duration: T.D.drift, easing: 'linear' }],
      blob1: () => [[{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(40px,30px) scale(1.08)' }], { duration: T.D.drift * 0.3, easing: T.E['in-out'], direction: 'alternate' }],
      blob2: () => [[{ transform: 'translate(0,0) scale(1.04)' }, { transform: 'translate(-36px,-24px) scale(.92)' }], { duration: T.D.drift * 0.37, easing: T.E['in-out'], direction: 'alternate' }],
      breathe: () => { const a = 0.04 * g(); return [[{ transform: 'scale(1,1)' }, { transform: `scale(${1 + a},${1 - a})` }, { transform: `scale(${1 - a / 2},${1 + a * 0.75})` }, { transform: 'scale(1,1)' }], { duration: T.D.breathe, easing: T.E['in-out'] }]; },
      snooze: () => { const a = 0.03 * g(); return [[{ transform: 'scale(1,1)' }, { transform: `scale(${1 + a},${1 - a})` }, { transform: 'scale(1,1)' }], { duration: T.D.breathe * 1.45, easing: T.E['in-out'] }]; },
      shimmer: () => [[{ transform: 'translateX(-150%) skewX(-18deg)' }, { transform: 'translateX(350%) skewX(-18deg)', offset: 0.16 }, { transform: 'translateX(350%) skewX(-18deg)' }], { duration: T.D.shimmer * (calm() ? 2 : 1), easing: T.E['in-out'] }],
      ring: () => [[{ opacity: 0.25 }, { opacity: 0.85 }, { opacity: 0.25 }], { duration: T.D.breathe, easing: T.E['in-out'] }],
      sheen: () => [[{ transform: 'translateX(-120%) skewX(-18deg)' }, { transform: 'translateX(520%) skewX(-18deg)', offset: 0.3 }, { transform: 'translateX(520%) skewX(-18deg)' }], { duration: T.D.float, easing: T.E['in-out'] }],
      stripes: () => [[{ transform: 'translateX(0)' }, { transform: 'translateX(28.28px)' }], { duration: T.D.breathe, easing: 'linear' }],
      float: () => [[{ transform: 'translateY(0)' }, { transform: `translateY(${-3 * g()}px)` }, { transform: 'translateY(0)' }], { duration: T.D.float, easing: T.E['in-out'] }],
      hop: () => { const h = -14 * g(); return [[{ transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(0) scale(1.12,.88)', offset: 0.08 }, { transform: `translateY(${h}px) scale(.92,1.1)`, offset: 0.2 }, { transform: 'translateY(0) scale(1.1,.9)', offset: 0.32 }, { transform: 'scale(1,1)', offset: 0.42 }, { transform: 'scale(1,1)' }], { duration: T.D.wave, easing: T.E['in-out'] }]; },
      bob: () => [[{ transform: 'translateY(0)' }, { transform: `translateY(${-3 * g()}px)` }, { transform: 'translateY(0)' }], { duration: T.D.wave, easing: T.E['in-out'] }],
      stick: () => [[{ transform: 'rotate(12deg) scale(1)' }, { transform: 'rotate(4deg) scale(1.08)' }, { transform: 'rotate(12deg) scale(1)' }], { duration: T.D.wave, easing: T.E['in-out'] }],
      wobble: () => [[{ transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(-2deg)' }], { duration: T.D.wave, easing: T.E['in-out'] }],
      glow: () => [[{ opacity: 0.5 }, { opacity: 1 }, { opacity: 0.5 }], { duration: T.D.breathe, easing: T.E['in-out'] }],
      twinkle: () => [[{ transform: 'scale(.6) rotate(0)', opacity: 0.4 }, { transform: 'scale(1.15) rotate(20deg)', opacity: 1 }, { transform: 'scale(.6) rotate(0)', opacity: 0.4 }], { duration: 1600, easing: T.E['in-out'] }],
      spin: () => [[{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 900, easing: 'linear' }],
      skel: () => [[{ transform: 'translateX(-100%)' }, { transform: 'translateX(100%)' }], { duration: 1400, easing: T.E['in-out'] }],
      // face accents (ClayFace SVG layers)
      drip: () => [[{ transform: 'translateY(0)' }, { transform: 'translateY(5px)', offset: 0.7 }, { transform: 'translateY(0)' }], { duration: 1400, easing: 'ease-in' }],
      vein: () => [[{ transform: 'scale(1)' }, { transform: 'scale(1.3)', offset: 0.15 }, { transform: 'scale(1)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: 900 }],
      steam: () => [[{ transform: 'translateY(2px) scale(.9)' }, { transform: 'translateY(-6px) scale(1.08)' }, { transform: 'translateY(2px) scale(.9)' }], { duration: 700, easing: 'steps(4,end)' }],
      zzz: () => [[{ transform: 'translate(0,0)', opacity: 0.3 }, { transform: 'translate(4px,-6px)', opacity: 1 }, { transform: 'translate(0,0)', opacity: 0.3 }], { duration: 2400, easing: T.E['in-out'] }],
    };
    const CALM_OFF = { drift: 1, float: 1, shimmer: 1, sheen: 1, bob: 1, twinkle: 1, glow: 1, wobble: 1, drip: 1, vein: 1, steam: 1, zzz: 1 };
    const RESP_LOOPS = { spin: 1, skel: 1 };
    // Sync every [data-amb] / [data-loop] element to its named loop. Cheap: only touches elements whose name changed.
    m.syncLoops = (force) => {
      const root = o.root(); if (!root) return;
      root.querySelectorAll('[data-amb],[data-loop]').forEach((el) => {
        const name = el.dataset.amb || el.dataset.loop || '';
        const tier = RESP_LOOPS[name] ? 'resp' : 'amb';
        const want = name && LOOPS[name] && m.on(tier) && !(calm() && CALM_OFF[name] && el.closest('[data-motion-preset="calm"]')) ? name : '';
        if (!force && el._loop === want) return;
        if (el._loopAnim) { el._loopAnim.cancel(); el._loopAnim = null; }
        el._loop = want;
        if (!want) return;
        const [kf, opt] = LOOPS[want]();
        el._loopAnim = el.animate(kf, { iterations: Infinity, ...opt, delay: +(el.dataset.ad || 0) });
        el._loopAnim.playbackRate = T.C.rate;
      });
    };

    // ---------- tick ----------
    // kind: total | row | ov-total | ov-row · beat: sec | min | hour
    m.tick = (digits, kind, beat, well) => {
      if (!m.on('resp') || !digits.length) return;
      const iv = o.cfg().interval, clamp = (d) => Math.min(d, iv * 0.95);
      const ov = kind.startsWith('ov'), total = kind.endsWith('total'), bc = ov || dia() === 'broadcast';
      if (ov && kind === 'ov-row' && calm()) return;
      const hop = T.C.hop, sq = T.C.squash, tilt = bc ? 0 : 5 * g();
      if (beat === 'sec' || iv < 120) {
        if (iv < 60 && beat === 'sec') return; // > 16× clock: seconds blur together, keep the rollovers
        digits.forEach((el) => {
          if (total) el.animate([{ transform: 'none' }, { transform: `translateY(${hop}px) scale(${1 - sq},${1 + sq})`, offset: 0.35 }, { transform: `translateY(0) scale(${1 + sq},${1 - sq})`, offset: 0.7 }, { transform: 'none' }], { duration: clamp(T.D.tick), easing: T.E.out });
          else el.animate([{ transform: 'none' }, { transform: `translateY(${hop * 0.6}px) rotate(${-tilt}deg)`, offset: 0.4 }, { transform: 'none' }], { duration: clamp(T.D.flick), easing: T.E.spring });
        });
        return;
      }
      const big = beat === 'hour', k = big ? 2.2 : 1.6, dur = clamp(big ? T.D.hour : T.D.minute) || 1;
      const ordered = [...digits].sort((a, b) => +a.dataset.pos - +b.dataset.pos);
      ordered.forEach((el, i) => el.animate([{ transform: 'none' }, { transform: `translateY(${hop * k * (total ? 1 : 0.6)}px) scale(.94,1.08)`, offset: 0.35 }, { transform: 'scale(1.06,.95)', offset: 0.65 }, { transform: 'none' }], { duration: dur, delay: Math.min(i * 50, iv * 0.3), easing: T.E.bouncy, fill: 'backwards' }));
      if (well && total) {
        if (!(calm() && ov)) well.animate(big ? [{ transform: 'scale(1)' }, { transform: 'scale(1.06,.94)', offset: 0.3 }, { transform: 'scale(.97,1.03)', offset: 0.6 }, { transform: 'scale(1)' }] : [{ transform: 'scale(1)' }, { transform: 'scale(1.03)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: dur, easing: T.E['in-out'] });
        if (big) { m.burst('resp', well, { n: ov ? 14 : dia() === 'showcase' ? 24 : 10, shapes: ['spark', 'circle'], colors: ['#FFC23D', '#FF6FAE', '#FFFFFF'], size: 16, spread: 160, k: calm() ? 0 : 1 }); m.cue('chime.hour', 'T04', dur * 0.3); }
        else { if (dia() === 'showcase') m.burst('resp', well, { n: 6, shapes: ['spark'], colors: ['#FFC23D', '#FF6FAE'], size: 14, spread: 120 }); m.cue('tick.minute', 'T03', dur * 0.35); }
      }
    };
    const BEATS = {
      0: () => [[{ transform: 'none' }, { transform: `translateY(${-8 * g()}px) scale(.94,1.07)`, offset: 0.35 }, { transform: 'scale(1.07,.93)', offset: 0.7 }, { transform: 'none' }], { duration: 420, easing: 'ease-out' }],
      1: () => [[{ transform: 'none' }, { transform: `translateY(2px) rotate(${-5 * g()}deg)`, offset: 0.4 }, { transform: 'none' }], { duration: 420, easing: 'ease-in-out' }],
      2: () => [[{ transform: 'rotate(0)' }, { transform: `rotate(${-11 * g()}deg)`, offset: 0.3 }, { transform: `rotate(${9 * g()}deg)`, offset: 0.65 }, { transform: 'rotate(0)' }], { duration: 520, easing: 'ease-in-out' }],
      3: () => [[{ transform: 'none' }, { transform: 'translateY(3px) scale(1.07,.88)', offset: 0.45 }, { transform: 'translateY(3px) scale(1.07,.88)', offset: 0.7 }, { transform: 'none' }], { duration: T.D.droop, easing: 'ease-in-out' }],
      4: () => [[{ transform: 'none' }, { transform: 'translateX(-4px)', offset: 0.2 }, { transform: 'translateX(4px)', offset: 0.4 }, { transform: 'translateX(-3px)', offset: 0.6 }, { transform: 'translateX(2px)', offset: 0.8 }, { transform: 'none' }], { duration: 380, easing: 'linear' }],
      5: () => [[{ transform: 'none' }, { transform: 'translateX(-4px) scale(1.06)' }, { transform: 'translateX(4px) scale(1.06)' }, { transform: 'translateX(-4px) scale(1.06)' }, { transform: 'translateX(3px) scale(1.04)' }, { transform: 'none' }], { duration: 460, easing: T.E.stepped }],
    };
    m.beat = (el, stage, minuteOnly) => {
      if (!m.on('resp') || !el || !BEATS[stage]) return;
      const iv = o.cfg().interval; if (iv < 200 && !minuteOnly) return;
      const [kf, opt] = BEATS[stage](); el.animate(kf, { ...opt, duration: Math.min(opt.duration, Math.max(iv, 300) * 0.95) });
    };
    m.stageChange = (el) => {
      m.play('resp', el, [{ transform: 'scale(1)' }, { transform: 'scale(1.25,.8)', offset: 0.2 }, { transform: 'scale(.9,1.12)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: T.D.jelly, easing: T.E.out });
      if (!calm()) m.burst('resp', el, { n: 6, shapes: ['circle'], colors: ['#FFFFFF', '#FFD2E5'], size: 12, spread: 70, up: false, gravity: 0 });
      m.cue('face.stage', 'T08');
    };

    // ---------- responsive ----------
    const jellyKf = (a = 1) => [{ transform: 'scale(1,1)' }, { transform: `scale(${1 + 0.07 * a},${1 - 0.12 * a})`, offset: 0.18 }, { transform: `scale(${1 - 0.06 * a},${1 + 0.08 * a})`, offset: 0.42 }, { transform: `scale(${1 + 0.03 * a},${1 - 0.03 * a})`, offset: 0.68 }, { transform: 'scale(1,1)' }];
    m.jelly = (tier, el, a = 1, dur) => m.play(tier, el, jellyKf(a * g()), { duration: dur || T.D.jelly, easing: T.E.out });
    m.release = (el) => m.play('resp', el, [{ transform: 'scale(1,1)' }, { transform: `scale(${1 + 0.06 * g()},${1 - 0.06 * g()})`, offset: 0.3 }, { transform: `scale(${1 - 0.03 * g()},${1 + 0.03 * g()})`, offset: 0.65 }, { transform: 'scale(1,1)' }], { duration: T.D.jelly * 0.6, easing: T.E.spring });
    m.menuIn = (el) => {
      if (!el) return;
      m.play('resp', el, [{ transform: 'scale(.6) translateY(-8px)', opacity: 0 }, { transform: 'none', opacity: 1, offset: 0.4 }, { transform: 'none', opacity: 1 }], { duration: T.D.toast, easing: T.E.bouncy });
      [...el.children].forEach((c, i) => m.play('resp', c, [{ transform: 'translateY(6px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: T.D.base, delay: 40 + i * 30, easing: T.E.out, fill: 'backwards' }));
      m.cue('menu.open', 'R04');
    };
    m.menuOut = (el) => { m.cue('menu.close', 'R05'); return m.done(m.play('resp', el, [{ transform: 'none', opacity: 1 }, { transform: 'scale(.9) translateY(-4px)', opacity: 0 }], { duration: T.D.fast, easing: T.E.in, fill: 'forwards' })); };
    m.modalIn = (scrim, card) => {
      m.play('resp', scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: T.D.base, easing: T.E.out });
      const s = dia() === 'showcase' ? 0.7 : 0.85;
      m.play('resp', card, [{ transform: `translateY(40px) scale(${s})`, opacity: 0 }, { transform: 'none', opacity: 1, offset: 0.3 }, { transform: 'none', opacity: 1 }], { duration: T.D.modal, easing: T.E.bouncy });
      m.cue('modal.in', 'R06', T.D.modal * 0.25);
    };
    m.modalOut = (scrim, card) => {
      m.cue('modal.out', 'R07');
      m.play('resp', scrim, [{ opacity: 1 }, { opacity: 0 }], { duration: T.D.base, easing: T.E.in, fill: 'forwards' });
      return m.done(m.play('resp', card, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(24px) scale(.92)', opacity: 0 }], { duration: T.D.base, easing: T.E.in, fill: 'forwards' }));
    };
    m.toastIn = (el, error) => {
      const a = m.play('resp', el, [{ transform: 'translateY(120%) scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1, offset: 0.35 }, { transform: 'none', opacity: 1 }], { duration: T.D.toast, easing: T.E.bouncy });
      if (a) a.finished.then(() => (error ? m.shake(el) : m.jelly('resp', el, 0.5, T.D.jelly * 0.7))).catch(() => {});
      m.cue(error ? 'toast.error' : 'toast.in', 'R08', T.D.toast * 0.6);
    };
    m.toastOut = (el) => m.done(m.play('resp', el, [{ transform: 'none', opacity: 1 }, { transform: 'translateX(30px)', opacity: 0 }], { duration: T.D.fast, easing: T.E.in, fill: 'forwards' }));
    m.tipIn = (el) => m.play('resp', el, [{ transform: 'translate(-50%,-100%) translateY(4px) scale(.7)', opacity: 0 }, { transform: 'translate(-50%,-100%)', opacity: 1 }], { duration: T.D.fast, easing: T.E.spring });
    m.editIn = (el) => m.play('resp', el, [{ transform: 'scale(.96)' }, { transform: 'scale(1)' }], { duration: T.D.base, easing: T.E.snappy });
    m.hopText = (el) => m.play('resp', el, [{ transform: 'none' }, { transform: `translateY(${-5 * g()}px)`, offset: 0.4 }, { transform: 'none' }], { duration: T.D.flick, easing: T.E.spring });
    m.shake = (el) => m.play('resp', el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: T.D.flick, easing: 'linear' });
    m.enterRow = (el) => {
      m.play('resp', el, [{ transform: 'translateY(-48px) scale(.9,1.1)', opacity: 0 }, { transform: 'translateY(0) scale(1.06,.92)', opacity: 1, offset: 0.55 }, { transform: 'scale(.98,1.02)', offset: 0.78 }, { transform: 'none' }], { duration: T.D.land, easing: T.E.out });
      if (dia() === 'showcase') setTimeout(() => m.burst('resp', el, { n: 8, ox: 0.1, shapes: ['circle'], colors: ['#FFD2E5', '#CDB8FF'], size: 12, spread: 90 }), T.D.land * 0.5);
      m.cue('add.plop', 'R13', T.D.land * 0.55);
    };
    m.exitRow = (el) => {
      setTimeout(() => m.burst('resp', el, { n: 8, ox: 0.5, shapes: ['circle'], colors: ['#DCCFD6', '#F3ECF0', '#FFFFFF'], size: 18, spread: 120, up: false, gravity: -20 }), T.D.toast * 0.3);
      m.cue('delete.poof', 'R14', T.D.toast * 0.3);
      return m.done(m.play('resp', el, [{ transform: 'none', opacity: 1 }, { transform: 'scale(1.04,.86)', opacity: 1, offset: 0.3 }, { transform: 'scale(.6)', opacity: 0 }], { duration: T.D.toast, easing: T.E.in, fill: 'forwards' }));
    };
    // FLIP: prev = Map(key → DOMRect) captured before the state change. special(key, el, dy) may return true if it animated.
    m.capture = (els) => { const mp = new Map(); els.forEach(([k, el]) => mp.set(k, el.getBoundingClientRect())); return mp; };
    m.flip = (prev, els, sc = 1, special) => {
      els.forEach(([k, el]) => {
        const p = prev.get(k); if (!p) return;
        const r = el.getBoundingClientRect(), dy = (p.top - r.top) / sc;
        if (special && special(k, el, dy)) return;
        if (Math.abs(dy) < 1) return;
        m.play('resp', el, [{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: T.D.travel, easing: T.E.snappy });
      });
    };
    m.arc = (el, dy, after) => {
      const tilt = dy > 0 ? -2 : 2;
      el.style.zIndex = 15;
      const a = m.play('resp', el, [{ transform: `translateY(${dy}px)` }, { transform: `translateY(${dy * 0.5}px) scale(1.04) rotate(${tilt}deg)`, offset: 0.5 }, { transform: 'none' }], { duration: T.D.travel * 1.3, easing: T.E['in-out'] });
      m.done(a).then(() => { el.style.zIndex = ''; after && after(); });
      return a;
    };
    m.land = (el) => m.play('resp', el, [{ transform: 'scale(1.08,.9)' }, { transform: 'scale(.97,1.04)', offset: 0.5 }, { transform: 'none' }], { duration: T.D.land, easing: T.E.out });
    m.clone = (el, pitch) => { m.play('resp', el, [{ transform: `translateY(${-pitch}px) scale(.96)`, opacity: 0.4 }, { transform: 'translateY(0) scale(1.03,.97)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: T.D.travel, easing: T.E.bouncy }); m.cue('dup.clone', 'R15'); };
    m.tape = (el) => { m.play('resp', el, [{ transform: 'rotate(-30deg) scale(1.6)', opacity: 0 }, { transform: 'rotate(-10deg) scale(1)', opacity: 0.92 }], { duration: T.D.land, easing: T.E.bouncy, fill: 'backwards', delay: T.D.travel }); m.cue('pin.tape', 'R16', T.D.travel + T.D.land * 0.6); };
    m.sticker = (el, delay = 0) => m.play('cel', el, [{ transform: 'rotate(40deg) scale(2.2)', opacity: 0 }, { transform: 'rotate(12deg) scale(1)', opacity: 1 }], { duration: T.D.land, easing: T.E.bouncy, delay, fill: 'backwards' });
    m.pick = (el) => m.play('resp', el, [{ transform: 'none' }, { transform: `scale(1.04) rotate(${dia() === 'showcase' ? -2 : -1.2}deg)` }], { duration: T.D.base, easing: T.E.snappy, fill: 'forwards' });
    m.drop = (el) => m.play('resp', el, [{ transform: `scale(1.04) rotate(${dia() === 'showcase' ? -2 : -1.2}deg)` }, { transform: 'scale(.97,1.03)', offset: 0.45 }, { transform: 'none' }], { duration: T.D.jelly * 0.6, easing: T.E.snappy });
    m.revert = (outer, mid, dy) => {
      const a = m.play('resp', outer, [{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: T.D.travel, easing: T.E.bouncy });
      m.done(a).then(() => m.play('resp', mid, [{ transform: 'rotate(0)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(0)' }], { duration: T.D.flick, easing: 'linear' }));
      m.cue('drag.revert', 'R22', T.D.travel * 0.8);
    };
    m.roll = (el, dir) => m.play('resp', el, [{ transform: `translateY(${dir * 70}%)`, opacity: 0.15 }, { transform: `translateY(${-dir * 8}%)`, opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: T.D.flick, easing: T.E.snappy });
    m.full = (well, ov) => {
      m.jelly('resp', well, ov || calm() ? 0.5 : 1);
      if (!ov) m.burst('resp', well, { n: 8, shapes: ['spark', 'circle'], colors: ['#FFEFA1', '#9BE3B4', '#FFC23D'], size: 14, spread: 110 });
      m.cue('counter.full', 'R24', T.D.jelly * 0.2);
    };
    m.morph = (el) => m.play('resp', el, [{ transform: 'scale(.3) rotate(-120deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(10deg)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: T.D.flick, easing: T.E.bouncy });
    m.ringIn = (el) => m.play('resp', el, [{ transform: 'scale(.94)', opacity: 0 }, { transform: 'scale(1.02)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: T.D.land, easing: T.E.out });
    m.wave = (digits, k = 1) => [...digits].forEach((el, i) => m.play('resp', el, [{ transform: 'none' }, { transform: `translateY(${-10 * g() * k}px)`, offset: 0.4 }, { transform: 'none' }], { duration: T.D.land, delay: i * 40, easing: T.E.bouncy, fill: 'backwards' }));
    m.droop = (digits) => [...digits].forEach((el, i) => m.play('resp', el, [{ transform: 'none' }, { transform: 'translateY(4px) scale(1.02,.96)', offset: 0.5 }, { transform: 'none' }], { duration: T.D.droop, delay: i * 20, easing: T.E['in-out'] }));
    m.stagOut = (els) => Promise.all([...els].map((el, i) => m.done(m.play('resp', el, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(12px)', opacity: 0 }], { duration: T.D.fast, delay: i * 20, easing: T.E.in, fill: 'forwards' }))));
    m.stagIn = (els) => [...els].forEach((el, i) => { el.getAnimations().forEach((a) => a.effect && a.effect.getComputedTiming().fill === 'forwards' && a.cancel()); m.play('resp', el, [{ transform: 'translateY(24px) scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1, offset: 0.4 }, { transform: 'none', opacity: 1 }], { duration: T.D.land, delay: i * 40, easing: T.E.bouncy, fill: 'backwards' }); });
    m.pageOut = (el, dir) => m.done(m.play('resp', el, [{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * 60}px) scale(.97)`, opacity: 0 }], { duration: T.D.fast, easing: T.E.in, fill: 'forwards' }));
    m.pageIn = (el, dir) => { if (!el) return; el.getAnimations().forEach((a) => a.cancel()); m.play('resp', el, [{ transform: `translateX(${dir * 80}px) scale(.97)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: T.D['page-x'], easing: T.E.snappy }); };
    m.progress = (fill, fromX, toX) => m.play('resp', fill, [{ transform: `translateX(${fromX}%)` }, { transform: `translateX(${toX}%)` }], { duration: T.D.land, easing: T.E.bouncy });
    m.pop = (el, s = 1.3) => m.play('resp', el, [{ transform: `scale(${1 + (s - 1) * g()})` }, { transform: 'none' }], { duration: T.D.flick, easing: T.E.spring });
    // theme wipe: circle in the next page colour grows from (x,y), swap at the end, fade out
    m.themeWipe = (layer, x, y, color, swap) => {
      if (!m.on('resp') || !layer) { swap(); return; }
      const W = innerWidth, H = innerHeight, r = Math.hypot(Math.max(x, W - x), Math.max(y, H - y));
      const c = document.createElement('div');
      Object.assign(c.style, { position: 'fixed', left: x - r + 'px', top: y - r + 'px', width: 2 * r + 'px', height: 2 * r + 'px', borderRadius: '50%', background: color, pointerEvents: 'none', zIndex: 90, transform: 'scale(0)' });
      layer.appendChild(c);
      c.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: T.D.theme, easing: T.E['in-out'], fill: 'forwards' }).onfinish = () => {
        swap();
        requestAnimationFrame(() => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.D.base, easing: T.E.out, fill: 'forwards' }).onfinish = () => c.remove());
      };
    };

    // ---------- broadcast ----------
    m.highlight = (el) => { if (!el) return null; el.getAnimations().forEach((a) => a.cancel()); return m.play('resp', el, [{ opacity: 0, transform: 'scale(1.04)', easing: T.E.out }, { opacity: 1, transform: 'scale(1)', offset: 0.1 }, { opacity: 1, offset: 0.6, easing: T.E['in-out'] }, { opacity: 0 }], { duration: T.D.highlight, easing: 'linear', fill: 'forwards' }); };
    m.bannerIn = (el) => m.play('resp', el, [{ transform: 'translateY(-120%)' }, { transform: 'none' }], { duration: T.D.toast, easing: T.E.snappy });
    m.bannerOut = (el) => m.done(m.play('resp', el, [{ transform: 'none' }, { transform: 'translateY(-140%)' }], { duration: T.D.base, easing: T.E.in, fill: 'forwards' }));
    m.mute = (el, on) => { if (!el) return; el.getAnimations().forEach((a) => a.cancel()); if (!on) return; el.animate([{ filter: 'saturate(1)', opacity: 1 }, { filter: 'saturate(.55)', opacity: 0.85 }], { duration: m.on('resp') ? T.D.base : 0, easing: T.E.standard, fill: 'forwards' }); };
    m.pageFlipOut = (rows) => {
      if (calm()) return Promise.all([...rows].map((el) => m.done(m.play('amb', el, [{ opacity: 1 }, { opacity: 0 }], { duration: T.D.base, fill: 'forwards' }))));
      return Promise.all([...rows].map((el, i) => m.done(m.play('amb', el, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-14px) rotateX(70deg)', opacity: 0 }], { duration: T.D.base, delay: i * 70, easing: T.E.in, fill: 'forwards' }))));
    };
    m.pageFlipIn = (rows) => [...rows].forEach((el, i) => {
      el.getAnimations().forEach((a) => a.cancel());
      if (calm()) return m.play('amb', el, [{ opacity: 0 }, { opacity: 1 }], { duration: T.D.base });
      m.play('amb', el, [{ transform: 'translateY(14px) rotateX(-70deg)', opacity: 0 }, { transform: 'none', opacity: 1, offset: 0.45 }, { transform: 'none', opacity: 1 }], { duration: T.D.land, delay: i * 70, easing: T.E.bouncy, fill: 'backwards' });
    });
    m.cardEnter = (el) => calm()
      ? m.play('resp', el, [{ opacity: 0 }, { opacity: 1 }], { duration: T.D.base })
      : m.play('resp', el, [{ transform: 'translateY(140%) rotate(4deg)' }, { transform: 'translateY(-4%) rotate(-1deg)', offset: 0.7 }, { transform: 'none' }], { duration: T.D.land * 1.3, easing: T.E.bouncy });
    m.stampIn = (el) => {
      m.cue('overlay.won', 'B05', T.D.stamp * 0.55);
      if (calm()) return m.play('cel', el, [{ opacity: 0 }, { opacity: 1 }], { duration: T.D.base, fill: 'backwards' });
      return m.play('cel', el, [{ transform: 'translate(-50%,-50%) scale(2.4) rotate(-20deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(.9) rotate(-8deg)', opacity: 1, offset: 0.55 }, { transform: 'translate(-50%,-50%) scale(1.05) rotate(-8deg)', offset: 0.75 }, { transform: 'translate(-50%,-50%) rotate(-8deg)' }], { duration: T.D.stamp, easing: T.E.out });
    };
    m.stampOut = (el) => m.done(m.play('cel', el, [{ transform: 'translate(-50%,-50%) rotate(-8deg)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.2) rotate(-8deg)', opacity: 0 }], { duration: T.D.base, easing: T.E.in, fill: 'forwards' }));
    m.cardHop = (el) => { if (!calm()) m.play('cel', el, [{ transform: 'none' }, { transform: `translateY(${-10 * g()}px) scale(1.02)`, offset: 0.35 }, { transform: 'scale(.99,1.01)', offset: 0.7 }, { transform: 'none' }], { duration: T.D.jelly, easing: T.E.out }); };

    // ---------- celebratory ----------
    m.won = (mid, face, ov) => {
      m.jelly('cel', mid, ov ? 0.8 : 1);
      m.play('cel', face, [{ transform: 'scale(1)' }, { transform: 'scale(1.3)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: T.D.jelly, easing: T.E.spring });
      m.burst('cel', face || mid, { ox: 0.5, size: 24, spread: 240, cone: 2, k: ov && calm() ? 0 : 1 });
      m.cue('won.yay', 'C01', T.D.jelly * 0.18);
    };
    m.niniJump = (el, n = 2) => m.play('cel', el, [{ transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(0) scale(1.2,.8)', offset: 0.15 }, { transform: `translateY(${-90 * g()}px) scale(.9,1.15) rotate(-10deg)`, offset: 0.45 }, { transform: 'translateY(0) scale(1.15,.85)', offset: 0.75 }, { transform: 'none' }], { duration: 1100, easing: T.E['in-out'], iterations: n });
    m.niniHop = (el) => m.play('cel', el, [{ transform: 'none' }, { transform: `translateY(${-24 * g()}px) scale(.95,1.06)`, offset: 0.4 }, { transform: 'scale(1.06,.94)', offset: 0.75 }, { transform: 'none' }], { duration: T.D.jelly, easing: T.E.out });
    m.unfurl = (el) => m.play('cel', el, [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1, offset: 0.35 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: T.D.land * 1.2, easing: T.E.bouncy });
    m.flash = (el) => m.play('cel', el, [{ filter: 'brightness(1.35)' }, { filter: 'brightness(1)' }], { duration: T.D.celebrate * 0.5, easing: T.E.out });
    m.bannerDrop = (el) => calm()
      ? m.play('cel', el, [{ opacity: 0 }, { opacity: 1 }], { duration: T.D.base })
      : m.play('cel', el, [{ transform: 'translateY(-220px) rotate(-12deg)', opacity: 0 }, { transform: 'translateY(0) rotate(3deg)', opacity: 1, offset: 0.45 }, { transform: 'translateY(-14px) rotate(-1deg)', offset: 0.65 }, { transform: 'none' }], { duration: T.D.land * 1.5, easing: T.E.out });

    return m;
  }

  window.WinniesMotion = { D, E, readTokens, engine };
})();
