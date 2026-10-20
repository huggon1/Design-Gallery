// Editorial kinetic type — "A sentence is a house you can enter."
// Every pixel is draw(t): no timers, no carried state, no randomness. Canvas 2D.
(function () {
  const W = 1280, H = 720, D = 18;
  const C = { paper: '#EEE9DF', ink: '#15130F', accent: '#8C2B1F', muted: '#7D776B', hair: 'rgba(21,19,15,.85)' };
  const F = { serif: "'Disp'", serifI: "'DispI'", grot: "'Grot'", mono: "'Mono'" };
  const cues = [0, 1.4, 3.6, 4.6, 6.6, 8.0, 10.2, 11.8, 13.0, 14.2, 16.0];
  const scenes = [[0, 'Load: WEIGHT lands'], [3.6, 'Set: the word becomes a floor'], [6.6, 'Lean: two words stand, then meet'],
                  [10.2, 'Gap: the space between becomes a room'], [13.0, 'Enter: pull back to the house'], [16.0, 'Hold']];

  // ---- pure helpers -------------------------------------------------------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const outExpo = p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
  const inOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const inExpo = p => p <= 0 ? 0 : Math.pow(2, 10 * p - 10);
  // critically damped step response — never passes its target
  const spring = (t, t0, w) => t <= t0 ? 0 : 1 - (1 + w * (t - t0)) * Math.exp(-w * (t - t0));

  let cv, g, k, grain, m = {};

  function measure() {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = `150px ${F.grot}`;
    const wW = g.measureText('WEIGHT');
    m.wSize = 150 * 640 / wW.width;                       // WEIGHT spans the floor exactly
    g.font = `${m.wSize}px ${F.grot}`;
    m.wCap = g.measureText('WEIGHT').actualBoundingBoxAscent;
    g.font = `150px ${F.grot}`;
    const pl = Math.max(g.measureText('THIS').width, g.measureText('THAT').width);
    m.pSize = 150 * 300 / pl;                            // pillar length 300
    g.font = `${m.pSize}px ${F.grot}`;
    m.pL = Math.max(g.measureText('THIS').width, g.measureText('THAT').width);
    m.pH = g.measureText('THIS').actualBoundingBoxAscent;
    g.restore();
  }

  // words revealed through a mask band, rolled upward on exit
  function words(list, x, y, font, size, color, t, tIn, step, tOut, gap = 0.26) {
    g.font = `${size}px ${font}`;
    const sp = g.measureText(' ').width;
    let cx = x;
    list.forEach((wd, i) => {
      const txt = typeof wd === 'string' ? wd : wd.t, fnt = typeof wd === 'string' ? font : wd.f, col = typeof wd === 'string' ? color : wd.c;
      g.font = `${size}px ${fnt}`;
      const w = g.measureText(txt).width;
      const pin = spring(t, tIn + i * step, 16), pout = tOut == null ? 0 : inExpo(seg(t, tOut + i * 0.03, tOut + i * 0.03 + 0.42));
      if (pin > 0.001 && pout < 0.999) {
        g.save();
        g.beginPath(); g.rect(cx - 4, y - size * 1.05, w + 8, size * 1.35); g.clip();
        g.fillStyle = col;
        g.fillText(txt, cx, y + (1 - pin) * size * 0.9 - pout * size * 1.1);
        g.restore();
      }
      cx += w + sp + gap;
    });
    return cx;
  }

  function width(list, font, size) {
    let w = 0; g.font = `${size}px ${font}`; const sp = g.measureText(' ').width;
    list.forEach((wd, i) => { g.font = `${size}px ${typeof wd === 'string' ? font : wd.f}`; w += g.measureText(typeof wd === 'string' ? wd : wd.t).width + (i ? sp + 0.26 : 0); });
    return w;
  }
  function mono(txt, x, y, color = C.muted, align = 'left', a = 1) {
    g.save(); g.globalAlpha = a; g.font = `12px ${F.mono}`; g.fillStyle = color; g.textAlign = align;
    g.letterSpacing = '1.5px'; g.fillText(txt, x, y); g.restore();
  }

  // ---- geometry shared by scenes ------------------------------------------
  const FX0 = 320, FX1 = 960, FY = 560;          // floor
  function sagAt(t) {                             // baseline only: controlled elastic
    const tau = t - 2.02; if (tau < 0) return 0;
    return 26 * Math.exp(-5.2 * tau) * Math.cos(13 * tau) * (1 - seg(t, 4.6, 5.4));
  }
  function slabH(t) { return m.wCap * lerp(1, 0.24, inOut(seg(t, 4.7, 5.9))); }

  function pillars(t) {
    const h = m.pH, L = m.pL, yS = FY - m.wCap * 0.24;
    const xIL = 640 - 175, xIR = 640 + 175;      // inner feet
    const aMax = Math.asin((xIR - xIL) / (2 * L)) * 0.93;  // leave a hairline at the apex
    const a = aMax * spring(t, 8.15, 9);
    return { h, L, yS, xIL, xIR, a };
  }

  function draw(t) {
    g.setTransform(k, 0, 0, k, 0, 0);
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H);

    // camera: pull back to reveal the whole house
    const pb = inOut(seg(t, 13.0, 14.6));
    const s = lerp(1, 0.6, pb), ty = lerp(0, -150, pb);
    g.save();
    g.translate(640, 400 + ty); g.scale(s, s); g.translate(-640, -400);

    // floor rule (draws in, sags under the load)
    const pr = outExpo(seg(t, 0.35, 1.25)), sag = sagAt(t);
    if (pr > 0) {
      g.strokeStyle = C.hair; g.lineWidth = 1.5 / s;
      g.beginPath(); g.moveTo(FX0, FY);
      const x1 = lerp(FX0, FX1, pr);
      g.quadraticCurveTo((FX0 + x1) / 2, FY + 2 * sag * pr, x1, FY); g.stroke();
    }

    // WEIGHT: drops, lands, is pressed flat into a floor slab
    const drop = spring(t, 1.35, 11);
    if (t > 1.35) {
      const sy = slabH(t) / m.wCap;
      const y = lerp(-80, FY + sag, drop);
      g.save(); g.translate(FX0, y); g.scale(1, sy);
      g.font = `${m.wSize}px ${F.grot}`; g.fillStyle = C.ink; g.fillText('WEIGHT', 0, 0);
      g.restore();
    }

    // pillars THIS / THAT rise through the slab, then lean until they meet
    let P = null;
    if (t > 6.75) {
      P = pillars(t);
      const rise = outExpo(seg(t, 6.8, 7.7)), riseR = outExpo(seg(t, 7.0, 7.9));
      const pill = (word, xi, sign, r) => {
        g.save(); g.translate(xi, P.yS); g.rotate(sign * P.a);
        g.beginPath(); g.rect(-P.h * 2, -P.L - 40, P.h * 4, P.L + 40); g.clip();
        g.translate(0, P.L * (1 - r));
        g.font = `${m.pSize}px ${F.grot}`; g.fillStyle = C.ink;
        if (sign > 0) { g.rotate(-Math.PI / 2); g.fillText(word, 0, 0); }          // reads up, tops face out-left
        else { g.translate(0, -P.L); g.rotate(Math.PI / 2); g.fillText(word, 0, 0); } // reads down, tops face out-right
        g.restore();
      };
      pill('THIS', P.xIL, 1, rise);
      pill('THAT', P.xIR, -1, riseR);
    }

    // the gap between them: outline draws, then "room." settles inside
    if (P && t > 10.4) {
      const ap = { x: P.xIL + P.L * Math.sin(P.a), y: P.yS - P.L * Math.cos(P.a) };
      const pts = [[P.xIL, P.yS], [ap.x, ap.y], [P.xIR, P.yS]];
      const per = Math.hypot(ap.x - P.xIL, ap.y - P.yS) * 2;
      const dp = outExpo(seg(t, 10.5, 11.6));
      g.save(); g.strokeStyle = C.accent; g.lineWidth = 2 / Math.max(s, .7); g.lineJoin = 'miter';
      g.setLineDash([per * dp, per]); g.inset = 0;
      // inset the triangle so the line sits inside the gap, off the letterforms
      const cxT = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cyT = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
      const ins = pts.map(([x, y]) => [lerp(x, cxT, 0.12), lerp(y, cyT, 0.12)]);
      g.beginPath(); g.moveTo(ins[0][0], ins[0][1]); g.lineTo(ins[1][0], ins[1][1]); g.lineTo(ins[2][0], ins[2][1]); g.stroke();
      g.restore();
      const rp = spring(t, 11.85, 12);
      if (rp > 0.001) {
        g.save();
        g.beginPath(); g.moveTo(ins[0][0], ins[0][1]); g.lineTo(ins[1][0], ins[1][1]); g.lineTo(ins[2][0], ins[2][1]); g.closePath(); g.clip();
        g.font = `84px ${F.serifI}`; g.fillStyle = C.accent; g.textAlign = 'center';
        g.fillText('room.', 640, P.yS - 26 + (1 - rp) * 90);
        g.restore();
      }
    }
    g.restore();   // camera

    // ---- captions (screen space) ----
    // 1. Every word is a — (WEIGHT is the last word)
    words(['Every', 'word', 'is', 'a'], FX0, 260, F.serif, 52, C.ink, t, 0.15, 0.2, 3.6);
    // 2. Set it down with care.
    words(['Set', 'it', 'down', 'with', 'care.'], FX0, 640, F.serif, 40, C.ink, t, 3.8, 0.16, 6.4);
    // 3. Lean this one on that,
    words(['Lean', { t: 'this', f: F.serifI, c: C.ink }, 'one', 'on', { t: 'that,', f: F.serifI, c: C.ink }], FX0, 200, F.serif, 52, C.ink, t, 6.85, 0.2, 10.0);
    // 4. and the gap between them becomes a —  (room. lands inside the gap)
    words(['and', 'the', 'gap', 'between', 'them', 'becomes', 'a'], FX0, 640, F.serif, 40, C.ink, t, 10.3, 0.14, 12.9);
    // 5. A sentence is a house / you can enter.
    const l5 = ['A', 'sentence', 'is', 'a', 'house'], l6 = [{ t: 'you', f: F.serifI, c: C.ink }, { t: 'can', f: F.serifI, c: C.ink }, { t: 'enter.', f: F.serifI, c: C.accent }];
    words(l5, 640 - width(l5, F.serif, 68) / 2, 520, F.serif, 68, C.ink, t, 14.0, 0.14, null);
    words(l6, 640 - width(l6, F.serif, 68) / 2, 596, F.serif, 68, C.ink, t, 14.75, 0.16, null);

    // ---- chrome ----
    const cueN = t < 3.6 ? 1 : t < 6.6 ? 2 : t < 10.2 ? 3 : t < 13 ? 4 : 5;
    const names = ['', 'LOAD', 'SET', 'LEAN', 'GAP', 'ENTER'];
    mono('NO. 02 — ON BUILDING A SENTENCE', 56, 58);
    mono(`${String(cueN).padStart(2, '0')} / 05   ${names[cueN]}`, W - 56, 58, C.ink, 'right');
    // a hairline progress mark, editorial running-head style
    g.fillStyle = 'rgba(21,19,15,.12)'; g.fillRect(56, 72, W - 112, 1);
    g.fillStyle = C.ink; g.fillRect(56, 72, (W - 112) * (t / D), 1);
    mono('SET IN INSTRUMENT SERIF & ARCHIVO BLACK', 56, H - 44, C.muted, 'left', 1 - 0.0 * t);
    mono('LAB STUDY · 2026', W - 56, H - 44, C.muted, 'right');

    // paper grain on top (multiply)
    if (grain) { g.save(); g.globalAlpha = 0.10; g.globalCompositeOperation = 'multiply'; g.drawImage(grain, 0, 0, W, H); g.restore(); }
  }

  function create(frame, scale) {
    k = scale; cv = document.createElement('canvas');
    cv.width = W * k; cv.height = H * k; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    frame.appendChild(cv); g = cv.getContext('2d');
    const css = `@font-face{font-family:Disp;src:url(fonts/InstrumentSerif-Regular.ttf)}@font-face{font-family:DispI;src:url(fonts/InstrumentSerif-Italic.ttf)}@font-face{font-family:Grot;src:url(fonts/ArchivoBlack-Regular.ttf)}@font-face{font-family:Mono;src:url(fonts/IBMPlexMono-Regular.ttf)}`;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const img = new Image(); img.src = 'grain.png';
    const ready = Promise.all([
      ...['40px Disp', '40px DispI', '40px Grot', '12px Mono'].map(f => document.fonts.load(f)),
      new Promise(r => { img.onload = r; img.onerror = r; })
    ]).then(() => { grain = img.complete && img.naturalWidth ? img : null; measure(); });
    let cur = 0;
    return {
      W, H, DURATION: D, STILL: 17.5, cues, canvas: cv, ready,
      seek(t) { cur = t; draw(t); },
      sceneAt(t) { let n = scenes[0][1]; for (const [a, s] of scenes) if (t >= a) n = s; return n; },
      hash() { const d = g.getImageData(0, 0, cv.width, cv.height).data; let h = 2166136261; for (let i = 0; i < d.length; i += 7) { h ^= d[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
    };
  }
  window.Reel = { create, meta: { title: 'Editorial kinetic type', sub: 'type as architecture · 18 s', bg: C.paper, ink: C.ink, accent: C.accent, muted: C.muted } };
})();
