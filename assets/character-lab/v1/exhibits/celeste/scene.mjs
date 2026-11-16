import {Game,DT} from './source/physics.js';
import {Audio} from './source/audio.js';
import {Renderer} from './neutral-renderer.js';
import {createRoom,sections} from './rooms.mjs';
export {sections};
export const options=[];
const SOURCE_SHA='e177c9414a48ed13a98a7ad1563dcf1eff5ed75f';
const labels={'dash-freeze':'冲刺准备',dash:'冲刺',climb:'抓墙',dead:'复位'};
export async function createScene({canvas,onStatus=()=>{}}={}){
 const frame=document.createElement('canvas'),renderer=new Renderer(frame),audio=new Audio({persist:false});
 audio.muted=true;
 let previous={},section='jump',status='',trace=[],lastOptions={debug:false,trace:false},disposed=false;
 const game=new Game(createRoom(section),{onEvent:e=>audio.event(e)});
 function render(dt){game.trainingOverlay={enabled:lastOptions.trace,trace,markers:[]};renderer.render(game,dt);}
 function reset(id=section){section=sections.some(s=>s.id===id)?id:'jump';game.reset(createRoom(section));previous={};trace=[];renderer.reset();render(0);}
 function step(dt,input={}){
  if(disposed)return;
  const x=(input.right?1:0)-(input.left?1:0),y=(input.down?1:0)-(input.up?1:0);
  game.step({x,y,aimX:x,aimY:y,jump:!!input.jump,jumpPressed:!!input.jump&&!previous.jump,dash:!!input.dash,dashPressed:!!input.dash&&!previous.dash,grab:!!input.grab});
  previous={...input};const p=game.player;
  trace.push({x:p.x+4,y:p.y+p.h});if(trace.length>240)trace.shift();
  const frozen=p.state==='dash-freeze'||p.launchFreeze>0||p.dreamFreeze>0;
  render(frozen?0:DT);
  const action=labels[p.state]||(p.grounded?(Math.abs(p.vx)>10?'跑动':'站立'):p.wall&&p.vy>0?'贴墙':p.vy<0?'跳跃':'下落');
  if(action!==status){status=action;onStatus(status);}
 }
 function draw(ctx,{width,height,debug=false,trace:showTrace=false}={}){
  if(debug!==lastOptions.debug||showTrace!==lastOptions.trace){lastOptions={debug,trace:showTrace};render(0);}
  const scale=Math.min(width/320,height/180),w=320*scale,h=180*scale,x=(width-w)/2,y=(height-h)/2;
  ctx.fillStyle='#343434';ctx.fillRect(0,0,width,height);ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,x,y,w,h);
  if(debug){const p=game.player;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.strokeStyle='#b9e7d2';ctx.lineWidth=.5;ctx.strokeRect(p.x-renderer.camera.x,p.y-renderer.camera.y,p.w,p.h);ctx.fillStyle='#eeeeee';ctx.font='5px monospace';ctx.fillText(`${p.vx.toFixed(0)}, ${p.vy.toFixed(0)}`,Math.min(265,p.x+10),Math.max(10,p.y-12));ctx.restore();}
  const p=game.player;
  if(p.state==='climb'||p.stamina<110){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#222';ctx.fillRect(p.x-5,p.y,2,12);ctx.fillStyle=p.stamina<20?'#e6a39a':'#b5d7be';ctx.fillRect(p.x-5,p.y+12-p.stamina/110*12,2,p.stamina/110*12);ctx.restore();}
 }
 reset();
 return{fixedStep:DT,step,draw,reset,clearInput(){previous={};const p=game.player;p.jumpBuffer=p.dashBuffer=p.demoBuffer=0;},getState(){const p=game.player;return{...p,mode:p.state,action:status,section,time:game.time,source:'huggon1/eri',sourceSha:SOURCE_SHA,techniques:[...game.techniques],frames:game.frames};},setOption(){},setMuted(v){if(audio.muted!==Boolean(v))audio.toggle();},unlockAudio(){audio.unlock();},dispose(){disposed=true;audio.ctx?.close();}};
}
