import {TUNING,WORLD,sections,createPlayer,resetPlayer,stepPlayer,clearInput,bodyBounds} from './physics.mjs';
import {loadCharacter,drawActor,drawFrame,drawSlash,describeAnimation} from './character.mjs';
import {ZeroAudio} from './audio.mjs';
export {sections};export const options=[];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const noise=n=>{const x=Math.sin(n*73.141+21.912)*17831.41;return x-Math.floor(x);};
const actionNames={idle:'站立',run:'跑动',idle_to_run:'起步',run_to_idle:'刹停',jump:'上升',fall:'下落',wall_slide:'接墙 / 滑墙',wall_jump:'墙跳翻身',roll_enter:'翻滚 · 进入',roll_rotate:'翻滚 · 转体',roll_recover:'翻滚 · 起身',strike_prepare:'刀击 · 蓄势',strike_active:'刀击 · 有效',strike_recover:'刀击 · 收势',postcrouch:'落地起身'};
export async function createScene({canvas,onStatus=()=>{}}={}){
 const art=await loadCharacter(),audio=new ZeroAudio(),surface=document.createElement('canvas'),c=surface.getContext('2d'),p=createPlayer();
 let disposed=false,view={w:600,h:310,cssW:960,cssH:496},camera={x:0,y:0},prev={x:p.x,y:p.y,camera:{x:0,y:0}},cameraReady=false,effects=[],echoes=[],echoTimer=0,footTimer=0,lastStatus='',toast='',toastAge=99;
 function aimInput(input){if(!input.aim?.active)return input;return {...input,aimWorld:{x:camera.x+input.aim.x*view.w,y:camera.y+input.aim.y*view.h}};}
 function effect(type,e){effects.push({type,x:e.x,y:e.y,age:0,angle:e.angle??0,wall:e.wall??0,face:p.face});}
 function event(e){
  const sounds={jump:'player_jump',wallJump:'player_jump',land:'player_land',roll:'player_roll',strike:p.attackSerial%2?'slash_1':'slash_2',reflect:'slash_bullet',shot:'gun_fire',slowEnter:'Slowmo_Enter',slowExit:'Slowmo_Exit',targetHit:'slash_bullet',returnHit:'slash_bullet'};
  if(sounds[e.type])audio.play(sounds[e.type],e.type==='shot'?.09:e.type==='land'?.15:e.type==='slowEnter'||e.type==='slowExit'?.25:.28,{fixedRate:e.type.startsWith('slow')});
  if(['jump','land','wallJump','reflect','targetHit','returnHit','contact'].includes(e.type))effect(e.type,e);
  if(e.type==='reflect'){toast='弹反';toastAge=0;}
  if(e.type==='contact'){toast='接触 · 练习弹';toastAge=0;}
  if(e.type==='returnHit'){toast='反射命中';toastAge=0;}
 }
 function updateCamera(dt,snap=false){
  const tx=clamp(p.x-view.w*.42,0,Math.max(0,WORLD.width-view.w)),ty=clamp(p.y-view.h*.76,-35,WORLD.height-view.h);
  const t=snap?1:1-Math.exp(-dt*9);camera.x+=(tx-camera.x)*t;camera.y+=(ty-camera.y)*t;
 }
 function step(dt,input={}){
  if(disposed)return;prev={x:p.x,y:p.y,camera:{...camera}};const before=p.time;stepPlayer(p,aimInput(input),dt);const ds=p.time-before;
  audio.setRate(p.timeScale);for(const e of p.events)event(e);
  effects=effects.filter(e=>(e.age+=ds)<(e.type==='land'?.26:e.type==='jump'||e.type==='wallJump'?.22:.3));
  echoes=echoes.filter(e=>(e.age+=ds)<.17);echoTimer-=ds;toastAge+=ds;
  const echoing=p.roll||p.attack?.age<.16||p.wallJumpAge<.18||(p.slow&&Math.abs(p.vx)>35);
  if(echoing&&echoTimer<=0){echoes.push({pose:{x:p.x,y:p.y,face:p.face,clip:p.clip,clipTime:p.clipTime,wall:p.wall},age:0,warm:p.wallJumpAge<.18});echoTimer=.032;}
  if(p.grounded&&Math.abs(p.vx)>40&&!p.roll&&!p.attack){footTimer+=ds;if(footTimer>.18){footTimer=0;audio.play('player_running_'+(Math.floor(p.runTime/.18)%4+1),.11);effect('foot',{x:p.x-p.face*4,y:p.y});}}else footTimer=0;
  const status=actionNames[p.action]||p.action;if(status!==lastStatus){lastStatus=status;onStatus(status);}updateCamera(ds);
 }
 function reset(section='course'){resetPlayer(p,section);effects=[];echoes=[];echoTimer=0;footTimer=0;toast='';toastAge=99;updateCamera(0,true);cameraReady=true;prev={x:p.x,y:p.y,camera:{...camera}};onStatus('站立');}
 function room(c){
  c.fillStyle='#141b24';c.fillRect(camera.x-30,camera.y-50,view.w+60,view.h+100);
  // Quiet training architecture keeps the character silhouette readable.
  c.strokeStyle='#23303d';c.lineWidth=1;
  for(let x=Math.floor((camera.x-100)/160)*160;x<camera.x+view.w+150;x+=160){c.strokeRect(x+12,90,128,188);c.fillStyle='#17212b';c.fillRect(x+14,92,124,184);c.strokeStyle='#253440';c.beginPath();c.moveTo(x+22,101);c.lineTo(x+130,101);c.stroke();}
  c.fillStyle='#28434e';for(let x=80;x<WORLD.width;x+=320){c.fillRect(x,83,44,2);c.fillStyle='#36515c';c.fillRect(x+6,84,32,1);c.fillStyle='#28434e';}
  for(const b of WORLD.solids){
   c.fillStyle=b.kind==='floor'?'#252c36':'#303943';c.fillRect(b.x,b.y,b.w,b.h);c.fillStyle='#64717a';c.fillRect(b.x,b.y,b.w,1);c.fillStyle='#3e4b58';c.fillRect(b.x,b.y+1,b.w,2);
   if(b.kind==='wall'){c.fillStyle='#42535d';c.fillRect(b.x+2,b.y+3,2,b.h-3);c.fillStyle='#1f2c35';c.fillRect(b.x+b.w-4,b.y+3,3,b.h-3);for(let y=b.y+16;y<b.y+b.h;y+=20){c.fillStyle='#5e6b71';c.fillRect(b.x+7,y,2,2);}}
   if(b.kind==='floor'){c.strokeStyle='#303b47';for(let x=0;x<WORLD.width;x+=40){c.beginPath();c.moveTo(x,307);c.lineTo(x+35,307);c.stroke();}}
  }
  c.font='6px ui-monospace, monospace';c.fillStyle='#586775';c.fillText('01  START / STOP',105,324);c.fillText('02  STEPS / UPPER ROUTE',590,324);c.fillText('03  WALL / PASSAGE',1018,324);c.fillText('04  DEFLECT / SLOW',1650,324);
  c.fillStyle='#6a8d95';c.font='7px system-ui, sans-serif';c.fillText('上层路线 →',665,234);c.fillText('← 上层路线',1385,194);c.fillText('← 地面通道 →',1032,285);
  c.strokeStyle='#72999b';c.lineWidth=1;for(const x of [980,1165]){c.beginPath();c.moveTo(x,274);c.lineTo(x+12,274);c.lineTo(x+8,271);c.moveTo(x+12,274);c.lineTo(x+8,277);c.stroke();}
 }
 function targets(c){
  const t=WORLD.target;
  c.fillStyle='#3c4b58';c.fillRect(t.x-2,t.y-22,4,42);c.fillRect(t.x-14,t.y+18,28,2);
  c.save();c.translate(t.x,t.y-5);c.rotate(p.targetFlash?Math.sin(p.targetFlash*75)*p.targetFlash*.25:0);c.fillStyle=p.targetFlash?'#dbf4ee':'#536571';c.fillRect(-11,-11,22,23);c.strokeStyle=p.targetFlash?'#fff9d8':'#8da6ac';c.lineWidth=1;c.strokeRect(-10.5,-10.5,21,22);c.beginPath();c.arc(0,0,5,0,Math.PI*2);c.stroke();c.restore();
  const e=WORLD.emitter;c.fillStyle='#52616c';c.fillRect(e.x-11,e.y-17,23,27);c.fillStyle=p.emitterFlash?'#f9d399':'#749fa4';c.fillRect(e.x-17,e.y-3,14,6);c.fillStyle='#202d37';c.fillRect(e.x-8,e.y-13,17,9);c.fillStyle='#638889';c.fillRect(e.x-6,e.y-11,Math.min(13,Math.max(0,p.shotTimer/WORLD.shotInterval*13)),2);c.fillStyle='#384a58';c.fillRect(e.x-3,e.y+10,7,8);
  if(p.emitterFlash>.02){c.fillStyle='#fff0a7';c.fillRect(e.x-22,e.y-2,5,3);}
 }
 function effectDraw(c,e){
  if(e.type==='land'||e.type==='foot')drawFrame(c,art,'landcloud',e.age,e.x,e.y,{alpha:e.type==='foot'?.3:1,scale:e.type==='foot'?.55:1});
  else if(e.type==='jump')drawFrame(c,art,'jumpcloud',e.age,e.x,e.y);
  else if(e.type==='wallJump'){c.save();c.translate(e.x+e.wall*6,e.y-16);c.rotate(e.wall<0?-Math.PI/2:Math.PI/2);drawFrame(c,art,'jumpcloud',e.age,0,0,{scale:.65});c.restore();}
  else if(['reflect','targetHit','returnHit'].includes(e.type)){
   drawFrame(c,art,'bulletreflect',e.age,e.x,e.y,{scale:e.type==='reflect'?1:.7});if(e.age<.125)drawFrame(c,art,'slashfx',e.age,e.x,e.y,{rotation:e.angle});
  }else if(e.type==='contact'){c.globalAlpha=(1-e.age/.3)*.6;c.strokeStyle='#f3aaab';c.lineWidth=1;c.beginPath();c.arc(e.x,e.y,5+e.age*24,0,7);c.stroke();c.globalAlpha=1;}
 }
 function draw(ctx,{width=960,height=540,interpolationAlpha=1,debug=false,trace=false}={}){
  if(disposed)return;const resized=view.cssW!==width||view.cssH!==height;view={w:Math.max(190,Math.round(width/height*310)),h:310,cssW:width,cssH:height};
  if(!cameraReady||resized){updateCamera(0,true);cameraReady=true;prev={x:p.x,y:p.y,camera:{...camera}};}
  const a=p.hitstop>0?1:clamp(interpolationAlpha,0,1),render={...p,x:prev.x+(p.x-prev.x)*a,y:prev.y+(p.y-prev.y)*a};
  const cam={x:prev.camera.x+(camera.x-prev.camera.x)*a,y:prev.camera.y+(camera.y-prev.camera.y)*a};
  surface.width=view.w;surface.height=view.h;c.imageSmoothingEnabled=false;c.save();c.translate(-Math.round(cam.x),-Math.round(cam.y));room(c);targets(c);if(p.slow){c.fillStyle='#03090e80';c.fillRect(cam.x,cam.y,view.w,view.h);}
  if(trace&&p.history.length){c.strokeStyle='#75d7d080';c.lineWidth=.7;c.setLineDash([2,3]);c.beginPath();p.history.forEach((h,i)=>i?c.lineTo(h.x,h.y-1):c.moveTo(h.x,h.y-1));c.stroke();c.setLineDash([]);}
  for(const e of echoes)drawActor(c,art,e.pose,{ghost:e.warm?'warm':true,alpha:(1-e.age/.17)*.42});
  if(p.grounded){c.fillStyle='#090e1488';c.beginPath();c.ellipse(render.x,render.y+1,p.roll?17:12,2,0,0,7);c.fill();}
  drawActor(c,art,render);if(p.slow)drawActor(c,art,render,{ghost:true,alpha:.7});drawSlash(c,art,render);
  if(p.damageAge<.22){c.fillStyle=`rgba(255,179,187,${(.22-p.damageAge)*.7})`;const b=bodyBounds(render);c.fillRect(b.x,b.y,b.w,b.h);}
  for(const b of p.bullets){c.strokeStyle=b.reflected?'#a0fff0':'#d6a987';c.lineWidth=1;c.beginPath();c.moveTo(b.x-b.vx*.026,b.y-b.vy*.026);c.lineTo(b.x,b.y);c.stroke();c.fillStyle=b.reflected?'#e9fff7':'#fff0ca';c.fillRect(Math.round(b.x)-2,Math.round(b.y)-1,4,2);}
  for(const e of effects)effectDraw(c,e);
  if(debug){
   const b=bodyBounds(render);c.strokeStyle='#7ce4d7';c.lineWidth=.6;c.strokeRect(b.x,b.y,b.w,b.h);c.fillStyle='#d3ddd5';c.fillRect(render.x-1,render.y-1,2,2);
   if(p.attack){c.save();c.translate(render.x,render.y-19);c.rotate(p.attack.angle);c.strokeStyle='#b1e7cd77';c.beginPath();c.arc(0,0,86,-1.39,1.39);c.stroke();c.restore();}
   c.fillStyle='#8babb9';c.font='6px ui-monospace, monospace';c.fillText(`${p.clip} ${describeAnimation(art,p).frame+1} / ${p.vx.toFixed(0)},${p.vy.toFixed(0)}`,render.x-35,render.y-57);
  }
  c.restore();
  if(p.slow){c.fillStyle='#2b84930c';c.fillRect(0,0,view.w,view.h);c.strokeStyle='#5fbdc45c';c.lineWidth=1;c.strokeRect(.5,.5,view.w-1,view.h-1);}
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(surface,0,0,width,height);ctx.restore();
  ctx.save();ctx.font='10px ui-monospace, monospace';ctx.fillStyle='#99acb7';ctx.fillText(p.slow?'CHRONOS / 0.22×':'CHRONOS',20,26);ctx.fillStyle='#2b3a47';ctx.fillRect(20,34,104,3);ctx.fillStyle=p.slow?'#9cecdf':'#668e99';ctx.fillRect(20,34,104*p.energy,3);
  ctx.fillStyle='#6e8390';ctx.fillText(`斩击 ${p.stats.targetHits}  ·  弹反 ${p.stats.parries}`,20,55);
  if(toastAge<.8){ctx.globalAlpha=Math.min(1,(.8-toastAge)*3);ctx.fillStyle=toast.includes('接触')?'#e4b1b3':'#c1f5df';ctx.textAlign='center';ctx.fillText(toast,width/2,40);}
  if(p.hitstop>0&&debug){ctx.textAlign='right';ctx.fillStyle='#d8eddf';ctx.fillText(`HITPAUSE ${(p.hitstop*1000).toFixed(0)} ms`,width-20,26);}
  ctx.restore();
 }
 function getState(){return {x:p.x,y:p.y,vx:p.vx,vy:p.vy,face:p.face,grounded:p.grounded,wall:p.wall,wallJumpAge:p.wallJumpAge,action:p.action,actionAge:p.actionAge,time:p.time,realTime:p.realTime,timeScale:p.timeScale,slow:p.slow,energy:p.energy,section:p.section,animation:describeAnimation(art,p),attack:p.attack?{...p.attack}:null,roll:p.roll?{...p.roll}:null,invulnerable:p.invulnerable,hitstop:p.hitstop,attackCooldown:p.attackCooldown,rollCooldown:p.rollCooldown,stats:{...p.stats},bullets:p.bullets.map(b=>({...b})),events:p.eventHistory.slice(-15),camera:{...camera},artReady:true,soundReady:audio.ready};}
 reset();
 return {fixedStep:1/120,step,draw,reset,sections,options,getState,clearInput:()=>clearInput(p),setOption(){},setMuted:muted=>audio.setMuted(muted),unlockAudio:()=>audio.unlock(),getAudioStream:()=>audio.capture?.stream,dispose(){disposed=true;effects=[];echoes=[];audio.dispose();}};
}
