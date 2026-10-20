// Three inks — one vessel drawn as paper sketch → cyanotype blueprint → light study.
// Same geometry every frame; only the ink changes. draw(t) is a pure function of t. Canvas 2D.
(function () {
  const W = 1280, H = 720, D = 18;
  const INK = {
    paper: { bg: '#ECE6D8', line: '#2B2925', faint: 'rgba(43,41,37,.16)', guide: 'rgba(79,110,154,.55)', text: '#2B2925', sub: '#7C766A' },
    print: { bg: '#23416B', line: '#F0ECE1', faint: 'rgba(240,236,225,.5)', guide: 'rgba(240,236,225,.55)', text: '#F0ECE1', sub: 'rgba(240,236,225,.62)' },
    light: { bg: '#101314', line: '#CBDDD4', faint: 'rgba(203,221,212,.22)', guide: 'rgba(203,221,212,.35)', text: '#E6EEE9', sub: 'rgba(203,221,212,.55)', core: '#F6F8F4' }
  };
  const cues = [0, 1.6, 3.4, 5.4, 6.4, 8.4, 10.6, 11.6, 13.6, 16.0, 17.0];
  const scenes = [[0, 'Paper: a single profile line'], [1.6, 'Paper: rings and meridians'], [3.4, 'Paper: hatching'], [5.4, 'Flood: the vessel becomes the sheet'],
                  [6.4, 'Blueprint: hidden lines, dimensions'], [10.6, 'Split: section opens on the centreline'], [11.6, 'Light: scan-line shading'],
                  [16.0, 'Flood back to paper'], [17.0, 'Hold']];
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const outExpo = p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
  const inExpo = p => p <= 0 ? 0 : Math.pow(2, 10 * p - 10);
  const inOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

  // ---- geometry ---------------------------------------------------------------
  const CX = 640, BASE = 612, HGT = 410, ELEV = 0.36, cE = Math.cos(ELEV), sE = Math.sin(ELEV);
  const PROF = [[0, 72], [0.07, 96], [0.36, 168], [0.6, 118], [0.78, 60], [0.9, 64], [1, 80]];
  function R(s) {                         // Catmull-Rom through the profile points (C1, no flat spots)
    s = clamp(s);
    let i = 0; while (i < PROF.length - 2 && s > PROF[i + 1][0]) i++;
    const r = j => PROF[Math.max(0, Math.min(PROF.length - 1, j))][1];
    const p = (s - PROF[i][0]) / (PROF[i + 1][0] - PROF[i][0]);
    const p0 = r(i - 1), p1 = r(i), p2 = r(i + 1), p3 = r(i + 2);
    return 0.5 * ((2 * p1) + (-p0 + p2) * p + (2 * p0 - 5 * p1 + 4 * p2 - p3) * p * p + (-p0 + 3 * p1 - 3 * p2 + p3) * p * p * p);
  }
  const P = (s, phi) => { const r = R(s); return [CX + r * Math.cos(phi), BASE - s * HGT * cE + r * Math.sin(phi) * sE, Math.sin(phi)]; };
  const theta = t => 0.26 * t;
  const RINGS = [0, 0.07, 0.17, 0.27, 0.36, 0.45, 0.54, 0.62, 0.7, 0.78, 0.85, 0.92, 1];
  const MER = 16;
  function silhouette(scale = 1, cy = BASE - HGT * cE / 2) {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const s = i / 40; pts.push([CX + R(s), BASE - s * HGT * cE]); }
    for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI; pts.push([CX + R(1) * Math.cos(a), BASE - HGT * cE - R(1) * Math.sin(a) * sE]); }
    for (let i = 40; i >= 0; i--) { const s = i / 40; pts.push([CX - R(s), BASE - s * HGT * cE]); }
    for (let i = 0; i <= 24; i++) { const a = Math.PI + i / 24 * Math.PI; pts.push([CX + R(0) * Math.cos(a + Math.PI), BASE - R(0) * Math.sin(a + Math.PI) * sE]); }
    return pts.map(([x, y]) => [CX + (x - CX) * scale, cy + (y - cy) * scale]);
  }

  let cv, g, k;
  // pencil boil: 8 phases a second, deterministic in t
  const wob = (x, y, seed, t, amp) => { const ph = Math.floor(t * 8); return [x + amp * Math.sin(0.031 * y + ph * 1.7 + seed), y + amp * Math.sin(0.027 * x + ph * 2.3 + seed * 1.3)]; };
  function poly(pts, ink, t, { w = 1.4, color, dash = null, pencil = false, seed = 0, upTo = 1 } = {}) {
    const n = Math.max(2, Math.floor(pts.length * upTo)); if (upTo <= 0) return;
    const pass = (amp, lw, alpha, sd) => {
      g.save(); g.globalAlpha *= alpha; g.strokeStyle = color; g.lineWidth = lw; g.lineJoin = g.lineCap = 'round';
      if (dash) g.setLineDash(dash);
      g.beginPath();
      for (let i = 0; i < n; i++) { const [x, y] = pencil ? wob(pts[i][0], pts[i][1], sd, t, amp) : pts[i]; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); g.restore();
    };
    if (pencil) { pass(1.1, w, 0.85, seed); pass(1.9, w * 0.55, 0.4, seed + 3.1); }
    else if (ink === 'light') { pass(0, w * 1.9, 1, 0); g.save(); g.strokeStyle = INK.light.core; pass(0, w * 0.6, 0.9, 0); g.restore(); }
    else pass(0, w, 1, 0);
  }
  function lightCore(pts, w) {    // white core for the light ink
    g.save(); g.strokeStyle = INK.light.core; g.lineWidth = w; g.lineCap = 'round'; g.beginPath();
    pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore();
  }

  // ---- one ink, whole frame ------------------------------------------------------
  function drawInk(ink, t, rev) {
    const c = INK[ink], th = theta(t);
    g.fillStyle = c.bg; g.fillRect(0, 0, W, H);
    // sheet furniture: a quiet grid on paper and blueprint only
    if (ink !== 'light') {
      g.save(); g.strokeStyle = ink === 'paper' ? 'rgba(79,110,154,.09)' : 'rgba(240,236,225,.07)'; g.lineWidth = 1;
      for (let x = 40; x < W; x += 40) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, H); g.stroke(); }
      for (let y = 40; y < H; y += 40) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(W, y + .5); g.stroke(); }
      g.restore();
    }
    const pencil = ink === 'paper', lw = ink === 'print' ? 1.6 : ink === 'light' ? 1.2 : 1.5;

    // light: scan-line fill first, thickness follows lambert shading
    if (ink === 'light') {
      const Lx = -0.55, Lz = 0.83;
      g.save(); g.strokeStyle = 'rgba(214,230,222,.92)'; g.lineCap = 'butt';
      for (let y = Math.ceil((BASE - HGT * cE) / 8) * 8; y <= BASE; y += 8) {
        const s = (BASE - y) / (HGT * cE), w = R(clamp(s));
        const N = 28;
        for (let i = 0; i < N; i++) {
          const nx = -1 + (i + 0.5) * 2 / N, nz = Math.sqrt(1 - nx * nx);
          const sh = clamp(nx * Lx + nz * Lz);
          g.lineWidth = 0.3 + 4.6 * Math.pow(sh, 1.6) * rev.scan;
          g.beginPath(); g.moveTo(CX + w * (-1 + i * 2 / N), y); g.lineTo(CX + w * (-1 + (i + 1) * 2 / N), y); g.stroke();
        }
      }
      g.restore();
    }

    // rings
    const ringN = Math.floor(RINGS.length * rev.rings + 1e-6);
    RINGS.slice(0, ringN).forEach((s, i) => {
      const front = [], back = [];
      for (let j = 0; j <= 72; j++) { const a = j / 72 * Math.PI * 2; const p = P(s, a); (p[2] >= 0 ? front : back).push(p); }
      // order arcs so each half is one continuous polyline
      const fr = []; for (let j = 0; j <= 36; j++) fr.push(P(s, j / 36 * Math.PI));
      const bk = []; for (let j = 0; j <= 36; j++) bk.push(P(s, Math.PI + j / 36 * Math.PI));
      const edge = s === 0 || s === 1;
      if (ink === 'light') { g.save(); g.globalAlpha = edge ? 1 : 0.32 + 0.0 * i; poly(fr, 'plain', t, { w: edge ? 1.6 : 0.8, color: c.line }); g.restore(); }
      else poly(fr, ink, t, { w: edge ? lw * 1.15 : lw * 0.8, color: c.line, pencil, seed: i * 1.7 });
      if (ink === 'print') poly(bk, ink, t, { w: lw * 0.7, color: c.faint, dash: [6, 5] });
      else if (ink === 'light' ? edge : s === 1) poly(bk, ink === 'light' ? 'plain' : ink, t, { w: lw * 0.7, color: c.faint, pencil, seed: i + 9 });
    });
    // meridians
    const merN = Math.floor(MER * rev.mer + 1e-6);
    for (let i = 0; i < merN; i++) {
      const phi = th + i * Math.PI * 2 / MER, front = Math.sin(phi) >= 0;
      const pts = []; for (let j = 0; j <= 40; j++) pts.push(P(j / 40, phi));
      if (ink === 'light') { if (front) { g.save(); g.globalAlpha = 0.22; poly(pts, 'plain', t, { w: 0.8, color: c.line }); g.restore(); } }
      else if (front) poly(pts, ink, t, { w: lw * 0.75, color: c.line, pencil, seed: 20 + i });
      else if (ink === 'print') poly(pts, ink, t, { w: lw * 0.6, color: c.faint, dash: [6, 5] });
    }
    // contour (true silhouette), drawn last and heaviest
    const right = [], left = [];
    for (let j = 0; j <= 60; j++) { const s = j / 60; right.push([CX + R(s), BASE - s * HGT * cE]); left.push([CX - R(s), BASE - s * HGT * cE]); }
    poly(right, ink, t, { w: lw * 1.35, color: c.line, pencil, seed: 41, upTo: rev.contour });
    poly(left, ink, t, { w: lw * 1.35, color: c.line, pencil, seed: 47, upTo: rev.contour });

    // paper: graphite hatching on the shadow side, built one stroke at a time
    if (ink === 'paper' && rev.hatch > 0) {
      const sil = silhouette();
      g.save(); g.beginPath(); sil.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip();
      // shadow side (light from upper-left): long diagonals, then a cross-hatch near the turning edge
      const strokes = [];
      for (let x0 = CX + 6; x0 < CX + 240; x0 += 6.5) strokes.push([[x0 + 120, BASE + 20], [x0 - 120, BASE - HGT - 40]]);
      for (let x0 = CX + 96; x0 < CX + 260; x0 += 7.5) strokes.push([[x0 - 110, BASE + 20], [x0 + 110, BASE - HGT - 40]]);
      const shown = Math.floor(strokes.length * rev.hatch);
      for (let i = 0; i < shown; i++) poly(strokes[i], ink, t, { w: 0.75, color: 'rgba(43,41,37,.5)', pencil: true, seed: 60 + i });
      g.restore();
    }
    // blueprint: centreline + dimensions
    if (ink === 'print') {
      const dp = outExpo(seg(t, 6.9, 8.3)), top = BASE - HGT * cE;
      g.save(); g.strokeStyle = c.guide; g.lineWidth = 1; g.setLineDash([22, 5, 3, 5]);
      g.beginPath(); g.moveTo(CX, BASE + 40); g.lineTo(CX, lerp(BASE + 40, top - 50, dp)); g.stroke(); g.restore();
      const dx = CX + R(0.36) + 96;
      const dim = (x0, y0, x1, y1, label, p, lx, ly) => {
        if (p <= 0) return;
        g.save(); g.strokeStyle = c.line; g.fillStyle = c.line; g.lineWidth = 1;
        const xe = lerp(x0, x1, p), ye = lerp(y0, y1, p);
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(xe, ye); g.stroke();
        const tick = (x, y) => { g.beginPath(); g.moveTo(x - 5, y + 5); g.lineTo(x + 5, y - 5); g.stroke(); };
        tick(x0, y0); if (p >= 1) tick(x1, y1);
        g.globalAlpha = seg(p, 0.7, 1); g.font = `15px 'Mono'`; g.fillText(label, lx, ly); g.restore();
      };
      // extension lines
      g.save(); g.strokeStyle = c.faint; g.lineWidth = 1; g.globalAlpha = dp;
      g.beginPath(); g.moveTo(CX + R(0) + 12, BASE); g.lineTo(dx + 12, BASE); g.moveTo(CX + R(1) + 12, top); g.lineTo(dx + 12, top); g.stroke(); g.restore();
      dim(dx, BASE, dx, top, `H ${Math.round(HGT * 0.6)}`, outExpo(seg(t, 7.2, 8.0)), dx + 14, (BASE + top) / 2 + 4);
      const yb = BASE - 0.36 * HGT * cE, yd = top - 34;
      dim(CX - R(0.36), yd, CX + R(0.36), yd, `Ø ${Math.round(2 * R(0.36) * 0.6)}`, outExpo(seg(t, 7.7, 8.5)), CX - 28, yd - 12);
      g.save(); g.strokeStyle = c.faint; g.lineWidth = 1; g.globalAlpha = seg(t, 7.7, 8.2);
      g.beginPath(); g.moveTo(CX - R(0.36), yb - 12); g.lineTo(CX - R(0.36), yd - 8); g.moveTo(CX + R(0.36), yb - 12); g.lineTo(CX + R(0.36), yd - 8); g.stroke(); g.restore();
    }

    // captions: ink name, materials, swatches
    const names = { paper: ['I', 'Paper', 'graphite · non-photo blue · cotton rag'], print: ['II', 'Blueprint', 'cyanotype · hidden lines dashed · section A–A'], light: ['III', 'Light', 'line density only · 8 px scan · no glow'] }[ink];
    g.save();
    g.fillStyle = c.sub; g.font = `12px 'Mono'`; g.letterSpacing = '1.5px';
    g.fillText('LAB STUDY 03 — ONE VESSEL, THREE INKS', 56, 58);
    g.textAlign = 'right'; g.fillText(`${names[0]} / III`, W - 56, 58); g.textAlign = 'left';
    g.letterSpacing = '0px';
    g.fillStyle = c.text; g.font = `italic 300 40px 'Serif'`; g.fillText(names[1], 56, H - 78);
    g.fillStyle = c.sub; g.font = `12px 'Mono'`; g.letterSpacing = '1px'; g.fillText(names[2].toUpperCase(), 56, H - 50);
    g.restore();
    // three swatches; the current ink is ringed
    ['paper', 'print', 'light'].forEach((nm, i) => {
      const x = W - 56 - (2 - i) * 26, y = H - 60;
      g.save(); g.fillStyle = INK[nm].bg; g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill();
      g.strokeStyle = c.sub; g.lineWidth = 1; g.stroke();
      if (nm === ink) { g.strokeStyle = c.text; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 12.5, 0, Math.PI * 2); g.stroke(); }
      g.restore();
    });
  }

  function clipPoly(pts) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip(); }

  function draw(t) {
    g.setTransform(k, 0, 0, k, 0, 0);
    const full = { contour: 1, rings: 1, mer: 1, hatch: 1, scan: 1 };
    const paperRev = {
      contour: inOut(seg(t, 0.2, 1.5)), rings: seg(t, 1.6, 2.8), mer: seg(t, 2.2, 3.4), hatch: seg(t, 3.5, 5.0), scan: 0
    };
    const endPaper = t >= 16.0;
    if (t < 5.4) drawInk('paper', t, paperRev);
    else if (t < 10.6) {
      drawInk('paper', t, full);
      const f = lerp(1, 9, inExpo(seg(t, 5.4, 6.3)));          // the vessel silhouette floods the sheet
      g.save(); clipPoly(silhouette(f)); drawInk('print', t, full); g.restore();
    } else if (t < 16.0) {
      drawInk('print', t, full);
      const wsp = 680 * inOut(seg(t, 10.6, 11.5));               // section opens from the centreline
      const scan = t < 11.4 ? 0 : outExpo(seg(t, 11.4, 12.6));
      g.save(); g.beginPath(); g.rect(CX - wsp, 0, wsp * 2, H); g.clip(); drawInk('light', t, { ...full, scan }); g.restore();
      if (wsp > 0 && wsp < 680) { g.save(); g.fillStyle = INK.print.line; g.fillRect(CX - wsp - 1, 0, 1, H); g.fillRect(CX + wsp, 0, 1, H); g.restore(); }
    }
    if (endPaper) {
      drawInk('light', t, full);
      const f = lerp(1, 9, inExpo(seg(t, 16.0, 16.9)));
      g.save(); clipPoly(silhouette(f)); drawInk('paper', t, full);
      const tp = outExpo(seg(t, 17.0, 17.6));
      g.globalAlpha = tp; g.fillStyle = INK.paper.text; g.font = `italic 300 34px 'Serif'`; g.textAlign = 'center';
      g.fillText('Same line, three inks.', CX, 112 + (1 - tp) * 10);
      g.restore();
    }
  }

  function create(frame, scale) {
    k = scale; cv = document.createElement('canvas');
    cv.width = W * k; cv.height = H * k; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    frame.appendChild(cv); g = cv.getContext('2d');
    const st = document.createElement('style');
    st.textContent = `@font-face{font-family:Serif;src:url(fonts/Newsreader.ttf);font-weight:200 800}@font-face{font-family:Serif;font-style:italic;src:url(fonts/Newsreader-Italic.ttf);font-weight:200 800}@font-face{font-family:Mono;src:url(fonts/JetBrainsMono.ttf);font-weight:100 800}`;
    document.head.appendChild(st);
    const ready = Promise.all(["italic 300 40px Serif", "300 40px Serif", "12px Mono"].map(f => document.fonts.load(f)));
    return {
      W, H, DURATION: D, STILL: 17.8, cues, canvas: cv, ready,
      seek(t) { draw(t); },
      sceneAt(t) { let n = scenes[0][1]; for (const [a, s] of scenes) if (t >= a) n = s; return n; },
      hash() { const d = g.getImageData(0, 0, cv.width, cv.height).data; let h = 2166136261; for (let i = 0; i < d.length; i += 7) { h ^= d[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
    };
  }
  window.Reel = { create, meta: { title: 'Three inks', sub: 'one vessel · paper → blueprint → light · 18 s', bg: '#ECE6D8', ink: '#2B2925', accent: '#23416B', muted: '#7C766A' } };
})();
