import {TUNING,SECTIONS,createWorld,createPlayer,resetPlayer,stepPlayer} from './physics.mjs';
import {loadCharacter,drawCharacter,animationFor} from './character.mjs';
export const sections=SECTIONS;
export const options=[];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rand=n=>{const f=Math.sin(n*12.9898+78.233)*43758.5453;return f-Math.floor(f);};

export async function createScene({canvas,onStatus=()=>{}}={}){
 const actor=await loadCharacter();let world=createWorld();const p=createPlayer(SECTIONS[0],world);
 const surface=document.createElement('canvas'),c=surface.getContext('2d');
 let disposed=false,particles=[],cameraX=0,cameraReady=false,viewWidth=640,lastWidth=0,lastHeight=0,lastAction='';
 function cameraTarget(){return clamp(p.x-viewWidth*.5,0,Math.max(0,world.width-viewWidth));}
 function reset(area='run'){
  const section=SECTIONS.find(s=>s.id===area)||SECTIONS[0];world=createWorld(section.id);resetPlayer(p,section,world);
  particles=[];cameraReady=false;lastAction='';
 }
 function puff(e){
  if(!['jump','double','wall','land','turn'].includes(e.type))return;
  const double=e.type==='double',wall=e.type==='wall',small=e.type==='turn';
  const n=small?3:double?12:9;
  for(let i=0;i<n;i++){
   const seed=p.jumpSerial*17+i+p.time;
   const angle=i/n*Math.PI*2;
   particles.push({x:e.x+(double?Math.cos(angle)*5:rand(seed)*10-5),y:e.y-(wall?8:double?8:1),
    vx:double?Math.cos(angle)*40:wall?-e.face*(15+rand(seed)*25):(rand(seed)-.5)*50,
    vy:double?Math.sin(angle)*26:-10-rand(seed+5)*25,
    age:0,life:small?.13:.22+rand(seed+7)*.07,size:small?2:3+Math.floor(rand(seed+4)*4)});
  }
 }
 function step(dt,input){
  if(disposed)return;
  stepPlayer(p,input,dt,world);
  p.events.forEach(puff);
  particles=particles.filter(q=>(q.age+=dt)<q.life);
  for(const q of particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=60*dt;}
  if(p.action!==lastAction){lastAction=p.action;onStatus(p.action);}
  if(cameraReady)cameraX+=(cameraTarget()-cameraX)*(1-Math.exp(-dt*12));
 }
 function slab(b){
  c.fillStyle=b.oneWay?'#39434d':'#303944';c.fillRect(b.x,b.y,b.w,b.h);
  c.fillStyle=b.oneWay?'#a9a18b':'#647380';c.fillRect(b.x,b.y,b.w,b.oneWay?2:1);
  if(b.oneWay){c.fillStyle='#687169';for(let x=b.x+5;x<b.x+b.w-3;x+=12)c.fillRect(x,b.y+4,4,1);}
  else {c.fillStyle='#3d4955';c.fillRect(b.x,b.y,1,b.h);}
 }
 function draw(ctx,{width,height,debug=false,trace=false}){
  if(disposed)return;
  const scale=height/world.height;
  viewWidth=Math.min(world.width,Math.ceil(width/scale));
  if(!cameraReady||lastWidth!==width||lastHeight!==height){cameraX=cameraTarget();cameraReady=true;lastWidth=width;lastHeight=height;}
  if(surface.width!==viewWidth||surface.height!==world.height){surface.width=viewWidth;surface.height=world.height;}
  c.imageSmoothingEnabled=false;
  c.fillStyle='#181f28';c.fillRect(0,0,viewWidth,world.height);
  c.save();c.translate(-Math.round(cameraX),0);
  if(world.returnLane){const lane=world.returnLane;c.fillStyle='#151c23';c.fillRect(lane.left,0,lane.right-lane.left,world.floor);}
  if(debug){c.strokeStyle='#29343e';c.lineWidth=1;for(let y=16;y<world.floor;y+=24){c.beginPath();c.moveTo(world.left,y+.5);c.lineTo(world.right,y+.5);c.stroke();}for(let x=16;x<world.right;x+=24){c.beginPath();c.moveTo(x+.5,16);c.lineTo(x+.5,world.floor);c.stroke();}}
  slab({x:0,y:0,w:16,h:world.height});slab({x:world.right,y:0,w:16,h:world.height});
  slab({x:0,y:0,w:world.width,h:16});slab({x:0,y:world.floor,w:world.width,h:32});
  world.blocks.forEach(slab);
  if(world.returnLane){
   const {left,right,gate,exit}=world.returnLane,center=(left+right)/2;
   c.strokeStyle='#59636b';c.lineWidth=1;
   for(let y=64;y<world.floor-24;y+=72){c.beginPath();c.moveTo(center-3,y);c.lineTo(center,y+3);c.lineTo(center+3,y);c.stroke();}
   c.strokeStyle='#99a092';c.beginPath();c.moveTo(left-13,gate-10);c.lineTo(left-5,gate-10);c.moveTo(left-8,gate-13);c.lineTo(left-5,gate-10);c.lineTo(left-8,gate-7);c.stroke();
   c.strokeStyle='#7e8989';c.beginPath();c.moveTo(left+1,world.floor-10);c.lineTo(left-9,world.floor-10);c.moveTo(left-6,world.floor-13);c.lineTo(left-9,world.floor-10);c.lineTo(left-6,world.floor-7);c.stroke();
  }
  if(trace&&p.history.length>1){c.strokeStyle='#70d5bd85';c.lineWidth=1;c.beginPath();p.history.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.stroke();}
  for(const q of particles){const t=q.age/q.life,size=Math.max(1,Math.round(q.size*(1-t*.6)));c.globalAlpha=t>.75?(1-t)*4:1;c.fillStyle='#f4f3e5';c.fillRect(Math.round(q.x-size/2),Math.round(q.y-size/2),size,size);}c.globalAlpha=1;
  drawCharacter(c,p,actor);
  if(debug){c.strokeStyle='#8fdec3';c.lineWidth=1;c.strokeRect(Math.round(p.x-TUNING.width/2)+.5,Math.round(p.y-TUNING.height)+.5,TUNING.width,TUNING.height);}
  c.restore();
  ctx.fillStyle='#11161d';ctx.fillRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
  const drawWidth=viewWidth*scale,offsetX=(width-drawWidth)/2;
  ctx.drawImage(surface,offsetX,0,drawWidth,height);
  if(debug){ctx.fillStyle='#0e171ee8';ctx.fillRect(offsetX+12,12,230,55);ctx.fillStyle='#acd8ca';ctx.font='11px ui-monospace,monospace';ctx.fillText(`${p.action}  vx ${Math.round(p.vx)}  vy ${Math.round(p.vy)}`,offsetX+22,33);ctx.fillText(`height ${Math.round(world.floor-p.y)}  air jump ${p.airJump}`,offsetX+22,52);}
 }
 return {fixedStep:1/120,sections,options,step,draw,reset,
  clearInput(){p.previousJump=false;p.buffer=0;},
  getState(){return {...Object.fromEntries(['x','y','vx','vy','face','action','actionAge','grounded','wall','airJump','jumpSerial','time','highest'].map(k=>[k,p[k]])),animation:animationFor(p,actor),cameraX,room:world.area,physics:{...TUNING}};},
  dispose(){disposed=true;particles=[];},setOption(){}};
}
