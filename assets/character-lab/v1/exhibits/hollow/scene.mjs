import {WORLD,SPAWNS,sections} from './world.mjs';
export {sections};
export const options=[{id:'shade',label:'暗影冲刺',type:'toggle',value:true}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const noise=n=>{const t=Math.sin(n*127.1+311.7)*43758.5453;return t-Math.floor(t)};
const named={Idle:'站立',Run:'移动',Airborne:'跳跃',Land:'落地','Double Jump':'帝王之翼','Wall Slide':'滑墙',Walljump:'螳螂爪',Dash:'冲刺','Shadow Dash':'暗影冲刺',Slash:'横斩',SlashAlt:'横斩',UpSlash:'上斩',DownSlash:'下斩','Wall Slash':'墙上挥刀'};
export async function createScene({canvas,onStatus=()=>{}}={}){
 const [Controller,Art,Abilities,Audio]=await Promise.all([import('./source/arena/controller.mjs'),import('./source/lab/art.mjs'),import('./source/arena/abilities.mjs'),import('./source/arena/audio.mjs')]);
 await Art.loadArt();
 const audio=new Audio.ArenaAudio();audio.volume=.38;await audio.preload();audio.setEnabled(false);
 const abort=new AbortController();const unlock=()=>audio.unlock();
 canvas?.addEventListener('pointerdown',unlock,{signal:abort.signal});window.addEventListener('keydown',unlock,{signal:abort.signal});
 let p=Controller.createPlayer(SPAWNS.run),fx=[],trail=[],clock=0,footClock=0,shade=true,sound=false,disposed=false,section='run',lastStatus='',hitTime=-9,hitCount=0;
 let camera={x:12.6,y:7.6},view={width:1000,height:580,ppu:40},cameraSnap=true;
 let previousPose={x:p.x,y:p.y,camera:{...camera}},presentation={x:p.x,y:p.y,camera:{...camera},alpha:1};
 function resetInterpolation(){previousPose={x:p.x,y:p.y,camera:{...camera}};}
 const events=[];
 const addFx=(kind,e,life=.4,more={})=>fx.push({kind,x:e.x,y:e.y,facing:e.facing??p.renderFacing,time:0,life,...more});
 function soundEvent(e){
  if(!sound)return;
  const names={jump:'hero_jump',doubleJump:'hero_wings',wallJump:'hero_wall_jump',land:'hero_land_soft',hit:'enemy_damage',shadowReady:'hero_shade_dash_2'};
  if(e.type==='dash')audio.play(e.shadow?'hero_shade_dash_1':'hero_dash',.6);
  else if(e.type==='slash')audio.play(e.alt?'sword_3':'sword_2',.65);
  else if(names[e.type])audio.play(names[e.type],e.type==='land'?.3:.55);
 }
 function handle(e){
  events.push({...e});if(events.length>80)events.shift();soundEvent(e);
  if(e.type==='doubleJump')addFx('wingWitness',e,.375);
  if(e.type==='jump')addFx('jumpdust',e,.4,{y:e.y+Art.FOOT_OFFSET-2.03,scale:1.3477635});
  if(e.type==='wallJump')addFx('wallPuff',e,.3,{facing:p.wallKickDirection});
  if(e.type==='dash'&&e.shadow)fx.push(...Abilities.shadowEffectEvents(e));
  if(e.type==='dash'&&!e.shadow)addFx('dashdust',e,.36,{y:e.y+.3,scale:1.1});
  if(e.type==='hit'){hitTime=clock;hitCount++;addFx('hit',e,.35);}
  if(e.type==='land')for(let i=0;i<7;i++)addFx('particle',e,.45,{vx:(noise(i+p.ticks)-.5)*5,vy:noise(i+7)*2+.4,r:.02+noise(i+4)*.04});
 }
 function step(dt,input={}){
  if(disposed)return;
  resetInterpolation();
  clock+=dt;for(const e of fx){e.time+=dt;if(e.kind==='particle'){e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy-=9*dt;}}fx=fx.filter(e=>e.time<e.life);
  const raw={move:(input.right?1:0)-(input.left?1:0),up:!!input.up,down:!!input.down,jump:!!input.jump,dash:!!input.dash,attack:!!input.attack,pressed:input.pressed,released:input.released};
  for(const e of Controller.stepPlayer(p,raw,WORLD))handle(e);
  if(p.grounded&&Math.abs(p.vx)>1&&!p.dashing){footClock+=dt;if(footClock>.22){footClock=0;if(sound)audio.play('hero_run_footsteps_stone',.12);}}else footClock=0;
  trail.push({x:p.x,y:p.y+.6,t:clock});trail=trail.filter(t=>clock-t.t<2.2);
  const status=named[p.anim]||p.anim;if(status!==lastStatus){onStatus(status);lastStatus=status;}
  updateCamera(dt);
 }
 function updateCamera(dt){
  const halfW=view.width/(2*view.ppu),halfH=view.height/(2*view.ppu);
  const wantedX=clamp(p.x+p.facing*1.5,WORLD.bounds.left+halfW-.8,WORLD.bounds.right+.8-halfW);
  const wantedY=clamp(p.y+3.1,WORLD.bounds.bottom+halfH-1.5,WORLD.bounds.top+1-halfH);
  const factor=cameraSnap?1:1-Math.exp(-dt*6.5);
  camera.x+=(wantedX-camera.x)*factor;camera.y+=(wantedY-camera.y)*factor;cameraSnap=false;
 }
 function reset(id=section){section=SPAWNS[id]?id:'run';Controller.resetPlayer(p,{...SPAWNS[section],shadowEnabled:shade});fx=[];trail=[];events.length=0;clock=0;hitTime=-9;hitCount=0;cameraSnap=true;audio.stop();updateCamera(.02);resetInterpolation();onStatus('站立');}
 function setOption(id,value){if(id==='shade'){shade=!!value;p.shadowEnabled=shade;p.shadowCooldown=0;}if(id==='sound'){sound=!!value;audio.setEnabled(sound);if(sound)audio.unlock();}}
 function geometry(ctx,x,y,w,h){
  ctx.fillStyle='#363b41';ctx.fillRect(x,y-h,w,h);
  ctx.strokeStyle='#69727b';ctx.lineWidth=.025;ctx.strokeRect(x,y-h,w,h);
 }
 function target(ctx){
  const age=clock-hitTime,offset=age<.25?Math.sin(age*42)*Math.exp(-age*15)*.08:0;
  const t=WORLD.targets[0];ctx.save();ctx.translate(offset,0);
  ctx.strokeStyle=age<.12?'#eef2f5':'#929ba4';ctx.lineWidth=.035;
  ctx.strokeRect(t.x-t.w/2,t.y,t.w,t.h);
  ctx.beginPath();ctx.moveTo(t.x,0);ctx.lineTo(t.x,t.y);ctx.moveTo(t.x-.5,0);ctx.lineTo(t.x+.5,0);ctx.stroke();
  if(age<.12){ctx.fillStyle='#b7c4cf22';ctx.fillRect(t.x-t.w/2,t.y,t.w,t.h);}
  ctx.restore();
 }
 function draw(ctx,{width,height,dpr=1,interpolationAlpha=1,debug=false,trace=false}={}){
  if(disposed)return;const resized=width!==view.width||height!==view.height;view={width,height,ppu:Math.max(23,Math.min(52,height/14.8))};if(resized)cameraSnap=true;if(cameraSnap){updateCamera(.02);resetInterpolation();}
  const alpha=p.freezeRemaining>0?1:clamp(interpolationAlpha,0,1);
  const render={...p,x:previousPose.x+(p.x-previousPose.x)*alpha,y:previousPose.y+(p.y-previousPose.y)*alpha,facing:p.renderFacing};
  const renderCamera={x:previousPose.camera.x+(camera.x-previousPose.camera.x)*alpha,y:previousPose.camera.y+(camera.y-previousPose.camera.y)*alpha};
  presentation={x:render.x,y:render.y,camera:renderCamera,alpha};
  const ppu=view.ppu;
  ctx.save();ctx.fillStyle='#22262c';ctx.fillRect(0,0,width,height);
  ctx.translate(width/2-renderCamera.x*ppu,height/2+renderCamera.y*ppu);ctx.scale(ppu,-ppu);
  const {left,right,bottom,top}=WORLD.bounds,roomWidth=right-left;
  geometry(ctx,left-1,bottom,roomWidth+2,4);geometry(ctx,left-1,top+2,1,top-bottom+6);geometry(ctx,right,top+2,1,top-bottom+6);geometry(ctx,left-1,top+2,roomWidth+2,2);
  for(const solid of WORLD.solids)geometry(ctx,solid.x,solid.y,solid.w,solid.h);
  target(ctx);
  if(trace&&trail.length){ctx.strokeStyle='#b9defa90';ctx.lineWidth=.025;ctx.setLineDash([.06,.12]);ctx.beginPath();trail.forEach((t,i)=>i?ctx.lineTo(t.x,t.y):ctx.moveTo(t.x,t.y));ctx.stroke();ctx.setLineDash([]);}
  if(debug){ctx.strokeStyle='#87a9c429';ctx.lineWidth=.015;for(let x=left;x<=right;x++){ctx.beginPath();ctx.moveTo(x,bottom);ctx.lineTo(x,top);ctx.stroke();}for(let y=bottom;y<=top;y++){ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();}}
  Abilities.drawAbilityBack(ctx,render,clock,{effects:fx});
  Art.drawKnight(ctx,render,clock);
  Abilities.drawNailAttack(ctx,render,clock);
  Abilities.drawAbilityFront(ctx,render,clock,{effects:fx});
  for(const e of fx){if(e.kind==='jumpdust'||e.kind==='dashdust')Art.drawSpell(ctx,e,clock);else if(e.kind==='hit')Art.drawHit(ctx,e,clock);else if(e.kind==='particle'){ctx.fillStyle=`rgba(161,177,190,${1-e.time/e.life})`;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();}}
  if(debug){ctx.strokeStyle='#a8e7df';ctx.lineWidth=.025;ctx.strokeRect(render.x-p.width/2,render.y,p.width,p.height);ctx.fillStyle='#c7e5f4';ctx.save();ctx.translate(render.x+.5,render.y+1.6);ctx.scale(1,-1);ctx.font='.25px monospace';ctx.fillText(`${p.vx.toFixed(1)}, ${p.vy.toFixed(1)}`,0,0);ctx.restore();}
  ctx.restore();
  ctx.save();
  if(shade){const remaining=clamp(1-p.shadowCooldown/1.5,0,1);ctx.fillStyle='#080d18bb';ctx.fillRect(width-114,15,96,24);ctx.fillStyle=remaining>=1?'#a6c7db':'#637184';ctx.font='10px system-ui';ctx.fillText(remaining>=1?'暗影就绪':'暗影恢复',width-103,30);ctx.fillStyle='#a6c7db';ctx.fillRect(width-110,37,88*remaining,1.5);}
  ctx.restore();
 }
 function getState(){return {x:p.x,y:p.y,vx:p.vx,vy:p.vy,grounded:p.grounded,action:named[p.anim]||p.anim,anim:p.anim,animTime:p.animTime,doubleJumped:p.doubleJumped,doubleJumpTime:p.doubleJumpTime,wingsVisible:p.doubleJumpTime>=0&&p.doubleJumpTime<.375,wall:p.wall,wallSliding:p.wallSliding,wallLock:p.wallLock,dashing:p.dashing,shadowDashing:p.shadowDashing,shadowCooldown:p.shadowCooldown,dashCooldown:p.dashCooldown,airDashed:p.airDashed,attack:p.attack?.kind??null,section,hitCount,time:clock,events:events.slice(-12),camera:{...camera},presentation:{...presentation,camera:{...presentation.camera}},soundReady:audio.ready,artReady:Art.assetStatus.loaded};}
 function dispose(){disposed=true;abort.abort();audio.stop();audio.context?.close();fx=[];trail=[];}
 return {fixedStep:Controller.FIXED_DT,step,draw,reset,getState,dispose,setOption,sections,options,resetInterpolation,clearInput:()=>Controller.clearInput(p),setMuted:muted=>setOption('sound',!muted),unlockAudio:unlock};
}
