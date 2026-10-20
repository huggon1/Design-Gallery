/**
 * gsap-framecheck-cards v2 — enriched Baseline B (M3)
 * Parallel card lanes + denser Tideline quiet-publish cascade.
 * Outer experiment only.
 */
(function (global) {
  const W = 1280, H = 720, DURATION = 24, BEAT = 0.5, BPM = 120;
  const PAPER = '#EFE8D8', INK = '#1C211D', GREEN = '#1F3D2F', OCHRE = '#B9832A', MUTED = '#6F6B5E';

  /** fleyta88-inspired timing gates (adapted). */
  const TIMING = {
    cardEnter: 0.28,
    titleEnter: 0.22,
    metaEnter: 0.16,
    stagger: 0.06,
    press: 0.18,
    ring: 1.15,
    check: 0.4,
    metric: 1.35,
    tabSlide: 0.38,
    endReveal: 0.55,
    laneSlide: 0.42,
    toast: 0.35,
  };

  function fmtMetric(n) { return Math.round(n).toLocaleString('en-US'); }
  function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1); }

  function create(host) {
    host.innerHTML = '';
    const stage = document.createElement('div');
    stage.className = 'reel-stage';
    stage.setAttribute('role', 'img');
    stage.setAttribute('aria-label', 'Tideline quiet publish — GSAP card cascade');
    Object.assign(stage.style, {
      position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px',
      transformOrigin: '0 0', background: PAPER, overflow: 'hidden',
      fontFamily: '"Reel Geist", system-ui, sans-serif', color: INK,
    });

    const grain = document.createElement('div');
    Object.assign(grain.style, {
      position: 'absolute', inset: '0', pointerEvents: 'none', opacity: '0.2',
      backgroundImage: 'url(grain.png)', backgroundSize: '280px', mixBlendMode: 'multiply',
    });
    stage.appendChild(grain);

    const wash = document.createElement('div');
    Object.assign(wash.style, {
      position: 'absolute', width: '560px', height: '560px', borderRadius: '50%',
      left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
      background: 'radial-gradient(circle, rgba(31,61,47,.10), transparent 68%)',
      pointerEvents: 'none',
    });
    stage.appendChild(wash);

    injectStyles(stage);

    // --- Board: groups hierarchy so the stage isn't empty paper ---
    const board = el('div', 'board', '');
    stage.appendChild(board);

    const rail = el('div', 'rail', '');
    const steps = ['Deploy', 'Live', 'Inspect', 'Ship'].map((label, i) => {
      const s = el('div', 'step' + (i === 0 ? ' is-on' : ''), '');
      s.dataset.i = String(i);
      s.append(el('span', 'step-dot', ''), el('span', 'step-label', label));
      return s;
    });
    rail.append(...steps);
    board.appendChild(rail);

    const body = el('div', 'board-body', '');
    const lane = el('div', 'lane', '');
    const focus = el('div', 'focus', '');
    const focusShell = el('div', 'focus-shell', '');
    focusShell.append(
      el('div', 'shell-eyebrow', 'NOW'),
      el('div', 'shell-title', 'Quiet publish'),
      el('div', 'shell-meta', 'Focal card docks here · cascade left · context right')
    );
    focus.appendChild(focusShell);
    const sats = el('div', 'sats', '');
    body.append(lane, focus, sats);
    board.appendChild(body);
    const leftcol = board; // fold target alias for end tween

    // ===== Focus cards =====
    // Card A — Publish
    const cardA = makeCard('card-a focus-card');
    const aEyebrow = el('div', 'eyebrow', 'DEPLOY');
    const aTitle = el('div', 'title', 'Tideline 2.4');
    const aMeta = el('div', 'meta', 'Ship quietly · no ceremony');
    const ctaWrap = el('div', 'cta-wrap', '');
    const cta = el('button', 'cta', 'Publish');
    cta.type = 'button';
    const ringSvg = svgRing();
    const checkSvg = svgCheck();
    ctaWrap.append(cta, ringSvg, checkSvg);
    const aFoot = el('div', 'foot-row', '');
    aFoot.append(
      chip('branch', 'main'),
      chip('hash', 'a6c2f83'),
      chip('who', 'you')
    );
    const aList = el('div', 'dense-list', '');
    [['Checks', '12 passing'], ['Migrates', 'none pending'], ['Reviewers', 'optional']].forEach(([k, v]) => {
      const row = el('div', 'dense-row', '');
      row.append(el('span', 'dense-k', k), el('span', 'dense-v', v));
      aList.appendChild(row);
    });
    cardA.append(aEyebrow, aTitle, aMeta, ctaWrap, aFoot, aList);
    focus.appendChild(cardA);

    // Card B — Live metric
    const cardB = makeCard('card-b focus-card');
    const bEyebrow = el('div', 'eyebrow', 'LIVE');
    const metricRow = el('div', 'metric-row', '');
    const num = el('span', 'num', '0');
    const unit = el('span', 'unit', 'req/s');
    metricRow.append(num, unit);
    const bMeta = el('div', 'meta', 'p50 latency steady · no alert');
    const spark = el('div', 'spark', '');
    const sparkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sparkSvg.setAttribute('viewBox', '0 0 200 36');
    sparkSvg.setAttribute('class', 'spark-svg');
    const sparkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sparkPath.setAttribute('d', 'M2 28 C 20 26, 30 22, 45 18 S 70 8, 90 14 120 30, 140 20 170 6, 198 10');
    sparkPath.setAttribute('fill', 'none');
    sparkPath.setAttribute('stroke', OCHRE);
    sparkPath.setAttribute('stroke-width', '2.5');
    sparkPath.setAttribute('stroke-linecap', 'round');
    sparkPath.setAttribute('stroke-dasharray', '280');
    sparkPath.setAttribute('stroke-dashoffset', '280');
    sparkPath.classList.add('spark-line');
    sparkSvg.appendChild(sparkPath);
    spark.appendChild(sparkSvg);
    const bStats = el('div', 'inline-stats', '');
    bStats.append(
      (() => { const x = el('div', 'inline-stat', ''); x.append(el('b', '', '0.0%'), el('span', '', 'error')); return x; })(),
      (() => { const x = el('div', 'inline-stat', ''); x.append(el('b', '', '3'), el('span', '', 'regions')); return x; })(),
      (() => { const x = el('div', 'inline-stat', ''); x.append(el('b', '', 'warm'), el('span', '', 'cache')); return x; })()
    );
    const bSpacer = el('div', 'card-grow', '');
    cardB.append(bEyebrow, metricRow, spark, bStats, bSpacer, bMeta);
    focus.appendChild(cardB);

    // Card C — Tabs / inspect
    const cardC = makeCard('card-c focus-card');
    const cEyebrow = el('div', 'eyebrow', 'INSPECT');
    const tabBar = el('div', 'tab-bar', '');
    const indicator = el('div', 'tab-indicator', '');
    const tabs = ['Overview', 'Traffic', 'Logs'].map((label, i) => {
      const t = el('button', 'tab' + (i === 0 ? ' is-active' : ''), label);
      t.type = 'button'; t.dataset.i = String(i); return t;
    });
    tabBar.append(indicator, ...tabs);
    const cBody = el('div', 'tab-body', '');
    const cMeta = el('div', 'meta tab-meta', 'Overview · health green');
    const cBars = el('div', 'mini-bars', '');
    for (let i = 0; i < 5; i++) {
      const b = el('div', 'mini-bar', '');
      b.style.setProperty('--h', (35 + i * 12) + '%');
      cBars.appendChild(b);
    }
    const cList = el('div', 'dense-list', '');
    [['Errors', '0 open'], ['Alerts', 'muted'], ['Canaries', 'healthy']].forEach(([k, v]) => {
      const row = el('div', 'dense-row', '');
      row.append(el('span', 'dense-k', k), el('span', 'dense-v', v));
      cList.appendChild(row);
    });
    cBody.append(cMeta, cBars, cList);
    const cSpacer = el('div', 'card-grow', '');
    cardC.append(cEyebrow, tabBar, cBody, cSpacer);
    focus.appendChild(cardC);

    // ===== Lane receipts (compressed completed cards) =====
    const recA = makeReceipt('rec-a', 'Deploy', 'Published · a6c2f83');
    const recB = makeReceipt('rec-b', 'Live', '10,799 req/s');
    const recC = makeReceipt('rec-c', 'Inspect', 'Traffic · clean');
    lane.append(recA, recB, recC);

    // ===== Satellite cards (parallel lane) =====
    const satEnv = makeCard('sat sat-env');
    satEnv.append(
      el('div', 'eyebrow', 'ENV'),
      el('div', 'env-pill staging', 'Staging'),
      el('div', 'meta', 'Promoting…')
    );
    const envPill = satEnv.querySelector('.env-pill');
    const envMeta = satEnv.querySelector('.meta');

    const satStats = makeCard('sat sat-stats');
    const s1 = el('div', 'stat', '');
    s1.append(el('span', 'stat-n n1', '0'), el('span', 'stat-u', 'ms p99'));
    const s2 = el('div', 'stat', '');
    s2.append(el('span', 'stat-n n2', '0.0'), el('span', 'stat-u', 's deploy'));
    satStats.append(el('div', 'eyebrow', 'DUAL'), s1, s2);

    const satLog = makeCard('sat sat-log');
    const logLines = [
      ['14:02', 'build', 'ok'],
      ['14:02', 'migrate', 'skip'],
      ['14:03', 'health', 'pass'],
    ].map(([t, k, v]) => {
      const row = el('div', 'log-row', '');
      row.append(el('span', 'log-t', t), el('span', 'log-k', k), el('span', 'log-v', v));
      return row;
    });
    satLog.append(el('div', 'eyebrow', 'PIPELINE'), ...logLines);
    sats.append(satEnv, satStats, satLog);

    // Toast
    const toast = el('div', 'toast', '');
    toast.append(
      el('span', 'toast-check', '✓'),
      el('span', 'toast-text', 'v2.4 · Production shipped'),
      el('span', 'toast-meta', 'just now')
    );
    stage.appendChild(toast);

    // End lockup
    const end = el('div', 'end', '');
    const rule = el('div', 'end-rule', '');
    const endH = el('div', 'end-h', 'Ship quietly.');
    const endS = el('div', 'end-s', 'Quiet by design · Tideline');
    const endMeta = el('div', 'end-meta', 'four cards · one cascade · no ceremony');
    end.append(rule, endH, endS, endMeta);
    stage.appendChild(end);

    host.appendChild(stage);

    const gsap = global.gsap;
    if (!gsap) throw new Error('GSAP not loaded');

    const metricProxy = { n: 0 };
    const p99Proxy = { n: 0 };
    const depProxy = { n: 0 };
    const ringArc = ringSvg.querySelector('.ring-arc');
    const checkPath = checkSvg.querySelector('.check-path');
    const circ = 2 * Math.PI * 18;
    ringArc.setAttribute('stroke-dasharray', String(circ));

    function layoutTabs() {
      const first = tabs[0].offsetLeft;
      gsap.set(indicator, { x: first, width: tabs[0].offsetWidth });
    }
    layoutTabs();

    // Initial states
    gsap.set(board, { autoAlpha: 1 });
    gsap.set(rail, { autoAlpha: 0, y: -10 });
    gsap.set(focusShell, { autoAlpha: 0.55 });
    gsap.set(steps, { autoAlpha: 0.35 });
    gsap.set(steps[0], { autoAlpha: 1 });
    gsap.set([cardA, cardB, cardC], { autoAlpha: 0, y: 32, scale: 0.96 });
    gsap.set([aEyebrow, aTitle, aMeta, ctaWrap, aFoot], { autoAlpha: 0, y: 12 });
    gsap.set([bEyebrow, metricRow, spark, bMeta], { autoAlpha: 0, y: 10 });
    gsap.set([cEyebrow, tabBar, cBody], { autoAlpha: 0, y: 10 });
    gsap.set([recA, recB, recC], { autoAlpha: 0, x: -20, scale: 0.96 });
    gsap.set([satEnv, satStats, satLog], { autoAlpha: 0, x: 24, y: 8 });
    gsap.set(logLines, { autoAlpha: 0, x: 8 });
    gsap.set(ringSvg, { autoAlpha: 0, scale: 0.6 });
    gsap.set(checkSvg, { autoAlpha: 0, scale: 0.6 });
    gsap.set(cta, { autoAlpha: 1, scale: 1 });
    gsap.set(toast, { autoAlpha: 0, y: 20, scale: 0.96, xPercent: -50 });
    gsap.set(end, { autoAlpha: 0, xPercent: -50, yPercent: -50 });
    gsap.set(rule, { scaleX: 0, transformOrigin: '50% 50%' });
    gsap.set([endH, endS, endMeta], { autoAlpha: 0, y: 14 });
    gsap.set(focus, { autoAlpha: 1, y: 0 });
    gsap.set(lane, { autoAlpha: 1 });
    gsap.set(sats, { autoAlpha: 1 });
    gsap.set(miniBarsHeights(cBars), {});

    function setStep(i) {
      steps.forEach((s, j) => {
        s.classList.toggle('is-on', j === i);
        s.classList.toggle('is-done', j < i);
      });
    }

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });

    // ========== ACT 1 — Rail + Publish card (0–4.2) ==========
    const t0 = 0.12;
    tl.to(rail, { autoAlpha: 1, y: 0, duration: TIMING.cardEnter }, t0);
    tl.to(cardA, { autoAlpha: 1, y: 0, scale: 1, duration: TIMING.cardEnter, ease: 'power3.out' }, t0 + 0.08);
    tl.to(aEyebrow, { autoAlpha: 1, y: 0, duration: TIMING.metaEnter }, t0 + 0.08 + TIMING.stagger * 0);
    tl.to(aTitle, { autoAlpha: 1, y: 0, duration: TIMING.titleEnter }, t0 + 0.08 + TIMING.stagger * 1);
    tl.to(aMeta, { autoAlpha: 1, y: 0, duration: TIMING.metaEnter }, t0 + 0.08 + TIMING.stagger * 2);
    tl.to(ctaWrap, { autoAlpha: 1, y: 0, duration: TIMING.cardEnter }, t0 + 0.08 + TIMING.stagger * 3);
    tl.to(aFoot, { autoAlpha: 1, y: 0, duration: TIMING.metaEnter }, t0 + 0.08 + TIMING.stagger * 4);

    // Press
    const tPress = 2.0;
    tl.to(cta, { scale: 0.92, duration: TIMING.press * 0.45, ease: 'power2.in' }, tPress);
    tl.to(cta, { scale: 0, autoAlpha: 0, duration: TIMING.press * 0.55, ease: 'power2.in' }, tPress + TIMING.press * 0.45);
    tl.to(ringSvg, { autoAlpha: 1, scale: 1, duration: 0.26, ease: 'back.out(1.6)' }, tPress + TIMING.press * 0.5);

    const tRing = tPress + TIMING.press + 0.04;
    tl.to(ringArc, { attr: { 'stroke-dashoffset': circ * (1 - 0.62) }, duration: TIMING.ring * 0.55, ease: 'power1.inOut' }, tRing);
    tl.to(ringArc, { attr: { 'stroke-dashoffset': 0 }, duration: TIMING.ring * 0.45, ease: 'power2.out' }, tRing + TIMING.ring * 0.55);

    const tCheck = tRing + TIMING.ring;
    tl.to(ringSvg, { autoAlpha: 0, scale: 0.8, duration: 0.16 }, tCheck);
    tl.to(checkSvg, { autoAlpha: 1, scale: 1, duration: 0.26, ease: 'back.out(1.7)' }, tCheck);
    tl.to(checkPath, { attr: { 'stroke-dashoffset': 0 }, duration: TIMING.check, ease: 'power2.out' }, tCheck + 0.04);
    tl.call(() => setStep(1), null, tCheck + 0.2);

    // ========== ACT 2 — Cascade: A → lane receipt, B focus + sats (4.4–9.5) ==========
    const tCascade1 = tCheck + TIMING.check + 0.2; // ~4.4
    // Card A shrinks out of focus; receipt appears in lane
    tl.to(cardA, { autoAlpha: 0, y: -40, scale: 0.9, duration: TIMING.laneSlide, ease: 'power2.in' }, tCascade1);
    tl.to(focusShell, { autoAlpha: 0.4, duration: TIMING.laneSlide }, tCascade1);
    tl.to(recA, { autoAlpha: 1, x: 0, scale: 1, duration: TIMING.cardEnter, ease: 'power3.out' }, tCascade1 + 0.12);

    // Card B enters focus
    tl.to(cardB, { autoAlpha: 1, y: 0, scale: 1, duration: TIMING.cardEnter, ease: 'power3.out' }, tCascade1 + 0.18);
    tl.to(bEyebrow, { autoAlpha: 1, y: 0, duration: TIMING.metaEnter }, tCascade1 + 0.18 + TIMING.stagger);
    tl.to(metricRow, { autoAlpha: 1, y: 0, duration: TIMING.titleEnter }, tCascade1 + 0.18 + TIMING.stagger * 2);
    tl.to(spark, { autoAlpha: 1, y: 0, duration: TIMING.metaEnter }, tCascade1 + 0.18 + TIMING.stagger * 3);
    tl.to(bMeta, { autoAlpha: 1, y: 0, duration: TIMING.metaEnter }, tCascade1 + 0.18 + TIMING.stagger * 4);
    tl.to(metricProxy, {
      n: 10799, duration: TIMING.metric, ease: 'power2.out',
      onUpdate: () => { num.textContent = fmtMetric(metricProxy.n); },
    }, tCascade1 + 0.18 + TIMING.stagger * 2);
    tl.to(sparkPath, { attr: { 'stroke-dashoffset': 0 }, duration: 1.1, ease: 'power1.out' }, tCascade1 + 0.4);

    // Parallel satellites: env + dual stats
    const tSat = tCascade1 + 0.55;
    tl.to(satEnv, { autoAlpha: 1, x: 0, y: 0, duration: TIMING.cardEnter, ease: 'power3.out' }, tSat);
    tl.to(satStats, { autoAlpha: 1, x: 0, y: 0, duration: TIMING.cardEnter, ease: 'power3.out' }, tSat + TIMING.stagger * 2);
    tl.to(p99Proxy, {
      n: 42, duration: 1.0, ease: 'power2.out',
      onUpdate: () => { satStats.querySelector('.n1').textContent = String(Math.round(p99Proxy.n)); },
    }, tSat + TIMING.stagger * 2);
    tl.to(depProxy, {
      n: 1.8, duration: 1.0, ease: 'power2.out',
      onUpdate: () => { satStats.querySelector('.n2').textContent = fmt1(depProxy.n); },
    }, tSat + TIMING.stagger * 2 + 0.08);

    // Env Staging → Production (parallel with metric hold)
    const tEnv = tCascade1 + 2.0;
    tl.to(envPill, {
      duration: 0.55, ease: 'power2.inOut',
      onStart: () => {},
      onUpdate: function () {},
    }, tEnv);
    tl.call(() => {
      envPill.textContent = 'Production';
      envPill.classList.remove('staging');
      envPill.classList.add('production');
      envMeta.textContent = 'Live · quiet';
    }, null, tEnv + 0.25);
    tl.fromTo(envPill, { scale: 1 }, { scale: 1.04, duration: 0.2, yoyo: true, repeat: 1, ease: 'power1.inOut' }, tEnv + 0.2);

    // ========== ACT 3 — B → lane, C focus + pipeline log (9.2–15.5) ==========
    const tCascade2 = 9.2;
    tl.to(cardB, { autoAlpha: 0, y: -36, scale: 0.9, duration: TIMING.laneSlide, ease: 'power2.in' }, tCascade2);
    tl.to(recB, { autoAlpha: 1, x: 0, scale: 1, duration: TIMING.cardEnter, ease: 'power3.out' }, tCascade2 + 0.1);
    tl.call(() => {
      recB.querySelector('.rec-sub').textContent = '10,799 req/s';
      setStep(2);
    }, null, tCascade2 + 0.1);

    tl.to(cardC, { autoAlpha: 1, y: 0, scale: 1, duration: TIMING.cardEnter, ease: 'power3.out' }, tCascade2 + 0.16);
    tl.to(cEyebrow, { autoAlpha: 1, y: 0, duration: TIMING.metaEnter }, tCascade2 + 0.16 + TIMING.stagger);
    tl.to(tabBar, { autoAlpha: 1, y: 0, duration: TIMING.titleEnter }, tCascade2 + 0.16 + TIMING.stagger * 2);
    tl.to(cBody, { autoAlpha: 1, y: 0, duration: TIMING.metaEnter }, tCascade2 + 0.16 + TIMING.stagger * 3);
    tl.to(cBars.querySelectorAll('.mini-bar'), {
      scaleY: 1, duration: 0.55, stagger: 0.05, ease: 'power2.out', transformOrigin: '50% 100%',
    }, tCascade2 + 0.5);

    // Pipeline log satellite
    tl.to(satLog, { autoAlpha: 1, x: 0, y: 0, duration: TIMING.cardEnter, ease: 'power3.out' }, tCascade2 + 0.35);
    tl.to(logLines, { autoAlpha: 1, x: 0, duration: TIMING.metaEnter, stagger: TIMING.stagger, ease: 'power2.out' }, tCascade2 + 0.5);

    // Tab hops
    function goTab(i, at, label) {
      const tab = tabs[i];
      tl.to(indicator, { x: tab.offsetLeft, duration: TIMING.tabSlide * 0.85, ease: 'power3.out' }, at);
      tl.to(indicator, { width: tab.offsetWidth, duration: TIMING.tabSlide, ease: 'power2.inOut' }, at);
      tl.call(() => {
        tabs.forEach((t, j) => t.classList.toggle('is-active', j === i));
        cMeta.textContent = label;
      }, null, at + TIMING.tabSlide * 0.45);
    }
    // Must layout after card visible — defer first hop slightly
    const tTabs = tCascade2 + 1.1;
    tl.call(() => layoutTabs(), null, tTabs - 0.05);
    goTab(1, tTabs, 'Traffic · last 15 minutes');
    goTab(2, tTabs + 0.9, 'Logs · no errors');
    goTab(0, tTabs + 1.8, 'Overview · health green');

    // ========== ACT 4 — C → lane, toast, collapse to end (15.8–24) ==========
    const tCascade3 = 15.8;
    tl.to(cardC, { autoAlpha: 0, y: -30, scale: 0.9, duration: TIMING.laneSlide, ease: 'power2.in' }, tCascade3);
    tl.to(focusShell, { autoAlpha: 0.85, duration: 0.35 }, tCascade3 + 0.15);
    // Update shell copy for toast beat (no new motion path)
    tl.call(() => {
      focusShell.querySelector('.shell-eyebrow').textContent = 'SHIPPED';
      focusShell.querySelector('.shell-title').textContent = 'Cascade complete';
      focusShell.querySelector('.shell-meta').textContent = 'Deploy · Live · Inspect · receipts on the left';
    }, null, tCascade3 + 0.2);
    tl.to(recC, { autoAlpha: 1, x: 0, scale: 1, duration: TIMING.cardEnter, ease: 'power3.out' }, tCascade3 + 0.1);
    tl.call(() => setStep(3), null, tCascade3 + 0.15);

    // Toast over the completed lane
    const tToast = tCascade3 + 0.55;
    tl.to(toast, { autoAlpha: 1, y: 0, scale: 1, duration: TIMING.toast, ease: 'power3.out' }, tToast);
    tl.to(toast, { autoAlpha: 1, duration: 1.4 }, tToast + TIMING.toast);
    tl.to(toast, { autoAlpha: 0, y: -12, duration: 0.35, ease: 'power2.in' }, tToast + 1.75);

    // Fold everything → editorial
    const tEnd = 18.6;
    tl.to(board, { autoAlpha: 0, y: -14, duration: 0.55, ease: 'power2.in' }, tEnd);
    tl.to(end, { autoAlpha: 1, duration: 0.2 }, tEnd + 0.4);
    tl.to(rule, { scaleX: 1, duration: 0.42, ease: 'power2.out' }, tEnd + 0.45);
    tl.to(endH, { autoAlpha: 1, y: 0, duration: TIMING.endReveal, ease: 'power3.out' }, tEnd + 0.6);
    tl.to(endS, { autoAlpha: 1, y: 0, duration: TIMING.metaEnter }, tEnd + 0.6 + TIMING.stagger * 2);
    tl.to(endMeta, { autoAlpha: 1, y: 0, duration: TIMING.metaEnter }, tEnd + 0.6 + TIMING.stagger * 4);
    tl.to({}, { duration: 0.01 }, DURATION);
    if (tl.duration() < DURATION) tl.set({}, {}, DURATION);

    const sceneAt = (t) => {
      if (t < 2.0) return 'rail + publish card';
      if (t < tCheck) return 'progress ring';
      if (t < tCascade1) return 'check';
      if (t < tCascade2) return 'metric + satellites';
      if (t < tCascade3) return 'tabs + pipeline';
      if (t < tEnd) return 'receipts + toast';
      return 'Ship quietly.';
    };

    function seek(t) {
      const clamped = Math.max(0, Math.min(DURATION, t));
      // suppressEvents=true: side effects are reconstructed below (callbacks don't undo on reverse seek)
      tl.seek(clamped, true);
      tl.pause();
      num.textContent = fmtMetric(metricProxy.n);
      satStats.querySelector('.n1').textContent = String(Math.round(p99Proxy.n));
      satStats.querySelector('.n2').textContent = fmt1(depProxy.n);

      if (clamped >= tCascade3 + 0.15) setStep(3);
      else if (clamped >= tCascade2 + 0.1) setStep(2);
      else if (clamped >= tCheck + 0.2) setStep(1);
      else setStep(0);

      if (clamped >= tEnv + 0.25) {
        envPill.textContent = 'Production';
        envPill.classList.remove('staging');
        envPill.classList.add('production');
        envMeta.textContent = 'Live · quiet';
      } else {
        envPill.textContent = 'Staging';
        envPill.classList.add('staging');
        envPill.classList.remove('production');
        envMeta.textContent = 'Promoting…';
      }

      if (clamped >= tCascade3 + 0.2) {
        focusShell.querySelector('.shell-eyebrow').textContent = 'SHIPPED';
        focusShell.querySelector('.shell-title').textContent = 'Cascade complete';
        focusShell.querySelector('.shell-meta').textContent = 'Deploy · Live · Inspect · receipts on the left';
      } else {
        focusShell.querySelector('.shell-eyebrow').textContent = 'NOW';
        focusShell.querySelector('.shell-title').textContent = 'Quiet publish';
        focusShell.querySelector('.shell-meta').textContent = 'Focal card docks here · cascade left · context right';
      }

      // Tab active + indicator from playhead (mirrors goTab schedule)
      let tabI = 0;
      let tabLabel = 'Overview · health green';
      if (clamped >= tTabs + 1.8 + TIMING.tabSlide * 0.45) {
        tabI = 0; tabLabel = 'Overview · health green';
      } else if (clamped >= tTabs + 0.9 + TIMING.tabSlide * 0.45) {
        tabI = 2; tabLabel = 'Logs · no errors';
      } else if (clamped >= tTabs + TIMING.tabSlide * 0.45) {
        tabI = 1; tabLabel = 'Traffic · last 15 minutes';
      }
      tabs.forEach((tb, j) => tb.classList.toggle('is-active', j === tabI));
      cMeta.textContent = tabLabel;
      const at = tabs[tabI];
      gsap.set(indicator, { x: at.offsetLeft, width: at.offsetWidth });

      api.t = clamped;
      return clamped;
    }

    const api = {
      W, H, D: DURATION, DURATION, BEAT, BPM, TIMING,
      stage, tl, seek, sceneAt,
      t: 0, playing: false,
      els: {
        cardA, cardB, cardC, cta, num, unit, indicator, tabs, end, toast,
        board, focusShell, rail, lane, sats, recA, recB, recC, satEnv, satStats, satLog,
        checkSvg, ringSvg, envPill,
      },
    };

    const ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    ready.then(() => {
      layoutTabs();
      // mini-bars start scaled down
      gsap.set(cBars.querySelectorAll('.mini-bar'), { scaleY: 0.15, transformOrigin: '50% 100%' });
      seek(0);
      document.body.dataset.ready = '1';
      stage.dataset.ready = '1';
    });

    global.reel = api;
    return api;
  }

  function miniBarsHeights() { return {}; }

  function makeCard(cls) {
    const c = document.createElement('div');
    c.className = 'card ' + cls;
    return c;
  }

  function makeReceipt(cls, title, sub) {
    const r = el('div', 'receipt ' + cls, '');
    r.append(el('div', 'rec-title', title), el('div', 'rec-sub', sub));
    return r;
  }

  function chip(cls, text) {
    const c = el('span', 'chip ' + cls, text);
    return c;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function svgRing() {
    const ringSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ringSvg.setAttribute('viewBox', '0 0 44 44');
    ringSvg.classList.add('ring');
    ringSvg.innerHTML = '<circle class="ring-track" cx="22" cy="22" r="18" fill="none" stroke="rgba(28,33,29,.12)" stroke-width="3"/><circle class="ring-arc" cx="22" cy="22" r="18" fill="none" stroke="' + OCHRE + '" stroke-width="3" stroke-linecap="round" stroke-dasharray="113.1" stroke-dashoffset="113.1" transform="rotate(-90 22 22)"/>';
    return ringSvg;
  }

  function svgCheck() {
    const checkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    checkSvg.setAttribute('viewBox', '0 0 44 44');
    checkSvg.classList.add('check');
    checkSvg.innerHTML = '<circle cx="22" cy="22" r="18" fill="' + GREEN + '"/><path class="check-path" d="M13 22.5l6 6 12-13" fill="none" stroke="#F9F5EC" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="40" stroke-dashoffset="40"/>';
    return checkSvg;
  }

  function injectStyles(stage) {
    const s = document.createElement('style');
    s.textContent = `
      .reel-stage .board{
        position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
        width:1140px; height:620px;
        background:rgba(247,241,227,.72);
        border:1px solid rgba(28,33,29,.10);
        border-radius:22px;
        box-shadow:0 28px 60px -40px rgba(31,61,47,.55), 0 1px 0 rgba(255,255,255,.65) inset;
        padding:18px 20px 20px; box-sizing:border-box;
        display:flex; flex-direction:column; gap:14px;
      }
      .reel-stage .rail{
        display:flex; flex-direction:row; align-items:center; gap:4px;
        width:100%; padding:6px; background:rgba(28,33,29,.045);
        border-radius:12px; flex-shrink:0;
      }
      .reel-stage .step{
        flex:1; display:flex; align-items:center; justify-content:center; gap:8px;
        font-size:13px; font-weight:500; color:${MUTED};
        padding:8px 6px; border-radius:9px;
      }
      .reel-stage .step.is-on{
        color:${GREEN}; font-weight:600; background:#F9F5EC;
        box-shadow:0 1px 3px rgba(28,33,29,.08);
      }
      .reel-stage .step.is-done{ color:${GREEN}; }
      .reel-stage .step-dot{
        width:8px; height:8px; border-radius:50%;
        background:rgba(28,33,29,.18); flex-shrink:0; position:relative;
      }
      .reel-stage .step.is-on .step-dot{
        background:${OCHRE}; box-shadow:0 0 0 3px rgba(185,131,42,.25);
      }
      .reel-stage .step.is-done .step-dot{ background:${GREEN}; }
      .reel-stage .step.is-done .step-dot::after{
        content:''; position:absolute; left:1.5px; top:2px;
        width:5px; height:2.5px; border-left:1.5px solid #F9F5EC;
        border-bottom:1.5px solid #F9F5EC; transform:rotate(-45deg);
      }

      .reel-stage .board-body{
        flex:1; display:grid;
        grid-template-columns:176px minmax(0,1fr) 248px;
        gap:12px; min-height:0; align-items:stretch;
      }
      .reel-stage .lane{
        display:flex; flex-direction:column; gap:8px; min-height:0;
      }
      .reel-stage .receipt{
        background:#F9F5EC; border:1px solid rgba(28,33,29,.10);
        border-radius:12px; padding:10px 12px;
        box-shadow:0 6px 14px -12px rgba(31,61,47,.45);
      }
      .reel-stage .rec-title{
        font-size:12px; font-weight:600; color:${GREEN}; letter-spacing:-.01em;
      }
      .reel-stage .rec-sub{
        font-family:"Reel Mono",ui-monospace,monospace; font-size:11px;
        color:${MUTED}; margin-top:2px;
      }

      .reel-stage .focus{
        position:relative; min-width:0; align-self:stretch;
      }
      .reel-stage .focus-shell{
        position:absolute; inset:0; border-radius:18px;
        border:1.5px dashed rgba(28,33,29,.14);
        background:rgba(239,232,216,.55);
        padding:28px 26px; box-sizing:border-box;
        display:flex; flex-direction:column; justify-content:center;
      }
      .reel-stage .shell-eyebrow{
        font-family:"Reel Mono",ui-monospace,monospace; font-size:11px;
        letter-spacing:.14em; color:${MUTED}; margin-bottom:10px;
      }
      .reel-stage .shell-title{
        font-family:"Reel Fraunces",Georgia,serif; font-size:28px; font-weight:560;
        color:rgba(31,61,47,.55); letter-spacing:-.02em;
      }
      .reel-stage .shell-meta{ margin-top:8px; font-size:13px; color:rgba(111,107,94,.85); max-width:34ch; }

      .reel-stage .focus-card{
        position:absolute; inset:0; width:auto; height:auto;
        z-index:2; display:flex; flex-direction:column;
      }

      .reel-stage .sats{
        display:flex; flex-direction:column; gap:8px; min-height:0;
      }
      .reel-stage .sat{ padding:12px 14px; }

      .reel-stage .card{
        background:#F9F5EC; border:1px solid rgba(28,33,29,.10);
        border-radius:16px; padding:18px 20px 16px;
        box-shadow:0 14px 32px -24px rgba(31,61,47,.5), 0 1px 0 rgba(255,255,255,.65) inset;
      }
      .reel-stage .focus-card.card{
        border-top:3px solid ${OCHRE};
        box-shadow:0 22px 48px -28px rgba(31,61,47,.55), 0 1px 0 rgba(255,255,255,.7) inset;
        min-height:0; box-sizing:border-box;
        padding:22px 24px 20px;
      }
      .reel-stage .eyebrow{
        font-family:"Reel Mono",ui-monospace,monospace; font-size:11px; letter-spacing:.14em;
        color:${MUTED}; font-weight:500; margin-bottom:8px;
      }
      .reel-stage .title{
        font-family:"Reel Fraunces",Georgia,serif; font-size:32px; font-weight:560;
        letter-spacing:-.02em; color:${GREEN}; line-height:1.15; margin-bottom:6px;
      }
      .reel-stage .dense-list{ margin-top:auto; border-top:1px solid rgba(28,33,29,.08); padding-top:12px; }
      .reel-stage .dense-row{
        display:flex; justify-content:space-between; gap:12px;
        padding:6px 0; font-size:13px;
        border-bottom:1px solid rgba(28,33,29,.05);
      }
      .reel-stage .dense-row:last-child{ border-bottom:0; }
      .reel-stage .dense-k{ color:${MUTED}; }
      .reel-stage .dense-v{ color:${INK}; font-weight:560; font-variant-numeric:tabular-nums; }
      .reel-stage .inline-stats{
        display:grid; grid-template-columns:repeat(3,1fr); gap:8px;
        margin:8px 0 6px;
      }
      .reel-stage .inline-stat{
        background:rgba(28,33,29,.04); border-radius:10px; padding:8px 10px;
        display:flex; flex-direction:column; gap:2px;
      }
      .reel-stage .inline-stat b{
        font-family:"Reel Mono",ui-monospace,monospace; font-size:15px; color:${INK}; font-weight:560;
      }
      .reel-stage .inline-stat span{ font-size:11px; color:${MUTED}; }
      .reel-stage .card-grow{ flex:1 1 auto; min-height:12px; }
      .reel-stage .meta{ font-size:13px; color:${MUTED}; font-weight:450; margin-top:4px; }
      .reel-stage .cta-wrap{
        margin-top:16px; height:44px; display:flex; align-items:center;
        position:relative;
      }
      .reel-stage .cta{
        font-family:"Reel Geist",system-ui,sans-serif; font-size:15px; font-weight:600;
        background:${GREEN}; color:#F9F5EC; border:0; border-radius:999px;
        padding:0 22px; height:40px; cursor:default; letter-spacing:-.01em;
        box-shadow:0 8px 18px -12px rgba(31,61,47,.7);
      }
      .reel-stage .ring, .reel-stage .check{
        position:absolute; left:0; width:44px; height:44px; pointer-events:none;
      }
      .reel-stage .foot-row{ display:flex; gap:6px; margin-top:14px; flex-wrap:wrap; }
      .reel-stage .chip{
        font-family:"Reel Mono",ui-monospace,monospace; font-size:11px;
        color:${MUTED}; background:rgba(28,33,29,.05); border-radius:6px;
        padding:3px 7px; border:1px solid rgba(28,33,29,.06);
      }

      .reel-stage .metric-row{
        display:flex; align-items:baseline; gap:7.5px;
        font-variant-numeric:tabular-nums; margin-bottom:8px;
      }
      .reel-stage .num{
        font-family:"Reel Mono",ui-monospace,monospace; font-size:36px; font-weight:560; color:${INK};
        letter-spacing:-.03em;
      }
      .reel-stage .unit{
        font-family:"Reel Mono",ui-monospace,monospace; font-size:14px; color:${MUTED}; font-weight:500;
      }
      .reel-stage .spark{ height:36px; margin:4px 0 6px; }
      .reel-stage .spark-svg{ width:100%; height:36px; display:block; }

      .reel-stage .tab-bar{
        position:relative; display:flex; gap:4px; margin:6px 0 12px;
        background:rgba(28,33,29,.05); border-radius:12px; padding:4px; height:44px; align-items:stretch;
      }
      .reel-stage .tab-indicator{
        position:absolute; top:4px; left:0; height:calc(100% - 8px);
        background:#F9F5EC; border-radius:9px;
        box-shadow:0 1px 3px rgba(28,33,29,.10), 0 0 0 1px rgba(28,33,29,.06);
        pointer-events:none;
      }
      .reel-stage .tab{
        position:relative; z-index:1; flex:1; border:0; background:transparent;
        font-family:"Reel Geist",system-ui,sans-serif; font-size:13px; font-weight:500;
        color:${MUTED}; border-radius:9px; cursor:default;
      }
      .reel-stage .tab.is-active{ color:${GREEN}; font-weight:600; }
      .reel-stage .tab-body{ display:flex; flex-direction:column; flex:1; min-height:0; }
      .reel-stage .tab-body .dense-list{ margin-top:auto; }
      .reel-stage .mini-bars{
        display:flex; align-items:flex-end; gap:6px; height:48px; margin-top:10px;
      }
      .reel-stage .mini-bar{
        flex:1; height:100%; border-radius:4px 4px 2px 2px;
        background:linear-gradient(180deg, ${OCHRE}, rgba(185,131,42,.35));
        transform:scaleY(0.15); transform-origin:50% 100%;
        opacity:.85;
      }
      .reel-stage .mini-bar:nth-child(2){ opacity:.7; }
      .reel-stage .mini-bar:nth-child(3){ opacity:.95; }
      .reel-stage .mini-bar:nth-child(4){ opacity:.6; }
      .reel-stage .mini-bar:nth-child(5){ opacity:.8; }

      .reel-stage .env-pill{
        display:inline-flex; align-items:center; font-size:14px; font-weight:600;
        border-radius:999px; padding:6px 12px; margin:4px 0 6px;
        font-family:"Reel Geist",system-ui,sans-serif;
      }
      .reel-stage .env-pill.staging{
        background:rgba(185,131,42,.16); color:${OCHRE};
      }
      .reel-stage .env-pill.production{
        background:rgba(31,61,47,.12); color:${GREEN};
      }
      .reel-stage .stat{ display:flex; align-items:baseline; gap:6px; margin-top:6px; }
      .reel-stage .stat-n{
        font-family:"Reel Mono",ui-monospace,monospace; font-size:22px; font-weight:560; color:${INK};
        font-variant-numeric:tabular-nums;
      }
      .reel-stage .stat-u{ font-size:12px; color:${MUTED}; }

      .reel-stage .log-row{
        display:grid; grid-template-columns:44px 1fr auto; gap:8px;
        font-family:"Reel Mono",ui-monospace,monospace; font-size:11px;
        padding:4px 0; border-bottom:1px solid rgba(28,33,29,.06);
        color:${MUTED};
      }
      .reel-stage .log-row:last-child{ border-bottom:0; }
      .reel-stage .log-k{ color:${INK}; }
      .reel-stage .log-v{ color:${GREEN}; font-weight:600; }

      .reel-stage .toast{
        position:absolute; left:50%; bottom:28px; margin-left:0; z-index:5;
        display:flex; align-items:center; gap:10px;
        background:#F9F5EC; border:1px solid rgba(28,33,29,.12);
        border-radius:14px; padding:12px 16px;
        box-shadow:0 16px 36px -20px rgba(31,61,47,.5);
        white-space:nowrap;
      }
      .reel-stage .toast-check{
        width:22px; height:22px; border-radius:50%; background:${GREEN}; color:#F9F5EC;
        display:grid; place-items:center; font-size:12px; font-weight:700;
      }
      .reel-stage .toast-text{ font-size:14px; font-weight:600; color:${INK}; }
      .reel-stage .toast-meta{ font-size:12px; color:${MUTED}; margin-left:4px; }

      .reel-stage .end{
        position:absolute; left:50%; top:50%;
        text-align:center; width:640px; pointer-events:none;
      }
      .reel-stage .end-rule{
        width:56px; height:3px; background:${OCHRE}; border-radius:2px; margin:0 auto 18px;
      }
      .reel-stage .end-h{
        font-family:"Reel Fraunces",Georgia,serif; font-size:48px; font-weight:560;
        color:${GREEN}; letter-spacing:-.03em; line-height:1.05;
      }
      .reel-stage .end-s{ margin-top:14px; font-size:15px; color:${MUTED}; font-weight:450; }
      .reel-stage .end-meta{
        margin-top:10px; font-family:"Reel Mono",ui-monospace,monospace;
        font-size:11px; letter-spacing:.06em; color:rgba(111,107,94,.85);
      }
    `;
    stage.appendChild(s);
  }

  global.Reel = { create, W, H, DURATION, BEAT, TIMING };
})(typeof window !== 'undefined' ? window : globalThis);
