import {LEVEL,TUNING,createPlayer,resetPlayer,stepPlayer,playerBounds} from './physics.mjs';
import {loadCharacter,drawActor,headPosition,poseFor,frameFor} from './character.mjs';
export {drawActor} from './character.mjs';
export const sections=[{id:'run',label:'跑动'},{id:'jump',label:'二段跳'},{id:'roll',label:'翻滚'},{id:'climb',label:'攀越'},{id:'attack',label:'剑击'}];
export const options=[];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t;
const rand=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
function line(c,x,y,a,b,color){c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.stroke();}
function stone(c,x,y,w,h){c.fillStyle='#2c333e';c.fillRect(x,y,w,h);c.fillStyle='#52606d';c.fillRect(x,y,w,2);c.strokeStyle='#414c59';c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,h-1);}
export async function createScene({canvas,onStatus=()=>{}}={}){
 const character=await loadCharacter(),surface=document.createElement('canvas'),c=surface.getContext('2d'),p=createPlayer();
 let particles=[],echoes=[],smoke=[],jumpBursts=[],camera={x:0,y:130},cameraReady=false,disposed=false,lastAction='',muted=true,audio=null,buffers={},audioReady=null;
 let hit=0,lastWidth=0,lastHeight=0,frame=0;
 async function unlockAudio(){
  if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();
  await audio.resume();
  audioReady??=Promise.all(Object.entries(character.sounds).map(async([k,v])=>{try{buffers[k]=await audio.decodeAudioData(v.slice(0));}catch{}}));await audioReady;
 }
 function sound(type){if(muted||!audio||audio.state!=='running'||!buffers[type])return;const src=audio.createBufferSource(),gain=audio.createGain();src.buffer=buffers[type];gain.gain.value=type==='hit'?.22:.15;src.connect(gain);gain.connect(audio.destination);src.start();}
 function burst(e){
  if(e.type==='double')jumpBursts.push({x:e.x,y:e.y,age:0});
  const count=e.type==='impact'?22:e.type==='double'?14:e.type==='strike'?0:7;
  for(let i=0;i<count;i++){const n=p.time*100+i;particles.push({x:e.x+(rand(n)*12-6),y:e.y-(e.type==='double'?5:1),vx:(rand(n+3)-.5)*(e.type==='impact'?210:85),vy:-20-rand(n+6)*75,life:.18+rand(n+8)*.18,max:.36,size:1+Math.floor(rand(n+9)*2),color:e.type==='double'?'#d8bd85':'#839ba5'});}
  const s={jump:'jump',double:'jump',roll:'roll',strike:p.combo===2?'saber1':'sword',impact:'hit'}[e.type];if(s)sound(s);
 }
 function reset(section='run'){resetPlayer(p,section);particles=[];echoes=[];smoke=[];jumpBursts=[];hit=0;frame=0;cameraReady=false;lastAction='';onStatus('idle');}
 function step(dt,input){
  if(disposed)return;stepPlayer(p,input,dt);frame++;
  for(const e of p.events){burst(e);if(e.type==='strike'&&Math.abs(p.x-380)<105&&(380-p.x)*p.face>0&&p.y>600){hit=.18;sound('hit');for(let i=0;i<15;i++)particles.push({x:380,y:617,vx:(60+rand(i)*130)*p.face,vy:(rand(i+9)-.6)*170,life:.16+rand(i)*.1,max:.26,size:1+i%2,color:i%2?'#fff0bb':'#bfe7e2'});}}
  if(p.action!==lastAction){lastAction=p.action;onStatus(p.action);}
  if(p.roll>0&&frame%4===0)echoes.push({state:{...p},life:.12});
  const h=headPosition(p,character);if(frame%2===0)smoke.push({x:h.x-p.face*4,y:h.y-10,life:.18,max:.18,size:7});
  jumpBursts=jumpBursts.filter(e=>(e.age+=dt)<.24);
  smoke=smoke.filter(e=>(e.life-=dt)>0);smoke.forEach(e=>{e.y-=dt*15;e.size+=dt*8;});
  echoes=echoes.filter(e=>(e.life-=dt)>0);particles=particles.filter(q=>(q.life-=dt)>0);particles.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=230*dt;});hit=Math.max(0,hit-dt);
  const vH=540,vW=Math.max(160,Math.round((canvas?.clientWidth||960)/(canvas?.clientHeight||540)*vH));camera.x=mix(camera.x,clamp(p.x-vW*.4,0,Math.max(0,LEVEL.width-vW)),1-Math.exp(-dt*7));camera.y=mix(camera.y,clamp(p.y-400,20,LEVEL.height-vH),1-Math.exp(-dt*5));
 }
 function draw(ctx,{width,height,debug=false,trace=false}={}){
  if(disposed)return;const viewH=540,viewW=Math.max(160,Math.round(width/height*viewH));surface.width=viewW;surface.height=viewH;c.imageSmoothingEnabled=false;
  const tx=clamp(p.x-viewW*.4,0,Math.max(0,LEVEL.width-viewW)),ty=clamp(p.y-400,20,LEVEL.height-viewH);
  if(!cameraReady||width!==lastWidth||height!==lastHeight){camera={x:tx,y:ty};cameraReady=true;lastWidth=width;lastHeight=height;}
  c.fillStyle='#171c24';c.fillRect(0,0,viewW,viewH);c.save();c.translate(-Math.round(camera.x),-Math.round(camera.y));
  if(debug){for(let x=Math.floor(camera.x/50)*50;x<camera.x+viewW;x+=50)line(c,x,camera.y,x,camera.y+viewH,'#28313c');for(let y=Math.floor(camera.y/50)*50;y<camera.y+viewH;y+=50)line(c,camera.x,y,camera.x+viewW,y,'#28313c');}
  stone(c,0,0,36,LEVEL.height);stone(c,LEVEL.width-36,0,36,LEVEL.height);stone(c,0,0,LEVEL.width,28);stone(c,0,LEVEL.ground,LEVEL.width,100);
  LEVEL.blocks.forEach(b=>{stone(c,b.x,b.y,b.w,b.h);if(b.oneWay){c.fillStyle='#6a7a89';c.fillRect(b.x,b.y,b.w,2);}});
  c.save();c.translate(380,LEVEL.ground);c.rotate(Math.sin(p.time*39)*hit*.15);c.fillStyle='#465461';c.fillRect(-3,-67,6,67);c.fillStyle=hit?'#f4edcf':'#687b87';c.fillRect(-14,-67,28,35);c.strokeStyle='#91a6ad';c.strokeRect(-14.5,-67.5,29,36);c.fillStyle='#465461';c.fillRect(-20,-3,40,3);c.restore();
  if(trace&&p.history.length>1){c.strokeStyle='#66dacc70';c.lineWidth=1;c.beginPath();p.history.forEach((a,i)=>i?c.lineTo(a.x,a.y):c.moveTo(a.x,a.y));c.stroke();}
  for(const e of smoke){c.globalAlpha=e.life/e.max*.45;c.fillStyle='#6c3944';c.fillRect(Math.round(e.x-e.size/2),Math.round(e.y-e.size/2),Math.round(e.size),Math.round(e.size));}c.globalAlpha=1;
  for(const e of echoes)drawActor(c,e.state,character,e.state.x,e.state.y,e.life*.95,true);
  if(p.grounded){c.fillStyle='#030b1260';c.beginPath();c.ellipse(p.x,p.y+1,p.roll>0?25:17,3,0,0,Math.PI*2);c.fill();}
  for(const e of jumpBursts){
   const t=e.age/.24;
   if(e.age<.085){const w=22+e.age*100;c.globalAlpha=1-e.age*4;c.fillStyle='#ddbf87';for(let dx=-w;dx<w;dx+=2){const top=e.y-9+Math.abs(dx)/w*17;c.fillRect(Math.round(e.x+dx),Math.round(top),2,Math.max(1,Math.round(e.y+12-top)));}}
   c.globalAlpha=(1-t)*.8;c.strokeStyle='#e5ce98';c.lineWidth=1.5;c.beginPath();c.ellipse(e.x,e.y+10,18+t*28,3+t*3,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;
  }
  drawActor(c,p,character,p.x,p.y);
  for(const q of particles){c.globalAlpha=q.life/q.max;c.fillStyle=q.color;c.fillRect(Math.round(q.x),Math.round(q.y),q.size,q.size);}c.globalAlpha=1;
  if(debug){const box=playerBounds(p);c.strokeStyle='#83f8db';c.lineWidth=1;c.strokeRect(box.x,box.y,box.w,box.h);c.fillStyle='#07141dc9';c.fillRect(camera.x+16,camera.y+16,240,72);c.fillStyle='#a6eadc';c.font='11px ui-monospace, monospace';const pose=frameFor(character.manifest,poseFor(p));c.fillText(`${pose.clip} ${pose.index+1}`,camera.x+26,camera.y+35);c.fillText(`${p.action}  vx ${Math.round(p.vx)} vy ${Math.round(p.vy)}`,camera.x+26,camera.y+53);c.fillText(`x ${Math.round(p.x)} y ${Math.round(p.y)} jump ${p.jumps}`,camera.x+26,camera.y+71);}
  c.restore();ctx.imageSmoothingEnabled=false;ctx.drawImage(surface,0,0,width,height);
 }
 return {fixedStep:1/60,step,draw,reset,sections,options,clearInput(){p.previous={};p.buffer=0;p.attackQueued=false;},getState(){const pose=frameFor(character.manifest,poseFor(p));return {...Object.fromEntries(['x','y','vx','vy','face','action','actionAge','grounded','jumps','roll','rollAge','rollRecovery','rollCooldown','climb','crouched','slam','time','runTime','doubleAge','attack','attackAge','combo','attackSerial'].map(k=>[k,p[k]])),animation:{clip:pose.clip,frame:pose.index,source:pose.frame.name},position:{x:p.x,y:p.y},camera:{...camera},physics:{...TUNING}};},dispose(){disposed=true;particles=[];echoes=[];smoke=[];jumpBursts=[];audio?.close();},setMuted(v){muted=v;},unlockAudio,setOption(){}};
}
