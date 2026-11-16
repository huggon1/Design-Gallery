import {WEAPON_ATTACHMENTS} from './attachments.mjs';
export const FIXED_STEP=1/120;
export const TUNING=Object.freeze({moveSpeed:112,rollDuration:.7,airDuration:.35,rollDistance:56,shotInterval:.25,magazine:10,reloadDuration:.96,bulletSpeed:400,bulletRange:288,damageGrace:1.1});
export const sections=[{id:'move-aim',label:'走位与瞄准'},{id:'sidearm',label:'射击与换弹'},{id:'roll-lane',label:'翻滚弹线'}];
export const ROOM={left:32,right:448,top:60,bottom:266};
export const COLUMNS=[{x:226,y:145,r:13}];
export const TARGETS=[{x:389,y:108},{x:405,y:165},{x:392,y:231}];
export const ROLL_ENDS=[.05,.11,.19,.27,.35,.43,.51,.61,.7];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function isRollInvulnerable(elapsed){return elapsed>=0&&elapsed<TUNING.airDuration;}
export function rollDistanceAt(elapsed){return TUNING.rollDistance*(1-Math.pow(1-clamp(elapsed/TUNING.rollDuration,0,1),2.2));}
export function directionFor(angle){const x=Math.cos(angle),y=Math.sin(angle);return{direction:Math.abs(x)<.38?(y<0?'back':'front'):(y<-.1?'back_right':'front_right'),mirror:x<-.01};}
export function frameForRoll(t){const i=ROLL_ENDS.findIndex(end=>t<end);return i<0?8:i;}
export function bodyClip(kind,direction,armor=1){
 if(armor!==0)return `marine_${kind}_${direction}${kind==='dodge'||direction==='back_right'?'':'_hand'}`;
 if(kind==='dodge')return `marine_dodge_${direction}_armorless`;
 if(kind==='run')return `marine_run_${direction}_armorless${direction==='back_right'?'':'_hand'}`;
 return {front:'marine_idle_front_armorless_hand',front_right:'marine_idle_front_right_hand_armorless',back:'marine_idle_back_hand_armorless',back_right:'marine_idle_back_right_armorless'}[direction];
}
export function animationFor(p){
 if(p.rollElapsed>=0){const d=directionFor(Math.atan2(p.rollY,p.rollX));return{clip:bodyClip('dodge',d.direction,p.armor),frame:frameForRoll(p.rollElapsed),count:9,...d};}
 const d=directionFor(p.angle),moving=Math.hypot(p.vx,p.vy)>1;
 // The *_hand body keeps the free hand. The aiming hand is the separate source sprite.
 return{clip:bodyClip(moving?'run':'idle',d.direction,p.armor),frame:Math.floor((moving?p.walkTime*12:p.idleTime*4))%(moving?6:4),count:moving?6:4,...d};
}
export function handAnchor(p){
 const a=animationFor(p),bob=a.clip.includes('run')?[0,1,2,0,1,2][a.frame]:[0,0,1,0][a.frame];
 return{x:p.x+(Math.cos(p.angle)<0?-4:4),y:p.y-5+(bob||0)};
}
export function weaponPoint(p,name,sprite='SPMA_idle_001'){
 const origin=handAnchor(p),points=WEAPON_ATTACHMENTS[sprite],source=points[name],primary=points.PrimaryHand;
 const relative=name==='Muzzle'?{x:9,y:-4}:source?{x:source.x-primary.x,y:primary.y-source.y}:{x:0,y:0};
 const flip=Math.cos(p.angle)<0?-1:1,x=relative.x,y=relative.y*flip,c=Math.cos(p.angle),s=Math.sin(p.angle);return{x:origin.x+x*c-y*s,y:origin.y+x*s+y*c};
}
export function createSimulation(){
 let time=0,section='move-aim',previous={},p,bullets=[],effects=[],targets=[],events=[],path=[],emitterTime=0,seed=19086;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function event(type,data={}){events.push({type,time,...data});}
 function particles(x,y,type,n=6){for(let i=0;i<n;i++){const a=random()*Math.PI*2,s=10+random()*35;effects.push({type,x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-7,life:.2+random()*.25,max:.45,spin:random()*6});}}
 function reset(id='move-aim'){
  section=sections.some(s=>s.id===id)?id:'move-aim';time=0;previous={};seed=19086;bullets=[];effects=[];events=[];path=[];emitterTime=1.2;
  p={x:section==='roll-lane'?170:128,y:section==='roll-lane'?212:188,vx:0,vy:0,angle:0,lastX:1,lastY:0,rollX:1,rollY:0,rollElapsed:-1,walkTime:0,idleTime:0,ammo:10,reloadRemaining:0,shotCooldown:0,lastShot:-10,lastLand:-10,lastArmorBreak:-10,armorBreakX:0,armorBreakY:0,hurtRemaining:0,hp:6,armor:1,hits:0,dodged:0,shots:0,rolls:0,aim:{x:380,y:180,active:false}};
  targets=TARGETS.map((t,i)=>({...t,id:i,hits:0,flash:0,tilt:0}));
 }
 function move(dx,dy){
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3));
  for(let i=0;i<count;i++){
   p.x=clamp(p.x+dx/count,ROOM.left+6,ROOM.right-6);p.y=clamp(p.y+dy/count,ROOM.top+5,ROOM.bottom-4);
   for(const c of COLUMNS){let x=p.x-c.x,y=p.y-c.y,d=Math.hypot(x,y),r=c.r+6;if(d<r){if(d<.001){x=1;y=0;d=1;}p.x=c.x+x/d*r;p.y=c.y+y/d*r;}}
  }
 }
 function beginReload(){if(p.reloadRemaining>0||p.ammo===10)return;p.reloadRemaining=TUNING.reloadDuration;event('reload-start');const clip=weaponPoint(p,'Clip');particles(clip.x,clip.y,'magazine',1);}
 function shoot(){
  if(p.ammo<=0){beginReload();return;}
  const a=p.angle,ax=Math.cos(a),ay=Math.sin(a),muzzle=weaponPoint(p,'Muzzle'),casing=weaponPoint(p,'Casing','SPMA_fire_001');
  bullets.push({x:muzzle.x,y:muzzle.y,vx:ax*TUNING.bulletSpeed,vy:ay*TUNING.bulletSpeed,life:TUNING.bulletRange/TUNING.bulletSpeed,enemy:false,angle:a});
  p.ammo--;p.shots++;p.lastShot=time;p.shotCooldown=TUNING.shotInterval;event('shot',{angle:a});particles(casing.x,casing.y,'casing',1);
 }
 function spawnEnemyBullet(x,y,vx=-48,vy=0){bullets.push({x,y,vx,vy,life:12,enemy:true,passed:false});}
 function step(dt,input={}){
  dt=Math.min(Math.max(dt,0),.1);if(dt===0)return;time+=dt;events=[];
  p.shotCooldown=Math.max(0,p.shotCooldown-dt);p.hurtRemaining=Math.max(0,p.hurtRemaining-dt);
  for(const t of targets){t.flash=Math.max(0,t.flash-dt);t.tilt*=Math.exp(-dt*16);}
  let dx=(input.right?1:0)-(input.left?1:0),dy=(input.down?1:0)-(input.up?1:0),length=Math.hypot(dx,dy);if(length){dx/=length;dy/=length;p.lastX=dx;p.lastY=dy;}
  const fireX=(input.fireRight?1:0)-(input.fireLeft?1:0),fireY=(input.fireDown?1:0)-(input.fireUp?1:0),fireKeys=fireX!==0||fireY!==0;
  if(fireKeys){p.angle=Math.atan2(fireY,fireX);p.aim={x:p.x+fireX*100,y:p.y-5+fireY*100,active:true};}
  else if(input.aimWorld?.active){p.aim={...input.aimWorld};p.angle=Math.atan2(p.aim.y-(p.y-5),p.aim.x-p.x);}
  const rollHeld=!!(input.dash||input.jump||input.special),rollPressed=rollHeld&&!previous.roll;
  if(rollPressed&&p.rollElapsed<0&&length){p.rollElapsed=0;p.rollX=dx;p.rollY=dy;p.rolls++;event('roll');particles(p.x,p.y,'dust',7);}
  if(input.reload&&!previous.reload)beginReload();
  if(p.reloadRemaining>0){p.reloadRemaining=Math.max(0,p.reloadRemaining-dt);if(p.reloadRemaining===0){p.ammo=10;event('reload-end');}}
  const oldX=p.x,oldY=p.y;
  if(p.rollElapsed>=0){
   const old=p.rollElapsed,next=Math.min(TUNING.rollDuration,old+dt),delta=rollDistanceAt(next)-rollDistanceAt(old);move(p.rollX*delta,p.rollY*delta);p.rollElapsed=next;
   if(old<TUNING.airDuration&&next>=TUNING.airDuration){p.lastLand=time;particles(p.x,p.y,'dust',8);event('land');}
   if(next>=TUNING.rollDuration-1e-7){p.rollElapsed=-1;p.walkTime=0;event('roll-end');}
  }else{
   move(dx*TUNING.moveSpeed*dt,dy*TUNING.moveSpeed*dt);
   if(length){p.walkTime+=dt;p.idleTime=0;}else{p.walkTime=0;p.idleTime+=dt;}
   if((input.attack||fireKeys)&&p.shotCooldown<=1e-7&&p.reloadRemaining===0)shoot();
  }
  p.vx=(p.x-oldX)/dt;p.vy=(p.y-oldY)/dt;
  if(section==='roll-lane'){
   emitterTime-=dt;if(emitterTime<=0){emitterTime+=2.4;for(const y of [188,208,246])spawnEnemyBullet(440,y,-48,0);event('volley');}
  }
  for(const b of bullets){
   b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(b.x<ROOM.left||b.x>ROOM.right||b.y<ROOM.top-10||b.y>ROOM.bottom)b.life=0;
   if(COLUMNS.some(c=>Math.hypot(b.x-c.x,b.y-(c.y-8))<c.r+2)){b.life=0;particles(b.x,b.y,'spark',3);}
   if(b.life<=0)continue;
   if(b.enemy){
    if(Math.hypot(b.x-p.x,b.y-(p.y-7))<8){
     if(isRollInvulnerable(p.rollElapsed)){if(!b.passed){b.passed=true;p.dodged++;event('dodge-through');}}
     else if(p.hurtRemaining<=0){
      b.life=0;p.hits++;p.hurtRemaining=TUNING.damageGrace;
      if(p.armor>0){p.armor=0;p.lastArmorBreak=time;p.armorBreakX=p.x;p.armorBreakY=p.y;effects.push({type:'helmet',x:p.x,y:p.y-19,vx:-18,vy:-42,life:.6,max:.6});for(const other of bullets)if(other.enemy)other.life=0;event('armor-break');}
      else{p.hp=p.hp===1?6:p.hp-1;particles(p.x,p.y-8,'hurt',12);}
      event('hurt',{rollElapsed:p.rollElapsed});
     }
    }
   }else{
    const t=targets.find(t=>Math.hypot(b.x-t.x,b.y-(t.y-12))<10);if(t){b.life=0;t.hits++;t.flash=.09;t.tilt=(b.vx>0?1:-1)*3;particles(b.x,b.y,'wood',8);event('target-hit',{id:t.id});}
   }
  }
  bullets=bullets.filter(b=>b.life>0);
  for(const e of effects){e.life-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=e.type==='helmet'?120:e.type==='casing'||e.type==='magazine'?85:9;e.vx*=Math.exp(-dt*(e.type==='helmet'?1:5));}
  effects=effects.filter(e=>e.life>0);
  path.push({x:p.x,y:p.y});if(path.length>260)path.shift();previous={roll:rollHeld,reload:!!input.reload};
 }
 function getState(){
  const animation=animationFor(p),action=p.rollElapsed>=0?(isRollInvulnerable(p.rollElapsed)?'roll-air':'roll-ground'):p.reloadRemaining>0?'reload':time-p.lastShot<.12?'fire':Math.hypot(p.vx,p.vy)>1?'move':'idle';
  return{...p,action,time,section,animation:{...animation,sprite:`${animation.clip}_${String(animation.frame+1).padStart(3,'0')}`},invulnerable:isRollInvulnerable(p.rollElapsed),damageProtected:isRollInvulnerable(p.rollElapsed)||p.hurtRemaining>0,rollProgress:p.rollElapsed<0?null:p.rollElapsed/TUNING.rollDuration,reloadProgress:p.reloadRemaining>0?1-p.reloadRemaining/TUNING.reloadDuration:null,targets:targets.map(t=>({...t})),bulletCount:bullets.length,events:events.map(e=>({...e}))};
 }
 reset();return{step,reset,getState,clearInput(){previous={};},spawnEnemyBullet,get player(){return p;},get time(){return time;},get section(){return section;},get bullets(){return bullets;},get effects(){return effects;},get targets(){return targets;},get path(){return path;},get events(){return events;}};
}
