import {EXHIBITS as exhibits,WORKS,gamesForWork,workForGame} from './hall-catalog.mjs';
import {createInput,createTransport} from './hall-runtime.mjs';
import {readHallRoute,workHash,createSceneLoader} from './hall-navigation.mjs';

const icon={reset:'<path d="M3 10a7 7 0 1 1 1.8 6M3 4v6h6"/>',sound:'<path d="M11 5 6 9H3v6h3l5 4V5ZM15 9l6 6m0-6-6 6"/>',fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',link:'<path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 -1)"/>'};
const svg=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon[name]}</svg>`;
document.querySelector('#app').innerHTML=`<main id="content" tabindex="-1">
  <section class="gallery-home" aria-label="画廊首页">
    <header class="gallery-header"><h1>Design Gallery</h1></header>
    <div class="gallery-grid">${Object.entries(WORKS).filter(([id])=>gamesForWork(id).length).map(([id,work])=>{const games=gamesForWork(id);return `<article class="gallery-card"><a class="gallery-card-link" data-work="${id}" href="${workHash(games[0][0])}">
      <div class="gallery-preview"><img src="${work.cover}" alt="${work.title}的通用动作示意" width="1200" height="560"></div>
      <div class="gallery-card-title"><h2>${work.title}</h2><span aria-hidden="true">↗</span></div>
      <p class="gallery-card-games">${games.map(([,game])=>game.name).join(' · ')}</p>
    </a></article>`;}).join('')}</div>
  </section>
  <section class="hall" aria-label="角色动作" hidden>
  <header class="hall-header"><div class="hall-heading"><a class="gallery-back" href="../../../index.html" target="_top" aria-label="返回 Design Gallery 首页"><span aria-hidden="true">←</span> Design Gallery</a><h1>角色动作</h1></div>
    <div class="hall-tools" aria-label="场景控制"><button class="tool icon" data-command="reset" aria-label="复位" title="复位 · R">${svg('reset')}</button><button class="tool" data-command="pause" aria-pressed="false" title="暂停 · P">暂停</button><button class="tool" data-command="speed" aria-pressed="false" title="切换半速">1×</button><span class="tool-separator"></span><button class="tool desktop-tool" data-command="debug" aria-pressed="false">标尺</button><button class="tool icon" data-command="sound" aria-label="开启声音" title="开启声音" hidden>${svg('sound')}</button><button class="tool icon desktop-tool" data-command="link" aria-label="复制展品链接" title="复制展品链接">${svg('link')}</button><button class="tool icon desktop-tool" data-command="fullscreen" aria-label="全屏" title="全屏">${svg('fullscreen')}</button></div>
  </header>
  <nav class="exhibit-tabs" role="tablist" aria-label="角色参考"></nav>
  <section class="hall-stage" id="exhibit-panel" role="tabpanel" aria-label="动作场景"><canvas tabindex="0" role="application" aria-label="角色动作场景"></canvas><div class="stage-overlay"><span class="loading-dot"></span><span>加载中</span></div><span class="stage-paused" hidden>已暂停</span></section>
  <div class="hall-under"><div class="scene-controls"><div class="stations" role="group" aria-label="练习位置"></div><div class="scene-options"></div></div>
    <div class="touch-controls" role="group" aria-label="触屏操作"><div class="touch-dpad">${[['up','↑'],['left','←'],['down','↓'],['right','→']].map(([a,l])=>`<button class="touch-key" data-hold="${a}" aria-label="${{up:'向上',left:'向左',down:'向下',right:'向右'}[a]}">${l}</button>`).join('')}</div><div class="touch-firepad" hidden>${[['fireUp','↑'],['fireLeft','←'],['fireDown','↓'],['fireRight','→']].map(([a,label])=>`<button class="touch-key" data-hold="${a}" aria-label="发射${{fireUp:'向上',fireLeft:'向左',fireDown:'向下',fireRight:'向右'}[a]}">${label}</button>`).join('')}</div><div class="touch-actions">${[['grab','抓','抓墙'],['attack','斩','攻击'],['dash','冲','位移'],['jump','跳','跳跃'],['hook','钩','钩爪'],['reload','弹','换弹'],['slow','慢','慢动作'],['special','技','特殊动作']].map(([a,l,n])=>`<button class="touch-key" data-hold="${a}" aria-label="${n}">${l}</button>`).join('')}</div></div>
    <footer class="hall-footer"><div class="key-guide"></div><details class="source-details"><summary>来源</summary><div></div></details></footer>
  </div>
  </section>
