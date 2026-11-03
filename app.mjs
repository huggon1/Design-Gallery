import {EXHIBITS,exhibitById,sortedExhibits,matchesExhibit,normalize} from './catalog.mjs';
import {resolveRoute,catalogUrl,exhibitUrl} from './routes.mjs';

const main = document.querySelector('#main');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let route, stageCleanup = () => {}, currentKey = '';
const scrolls = new Map();
const legacyNative = new Set(['gsap-framecheck-cards','seek-t-morph-reel','editorial-kinetic-type','three-ink-linework','annotated-3d-cutaway']);
function store(key,value) { try { sessionStorage.setItem('gallery-flat-'+key,String(value)); } catch {} }
function read(key) { try { return sessionStorage.getItem('gallery-flat-'+key); } catch { return null; } }
function rememberScroll() {
  if (currentKey) { scrolls.set(currentKey,scrollY); store('scroll-'+currentKey,scrollY); }
}
function resetAccent() {
  const style = document.documentElement.style;
  style.setProperty('--accent','#edbb95');
  style.setProperty('--glow-a','rgba(170,101,135,.17)');
  style.setProperty('--glow-b','rgba(219,149,95,.07)');
}
function tags(exhibit) {
  return (exhibit.tags ?? []).length ? `<div class="tags" aria-label="标签">${exhibit.tags.map(tag => `<a class="tag" href="${escape(catalogUrl('',tag))}">${escape(tag)}</a>`).join('')}</div>` : '';
}
function card(exhibit,index) {
  return `<article class="work-card" data-exhibit="${escape(exhibit.id)}"><a class="work-card-link" href="${escape(exhibitUrl(exhibit.id,route.url))}"><div class="preview ${exhibit.embedSlug ? '' : 'native-preview'}"><img src="${escape(exhibit.preview)}" alt="${escape(exhibit.title)}预览" width="960" height="613" ${index < 3 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></div><div class="work-card-title"><h2>${escape(exhibit.title)}</h2><span aria-hidden="true">↗</span></div></a>${tags(exhibit)}</article>`;
}
function catalogPage() {
  return `<section aria-labelledby="catalog-title"><div class="collection-heading"><div><div class="eyebrow">THE COLLECTION</div><h1 id="catalog-title">设计方案</h1><p>收集具体的设计方案，随时打开、操作和借用。</p></div><span class="count">${EXHIBITS.length} 件展品</span></div><div class="catalog-toolbar"><div id="result-count" role="status" aria-live="polite"></div><label class="archive-search"><span aria-hidden="true">⌕</span><input id="search" type="search" autocomplete="off" aria-label="搜索展品" placeholder="搜索标题或标签" value="${escape(route.query)}"></label></div><div id="active-filter"></div><div class="work-grid" id="catalog-results"></div><div class="empty-state" id="empty-state" hidden><p>还没有匹配的展品。</p><button class="text-link" id="clear-search" type="button">清空条件</button></div></section>`;
}
function updateResults() {
  const list = sortedExhibits.filter(exhibit => matchesExhibit(exhibit,route.query) && (!route.tag || (exhibit.tags ?? []).some(tag => normalize(tag) === normalize(route.tag))));
  document.querySelector('#catalog-results').innerHTML = list.map(card).join('');
  document.querySelector('#result-count').textContent = route.query || route.tag ? `${list.length} 件匹配展品` : '全部展品 · 最新收录 ↓';
  document.querySelector('#empty-state').hidden = list.length > 0;
  document.querySelector('#active-filter').innerHTML = route.tag ? `<div class="active-filter"><span>标签：${escape(route.tag)}</span><a class="text-link" href="${escape(catalogUrl(route.query))}" aria-label="清除标签筛选">清除 ×</a></div>` : '';
}
function exhibitPage(exhibit) {
  return `<nav class="breadcrumb" aria-label="当前位置"><a id="back-link" href="${escape(route.back)}">← 全部展品</a></nav><section aria-labelledby="work-title"><div class="work-heading"><h1 id="work-title">${escape(exhibit.title)}</h1>${tags(exhibit)}</div><div class="stage-shell" id="stage-shell" aria-busy="true"><div class="stage-status" id="stage-status" role="status"><span class="loading-dot" aria-hidden="true"></span><span id="stage-message">正在打开作品…</span><button id="retry-stage" type="button" hidden>重新载入</button></div><iframe id="exhibit-frame" title="${escape(exhibit.title)}展示台" src="${escape(exhibit.entry)}" referrerpolicy="no-referrer"></iframe></div>${exhibit.description ? `<p class="work-description">${escape(exhibit.description)}</p>` : ''}${exhibit.reference ? `<div class="provenance"><a href="${escape(exhibit.reference.url)}" target="_blank" rel="noreferrer">参考 ${escape(exhibit.reference.title)} ↗</a></div>` : ''}</section>`;
}
function configureStage(exhibit) {
  const frame = document.querySelector('#exhibit-frame'), status = document.querySelector('#stage-status');
  let observer, timer, disposed = false;
  const fail = () => {
    if (disposed) return;
    clearTimeout(timer);
    status.hidden = false;
    document.querySelector('#stage-message').textContent = '展台暂时未能加载，请重新载入。';
    document.querySelector('#retry-stage').hidden = false;
    document.querySelector('#stage-shell').setAttribute('aria-busy','false');
  };
  const onLoad = () => {
    if (disposed) return;
    try {
      const doc = frame.contentDocument;
      if (!doc?.body || doc.title === 'Error response') return fail();
      let content;
      if (exhibit.embedSlug) {
        if (!doc.getElementById(exhibit.embedSlug)?.classList.contains('active')) return fail();
        const style = doc.createElement('style');
        style.textContent = '.reorder-inspector{display:none!important}.reorder-stage-body{grid-template-columns:minmax(0,1fr)!important}';
        doc.head.append(style);
        content = doc.querySelector('#monolith-frame');
      } else {
        if (legacyNative.has(exhibit.id)) {
          if (!doc.querySelector('#frame,#stage')) return fail();
          const style = doc.createElement('style');
          style.textContent = 'main>header,.ban,.note{display:none!important}main{padding:24px!important}';
          doc.head.append(style);
        }
        content = doc.querySelector('main') ?? doc.body;
      }
      if (!content) return fail();
      const fit = () => {
        if (disposed) return;
        const height = Math.ceil(content.getBoundingClientRect().height);
        if (Number.isFinite(height) && height >= 100 && height <= 15000 && frame.style.height !== height+'px') frame.style.height = height+'px';
      };
      observer?.disconnect();
      observer = new ResizeObserver(fit);
      observer.observe(content);
      fit();
      clearTimeout(timer);
      status.hidden = true;
      document.querySelector('#stage-shell').setAttribute('aria-busy','false');
    } catch { fail(); }
  };
  const startTimer = () => { clearTimeout(timer); timer = setTimeout(fail,12000); };
  const retry = () => {
    observer?.disconnect();
    document.querySelector('#stage-message').textContent = '正在重新载入…';
    document.querySelector('#retry-stage').hidden = true;
    document.querySelector('#stage-shell').setAttribute('aria-busy','true');
    startTimer();
    frame.src = exhibit.entry;
  };
  frame.addEventListener('load',onLoad);
  frame.addEventListener('error',fail);
  document.querySelector('#retry-stage').addEventListener('click',retry);
  startTimer();
  stageCleanup = () => { disposed = true; clearTimeout(timer); observer?.disconnect(); frame.removeEventListener('load',onLoad); frame.removeEventListener('error',fail); };
}
function render() {
  stageCleanup();
  stageCleanup = () => {};
  resetAccent();
  route = resolveRoute(location.hash);
  if (route.url !== location.hash && route.kind !== 'missing') history.replaceState(null,'',route.url);
  currentKey = route.url;
  let title = '设计方案';
  if (route.kind === 'catalog') {
    main.innerHTML = catalogPage();
    updateResults();
    const input = document.querySelector('#search');
    input.addEventListener('input',() => {
      route.query = input.value.trim();
      route.url = catalogUrl(route.query,route.tag);
      history.replaceState(null,'',route.url);
      currentKey = route.url;
      updateResults();
    });
    document.querySelector('#clear-search').addEventListener('click',() => {
      route.query = route.tag = '';
      route.url = catalogUrl();
      history.replaceState(null,'',route.url);
      currentKey = route.url;
      input.value = '';
      updateResults();
      input.focus();
    });
  } else if (route.kind === 'exhibit') {
    const exhibit = exhibitById(route.id);
    title = exhibit.title;
    main.innerHTML = exhibitPage(exhibit);
    configureStage(exhibit);
  } else {
    title = '展品待收录';
    main.innerHTML = '<section class="empty-state"><h1>这件展品还未收录</h1><a class="text-link" href="#/">返回全部展品 →</a></section>';
  }
  document.title = `${title} · 设计画廊`;
  document.querySelector('#announcement').textContent = `${title}已打开`;
  const saved = scrolls.get(currentKey) ?? Number(read('scroll-'+currentKey) ?? 0);
  requestAnimationFrame(() => window.scrollTo({top:Number.isFinite(saved) ? saved : 0,behavior:'instant'}));
}
window.addEventListener('message',event => {
  const frame = document.querySelector('#exhibit-frame'), exhibit = route.kind === 'exhibit' && exhibitById(route.id);
  if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin || !exhibit?.embedSlug) return;
  const data = event.data;
  if (data?.type !== 'gallery:stage' || data.slug !== exhibit.embedSlug) return;
  const height = Number(data.height);
  if (Number.isFinite(height) && height >= 100 && height <= 15000) frame.style.height = Math.ceil(height)+'px';
  for (const [field,name] of [['accent','--accent'],['auraA','--glow-a'],['auraB','--glow-b']]) {
    if (data[field] && CSS.supports('color',data[field])) document.documentElement.style.setProperty(name,data[field]);
  }
});
document.addEventListener('click',event => { if (event.target.closest('a')?.hash?.startsWith('#/')) rememberScroll(); });
document.querySelector('.skip-link').addEventListener('click',event => { event.preventDefault(); main.focus(); main.scrollIntoView(); });
window.addEventListener('hashchange',() => { render(); main.focus({preventScroll:true}); });
window.addEventListener('beforeunload',rememberScroll);
window.addEventListener('keydown',event => {
  if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !document.activeElement.matches('input,textarea,select,[contenteditable]')) {
    const search = document.querySelector('#search');
    if (search) { event.preventDefault(); search.focus(); }
  }
});
document.querySelector('#footer-count').textContent = `${EXHIBITS.length} 件展品 ↗`;
render();
