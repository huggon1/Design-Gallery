import {createWorld,advance,resetWorld,clearInput,CLIPS,SECTIONS,frameOf,phaseOf,supportFor,animationTime,TUNING,WORLD} from './controller.mjs';
import {LANDMARKS,DUMMIES,SOLIDS} from '../world.mjs';
import {drawCharacter,disposeCharacter,loadCharacterAsset,characterAssetInfo} from './character.mjs';
import {getCharacterCanvas} from './character.mjs';
import {loadSwordSwipe,drawSwordSwipe} from '../research/pointed-swipe/sword-swipe.mjs';
import {createAudio} from '../audio.mjs';
import {loadSwordArcs,drawSwordArc} from '../research/pointed-swipe/sword-arcs.mjs';
export const sections=SECTIONS;
export const options=[{id:'paths',label:'位移轨迹',default:false},{id:'anchors',label:'角色挂点',default:false}];
const mix=(a,b,t)=>a+(b-a)*t,angleMix=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export async function createScene({canvas,onStatus=()=>{}}={}){
 const [swipe,arcs]=await Promise.all([loadSwordSwipe(),loadSwordArcs(),loadCharacterAsset()]);const w=createWorld(),audio=createAudio(),settings={paths:false,anchors:false,samples:false};let disposed=false,view={width:1000,height:640,s:1,cx:500,cy:330,camX:0,camY:0},lastEvent=-1,lastAction='',ghosts=[],lastGhost=-1;
 function step(dt,input={}){if(disposed)return;let aimWorld=input.aim?.active?{x:(input.aim.x*view.width-view.cx)/view.s+view.camX,y:(input.aim.y*view.height-view.cy)/view.s/.56+view.camY,active:true}:null;if(aimWorld){const sx=input.aim.x*view.width,sy=input.aim.y*view.height;let nearest=40*view.s;for(const d of DUMMIES){const dx=view.cx+(d.x-view.camX)*view.s-sx,dy=view.cy+(d.y-view.camY)*.56*view.s-38*.87*view.s-sy,dist=Math.hypot(dx,dy);if(dist<nearest){nearest=dist;aimWorld={x:d.x,y:d.y,active:true};}}}advance(w,dt,{...input,aimWorld});for(const e of w.events)if(e.time>lastEvent)audio.play(e.type);if(w.events.length)lastEvent=w.events.at(-1).time;if(lastAction!==w.action){lastAction=w.action;onStatus(CLIPS[w.action].label);}}
 function draw(ctx,{width,height,interpolationAlpha=1,debug=false,trace=false}={}){
  if(disposed)return;const a=interpolationAlpha,s=Math.min(width/1845,height/1040),cx=width*.5,cy=height*.56,camX=mix(w.prevCameraX,w.cameraX,a),camY=mix(w.prevCameraY,w.cameraY,a),px=mix(w.prevX,w.x,a),py=mix(w.prevY,w.y,a),angle=angleMix(w.prevAngle,w.angle,a),time=w.action===w.prevAction?mix(w.prevActionTime,w.actionTime,a):w.actionTime,animTime=w.action==='run'?animationTime(w):time;
  view={width,height,s,cx,cy,camX,camY};ctx.fillStyle='#1c2925';ctx.fillRect(0,0,width,height);ctx.save();ctx.translate(cx-camX*s+Math.sin(w.time*139)*w.cameraShake,cy-camY*.56*s+Math.cos(w.time*121)*w.cameraShake*.5);ctx.scale(s,s);
  const ground=(x,y,z=0)=>[x,y*.56-z*.87];
  function polygon(pts,fill,stroke=null){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...ground(...p)):ctx.moveTo(...ground(...p)));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
  const minX=Math.max(WORLD.left,camX-width/s/2-160),maxX=Math.min(WORLD.right,camX+width/s/2+160),minY=Math.max(WORLD.top,camY-height/s/.56*.7-180),maxY=Math.min(WORLD.bottom,camY+height/s/.56*.7+180);
  for(let y=Math.floor(minY/160)*160;y<maxY;y+=160)for(let x=Math.floor(minX/160)*160;x<maxX;x+=160){const k=Math.abs(Math.floor(x/160)*17+Math.floor(y/160)*13)%7;polygon([[x+1,y+1],[x+159,y+1],[x+159,y+159],[x+1,y+159]],['#303c31','#334034','#303d33','#344034','#354137','#303b32','#303d33'][k],'#28372e');if(k===3){ctx.strokeStyle='#56604a44';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+43,(y+47)*.56);ctx.lineTo(x+77,(y+92)*.56);ctx.lineTo(x+123,(y+104)*.56);ctx.stroke();}}
  // Continuous roads connect every point to the common spawn, across camera boundaries.
  ctx.strokeStyle='#70724e38';ctx.lineWidth=72;ctx.lineCap='round';for(const p of LANDMARKS){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(p.x,p.y*.56);ctx.stroke();}ctx.lineCap='butt';
  ctx.strokeStyle='#b49c6266';ctx.lineWidth=2;ctx.setLineDash([8,25]);for(const p of LANDMARKS){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(p.x,p.y*.56);ctx.stroke();}ctx.setLineDash([]);
  for(const p of LANDMARKS){if(p.x<minX-200||p.x>maxX+200||p.y<minY-200||p.y>maxY+200)continue;ctx.strokeStyle=p.id==='spawn'?'#b8a46b':'#7d8b6955';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y*.56,120,67.2,0,0,7);ctx.stroke();ctx.beginPath();ctx.ellipse(p.x,p.y*.56,108,60.5,0,0,7);ctx.stroke();ctx.textAlign='center';ctx.font='16px system-ui';ctx.fillStyle='#b9bd98';ctx.fillText(p.label,p.x,p.y*.56+92);}
  polygon([[WORLD.left,WORLD.top],[WORLD.right,WORLD.top],[WORLD.right,WORLD.bottom],[WORLD.left,WORLD.bottom]],'#0000','#98875e');
  if(settings.paths||trace){ctx.lineWidth=2;for(let i=1;i<w.trace.length;i++){const x=w.trace[i-1],y=w.trace[i];ctx.strokeStyle=y.action==='dash'?'#ee8457aa':'#90c9ac88';ctx.beginPath();ctx.moveTo(x.x,x.y*.56);ctx.lineTo(y.x,y.y*.56);ctx.stroke();}}
  ghosts=ghosts.filter(g=>w.time-g.time<.16);for(const g of ghosts){ctx.globalAlpha=(1-(w.time-g.time)/.16)*.2;ctx.drawImage(g.image,g.x-187.5,g.y*.56-170,375,225);}ctx.globalAlpha=1;
  const props=[...SOLIDS.map(p=>({...p,type:'column'})),...DUMMIES.map(p=>({...p,type:'dummy'})),{id:'north',x:-1600,y:-1620,r:37,type:'column'},{x:px,y:py,type:'hero'}].filter(p=>p.type==='hero'||p.x>minX-120&&p.x<maxX+120&&p.y>minY-120&&p.y<maxY+220).sort((a,b)=>a.y-b.y);
  for(const p of props){if(p.type==='hero'){
   const anchors=drawCharacter(ctx,{x:px,y:py*.56,angle,clip:w.action,time:animTime,transition:w.transition,debug:debug||settings.anchors,studySamples:settings.samples});const c=CLIPS[w.action],u=time/c.duration,attack=['slash-1','slash-2','thrust','dash-strike'].includes(w.action),world=v=>({x:px-v[0]*Math.cos(angle)+v[1]*Math.sin(angle),y:py+v[0]*Math.sin(angle)+v[1]*Math.cos(angle),z:v[2]});
   if(attack){
    const {grip,tip}=anchors.bladeScreen;
    if(w.action==='slash-1'||w.action==='slash-2'){
     drawSwordArc(ctx,arcs,{clip:w.action,elapsed:time-c.duration*c.stages[0],x:px,y:py*.56,
      gripX:px+grip[0],gripY:py*.56+grip[1],tipX:px+tip[0],tipY:py*.56+tip[1],
      angle:w.rootAngle,standingHeight:98});
    }else if(w.action==='thrust'){
     const t=(u-c.stages[0])/(c.stages[1]-c.stages[0]);
     if(t>0&&t<1){
      ctx.save();ctx.translate(px,py*.56);ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
      const pulse=Math.sin(t*Math.PI);
      for(const [color,width] of [['#ff7023',8],['#ffe3a0',3.4],['#fffdea',1.4]]){
       ctx.strokeStyle=color;ctx.globalAlpha=pulse*.78;ctx.lineWidth=width*pulse;
       ctx.beginPath();ctx.moveTo(...grip);ctx.lineTo(...tip);ctx.stroke();
      }ctx.restore();
     }
    }
   }
   if(w.action==='dash-strike'&&time<13/60){
    const {grip,tip}=anchors.bladeScreen;
    drawSwordSwipe(ctx,swipe,{x:px+grip[0],y:py*.56+grip[1],tipX:px+tip[0],tipY:py*.56+tip[1],screenAngle:Math.atan2(.56*Math.cos(w.rootAngle),Math.sin(w.rootAngle)),time,standingHeight:98});
   }
   if(w.dashMotion&&w.time-lastGhost>.033){lastGhost=w.time;const image=document.createElement('canvas');image.width=375;image.height=225;image.getContext('2d').drawImage(getCharacterCanvas(),0,0,375,225);ghosts.push({image,x:px,y:py,time:w.time});}
   if(anchors.tip&&w.time!==w.trajectory.at(-1)?.time){w.trajectory.push({time:w.time,action:w.action,root:{x:px,y:py},hand:world(anchors.hand),tip:world(anchors.tip)});if(w.trajectory.length>600)w.trajectory.shift();}
  }else if(p.type==='column'){
   const r=p.r||34,h=p.id==='north'?125:65;ctx.fillStyle='#0d1c18aa';ctx.beginPath();ctx.ellipse(p.x+12,p.y*.56+5,r+13,r*.52,0,0,7);ctx.fill();polygon([[p.x-r,p.y-r],[p.x+r,p.y-r],[p.x+r,p.y+r],[p.x-r,p.y+r]],'#6b7b63','#20352a');polygon([[p.x-r*.8,p.y+r*.8],[p.x+r*.8,p.y+r*.8],[p.x+r*.8,p.y+r*.8,h],[p.x-r*.8,p.y+r*.8,h]],'#4c604c','#22382c');polygon([[p.x+r*.8,p.y-r*.8],[p.x+r*.8,p.y+r*.8],[p.x+r*.8,p.y+r*.8,h],[p.x+r*.8,p.y-r*.8,h]],'#344f3e');polygon([[p.x-r,p.y-r,h],[p.x+r,p.y-r,h],[p.x+r,p.y+r,h],[p.x-r,p.y+r,h]],'#8b9476','#a9ad80');ctx.fillStyle='#b1b88d';ctx.textAlign='center';ctx.font='27px Georgia';ctx.fillText('Ω',p.x,p.y*.56-h*.87+9);
  }else{
   const hit=w.lastHit?.id===p.id?w.lastHit:null,age=hit?w.time-hit.time:9,shake=age<.15?Math.sin(age*130)*(1-age/.15)*5:0,x=p.x+shake,y=p.y;ctx.fillStyle='#101f1899';ctx.beginPath();ctx.ellipse(x,y*.56+3,27,13,0,0,7);ctx.fill();polygon([[x-8,y-5],[x+8,y-5],[x+8,y-5,65],[x-8,y-5,65]],'#796449','#302c23');ctx.strokeStyle='#aa9270';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x-31,y*.56-34);ctx.lineTo(x+31,y*.56-34);ctx.stroke();ctx.fillStyle=age<.08?'#ffe0a2':'#b39b76';ctx.beginPath();ctx.ellipse(x,y*.56-40,20,25,0,0,7);ctx.fill();ctx.strokeStyle='#954a39';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y*.56-40,12,16,0,0,7);ctx.stroke();if(age<.5){ctx.fillStyle='#ffe7ad';ctx.font='bold 19px Georgia';ctx.textAlign='center';ctx.fillText(hit.clip==='thrust'?'30':hit.clip==='slash-2'?'25':'20',x,y*.56-83-age*30);}
  }}
  for(const p of w.particles){ctx.fillStyle=p.life>.2?'#fff2cc':'#ed9950';ctx.globalAlpha=Math.min(1,p.life*5);const q=ground(p.x,p.y,p.z);ctx.fillRect(q[0],q[1],3,3);}ctx.globalAlpha=1;ctx.restore();
  ctx.textAlign='left';ctx.fillStyle='#e0d3ad';ctx.font='17px Georgia';ctx.fillText('ZAGREUS · STYGIUS',22,30);ctx.fillStyle='#9aad96';ctx.font='11px system-ui';ctx.fillText('一片练习场 · 沿路走到每处标记，再回到出生圆环',22,51);ctx.fillText(settings.samples?'固定角度实录取样 · 其余角度为重建':'基础剑 · 多向姿态重建',22,69);
  const mw=126,mh=94,mx=width-mw-20,my=20;ctx.fillStyle='#12241bd9';ctx.fillRect(mx,my,mw,mh);ctx.strokeStyle='#687656';ctx.strokeRect(mx,my,mw,mh);for(const p of LANDMARKS){ctx.fillStyle=w.visited.includes(p.id)?'#c0ad76':'#6b8e70';ctx.beginPath();ctx.arc(mx+(p.x-WORLD.left)/WORLD.width*mw,my+(p.y-WORLD.top)/WORLD.height*mh,2.5,0,7);ctx.fill();}ctx.fillStyle='#f5ba89';ctx.beginPath();ctx.arc(mx+(px-WORLD.left)/WORLD.width*mw,my+(py-WORLD.top)/WORLD.height*mh,3,0,7);ctx.fill();
  ctx.fillStyle='#e0d3ad';ctx.font='13px system-ui';ctx.fillText(CLIPS[w.action].label,22,height-37);ctx.fillStyle='#94ad99';ctx.font='11px monospace';ctx.fillText(`${phaseOf(w.action,time)} · ${w.visited.length}/${LANDMARKS.length} 处 · 命中 ${w.hits}`,22,height-18);ctx.textAlign='right';ctx.fillStyle='#9bad96';ctx.fillText(`冲刺 ${w.charges}/2  ·  ${Math.hypot(w.vx,w.vy).toFixed(0)} u/s`,width-22,height-24);
 }
 return {fixedStep:1/120,sections,options,step,draw,reset(area){resetWorld(w,area);lastEvent=-1;ghosts=[];lastGhost=-1;},clearInput(){clearInput(w);},getState(){return {x:w.x,y:w.y,vx:w.vx,vy:w.vy,time:w.time,action:w.action,actionTime:w.actionTime,angle:w.angle,charges:w.charges,recharge:w.recharge,hits:w.hits,dashCount:w.dashCount,hitstop:w.hitstop,section:w.section,visited:[...w.visited],camera:{x:w.cameraX,y:w.cameraY},world:WORLD,view,animation:{clip:w.action,frame:frameOf(w.action,animationTime(w)),totalFrames:CLIPS[w.action].frames,phase:phaseOf(w.action,w.actionTime),source:characterAssetInfo().route,support:supportFor(w.action,w.actionTime)},characterAsset:characterAssetInfo(),events:w.events.slice(-8),trace:w.trace.slice(-120),trajectory:w.trajectory.slice(-120),bladeTrail:[]};},setOption(id,v){if(id in settings)settings[id]=!!v;},setMuted(v){audio.setMuted(v);},unlockAudio(){audio.unlock();},getAudioStream(){return audio.getStream();},dispose(){disposed=true;audio.dispose();disposeCharacter();w.particles=[];ghosts=[];}};
}
