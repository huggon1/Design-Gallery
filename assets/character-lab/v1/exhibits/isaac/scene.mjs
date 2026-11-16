import {loadCharacter,drawCharacter,poseFor} from './character.mjs';
import {TUNING,SECTIONS,FLOOR,createWorld,createState,stepState} from './physics.mjs';
import {loadTears,drawTear,drawSplash,TEAR_CLIP} from './tears.mjs';
export const sections=SECTIONS;
export const options=[];
const hash=n=>{const x=Math.sin(n*73.37+19.11)*48271;return x-Math.floor(x);};
const TAU=Math.PI*2;
export async function createScene({canvas,onStatus=()=>{}}={}){
  const [actor,tearAssets]=await Promise.all([loadCharacter(),loadTears()]);let p=createState(),world=createWorld(),disposed=false,muted=true,audio=null,lastStatus='';
  let view={width:880,height:540,scale:1,x:0,y:0};
  function reset(area='room'){
    const id=sections.find(s=>s.id===area)?.id||'room';p=createState(id);world=createWorld(id);lastStatus='';
  }
  function eye(s,name){const f=poseFor(actor.data,s).eyes[name];return {x:f.XPosition,y:f.YPosition};}
  function sound(kind){
    if(muted||!audio||audio.state!=='running')return;
    const start=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
    const wood=['wood','rock','wall'].includes(kind),hurt=kind==='hurt';
    osc.type=hurt?'triangle':'sine';osc.frequency.setValueAtTime(hurt?155:wood?270:kind==='land'?520:760,start);
    osc.frequency.exponentialRampToValueAtTime(hurt?75:wood?95:kind==='land'?230:390,start+.065);
    gain.gain.setValueAtTime(hurt?.1:wood?.045:.022,start);gain.gain.exponentialRampToValueAtTime(.001,start+.075);
    osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+.08);
  }
  function step(dt,input={}){
    if(disposed)return;
    let normalized=input;
    if(input.aim?.active)normalized={...input,aim:{...input.aim,x:(input.aim.x*view.width-view.x)/(view.scale*880),y:(input.aim.y*view.height-view.y)/(view.scale*540)}};
    stepState(p,world,normalized,dt,eye);p.events.forEach(e=>sound(e.type));
    if(p.action!==lastStatus){lastStatus=p.action;onStatus(({idle:'站立',walk:'行走',coast:'惯性滑行',fire:'四向发射',move_fire:'移动发射',hit:'受击反馈'})[p.action]||p.action);}
  }
  function floor(ctx){
    ctx.fillStyle='#211b1c';ctx.fillRect(0,0,880,540);
    ctx.fillStyle='#493a36';ctx.fillRect(35,47,810,455);
    ctx.fillStyle='#634b42';ctx.fillRect(48,66,784,423);
    for(let i=0;i<34;i++){
      const x=48+i*24;
      ctx.fillStyle=i%2?'#59443f':'#695047';ctx.fillRect(x,61,23,34);ctx.fillStyle='#342c2b';ctx.fillRect(x,94,23,4);
      ctx.fillStyle=i%2?'#4a3b37':'#544039';ctx.fillRect(x,480,23,25);ctx.fillStyle='#806050';ctx.fillRect(x,480,23,3);
    }
    for(let i=0;i<14;i++){
      const y=96+i*28;
      ctx.fillStyle=i%2?'#5c463e':'#614b42';ctx.fillRect(36,y,28,27);ctx.fillRect(816,y,28,27);
      ctx.fillStyle='#302827';ctx.fillRect(60,y,5,27);ctx.fillRect(816,y,5,27);
    }
    const g=ctx.createLinearGradient(0,98,0,480);g.addColorStop(0,'#72534a');g.addColorStop(.3,'#806052');g.addColorStop(1,'#765547');ctx.fillStyle=g;ctx.fillRect(65,98,751,382);
    for(let i=0;i<160;i++){
      const x=71+Math.floor(hash(i*3)*730),y=105+Math.floor(hash(i*3+1)*362);
      ctx.fillStyle=i%3?'#513c3429':'#be977923';ctx.fillRect(x,y,2+Math.floor(hash(i+4)*7),i%4?2:4);
    }
    // Fixed masonry marks and four directions keep motion easy to read.
    ctx.strokeStyle='#382a2638';ctx.lineWidth=2;
    for(let i=0;i<12;i++){
      const x=94+hash(i*7)*680,y=136+hash(i*7+1)*310;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+7,y-3);ctx.lineTo(x+14,y+3);ctx.stroke();
    }
    ctx.fillStyle='#2b222052';ctx.fillRect(65,98,751,9);ctx.fillRect(65,98,10,382);ctx.fillRect(806,98,10,382);
    ctx.fillStyle='#d3b18a80';ctx.font='11px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText('N',440,91);ctx.fillText('S',440,500);ctx.fillText('W',49,294);ctx.fillText('E',832,294);ctx.textAlign='left';
  }
  function rock(ctx,o){
    ctx.fillStyle='#241b1c66';ctx.beginPath();ctx.ellipse(o.x+2,o.y+3,o.r+4,13,0,0,TAU);ctx.fill();
    ctx.save();ctx.translate(o.x,o.y);ctx.lineWidth=3;ctx.strokeStyle='#362f2d';ctx.fillStyle='#625b52';ctx.beginPath();ctx.moveTo(-28,-6);ctx.lineTo(-23,-29);ctx.lineTo(-9,-39);ctx.lineTo(15,-36);ctx.lineTo(28,-22);ctx.lineTo(29,-3);ctx.lineTo(16,7);ctx.lineTo(-12,7);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#817867';ctx.beginPath();ctx.moveTo(-22,-27);ctx.lineTo(-7,-35);ctx.lineTo(12,-32);ctx.lineTo(20,-20);ctx.lineTo(-1,-22);ctx.lineTo(-11,-7);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#443d36';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-32);ctx.lineTo(-1,-22);ctx.lineTo(19,-20);ctx.moveTo(-1,-22);ctx.lineTo(-12,-7);ctx.lineTo(-7,5);ctx.moveTo(19,-20);ctx.lineTo(15,5);ctx.stroke();ctx.restore();
  }
  function target(ctx,t){
    const recoil=t.flash>0?Math.sin(t.flash*45)*2:0;
    ctx.save();ctx.translate(Math.round(t.x),Math.round(t.y));ctx.fillStyle='#271c1c66';ctx.beginPath();ctx.ellipse(0,2,23,8,0,0,TAU);ctx.fill();
    ctx.fillStyle='#473022';ctx.fillRect(-4,-26,8,27);ctx.fillStyle='#a5774b';ctx.fillRect(-2,-26,3,25);
    ctx.translate(recoil,-25);ctx.lineWidth=3;ctx.strokeStyle='#402d24';ctx.fillStyle=t.flash>0?'#d4a26a':'#a57850';ctx.beginPath();ctx.ellipse(0,-2,21,20,0,0,TAU);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#684934';ctx.lineWidth=2;for(let x=-14;x<20;x+=9){ctx.beginPath();ctx.moveTo(x,-14);ctx.lineTo(x+1,11);ctx.stroke();}
    ctx.strokeStyle=t.flash>0?'#efc97a':'#7d4535';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-2,13,12,0,0,TAU);ctx.stroke();ctx.beginPath();ctx.ellipse(0,-2,5,5,0,0,TAU);ctx.stroke();ctx.restore();
  }
  function enemy(ctx,e){
    if(e.health<=0)return;
    const tick=Math.floor(p.time*8)%4,bob=[0,-2,0,1][tick],sx=e.x,sy=e.y;
    ctx.save();ctx.translate(sx,sy);ctx.fillStyle='#231b1c66';ctx.beginPath();ctx.ellipse(0,1,17,7,0,0,TAU);ctx.fill();
    ctx.fillStyle='#3a2c26';ctx.fillRect(-10,-5-(tick%2)*3,8,8);ctx.fillRect(3,-5-((tick+1)%2)*3,8,8);
    ctx.translate(0,bob);ctx.fillStyle=e.flash>0?'#e9c391':'#9d805e';ctx.strokeStyle='#42362c';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-18,16,20,0,0,TAU);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#5e4938';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-32);ctx.lineTo(-6,-7);ctx.moveTo(5,-36);ctx.lineTo(7,-2);ctx.stroke();ctx.fillStyle='#3b302b';ctx.fillRect(-9,-24,5,5);ctx.fillRect(5,-24,5,5);ctx.fillRect(-3,-13,7,3);ctx.restore();
  }
  function tear(ctx,t,debug){
    ctx.fillStyle='#251f243d';ctx.beginPath();ctx.ellipse(t.x,t.y,4.5,2,0,0,TAU);ctx.fill();
    const x=Math.round(t.x),y=Math.round(t.y-t.z);drawTear(ctx,tearAssets,x,y,TUNING.scale);
    if(debug){ctx.strokeStyle='#aedee447';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,t.y);ctx.lineTo(x,y);ctx.stroke();}
  }
  function effect(ctx,e){
    const f=e.age/e.life;drawSplash(ctx,tearAssets,e.x,e.y-e.z,e.age,TUNING.scale);
    if(e.type!=='wood')return;
    ctx.save();ctx.globalAlpha=Math.max(0,1-f*2);
    for(let i=0;i<5;i++){
      const a=i/7*TAU+e.seed,dist=5+f*18,x=e.x+Math.cos(a)*dist,y=e.y-e.z+Math.sin(a)*dist*.65+f*f*12;
      ctx.fillStyle=i%2?'#d9b07b':'#6a4732';ctx.fillRect(Math.round(x),Math.round(y),i%2?3:2,i%2?4:2);
    }
    ctx.restore();
  }
  function draw(ctx,{width,height,interpolationAlpha=1,debug=false,trace=false}={}){
    if(disposed)return;
    const scale=Math.min(width/880,height/540);view={width,height,scale,x:(width-880*scale)/2,y:(height-540*scale)/2};
    ctx.save();ctx.fillStyle='#191a1b';ctx.fillRect(0,0,width,height);ctx.translate(view.x,view.y);ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;floor(ctx);
    if(trace&&p.history.length>1){ctx.strokeStyle='#b8d6c16b';ctx.lineWidth=1.5;ctx.beginPath();p.history.forEach((h,i)=>i?ctx.lineTo(h.x,h.y):ctx.moveTo(h.x,h.y));ctx.stroke();}
    const alpha=Math.max(0,Math.min(1,interpolationAlpha)),x=p.previousX+(p.x-p.previousX)*alpha,y=p.previousY+(p.y-p.previousY)*alpha;
    const objects=[...world.rocks.map(o=>({y:o.y,draw:()=>rock(ctx,o)})),...world.targets.map(o=>({y:o.y,draw:()=>target(ctx,o)})),{y,draw:()=>{
      ctx.save();if(p.invulnerable>0&&Math.floor(p.time*16)%2)ctx.globalAlpha=.5;drawCharacter(ctx,actor,p,{x,y,scale:TUNING.scale,anchors:debug});ctx.restore();
    }}];
    if(world.enemy)objects.push({y:world.enemy.y,draw:()=>enemy(ctx,world.enemy)});
    for(const t of p.tears)objects.push({y:t.y,draw:()=>tear(ctx,t,debug)});
    objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());p.effects.forEach(e=>effect(ctx,e));
    if(debug){
      ctx.strokeStyle='#a6d4b5';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p.x,p.y,TUNING.playerRadius,TUNING.playerRadius,0,0,TAU);ctx.stroke();
      for(const r of world.rocks){ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,TAU);ctx.stroke();}
      ctx.fillStyle='#18221edc';ctx.fillRect(78,108,233,57);ctx.fillStyle='#c4d6bd';ctx.font='11px ui-monospace';ctx.fillText(`${p.action}  body ${p.bodyDirection} / head ${p.headDirection}`,87,127);ctx.fillText(`v ${Math.hypot(p.vx,p.vy).toFixed(1)}  eye ${p.lastEye||'—'}  shot ${p.shots}`,87,145);
    }
    ctx.restore();
  }
  return {fixedStep:1/120,sections,options,step,draw,reset,
    clearInput(){p.previousFire={};p.fireDirection=null;},
    getState(){const pose=poseFor(actor.data,p);return {x:p.x,y:p.y,vx:p.vx,vy:p.vy,time:p.time,section:p.section,action:p.action,
      bodyDirection:p.bodyDirection,headDirection:p.headDirection,moving:p.moving,shots:p.shots,hits:p.hits,landings:p.landings,damageCount:p.damageCount,
      lastEye:p.lastEye,nextEye:p.nextEye,animation:{body:{clip:pose.bodyClip,frame:pose.body.keyframe,tick:pose.bodyTick,frameCount:10},head:{clip:pose.headClip,frame:pose.head.keyframe,tick:pose.headTick},hit:pose.hit?{clip:'Hit',frame:pose.hit[0].frame.keyframe,age:p.hitAge}:null,fps:actor.data.fps,eyes:pose.eyes},
      tears:p.tears.map(t=>({...t,clip:TEAR_CLIP})),effects:p.effects.map(e=>({...e,clip:'Poof',frame:Math.min(15,Math.floor(e.age*30))})),targets:world.targets.map(t=>({...t})),enemy:world.enemy?{...world.enemy}:null,physics:{...TUNING},
      shotLog:p.shotLog.map(t=>({...t})),history:p.history.map(h=>({...h})),audio:{muted,state:audio?.state||'locked'}};},
    setOption(){},setMuted(value){muted=Boolean(value);},async unlockAudio(){if(disposed)return;if(!audio){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(AC)audio=new AC();}if(audio?.state==='suspended')await audio.resume();},
    dispose(){disposed=true;p.tears=[];p.effects=[];audio?.close();audio=null;}
  };
}
