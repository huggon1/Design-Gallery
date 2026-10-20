/* seek-t-morph-reel · scene engine v2 (~20s)
 * Every visual property is a pure function of t (seconds). No timers, no state carried between frames.
 * Reel.create(container) -> { seek(t), DURATION, BPM, BEAT, sceneAt(t), sheetAt(t) }
 */
(function (global) {
  'use strict';

  const DURATION = 20, BPM = 120, BEAT = 60 / BPM, W = 1280, H = 720, CX = W / 2, CY = H / 2;

  const COL = {
    paper:   [239, 232, 216],
    paperHi: [249, 245, 236],
    ink:     [28, 33, 29],
    green:   [31, 61, 47],
    greenHi: [46, 86, 66],
    ochre:   [185, 131, 42],
    muted:   [112, 108, 94],
    staging:[148, 120, 64],   // muted ochre-brown for Staging badge
  };

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const easeOutCubic = p => 1 - Math.pow(1 - p, 3);
  const easeInOutCubic = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const easeOutExpo = p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));

  function spring(dt, { k, c, m = 1 }) {
    if (dt <= 0) return 0;
    const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w0 * dt) * (Math.cos(wd * dt) + (z * w0 / wd) * Math.sin(wd * dt));
    }
    return 1 - Math.exp(-w0 * dt) * (1 + w0 * dt);
  }
  const S = {
    snap:   { k: 420, c: 36 },
    soft:   { k: 170, c: 22 },
    pop:    { k: 300, c: 17 },
    glide:  { k: 48,  c: 13.9 }, // slower entry (ζ≈1.0)
    settle: { k: 200, c: 30 },
    rise:   { k: 150, c: 21 },
    crush:  { k: 900, c: 54 },
    exit:   { k: 120, c: 22 },
  };

  function chain(t, base, steps) {
    let v = base, prev = base;
    for (const [t0, to, p] of steps) { v += (to - prev) * spring(t - t0, p); prev = to; }
    return v;
  }
  const chainC = (t, base, steps) => [0, 1, 2].map(i => chain(t, base[i], steps.map(s => [s[0], s[1][i], s[2]])));
  const rgba = (c, a = 1) => `rgba(${c.map(v => Math.round(clamp(v, 0, 255))).join(',')},${a})`;
  const mixC = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
  const bump = (t, tc, pre = 0.06, post = 0.2) => easeOutCubic(seg(t, tc - pre, tc)) * (1 - easeInOutCubic(seg(t, tc, tc + post)));

  /* sizes in local (pre-UI-scale) coords */
  const PILL = { w: 212, h: 64 }, DISC = 72;
  const CHIP = { w: 248, h: 56 }, BAR = { w: 444, h: 56 };
  const STATS = { w: 420, h: 88 }, BADGE = { w: 220, h: 52 };
  const TOAST = { w: 300, h: 56 }, RULE = { w: 72, h: 3 };
  const UI = 1.5;
  const toLocalX = x => CX + (x - CX) / UI, toLocalY = y => CY + (y - CY) / UI;
  const TAB_PAD = 6, TAB_W = (BAR.w - TAB_PAD * 2) / 3;
  const tabL = i => CX - BAR.w / 2 + TAB_PAD + TAB_W * i;
  const tabR = i => tabL(i) + TAB_W;
  const HEAD_Y = 292, RULE_Y = 396, SUB_Y = 438, META_Y = 620, LOCK_Y = 668;
  const CLICKS = [1.0, 5.5, 6.5];
  const HEAD = [['Ship', false], [' ', false], ['quietly.', true]];

  /* Beat map — scene labels for player + contact sheet */
  const SCENES = [
    [0,    'Publish · idle'],
    [0.75, 'Publish · hover'],
    [1.0,  'Press'],
    [1.25, 'Progress'],
    [2.5,  'Done'],
    [3.0,  'Status chip'],
    [4.5,  'Tab bar'],
    [5.5,  'Tab · Traffic'],
    [6.5,  'Tab · Logs'],
    [7.0,  'Dual metrics'],
    [9.5,  'Env · Staging'],
    [10.5, 'Env · Production'],
    [12.0, 'Shipped toast'],
    [14.0, 'Rule'],
    [14.25,'Headline'],
    [16.0, 'Subline'],
    [17.0, 'Meta · hold'],
  ];
  const sceneAt = t => { let n = SCENES[0][1]; for (const [s, name] of SCENES) if (t >= s - 1e-6) n = name; return n; };

  /* Contact sheet prefers composed stills for transitional beats */
  const SHEET_SNAP = { 14: 14.15, 28: 14.4 }; // beat → preferred t (collapse / early headline)
  const sheetAt = t => {
    const b = Math.round(t / BEAT);
    if (SHEET_SNAP[b] != null) return SHEET_SNAP[b];
    return t;
  };

  /* Sparkline path: 12 exact sample points of a calm "traffic" curve (deterministic) */
  const SPARK = [18, 22, 19, 28, 31, 27, 35, 42, 38, 45, 48, 44]; // ends at 44 ≈ p99 story
  function sparkPath(w, h, pad = 4) {
    const xs = SPARK.map((_, i) => pad + (i / (SPARK.length - 1)) * (w - pad * 2));
    const mn = Math.min(...SPARK), mx = Math.max(...SPARK);
    const ys = SPARK.map(v => h - pad - ((v - mn) / (mx - mn)) * (h - pad * 2));
    return xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  }

  const CSS = `
  @font-face{font-family:'Reel Fraunces';src:url(fonts/Fraunces.ttf) format('truetype');font-weight:100 900;font-style:normal}
  @font-face{font-family:'Reel Fraunces';src:url(fonts/Fraunces-Italic.ttf) format('truetype');font-weight:100 900;font-style:italic}
  @font-face{font-family:'Reel Geist';src:url(fonts/Geist.ttf) format('truetype');font-weight:100 900}
  @font-face{font-family:'Reel Mono';src:url(fonts/GeistMono.ttf) format('truetype');font-weight:100 900}
  .reel-stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;transform-origin:0 0;
    background:radial-gradient(115% 95% at 50% 38%,#F5F0E4 0%,#EFE8D8 52%,#E4DAC5 100%);
    font-family:'Reel Geist',system-ui,sans-serif;color:${rgba(COL.ink)};-webkit-font-smoothing:antialiased;contain:strict}
  .reel-stage *{box-sizing:border-box}
  .reel-stage .grain{position:absolute;inset:0;opacity:.06;mix-blend-mode:multiply;pointer-events:none;
    background-image:url(grain.png);background-size:256px 256px}
  .reel-stage .world{position:absolute;inset:0;transform-origin:50% 46%}
  .reel-stage .ui{position:absolute;inset:0;transform-origin:${CX}px ${CY}px;transform:scale(${UI})}
  .reel-stage .abs{position:absolute;left:0;top:0}
  .reel-stage .chrome{font-size:15px;letter-spacing:-.005em;font-weight:560;display:flex;align-items:center;gap:10px}
  .reel-stage .mark{width:14px;height:14px;border-radius:4px;background:${rgba(COL.green)};position:relative}
  .reel-stage .mark:after{content:'';position:absolute;right:-3px;bottom:-3px;width:6px;height:6px;border-radius:50%;background:${rgba(COL.ochre)}}
  .reel-stage .rel{font-family:'Reel Mono',monospace;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;color:${rgba(COL.muted)}}
  .reel-stage .label{font-size:19px;font-weight:540;letter-spacing:.005em;color:${rgba(COL.paperHi)};white-space:nowrap}
  .reel-stage .chiptext{display:flex;align-items:baseline;gap:10px;font-size:18px;white-space:nowrap}
  .reel-stage .chiptext .live{font-weight:560}
  .reel-stage .chiptext .sep{width:1px;height:16px;background:${rgba(COL.ink, .16)};align-self:center}
  .reel-stage .chiptext .metric{display:inline-flex;align-items:baseline;gap:5px;font-variant-numeric:tabular-nums}
  .reel-stage .chiptext .num{font-family:'Reel Mono',monospace;font-weight:500;letter-spacing:-.01em;min-width:5.6ch;text-align:right}
  .reel-stage .chiptext .unit{color:${rgba(COL.muted)};font-size:15px}
  .reel-stage .tab{width:${TAB_W}px;height:44px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:520;letter-spacing:.002em}
  .reel-stage .stats{display:flex;align-items:center;gap:22px;padding:0 22px;height:88px;white-space:nowrap}
  .reel-stage .stat{display:flex;flex-direction:column;gap:3px}
  .reel-stage .stat .k{font-family:'Reel Mono',monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:${rgba(COL.muted)}}
  .reel-stage .stat .v{font-family:'Reel Mono',monospace;font-size:22px;font-weight:500;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
  .reel-stage .stat .v .u{font-size:14px;color:${rgba(COL.muted)};margin-left:3px;font-weight:450}
  .reel-stage .spark{flex:0 0 auto}
  .reel-stage .badge{display:flex;align-items:center;gap:12px;padding:0 18px;height:52px;font-size:16px;font-weight:540;white-space:nowrap}
  .reel-stage .badge .dot{width:10px;height:10px;border-radius:50%;flex:0 0 auto}
  .reel-stage .badge .env{font-variant-numeric:tabular-nums}
  .reel-stage .toast{display:flex;align-items:center;gap:12px;padding:0 20px;height:56px;font-size:17px;font-weight:540;color:${rgba(COL.paperHi)};white-space:nowrap}
  .reel-stage .toast .tk{font-family:'Reel Mono',monospace;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;opacity:.78;font-weight:450}
  .reel-stage .head{white-space:nowrap;font-family:'Reel Fraunces',Georgia,serif;font-size:132px;line-height:1.22;clip-path:inset(-40px -60px 0 -60px);font-weight:360;
    letter-spacing:-.028em;font-variation-settings:'opsz' 144,'SOFT' 30,'WONK' 0}
  .reel-stage .head .g{display:inline-block}
  .reel-stage .head .it{font-style:italic;color:${rgba(COL.green)};font-variation-settings:'opsz' 144,'SOFT' 60,'WONK' 1}
  .reel-stage .sub{font-size:23px;font-weight:420;letter-spacing:-.008em;color:${rgba(COL.ink, .72)};white-space:nowrap}
  .reel-stage .meta{font-family:'Reel Mono',monospace;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:${rgba(COL.muted)};white-space:nowrap}
  .reel-stage .lock{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:520;color:${rgba(COL.ink, .55)};white-space:nowrap}
  .reel-stage .lock .mark{width:12px;height:12px;border-radius:3px}
  .reel-stage .lock .mark:after{width:5px;height:5px;right:-2px;bottom:-2px}
  `;
  function injectCSS() {
    if (document.getElementById('reel-css')) return;
    const s = document.createElement('style'); s.id = 'reel-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function el(tag, cls, parent, html) {
    const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; parent.appendChild(e); return e;
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e;
  }
  function center(e, x, y, s = 1) {
    const w = e.__w ?? (e.__w = e.offsetWidth), h = e.__h ?? (e.__h = e.offsetHeight);
    e.style.transform = `translate(${(x - w / 2).toFixed(3)}px,${(y - h / 2).toFixed(3)}px) scale(${s.toFixed(5)})`;
  }

  function create(container) {
    injectCSS();
    const stage = el('div', 'reel-stage', container);
    stage.setAttribute('role', 'img');
    stage.setAttribute('aria-label', 'Tideline 2.4 launch reel: Publish becomes progress, status, tabs, dual metrics, an environment badge, a shipped toast, then the headline Ship quietly.');
    const world = el('div', 'world', stage);
    el('div', 'grain', stage);

    const chromeL = el('div', 'abs chrome', world, '<span class="mark"></span>Tideline');
    const chromeR = el('div', 'abs rel', world, 'Release 2.4');

    const ui = el('div', 'ui', world);
    const shape = el('div', 'abs', ui);
    const label = el('div', 'abs label', ui, 'Publish');

    const icon = svg('svg', { class: 'abs', width: 120, height: 120, viewBox: '-60 -60 120 120', style: 'overflow:visible' }, ui);
    const disc = svg('circle', { r: DISC / 2, fill: rgba(COL.green) }, icon);
    const track = svg('circle', { r: 24, fill: 'none', stroke: rgba(COL.paperHi), 'stroke-width': 3 }, icon);
    const ARC_LEN = 2 * Math.PI * 24;
    const arc = svg('circle', { r: 24, fill: 'none', stroke: rgba(COL.ochre), 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': ARC_LEN }, icon);
    const CHECK_LEN = 36.2;
    const check = svg('path', { d: 'M-12 1 L-4 9 L13 -9', fill: 'none', stroke: rgba(COL.paperHi), 'stroke-width': 4.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': CHECK_LEN }, icon);

    const chip = el('div', 'abs chiptext', ui,
      '<span class="live">Live</span><span class="sep"></span><span class="metric"><span class="num">0</span><span class="unit">req/s</span></span>');
    const num = chip.querySelector('.num');

    const indicator = el('div', 'abs', ui);
    indicator.style.height = '44px'; indicator.style.borderRadius = '22px';
    const tabs = ['Overview', 'Traffic', 'Logs'].map(n => el('div', 'abs tab', ui, n));

    /* Dual metrics + sparkline */
    const stats = el('div', 'abs stats', ui,
      '<div class="stat"><span class="k">p99 latency</span><span class="v"><span class="n1">42</span><span class="u">ms</span></span></div>' +
      '<div class="stat"><span class="k">deploy time</span><span class="v"><span class="n2">1.8</span><span class="u">s</span></span></div>');
    const sparkSvg = svg('svg', { class: 'spark', width: 120, height: 40, viewBox: '0 0 120 40' }, stats);
    const sparkTrack = svg('path', { d: sparkPath(120, 40), fill: 'none', stroke: rgba(COL.ink, 0.12), 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sparkSvg);
    const sparkLine = svg('path', { d: sparkPath(120, 40), fill: 'none', stroke: rgba(COL.green), 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sparkSvg);
    const SPARK_LEN = sparkLine.getTotalLength ? 0 : 180; // measured after mount
    let sparkLen = 0;

    /* Env badge */
    const badge = el('div', 'abs badge', ui, '<span class="dot"></span><span class="env">Staging</span>');
    const badgeDot = badge.querySelector('.dot');
    const badgeEnv = badge.querySelector('.env');

    /* Shipped toast */
    const toast = el('div', 'abs toast', ui,
      '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9.2 L7.2 12.8 L14.5 5.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span>Shipped</span><span class="tk">v2.4 · Production</span>');

    const head = el('div', 'abs head', world);
    const glyphs = [];
    for (const [word, italic] of HEAD) {
      for (const ch of word) {
        const g = el('span', 'g' + (italic ? ' it' : ''), head, ch === ' ' ? '&nbsp;' : ch);
        glyphs.push(g);
      }
    }
    const sub = el('div', 'abs sub', world, 'Deploys that don\u2019t make noise.');
    const meta = el('div', 'abs meta', world, 'Tideline 2.4 \u00b7 available today');
    const lock = el('div', 'abs lock', world, '<span class="mark"></span>Quiet by design');

    const ripple = el('div', 'abs', ui);
    Object.assign(ripple.style, { width: '48px', height: '48px', borderRadius: '50%', border: `1.5px solid ${rgba(COL.ochre)}` });
    const cursor = svg('svg', { class: 'abs', width: 26, height: 30, viewBox: '-2 -2 22 28', style: 'overflow:visible' }, ui);
    svg('path', { d: 'M0 0 L0 20.5 L5.4 15.6 L8.9 23.6 L12.4 22.1 L9 14.2 L15.8 14.2 Z', fill: rgba(COL.ink), stroke: rgba(COL.paperHi), 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, cursor);

    function remeasure() {
      [chromeL, chromeR, label, chip, stats, badge, toast, head, sub, meta, lock, ...tabs].forEach(e => { delete e.__w; delete e.__h; });
      try { sparkLen = sparkLine.getTotalLength(); } catch (_) { sparkLen = 180; }
    }
    remeasure();

    function seek(tIn) {
      const t = clamp(+tIn || 0, 0, DURATION);
      if (!sparkLen) try { sparkLen = sparkLine.getTotalLength(); } catch (_) { sparkLen = 180; }

      world.style.transform = `scale(${(1 + 0.022 * easeInOutCubic(t / DURATION)).toFixed(5)})`;

      /* chrome fades slightly during end card so the headline owns the frame */
      const chromeA = 1 - 0.35 * easeOutCubic(seg(t, 14.0, 15.0));
      chromeL.style.opacity = chromeA; chromeR.style.opacity = chromeA;
      chromeL.style.transform = `translate(64px,52px)`;
      const rw = chromeR.__w ?? (chromeR.__w = chromeR.offsetWidth);
      chromeR.style.transform = `translate(${W - 64 - rw}px,55px)`;

      /* ---------- one-object geometry timeline ----------
         Publish → disc → chip → bar → stats → badge → toast → rule */
      const w = chain(t, PILL.w, [
        [1.02, DISC, S.snap],
        [3.0, CHIP.w, S.soft],
        [4.5, BAR.w, S.soft],
        [7.0, STATS.w, S.soft],
        [9.5, BADGE.w, S.soft],
        [12.0, TOAST.w, S.soft],
        [14.0, RULE.w / UI, S.soft],
      ]);
      const h = chain(t, PILL.h, [
        [1.02, DISC, S.snap],
        [3.0, CHIP.h, S.soft],
        [4.5, BAR.h, S.soft],
        [7.0, STATS.h, S.soft],
        [9.5, BADGE.h, S.soft],
        [12.0, TOAST.h, S.soft],
        [14.0, RULE.h / UI, S.crush],
      ]);
      const cy = chain(t, CY, [[14.0, toLocalY(RULE_Y), S.soft]]);
      const press = chain(t, 1, [[0.96, 0.955, S.snap], [1.08, 1, S.settle]]);
      const pop = chain(t, 1, [[2.47, 1.075, S.snap], [2.58, 1, S.pop]]);
      const toastPop = chain(t, 1, [[12.0, 1.04, S.snap], [12.12, 1, S.pop]]);
      const sScale = press * pop * toastPop;

      /* colour story */
      let col = chainC(t, COL.green, [
        [0.66, COL.greenHi, S.soft],
        [0.96, COL.green, S.snap],
        [3.0, COL.paperHi, S.snap],
      ]);
      /* stats stay paper; badge: staging ochre-brown then green Production; toast: green; rule: ochre */
      col = mixC(col, COL.paperHi, 0); // keep paper through tabs/stats
      const badgeCol = mixC(COL.staging, COL.green, easeInOutCubic(seg(t, 10.4, 11.1)));
      col = mixC(col, badgeCol, easeOutCubic(seg(t, 9.45, 9.7)));
      col = mixC(col, COL.green, easeOutCubic(seg(t, 11.95, 12.15)));
      col = mixC(col, COL.ochre, easeOutCubic(seg(t, 13.95, 14.08)));

      const lightA = seg(t, 3.02, 3.35) * (1 - seg(t, 9.45, 9.7)) * (1 - seg(t, 11.95, 12.15));
      const darkA = (1 - seg(t, 2.98, 3.15))
        + easeOutCubic(seg(t, 9.5, 9.75)) * (1 - easeOutCubic(seg(t, 11.95, 12.15)))
        + easeOutCubic(seg(t, 12.0, 12.2)) * (1 - easeOutCubic(seg(t, 13.95, 14.1)));
      const rad = Math.min(w, h) / 2;
      /* stats panel uses softer radius so it reads as a card, not a pill */
      const radius = lerp(rad, 16 / UI, easeOutCubic(seg(t, 6.95, 7.2)) * (1 - easeOutCubic(seg(t, 9.4, 9.65))));

      shape.style.width = w.toFixed(3) + 'px';
      shape.style.height = h.toFixed(3) + 'px';
      shape.style.borderRadius = radius.toFixed(3) + 'px';
      shape.style.background = rgba(col);
      shape.style.opacity = '1';
      shape.style.boxShadow =
        `inset 0 1px 0 rgba(255,255,255,${(0.08 * Math.min(1, darkA) * (1 - lightA) + 0.7 * lightA).toFixed(3)}),` +
        `0 0 0 1px ${rgba(COL.ink, 0.09 * lightA)},` +
        `0 22px 44px -22px ${rgba(COL.green, 0.50 * Math.min(1, darkA) + 0.28 * lightA)},` +
        `0 3px 8px -4px ${rgba(COL.green, 0.22 * (Math.min(1, darkA) + lightA))}`;
      shape.style.transform = `translate(${(CX - w / 2).toFixed(3)}px,${(cy - h / 2).toFixed(3)}px) scale(${sScale.toFixed(5)})`;

      /* Publish label */
      const labA = 1 - easeOutCubic(seg(t, 0.98, 1.16));
      label.style.opacity = labA;
      center(label, CX, CY - 1, sScale * (1 - 0.08 * seg(t, 0.98, 1.16)));

      /* icon: ring → check → chip icon */
      const ringA = easeOutCubic(seg(t, 1.18, 1.32)) * (1 - seg(t, 2.42, 2.56));
      const prog = 0.62 * easeOutCubic(seg(t, 1.3, 1.95)) + 0.38 * easeInOutCubic(seg(t, 2.06, 2.44));
      track.style.opacity = (0.2 * ringA).toFixed(3);
      arc.style.opacity = ringA.toFixed(3);
      arc.setAttribute('stroke-dashoffset', (ARC_LEN * (1 - prog)).toFixed(3));
      arc.setAttribute('transform', `rotate(${(-90 + 50 * easeInOutCubic(seg(t, 1.3, 2.44))).toFixed(3)})`);
      const chk = easeOutCubic(seg(t, 2.44, 2.76));
      check.setAttribute('stroke-dashoffset', (CHECK_LEN * (1 - chk)).toFixed(3));
      disc.style.opacity = t >= 2.96 ? 1 : 0;
      const iconGo = spring(t - 3.0, S.soft);
      const iconX = CX + lerp(0, -CHIP.w / 2 + 28, iconGo);
      const iconS = lerp(1, 0.42, iconGo) * pop;
      const iconA = (1 - easeInOutCubic(seg(t, 4.38, 4.56)));
      icon.style.opacity = iconA;
      icon.style.transform = `translate(${(iconX - 60).toFixed(3)}px,${(CY - 60).toFixed(3)}px) scale(${iconS.toFixed(5)})`;

      /* chip text + exact metric (tighter unit gap) */
      const chipIn = easeOutCubic(seg(t, 3.2, 3.5)), chipOut = easeInOutCubic(seg(t, 4.36, 4.52));
      chip.style.opacity = (chipIn * (1 - chipOut)).toFixed(3);
      const n = Math.round(10799 * easeOutExpo(seg(t, 3.28, 4.2)));
      num.textContent = n.toLocaleString('en-US');
      delete chip.__w; delete chip.__h;  // metric digit count changes width
      const cw = chip.offsetWidth; chip.__w = cw; chip.__h = chip.offsetHeight;
      center(chip, CX - CHIP.w / 2 + 52 + cw / 2, CY + 8 * (1 - chipIn), 1);

      /* tabs + asymmetric indicator */
      const L = chain(t, tabL(0), [[5.57, tabL(1), S.soft], [6.57, tabL(2), S.soft]]);
      const R = chain(t, tabR(0), [[5.5, tabR(1), S.snap], [6.5, tabR(2), S.snap]]);
      const barOut = easeInOutCubic(seg(t, 6.88, 7.05));
      const indA = easeOutCubic(seg(t, 4.72, 4.95)) * (1 - barOut);
      const indS = 0.94 + 0.06 * spring(t - 4.72, S.soft);
      const tapSquash = 1 - 0.05 * (bump(t, 5.5) + bump(t, 6.5));
      indicator.style.opacity = indA.toFixed(3);
      indicator.style.width = (R - L).toFixed(3) + 'px';
      indicator.style.background = rgba(COL.green);
      indicator.style.boxShadow = `0 6px 14px -8px ${rgba(COL.green, 0.6)}`;
      indicator.style.transform = `translate(${L.toFixed(3)}px,${(CY - 22).toFixed(3)}px) scale(${indS.toFixed(4)},${(indS * tapSquash).toFixed(4)})`;
      tabs.forEach((tb, i) => {
        const a = easeOutCubic(seg(t, 4.62 + i * 0.0625, 4.9 + i * 0.0625)) * (1 - barOut);
        const mid = tabL(i) + TAB_W / 2, half = 34;
        const ov = easeInOutCubic(clamp((Math.min(R, mid + half) - Math.max(L, mid - half)) / (2 * half)));
        tb.style.opacity = a.toFixed(3);
        tb.style.color = rgba(mixC(mixC(COL.ink, COL.muted, 0.55), COL.paperHi, ov));
        tb.style.transform = `translate(${tabL(i).toFixed(3)}px,${(CY - 22 + 6 * (1 - a)).toFixed(3)}px)`;
      });

      /* dual metrics + sparkline draw */
      const statsIn = easeOutCubic(seg(t, 7.15, 7.45));
      const statsOut = easeInOutCubic(seg(t, 9.35, 9.55));
      const statsA = statsIn * (1 - statsOut);
      stats.style.opacity = statsA.toFixed(3);
      center(stats, CX, CY + 10 * (1 - statsIn), 1);
      const draw = easeOutCubic(seg(t, 7.3, 8.6));
      sparkLine.setAttribute('stroke-dasharray', sparkLen.toFixed(2));
      sparkLine.setAttribute('stroke-dashoffset', (sparkLen * (1 - draw)).toFixed(2));
      sparkTrack.style.opacity = (0.9 * statsA).toFixed(3);
      /* count-up the two stats from prior plausible values */
      const p99 = Math.round(lerp(68, 42, easeOutExpo(seg(t, 7.2, 8.4))));
      const dep = (lerp(4.2, 1.8, easeOutExpo(seg(t, 7.35, 8.55)))).toFixed(1);
      stats.querySelector('.n1').textContent = String(p99);
      stats.querySelector('.n2').textContent = dep;
      delete stats.__w; delete stats.__h;

      /* env badge Staging → Production */
      const badgeIn = easeOutCubic(seg(t, 9.6, 9.9));
      const badgeOut = easeInOutCubic(seg(t, 11.85, 12.05));
      const badgeA = badgeIn * (1 - badgeOut);
      badge.style.opacity = badgeA.toFixed(3);
      const envFlip = easeInOutCubic(seg(t, 10.45, 11.05));
      badgeEnv.textContent = envFlip < 0.5 ? 'Staging' : 'Production';
      badgeEnv.style.opacity = (1 - Math.abs(envFlip - 0.5) * 1.6).toFixed(3);
      badgeDot.style.background = rgba(mixC(COL.ochre, COL.paperHi, easeOutCubic(seg(t, 10.4, 11.0))));
      badge.style.color = rgba(COL.paperHi);
      delete badge.__w; delete badge.__h;  // Staging/Production differ in width — never cache across flips
      center(badge, CX, CY + 8 * (1 - badgeIn), 1);

      /* shipped toast */
      const toastIn = easeOutCubic(seg(t, 12.1, 12.4));
      const toastOut = easeInOutCubic(seg(t, 13.85, 14.05));
      const toastA = toastIn * (1 - toastOut);
      toast.style.opacity = toastA.toFixed(3);
      center(toast, CX, CY + 8 * (1 - toastIn), 1);

      /* headline */
      const hw = head.__w ?? (head.__w = head.offsetWidth), hh = head.__h ?? (head.__h = head.offsetHeight);
      head.style.transform = `translate(${(CX - hw / 2).toFixed(3)}px,${(HEAD_Y - hh / 2).toFixed(3)}px)`;
      glyphs.forEach((g, i) => {
        const s0 = 14.3 + i * BEAT / 8;
        const a = easeOutCubic(seg(t, s0, s0 + 0.18));
        const y = 150 * (1 - spring(t - s0, S.rise));
        const blur = 2.5 * (1 - easeOutCubic(seg(t, s0, s0 + 0.2)));
        g.style.opacity = a.toFixed(3);
        g.style.transform = `translateY(${y.toFixed(3)}px)`;
        g.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
      });

      const subA = easeOutCubic(seg(t, 16.05, 16.45));
      sub.style.opacity = subA.toFixed(3);
      center(sub, CX, SUB_Y + 10 * (1 - subA));
      const metaA = easeOutCubic(seg(t, 17.0, 17.4));
      meta.style.opacity = metaA.toFixed(3);
      center(meta, CX, META_Y + 6 * (1 - metaA));
      const lockA = easeOutCubic(seg(t, 17.6, 18.1));
      lock.style.opacity = lockA.toFixed(3);
      center(lock, CX, LOCK_Y + 6 * (1 - lockA));

      /* cursor — slower entry from farther off-frame */
      const OFF = (x, y) => [toLocalX(x), toLocalY(y)];
      const pts = [
        OFF(1380, 820),
        [CX + 44, CY + 12],
        OFF(1400, 640),
        [CX + 20, CY + 10],
        [tabL(2) + TAB_W / 2 + 14, CY + 10],
        OFF(1400, 700),
      ];
      const glide = [S.glide, S.exit, S.glide, S.glide, S.exit];
      const at = [0.05, 1.36, 4.82, 5.94, 6.78]; // earlier start → slower approach
      const steps = i => at.map((t0, k) => [t0, pts[k + 1][i], glide[k]]);
      const cx = chain(t, pts[0][0], steps(0)), cyy = chain(t, pts[0][1], steps(1));
      const cPress = 1 - 0.14 * CLICKS.reduce((s, c) => s + bump(t, c, 0.07, 0.22), 0);
      const cursorGone = seg(t, 7.0, 7.25); // leave after last tab click; later beats are system-driven
      cursor.style.transform = `translate(${cx.toFixed(3)}px,${cyy.toFixed(3)}px) scale(${(cPress * 0.8).toFixed(4)})`;
      cursor.style.transformOrigin = '0 0';
      cursor.style.opacity = (1 - cursorGone).toFixed(3);

      let last = -1; for (const c of CLICKS) if (t >= c) last = c;
      const rp = last < 0 ? 1 : seg(t, last, last + 0.5);
      const rr = 6 + 22 * easeOutCubic(rp);
      ripple.style.opacity = (last < 0 || cursorGone > 0.5) ? 0 : (0.55 * (1 - rp)).toFixed(3);
      ripple.style.transform = `translate(${(cx - 24).toFixed(3)}px,${(cyy - 24).toFixed(3)}px) scale(${(rr / 24).toFixed(4)})`;

      stage.dataset.t = t.toFixed(4);
      return t;
    }

    return { seek, stage, remeasure, DURATION, BPM, BEAT, sceneAt, sheetAt, W, H };
  }

  global.Reel = { create, DURATION, BPM, BEAT, sceneAt, sheetAt, W, H };
})(window);