</main><div class="toast" role="status" hidden></div>`;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('canvas'),ctx=canvas.getContext('2d'),stage=$('.hall-stage'),overlay=$('.stage-overlay'),input=createInput(),transport=createTransport(input),loader=createSceneLoader();
let currentView='home',currentId='',currentArea='',currentWork='character-actions',generation=0,ready=false,debug=false,muted=true,viewport={width:1,height:1,dpr:1},activeModule=null,raf=0,toastTimer;
const abort=new AbortController();
const on=(el,name,fn,options={})=>el.addEventListener(name,fn,{...options,signal:abort.signal});
function resize(){const r=stage.getBoundingClientRect();viewport={width:r.width,height:r.height,dpr:Math.min(devicePixelRatio||1,2)};canvas.width=Math.round(r.width*viewport.dpr);canvas.height=Math.round(r.height*viewport.dpr);}
const observer=new ResizeObserver(resize);observer.observe(stage);resize();
function clear(){transport.clearInput();$$('.touch-key').forEach(el=>el.classList.remove('is-held'));}
function focusStage(){canvas.focus({preventScroll:true});}
function toast(text){$('.toast').textContent=text;$('.toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('.toast').hidden=true,2200);}
function navigate(id,area=''){const hash=workHash(id,area);if(location.hash===hash){if(ready)reset(area);}else location.hash=hash;}
function closeScene(){loader.cancel();clear();transport.scene?.setMuted?.(true);transport.setScene(null);activeModule=null;ready=false;}
function reset(area=currentArea){clear();transport.scene?.reset(area||undefined);transport.resetClock();focusStage();}
function setPaused(value){transport.setPaused(value);clear();$('[data-command=pause]').textContent=value?'继续':'暂停';$('[data-command=pause]').setAttribute('aria-pressed',String(value));$('.stage-paused').hidden=!value;}
function paintControls(scene,module){
  const sections=scene.sections||module.sections||[];
  const validArea=sections.some(s=>s.id===currentArea)?currentArea:(sections[0]?.id||'');currentArea=validArea;
  history.replaceState(null,'',workHash(currentId,currentArea));
  $('.stations').replaceChildren(...(sections.length>1?sections:[]).map(s=>{const b=document.createElement('button');b.className='station';b.textContent=s.label;b.dataset.area=s.id;b.setAttribute('aria-pressed',String(s.id===currentArea));on(b,'click',()=>navigate(currentId,s.id));return b;}));
  const options=scene.options||module.options||[];
  $('.scene-options').replaceChildren(...options.map(option=>{
    const label=document.createElement('label'),control=document.createElement('input');control.type='checkbox';control.checked=Boolean(option.value??option.default);control.dataset.option=option.id;label.append(control,document.createTextNode(option.label));
    on(control,'change',()=>{clear();scene.setOption?.(option.id,control.checked);focusStage();});return label;
  }));
  $('.scene-controls').hidden=sections.length<=1&&options.length===0;
  if(validArea)scene.reset(validArea);
  $('[data-command=sound]').hidden=typeof scene.setMuted!=='function';scene.setMuted?.(muted);
}
async function loadRoute(){
  const route=readHallRoute(location.hash),wasWork=currentView==='work';currentView=route.view;
  $('.gallery-home').hidden=route.view!=='home';$('.hall').hidden=route.view!=='work';
  if(route.view==='home'){
    generation++;closeScene();currentId='';currentArea='';setPaused(false);document.title='Design Gallery';
    $('.source-details').open=false;$('.toast').hidden=true;clearTimeout(toastTimer);
    if(location.hash!=='#/')history.replaceState(null,'','#/');
    if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    if(wasWork)($(`.gallery-card-link[data-work="${currentWork}"]`)||$('.gallery-card-link'))?.focus({preventScroll:true});
    return;
  }
  resize();
  if(currentId===route.id&&ready){currentArea=route.area;const sections=transport.scene.sections||activeModule.sections||[];if(!sections.some(s=>s.id===currentArea))currentArea=sections[0]?.id||'';history.replaceState(null,'',workHash(currentId,currentArea));$$('[data-area]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.area===currentArea)));reset();return;}
  const token=++generation;closeScene();currentId=route.id;currentArea=route.area;setPaused(false);
  for(const command of ['pause','reset'])$(`[data-command=${command}]`).disabled=true;
  const exhibit=exhibits[currentId];currentWork=workForGame(currentId);const work=WORKS[currentWork];document.title=`${exhibit.name} · ${work.title}`;$('.hall-heading h1').textContent=work.title;$('.hall').setAttribute('aria-label',work.title);
  $('.exhibit-tabs').innerHTML=gamesForWork(currentWork,currentId).map(([id,e])=>`<button class="exhibit-tab" id="tab-${id}" role="tab" aria-selected="false" aria-controls="exhibit-panel" data-exhibit="${id}" tabindex="-1">${e.name}</button>`).join('');
  $$('.exhibit-tab').forEach(b=>{const selected=b.dataset.exhibit===currentId;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
  stage.setAttribute('aria-labelledby',`tab-${currentId}`);canvas.setAttribute('aria-label',`${exhibit.name}角色动作场景`);
  $('.key-guide').innerHTML=exhibit.keys.map(([key,label])=>`<span><kbd>${key}</kbd>${label}</span>`).join('');
  $('.source-details').open=false;$('.source-details>div').innerHTML=`<p>${exhibit.source}</p><p>${exhibit.links.map(([label,url])=>`<a href="${url}" target="_blank" rel="noopener">${label} ↗</a>`).join(' · ')}</p>`;
  stage.classList.toggle('portrait',exhibit.inputMode==='tap');$('.touch-controls').classList.toggle('single-input',exhibit.inputMode==='tap');$('.touch-dpad').hidden=exhibit.inputMode==='tap';resize();
  $('.touch-firepad').hidden=exhibit.inputMode!=='four-way';
  for(const key of ['attack','grab','dash','jump','hook','reload','slow','special']){const button=$(`[data-hold=${key}]`);button.hidden=!exhibit.touch[key];if(typeof exhibit.touch[key]==='string')button.textContent=exhibit.touch[key];}
  $('.stations').replaceChildren();$('.scene-options').replaceChildren();
  overlay.className='stage-overlay';overlay.innerHTML='<span class="loading-dot"></span><span>加载中</span>';overlay.hidden=false;
  try{
    const loaded=await loader.open(exhibit.path,{canvas,onStatus:()=>{}});
    if(!loaded)return;
    const {module,scene}=loaded;
    activeModule=module;transport.setScene(scene);paintControls(scene,module);setPaused(false);ready=true;overlay.hidden=true;for(const command of ['pause','reset'])$(`[data-command=${command}]`).disabled=false;focusStage();
  }catch(error){
    if(token!==generation)return;
    console.error(error);overlay.className='stage-overlay error';overlay.replaceChildren();const p=document.createElement('p');p.textContent='场景加载失败';const b=document.createElement('button');b.className='retry';b.textContent='重新加载';on(b,'click',()=>location.reload());overlay.append(p,b);
  }
}
function frame(timestamp){
  try{transport.frame(timestamp);if(ready&&transport.scene){ctx.setTransform(viewport.dpr,0,0,viewport.dpr,0,0);ctx.clearRect(0,0,viewport.width,viewport.height);ctx.save();transport.scene.draw(ctx,{...viewport,time:transport.time,interpolationAlpha:transport.interpolationAlpha,debug,trace:debug});ctx.restore();}}
  catch(error){closeScene();console.error(error);overlay.className='stage-overlay error';overlay.textContent='场景运行中断，请切换角色或刷新重试。';overlay.hidden=false;}
  raf=requestAnimationFrame(frame);
}
function unlockAudio(){if(!muted)transport.scene?.unlockAudio?.();}
const keymap={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',Space:'jump',KeyK:'jump',ShiftLeft:'dash',ShiftRight:'dash',KeyL:'dash',KeyJ:'attack',KeyC:'grab',KeyZ:'grab',KeyI:'special',KeyU:'reload'};
const keyAction=code=>{const bindings=exhibits[currentId]?.bindings;return bindings&&Object.hasOwn(bindings,code)?bindings[code]:keymap[code];};
on(document,'keydown',event=>{
  if(event.metaKey||event.ctrlKey||event.altKey||!ready)return;
  if(event.target!==canvas&&event.target!==document.body)return;
  const action=keyAction(event.code);
  if(action){event.preventDefault();if(!transport.paused&&!event.repeat){input.hold(event.code,action);unlockAudio();}}
  else if(!event.repeat&&event.code==='KeyR'){event.preventDefault();reset();}
  else if(!event.repeat&&event.code==='KeyP'){event.preventDefault();setPaused(!transport.paused);}
});
on(document,'keyup',event=>{if(keyAction(event.code))input.release(event.code);});
on(window,'blur',clear);on(document,'visibilitychange',()=>{if(document.hidden)clear();});
function pointerAim(event){const r=canvas.getBoundingClientRect();input.setAim((event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height,true);}
function mouseAction(button){return exhibits[currentId]?.mouse?.[button===0?'left':button===2?'right':'']||null;}
function syncMouse(event){for(const [button,mask] of [[0,1],[2,2]]){const action=mouseAction(button);if(action&&(event.buttons&mask))input.hold(`mouse:${button}`,action);else input.release(`mouse:${button}`);}}
on(canvas,'pointermove',event=>{if(ready&&!transport.paused&&exhibits[currentId]?.inputMode==='aim'){pointerAim(event);if(event.pointerType==='mouse')syncMouse(event);}});
on(canvas,'pointerdown',event=>{
  focusStage();unlockAudio();if(!ready||transport.paused)return;
  const exhibit=exhibits[currentId];let action=null;
  if(exhibit.inputMode==='tap')action='jump';
  else if(exhibit.inputMode==='aim'){
    pointerAim(event);if(event.pointerType==='mouse'){canvas.setPointerCapture(event.pointerId);syncMouse(event);return;}
    action=mouseAction(event.button);
  }
  if(action){event.preventDefault();canvas.setPointerCapture(event.pointerId);input.hold(`canvas:${event.pointerId}`,action);}
});
// mousedown observes additional mouse buttons pressed while another remains held.
on(canvas,'mousedown',event=>{if(ready&&!transport.paused&&exhibits[currentId]?.inputMode==='aim'){event.preventDefault();pointerAim(event);syncMouse(event);}});
on(window,'mouseup',event=>input.release(`mouse:${event.button}`));
on(canvas,'pointerup',event=>{input.release(`canvas:${event.pointerId}`);if(event.pointerType==='mouse'&&exhibits[currentId]?.inputMode==='aim')syncMouse(event);});
for(const name of ['pointercancel','lostpointercapture'])on(canvas,name,event=>{input.release(`canvas:${event.pointerId}`);if(!event.buttons){input.release('mouse:0');input.release('mouse:2');}});
on(canvas,'contextmenu',event=>{if(exhibits[currentId]?.inputMode==='aim')event.preventDefault();});
for(const b of $$('[data-hold]')){
  on(b,'pointerdown',event=>{event.preventDefault();if(!ready||transport.paused)return;b.setPointerCapture(event.pointerId);input.hold(`pointer:${event.pointerId}`,b.dataset.hold);b.classList.add('is-held');unlockAudio();});
  const release=event=>{input.release(`pointer:${event.pointerId}`);b.classList.remove('is-held');};on(b,'pointerup',release);on(b,'pointercancel',release);on(b,'lostpointercapture',release);
}
on($('.exhibit-tabs'),'click',event=>{const button=event.target.closest('[data-exhibit]');if(button)navigate(button.dataset.exhibit);});
on($('.exhibit-tabs'),'keydown',event=>{
  const b=event.target.closest('[data-exhibit]');if(!b||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=$$('.exhibit-tab'),i=tabs.indexOf(b),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].focus();navigate(tabs[next].dataset.exhibit);
});
for(const b of $$('[data-command]'))on(b,'click',async()=>{
  const command=b.dataset.command;
  if(command==='reset')reset();
  if(command==='pause'){setPaused(!transport.paused);focusStage();}
  if(command==='speed'){transport.setSpeed(transport.speed===1?.5:1);b.textContent=`${transport.speed}×`;b.setAttribute('aria-pressed',String(transport.speed!==1));focusStage();}
  if(command==='debug'){debug=!debug;b.setAttribute('aria-pressed',String(debug));focusStage();}
  if(command==='sound'){muted=!muted;unlockAudio();transport.scene?.setMuted?.(muted);b.setAttribute('aria-label',muted?'开启声音':'关闭声音');b.title=muted?'开启声音':'关闭声音';b.setAttribute('aria-pressed',String(!muted));focusStage();}
  if(command==='fullscreen'){try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.hall').requestFullscreen();}catch{toast('当前窗口请使用浏览器全屏');}focusStage();}
  if(command==='link'){try{await navigator.clipboard.writeText(location.href.split('#')[0]+workHash(currentId,currentArea));toast('已复制展品链接');}catch{toast('请复制地址栏中的展品链接');}}
});
on($('.skip-link'),'click',event=>{event.preventDefault();(currentView==='work'?canvas:$('.gallery-card-link')).focus();});
on(window,'hashchange',loadRoute);
on(window,'pagehide',()=>{cancelAnimationFrame(raf);closeScene();observer.disconnect();abort.abort();clearTimeout(toastTimer);generation++;});
window.__gallery={get view(){return currentView;},get ready(){return ready;},get exhibit(){return currentId;},get area(){return currentArea;},get state(){return transport.scene?.getState?.()??null;},get input(){return input.snapshot();},get aim(){return input.aim;},get paused(){return transport.paused;},get time(){return transport.time;},get speed(){return transport.speed;},reset,pause:setPaused};
loadRoute();raf=requestAnimationFrame(frame);
