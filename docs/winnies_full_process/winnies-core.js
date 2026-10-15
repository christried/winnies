// Winnies shared prototype core: sample data, timers, sorting, WAAPI motion plumbing.
(function () {
  const DATA = [
    { id: 1, game: 'Elden Ring', cond: 'Malenia, no summons', secs: 11564, pinned: true, running: true },
    { id: 2, game: 'Super Mario 64', cond: 'All stars', count: 87, target: 120, secs: 14470 },
    { id: 3, game: 'Cuphead', cond: 'Expert, every boss', count: 12, target: 19, secs: 6482 },
    { id: 4, game: 'Celeste', cond: 'Farewell, golden strawberry', secs: 0 },
    { id: 5, game: 'Dark Souls III', cond: 'Soul Level 1 Nameless King', secs: 8431 },
    { id: 6, game: 'Hollow Knight', cond: 'Pantheon of Hallownest', secs: 4509, won: true },
    { id: 7, game: 'Hades', cond: 'Heat 16 clear', secs: 3160, won: true },
    { id: 8, game: 'Tetris Effect', cond: '150 lines, Marathon', count: 150, target: 150, secs: 2511, won: true },
  ];
  const p2 = (n) => String(n).padStart(2, '0');
  const fmt = (s) => (!s ? '00:00' : Math.floor(s / 3600) + ':' + p2(Math.floor((s % 3600) / 60)) + ':' + p2(s % 60));
  const fmtTotal = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? h + ':' + p2(m) + ':' + p2(x) : p2(m) + ':' + p2(x);
  };
  const digits = (str, prev) => {
    const off = prev ? prev.length - str.length : 0;
    return str.split('').map((c, i) => ({
      k: i, c, sep: c === ':', num: c !== ':',
      chg: prev && prev[i + off] !== c ? '1' : '0',
    }));
  };
  const rank = (q) => (q.won ? 2 : q.pinned ? 0 : 1);

  function burst(W, el, o) {
    const root = W.c.rootRef.current;
    if (!root || !el) return;
    const rr = root.getBoundingClientRect(), sc = rr.width / root.offsetWidth || 1;
    const er = el.getBoundingClientRect();
    const cx = (er.left + er.width * (o.ox ?? 0.5) - rr.left) / sc;
    const cy = (er.top + er.height * (o.oy ?? 0.5) - rr.top) / sc;
    for (let i = 0; i < (o.n || 24); i++) {
      const p = document.createElement('div');
      const shape = o.shapes[i % o.shapes.length], col = o.colors[i % o.colors.length];
      const sz = (o.size || 14) * (0.6 + Math.random() * 0.8);
      Object.assign(p.style, {
        position: 'absolute', left: cx + (Math.random() - 0.5) * (o.jx || 0) + 'px', top: cy + 'px',
        width: sz + 'px', height: sz + 'px', pointerEvents: 'none', zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      });
      if (shape === 'circle') Object.assign(p.style, { borderRadius: '50%', background: col });
      else if (shape === 'square') p.style.background = col;
      else if (shape === 'star') Object.assign(p.style, { background: col, clipPath: 'polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)' });
      else if (shape === 'bar') Object.assign(p.style, { background: col, height: sz * 0.35 + 'px', borderRadius: '2px' });
      else if (shape.startsWith('text:')) Object.assign(p.style, { color: col, fontSize: sz + 'px', fontFamily: o.font || 'inherit', fontWeight: 700, width: 'auto', height: 'auto' }), (p.textContent = shape.slice(5));
      if (o.style) Object.assign(p.style, typeof o.style === 'function' ? o.style(col) : o.style);
      root.appendChild(p);
      const ang = o.up ? -Math.PI / 2 + (Math.random() - 0.5) * (o.cone || 2.2) : Math.random() * Math.PI * 2;
      const dist = (o.spread || 160) * (0.35 + Math.random() * 0.65);
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist, r = (Math.random() - 0.5) * (o.spin ?? 540);
      const steps = o.steps ? ` ` : '';
      const a = p.animate([
        { transform: 'translate(-50%,-50%) scale(.2) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${r}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + (o.gravity ?? 90)}px)) scale(${o.endScale ?? 0.7}) rotate(${r * 1.4}deg)`, opacity: 0 },
      ], { duration: (o.dur || 1100) * (0.75 + Math.random() * 0.5), easing: o.easing || 'cubic-bezier(.15,.7,.3,1)', delay: Math.random() * (o.stagger || 60) });
      a.onfinish = () => p.remove();
    }
  }

  function mount(c, M) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const W = { c, M, tickPending: false, landId: null, burst: (el, o) => burst(W, el, o) };
    W.rm = () => reduce.matches;
    W.root = () => c.rootRef.current;
    W.update = (id, patch) => c.setState((s) => ({ ch: s.ch.map((q) => (q.id === id ? { ...q, ...patch } : q)) }));
    c.setState({
      total: 52327, paused: false, ticked: false, menuId: 5, hoverId: 2, page: 0, completeShown: false,
      ch: DATA.map((d, i) => ({ count: null, target: null, pinned: false, running: false, won: false, ...d, order: i })),
    });
    W.iv = setInterval(() => {
      const s = c.state;
      if (!s.ch || s.paused || !s.ch.some((q) => q.running)) return;
      W.tickPending = true;
      c.setState({ total: s.total + 1, ticked: true, ch: s.ch.map((q) => (q.running ? { ...q, secs: q.secs + 1 } : q)) });
    }, 1000);
    if (c.props.overlayRotate) W.pv = setInterval(() => c.setState((s) => ({ page: (s.page + 1) % 2 })), 10000);
    W.stop = () => { clearInterval(W.iv); clearInterval(W.pv); };

    W.afterUpdate = () => {
      const root = W.root();
      if (!root) return;
      if (!W.rm()) {
        root.querySelectorAll('[data-amb]').forEach((el) => {
          const n = el.dataset.amb;
          if (el._ambName === n) return;
          if (el._ambAnim) el._ambAnim.cancel();
          el._ambName = n;
          const a = M.amb && M.amb[n];
          el._ambAnim = a ? el.animate(a[0], { iterations: Infinity, ...a[1], delay: +(el.dataset.ad || 0) }) : null;
        });
      }
      if (W.tickPending) {
        W.tickPending = false;
        if (!W.rm()) {
          root.querySelectorAll('[data-chg="1"]').forEach((el) => {
            const t = M.tick && M.tick(el.dataset.kind, el, W);
            if (t) el.animate(t[0], t[1]);
          });
          root.querySelectorAll('[data-beat]').forEach((el) => {
            if (!el.dataset.beat) return;
            const t = M.beat && M.beat(el.dataset.beat, el, W);
            if (t) el.animate(t[0], t[1]);
          });
        }
      }
      if (W.landId != null) {
        const id = W.landId;
        W.landId = null;
        if (!W.rm() && M.land) root.querySelectorAll(`[data-row="${id}"],[data-orow="${id}"]`).forEach((el) => M.land(el, W, el.hasAttribute('data-orow')));
      }
      if (W.completePending) {
        W.completePending = false;
        if (!W.rm() && M.complete) M.complete(root, W);
      }
    };

    W.win = (id) => {
      const q = c.state.ch.find((x) => x.id === id);
      if (q.won) return W.update(id, { won: false });
      let d = 0;
      if (!W.rm() && M.won) {
        W.root().querySelectorAll(`[data-row="${id}"],[data-orow="${id}"]`).forEach((el) => M.won(el, W, el.hasAttribute('data-orow')));
        d = M.wonDelay ?? 600;
      }
      setTimeout(() => {
        W.landId = id;
        c.setState((s) => {
          let ch = s.ch.map((x) => (x.id === id ? { ...x, won: true, running: false } : x));
          const all = ch.every((x) => x.won);
          if (all) ch = ch.map((x) => ({ ...x, running: false }));
          if (all && !s.completeShown) W.completePending = true;
          return { ch, completeShown: s.completeShown || all };
        });
      }, d);
    };
    W.play = (id) => c.setState((s) => {
      const q = s.ch.find((x) => x.id === id);
      if (q.won) return null;
      const on = !q.running || s.paused;
      return { paused: on ? false : s.paused, ch: s.ch.map((x) => (x.id === id ? { ...x, running: on } : x)) };
    });
    W.toggleTotal = () => c.setState((s) => {
      const live = !s.paused && s.ch.some((x) => x.running);
      if (live) return { paused: true };
      if (s.ch.some((x) => x.running)) return { paused: false };
      const first = [...s.ch].sort((a, b) => rank(a) - rank(b) || a.order - b.order).find((x) => !x.won);
      return first ? { paused: false, ch: s.ch.map((x) => (x.id === first.id ? { ...x, running: true } : x)) } : null;
    });
    W.step = (id, d) => c.setState((s) => ({ ch: s.ch.map((x) => (x.id === id && x.target != null ? { ...x, count: Math.max(0, Math.min(x.target, x.count + d)) } : x)) }));
    W.menu = (id) => c.setState((s) => ({ menuId: s.menuId === id ? null : id }));
    W.replayWon = () => {
      const root = W.root();
      if (!root || W.rm()) return;
      root.querySelectorAll('[data-demo]').forEach((el) => {
        M.won && M.won(el, W, false);
        setTimeout(() => M.land && M.land(el, W, false), M.wonDelay ?? 600);
      });
    };
    W.replayComplete = () => { const root = W.root(); if (root && !W.rm() && M.complete) M.complete(root, W); };

    W.vals = () => {
      const s = c.state;
      if (!s.ch) return null;
      const live = !s.paused && s.ch.some((q) => q.running);
      const sorted = [...s.ch].sort((a, b) => rank(a) - rank(b) || a.order - b.order);
      const rows = sorted.map((q, i) => {
        const running = q.running && !s.paused && !q.won;
        const t = fmt(q.secs);
        const status = q.won ? 'won' : running ? 'running' : 'idle';
        return {
          id: q.id, n: i + 1, game: q.game, cond: q.cond || '', hasCond: !!q.cond,
          hasCounter: q.target != null, count: q.count, target: q.target,
          countStr: q.target != null ? q.count + ' / ' + q.target : '', full: q.target != null && q.count >= q.target,
          time: t, td: digits(t, s.ticked && running ? fmt(q.secs - 1) : null),
          running, won: q.won, idle: !q.won && !running, notWon: !q.won, untouched: !q.secs, pinned: q.pinned && !q.won,
          hover: q.id === s.hoverId, menu: q.id === s.menuId, status,
          statusWord: q.won ? 'Won' : running ? 'Running' : 'Idle',
          counterLabel: q.target != null ? 'Remove counter' : 'Add counter', pinLabel: q.pinned ? 'Unpin' : 'Pin',
          playIcon: running ? 'pause' : 'play_arrow', playLabel: running ? 'Pause' : 'Start',
          winLabel: q.won ? 'Won' : 'Mark Won',
          menuItems: [
            ['edit', 'Edit inline'], [q.target != null ? 'exposure_neg_1' : 'exposure_plus_1', q.target != null ? 'Remove counter' : 'Add counter'],
            ['push_pin', q.pinned ? 'Unpin' : 'Pin'], ['restart_alt', 'Reset timer'], ['content_copy', 'Duplicate'], ['delete', 'Delete'],
          ].map(([icon, label], k) => ({ k, icon, label, first: k === 0, danger: k === 5 })),
          onWin: () => W.win(q.id), onPlay: () => W.play(q.id), onMenu: () => W.menu(q.id),
          onInc: () => W.step(q.id, 1), onDec: () => W.step(q.id, -1),
        };
      });
      const won = s.ch.filter((q) => q.won).length, total = s.ch.length, pct = Math.round((won / total) * 100);
      const runningCount = rows.filter((r) => r.running).length;
      const tt = fmtTotal(s.total);
      return {
        rows, ovRows: rows.slice(s.page * 5, s.page * 5 + 5),
        pageDots: [0, 1].map((k) => ({ k, on: k === s.page, off: k !== s.page })), pageLabel: s.page + 1 + ' / 2',
        total: tt, totalDigits: digits(tt, s.ticked && live ? fmtTotal(s.total - 1) : null),
        wonCount: won, totalCount: total, pct, pctStr: pct + '%', summary: `${won} / ${total} won · ${pct}%`,
        runningCount, runningLabel: runningCount + ' running', live, paused: !live,
        totalBtnLabel: live ? 'Pause Winnie' : 'Start Winnie', totalBtnIcon: live ? 'pause' : 'play_arrow',
        onTotal: W.toggleTotal, complete: won === total, notComplete: won !== total,
        onReplayWon: W.replayWon, onReplayComplete: W.replayComplete,
      };
    };
    c._wc = W;
    return W;
  }

  window.WinniesCore = { DATA, fmt, fmtTotal, digits, mount };
})();
