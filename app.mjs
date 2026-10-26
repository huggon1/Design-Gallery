const WORKS = [
  {slug:'living-cover', title:'动态封面', english:'Living Shader Cover', roman:'I', room:'visual', date:'2026.10.15', version:'v1', type:'动效', schemes:'静态 · 缓慢流动 · 指针响应', summary:'三种状态，同一张声音艺术展封面。', description:'同一张声音艺术展封面，分别呈现静态印刷、自动流动与随指针变化的材质状态。展台支持三态并排与单态聚焦，配色、速度和暂停可调，适合音乐专辑封面与展览主视觉。', reference:'23rd', source:'https://23rd.dev/', accent:'#f3b37a', glowA:'rgba(196,108,138,.23)', glowB:'rgba(242,166,98,.09)'},
  {slug:'image-compare', title:'图像对比', english:'Optical Image Comparison', roman:'II', room:'visual', date:'2026.10.15', version:'v1', type:'交互', schemes:'滑动分割 · 并排全画幅 · 按住切换', summary:'让两幅画面的差异，落在同一个视线里。', description:'比较同一张原创植物展海报的两个版本。滑动分割适合局部对齐比对，并排全画幅适合构图审视，按住切换适合发现细微变化，可用于设计改版、修图与生成结果审阅。', reference:'Bencho', source:'https://bencho.dev/', accent:'#9be3b1', glowA:'rgba(92,168,118,.20)', glowB:'rgba(214,202,148,.07)'},
  {slug:'reorder-list', title:'拖动排序', english:'Tactile Reorder Queue', roman:'III', room:'feedback', date:'2026.10.15', version:'v1', type:'交互', schemes:'指针拖动 · 行内微调 · 键盘排序', summary:'拿起、移动、落下，让顺序变化有迹可循。', description:'调整六条设计参考的顺序，松手后平滑落位，并支持多步撤销。可使用拖动把手、行内方向按钮，或聚焦把手后按空格提起、方向键移动、回车落位，适合播放队列、参考清单与作品编排。', reference:'Bencho', source:'https://bencho.dev/', accent:'#e6c885', glowA:'rgba(218,182,112,.18)', glowB:'rgba(138,168,112,.08)'},
  {slug:'agent-progress', title:'任务进度', english:'Agent Progress & Recovery', roman:'IV', room:'feedback', date:'2026.10.15', version:'v1', type:'交互', schemes:'故障与恢复 · 顺畅归档 · 阶段详情', summary:'逐项呈现进展，从失败的位置继续。', description:'批量整理五条模拟参考，展开条目可查看提取摘要、识别特点与保存笔记三个阶段。可切换故障与顺畅情境，失败项保留已完成阶段并支持单项重试，适合批量导入与内容整理。', reference:'Beautiful UI', source:'https://beautifului.dev/', accent:'#85c1ff', glowA:'rgba(88,156,232,.20)', glowB:'rgba(218,122,78,.08)'},
  {slug:'remove-experience', title:'移除确认', english:'Modal & Inline Confirm', roman:'V', room:'feedback', date:'2026.10.13', version:'v2', type:'交互', schemes:'弹窗确认 · 原地确认 · 失败与撤销', summary:'在原地完成一次有余地的决定。', description:'同一组模拟收藏，分别用传统弹窗与原地胶囊变形完成移除。支持双方案并排与单独查看，可模拟响应延迟和单次失败，并体验取消、重试与撤销，适合收藏夹与队列等可恢复操作。', reference:'Arc UI', source:'https://uiarc.dev/components/confirm-morph', accent:'#f29b8e', glowA:'rgba(216,102,92,.20)', glowB:'rgba(116,168,138,.07)'}
];
WORKS.push(...[{"slug": "annotated-3d-cutaway", "title": "可标注三维剖解", "english": "Annotated 3D Cutaway", "roman": "VI", "room": "visual", "date": "2026.10.20", "version": "v1", "type": "三维", "schemes": "旋转 · 剖切 · 爆炸", "summary": "可标注三维剖解", "description": "虚构手摇磨豆机 Clove C2：绕转查看，章节切到剖面与爆炸，标签贴在结构上。剖切滑条连续扫过壳体。纸台与哑光材质。适合硬件「怎么工作」讲解页。", "reference": "设计实验室", "source": "assets/annotated-3d-cutaway/v1/index.html", "entry": "assets/annotated-3d-cutaway/v1/index.html", "preview": "assets/annotated-3d-cutaway/v1/preview.png", "accent": "#edbb95", "glowA": "rgba(170,101,135,.17)", "glowB": "rgba(219,149,95,.07)"}, {"slug": "gsap-framecheck-cards", "title": "GSAP 帧检卡片联播", "english": "GSAP Framecheck Cards", "roman": "VII", "room": "visual", "date": "2026.10.20", "version": "v1", "type": "动效", "schemes": "播放暂停 · 时间轴 · 逐帧查看", "summary": "GSAP 帧检卡片联播", "description": "同一条「安静发布」故事，用 GSAP 时间线做成卡片级联：焦点卡、回执条与卫星信息并行，并用 Playwright 帧检锁住时序。暖纸、绿与赭石。适合讲解 GSAP 编排与帧级验收，也可对照 seek(t) 同题材短片。", "reference": "设计实验室", "source": "assets/gsap-framecheck-cards/v1/index.html", "entry": "assets/gsap-framecheck-cards/v1/index.html", "preview": "assets/gsap-framecheck-cards/v1/preview.png", "accent": "#edbb95", "glowA": "rgba(170,101,135,.17)", "glowB": "rgba(219,149,95,.07)"}, {"slug": "editorial-kinetic-type", "title": "编辑式动能字体", "english": "Editorial Kinetic Type", "roman": "VIII", "room": "visual", "date": "2026.10.20", "version": "v1", "type": "动效", "schemes": "播放暂停 · 时间轴 · 逐帧查看", "summary": "编辑式动能字体", "description": "字被当成可以走进的建筑：字重落地成地面，两个词相倚而立，间隙里长出房间。骨色纸、墨与酒红，适合品牌片头，也可演示编辑式排印。帧由 seek(t) 计算，同属代码驱动帧。", "reference": "设计实验室", "source": "assets/editorial-kinetic-type/v1/index.html", "entry": "assets/editorial-kinetic-type/v1/index.html", "preview": "assets/editorial-kinetic-type/v1/preview.png", "accent": "#edbb95", "glowA": "rgba(170,101,135,.17)", "glowB": "rgba(219,149,95,.07)"}, {"slug": "seek-t-morph-reel", "title": "连续变形发布短片", "english": "Continuous Morph Reel", "roman": "IX", "room": "visual", "date": "2026.10.20", "version": "v1", "type": "动效", "schemes": "播放暂停 · 时间轴 · 逐帧查看", "summary": "连续变形发布短片", "description": "Tideline 2.4 的界面沿同一物件连续变形：Publish、进度环、对勾、10,799 req/s、标签栏，再到 p99 42ms 与部署 1.8s，最后收到结尾卡片。暖纸、绿与赭石，适合产品发布短片。每一帧由 seek(t) 算出，方法上属于代码驱动帧。", "reference": "设计实验室", "source": "assets/seek-t-morph-reel/v1/index.html", "entry": "assets/seek-t-morph-reel/v1/index.html", "preview": "assets/seek-t-morph-reel/v1/preview.png", "accent": "#edbb95", "glowA": "rgba(170,101,135,.17)", "glowB": "rgba(219,149,95,.07)"}, {"slug": "three-ink-linework", "title": "三种墨水线稿", "english": "Three Ink Linework", "roman": "X", "room": "visual", "date": "2026.10.20", "version": "v1", "type": "动效", "schemes": "播放暂停 · 时间轴 · 逐帧查看", "summary": "三种墨水线稿", "description": "同一只器皿，几何不换，只换画法：纸上铅笔、蓝图、再变成光。适合品牌线稿与方法演示。帧由 seek(t) 计算，同属代码驱动帧。", "reference": "设计实验室", "source": "assets/three-ink-linework/v1/index.html", "entry": "assets/three-ink-linework/v1/index.html", "preview": "assets/three-ink-linework/v1/preview.png", "accent": "#edbb95", "glowA": "rgba(170,101,135,.17)", "glowB": "rgba(219,149,95,.07)"}]);
WORKS.sort((a,b)=>b.date.localeCompare(a.date));
const ROOMS = [
  {id:'visual', title:'视觉与材质', roman:'I', english:'LIGHT / FORM / PERCEPTION', tagline:'让画面流动，让差异显现。', description:'从封面的光与运动，到两幅图像的细微差异。观察画面、运动与空间如何被感知。', ids:["annotated-3d-cutaway", "gsap-framecheck-cards", "editorial-kinetic-type", "seek-t-morph-reel", "three-ink-linework", "living-cover", "image-compare"]},
  {id:'feedback', title:'操作与反馈', roman:'II', english:'ACTION / STATE / RECOVERY', tagline:'每一次操作，都有清楚的回应。', description:'排序、等待与移除。三件作品，研究操作如何发生、结果如何反馈，以及出错后如何继续。', ids:['reorder-list','agent-progress','remove-experience']}
];
const main = document.getElementById('main');
const bySlug = slug => WORKS.find(w => w.slug === slug);
const roomById = id => ROOMS.find(r => r.id === id);
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const preview = (w,eager=false) => `<div class="preview ${w.preview?'native-preview':''}"><img src="${w.preview||`assets/previews/${w.slug}.jpg`}" alt="${w.title}预览" width="960" height="613" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async"></div>`;
let currentRoute = '', currentWork = null, stageTimeout, searchTimer;
const scrollPositions = new Map();
const defaultTheme = () => {const s=document.documentElement.style;s.setProperty('--accent','#edbb95');s.setProperty('--glow-a','rgba(170,101,135,.17)');s.setProperty('--glow-b','rgba(219,149,95,.07)');};
function parseRoute(){const raw=location.hash.startsWith('#/')?location.hash.slice(1):'/';const url=new URL(raw,location.origin);return {path:url.pathname,params:url.searchParams,key:raw};}
function workHref(w,from,q=''){const p=new URLSearchParams({from});if(q)p.set('q',q);return `#/work/${w.slug}?${p}`;}
function card(w,from,q=''){return `<a class="work-card" data-work="${w.slug}" href="${escape(workHref(w,from,q))}">${preview(w)}<div class="work-card-title"><h2>${w.title}</h2><span class="roman">${w.roman}</span></div><div class="work-meta"><span>${w.type} · ${w.schemes.split(' · ').slice(0,2).join(' / ')}</span><time>${w.date}</time></div><p class="work-summary">${w.summary}</p></a>`;}
function announce(text){document.getElementById('announcement').textContent=text;}
function home(){
  return `<section aria-labelledby="home-title" class="hall"><div class="hall-heading"><div><div class="eyebrow">THE COLLECTION</div><h1 id="home-title">大厅</h1></div><span class="count">${WORKS.length} WORKS / ${ROOMS.length.toString().padStart(2,'0')} THEMES</span></div>${ROOMS.map(r=>`<section class="hall-section" data-section="${r.id}" id="section-${r.id}" aria-labelledby="heading-${r.id}"><div class="hall-section-heading"><div class="hall-section-title"><span class="roman">${r.roman}</span><h2 id="heading-${r.id}">${r.title}</h2><span class="count">${r.ids.length} 件</span></div><p>${r.tagline}</p></div><div class="work-grid ${r.ids.length===2?'two':''}">${r.ids.map(id=>card(bySlug(id),'hall')).join('')}</div></section>`).join('')}</section>`;
}
function archive(params){const q=params.get('q')||'';return `<div class="back-row"><a class="text-link" id="back-link" href="#/">← 返回大厅</a><span class="count">${WORKS.length} COLLECTED WORKS</span></div><section aria-labelledby="archive-title"><div class="room-heading"><div class="eyebrow">THE COMPLETE COLLECTION</div><h1 id="archive-title">全部馆藏</h1></div><div class="archive-toolbar"><div class="filter-links"><a href="#/all" aria-current="page">全部 ${WORKS.length}</a>${ROOMS.map(r=>`<a href="#/room/${r.id}" data-room="${r.id}">${r.title} ${r.ids.length}</a>`).join('')}</div><label class="archive-search"><span aria-hidden="true">⌕</span><input id="search" type="search" autocomplete="off" aria-label="搜索作品或用途" placeholder="搜索作品或用途" value="${escape(q)}"></label></div><div class="results-meta"><span id="result-count" aria-live="polite"></span><span>最新收录 ↓</span></div><div class="work-grid" id="archive-grid"></div><div class="empty-state" id="empty-state" hidden>暂时没有匹配的作品。<br><button id="clear-search" type="button">清空搜索</button></div></section>`;}
function filtered(q){return WORKS.filter(w=>(w.title+w.english+w.description+w.schemes).toLowerCase().includes(q.trim().toLowerCase()));}
function updateArchive(q){const list=filtered(q);document.getElementById('archive-grid').innerHTML=list.map(w=>card(w,'all',q)).join('');document.getElementById('result-count').textContent=`${list.length} 件作品`;document.getElementById('empty-state').hidden=list.length>0;}
function showWork(w,params){
  let from=params.get('from')||'hall';
  if(from!=='all'&&from!=='hall'&&!roomById(from))from='hall';
  const r=roomById(from),q=params.get('q')||'';
  const back=from==='all'?`#/all${q?'?q='+encodeURIComponent(q):''}`:r?`#/?section=${r.id}`:'#/';
  const list=r?r.ids.map(bySlug):from==='all'?filtered(q):WORKS;
  const i=list.findIndex(x=>x.slug===w.slug);
  const neighbors=i>=0&&list.length>1?[list[(i-1+list.length)%list.length],list[(i+1)%list.length]]:[];
  return `<div class="breadcrumb" aria-label="当前位置"><a id="back-link" href="${escape(back)}">${from==='all'?'全部馆藏':'← 大厅'}</a><span class="slash">/</span><span aria-current="page">${w.title}</span></div><section aria-labelledby="work-title"><div class="work-heading"><div><div class="eyebrow">EXHIBIT ${w.roman} / ${w.type}</div><h1 id="work-title">${w.title}</h1><p class="english">${w.english}</p></div><p class="scheme-summary">${w.schemes}</p></div><div class="stage-shell" id="stage-shell" aria-busy="true"><div class="stage-status" id="stage-status" role="status"><span class="loading-dot" aria-hidden="true"></span><span id="stage-message">正在打开${w.title}…</span><button id="retry-stage" hidden type="button">重新载入</button></div><iframe id="exhibit-frame" title="${w.title}交互展示台" src="${w.entry||`exhibit.html#${w.slug}`}" referrerpolicy="no-referrer"></iframe></div><div class="work-description"><p>${w.description}</p><div class="provenance"><div>收录 ${w.date} · ${w.version}</div><a href="${w.source}" target="_blank" rel="noreferrer">参考 ${w.reference} ↗</a></div></div></section>${neighbors.length?`<nav class="neighbors" aria-label="继续浏览作品"><a data-work="${neighbors[0].slug}" href="${escape(workHref(neighbors[0],from,q))}"><span>PREVIOUS STUDY</span><strong>← ${neighbors[0].title}</strong></a><a data-work="${neighbors[1].slug}" href="${escape(workHref(neighbors[1],from,q))}"><span>NEXT STUDY</span><strong>${neighbors[1].title} →</strong></a></nav>`:''}`;}
function configureNativeStage(w){
  const frame=document.getElementById('exhibit-frame');
  frame.addEventListener('load',()=>{
    if(currentWork?.slug!==w.slug)return;
    const doc=frame.contentDocument;
    const style=doc.createElement('style');
    style.textContent='main>header,.ban{display:none!important} main{padding:24px!important}';
    doc.head.append(style);
    const content=doc.querySelector('main')||doc.body;
    const fit=()=>{if(!frame.isConnected)return;frame.style.height=Math.ceil(content.getBoundingClientRect().height)+'px';};
    const observer=new ResizeObserver(fit);observer.observe(content);fit();
    frame.contentWindow.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
    document.getElementById('stage-status').hidden=true;
    document.getElementById('stage-shell').setAttribute('aria-busy','false');
  });
}
function configureStage(w){if(w.entry){configureNativeStage(w);return;}const s=document.documentElement.style;s.setProperty('--accent',w.accent);s.setProperty('--glow-a',w.glowA);s.setProperty('--glow-b',w.glowB);const timeout=()=>{stageTimeout=setTimeout(()=>{const label=document.getElementById('stage-message');if(label){label.textContent='展台暂时未能加载，请重新载入。';document.getElementById('retry-stage').hidden=false;}},12000);};timeout();document.getElementById('retry-stage').onclick=()=>{clearTimeout(stageTimeout);document.getElementById('stage-message').textContent=`正在打开${w.title}…`;document.getElementById('retry-stage').hidden=true;document.getElementById('exhibit-frame').src=`exhibit.html#${w.slug}`;timeout();};}
function render({restore=true}={}){
  clearTimeout(stageTimeout);clearTimeout(searchTimer);
  let route=parseRoute();
  if(route.path.startsWith('/room/')){
    const r=roomById(route.path.split('/')[2]);
    if(r){history.replaceState(null,'',`#/?section=${r.id}`);route=parseRoute();}
  }
  currentRoute=route.key;currentWork=null;defaultTheme();
  let title='大厅',html;
  if(route.path==='/')html=home();
  else if(route.path==='/all'){html=archive(route.params);title='全部馆藏';}
  else if(route.path.startsWith('/work/')){
    const w=bySlug(route.path.split('/')[2]);
    if(w){html=showWork(w,route.params);title=w.title;currentWork=w;}
  }
  if(!html){html='<div class="not-found"><div class="eyebrow">EXHIBIT NOT FOUND</div><h1>这条路径还没有作品。</h1><p>从大厅继续浏览。</p><a class="text-link" href="#/">返回大厅 →</a></div>';title='作品未找到';}
  main.innerHTML=html;document.title=`${title} · 设计画廊`;
  document.querySelectorAll('[data-nav]').forEach(a=>{
    const selected=a.dataset.nav===(route.path==='/all'?'all':'rooms');
    if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  if(route.path==='/all'){
    const input=document.getElementById('search');updateArchive(input.value);
    const search=()=>{
      const q=input.value;updateArchive(q);
      const next='/all'+(q?'?q='+encodeURIComponent(q):'');
      history.replaceState(null,'','#'+next);currentRoute=next;
    };
    input.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(search,100);});
    document.getElementById('clear-search').onclick=()=>{input.value='';search();input.focus();};
  }
  if(currentWork)configureStage(currentWork);
  announce(`${title}已打开`);
  requestAnimationFrame(()=>{
    if(!restore)return;
    const section=roomById(route.params.get('section'));
    if(route.path==='/'&&section){document.getElementById(`section-${section.id}`).scrollIntoView({behavior:'instant',block:'start'});}
    else window.scrollTo({top:scrollPositions.get(route.key)||0,behavior:'instant'});
  });
}
window.addEventListener('message',event=>{const frame=document.getElementById('exhibit-frame');if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin||!currentWork)return;const d=event.data;if(!d||d.type!=='gallery:stage'||d.slug!==currentWork.slug)return;const height=Number(d.height);if(Number.isFinite(height)&&height>100&&height<15000)frame.style.height=`${Math.ceil(height)}px`;if(typeof d.accent==='string'&&CSS.supports('color',d.accent))document.documentElement.style.setProperty('--accent',d.accent);for(const [field,property]of [['auraA','--glow-a'],['auraB','--glow-b']]){if(typeof d[field]==='string'&&CSS.supports('color',d[field]))document.documentElement.style.setProperty(property,d[field]);}clearTimeout(stageTimeout);document.getElementById('stage-status').hidden=true;document.getElementById('stage-shell').setAttribute('aria-busy','false');});
document.addEventListener('click',event=>{const a=event.target.closest('a');if(!a)return;if(a.classList.contains('skip-link')){event.preventDefault();main.focus();main.scrollIntoView();return;}if(a.getAttribute('href')?.startsWith('#/')){scrollPositions.set(currentRoute,scrollY);}});
window.addEventListener('scroll',()=>{scrollPositions.set(currentRoute,scrollY);},{passive:true});
window.addEventListener('hashchange',()=>render());
if(bySlug(location.hash.slice(1)))history.replaceState(null,'',`#/work/${location.hash.slice(1)}?from=hall`);
else if(!location.hash||!location.hash.startsWith('#/'))history.replaceState(null,'','#/');
if('scrollRestoration'in history)history.scrollRestoration='manual';
render();
