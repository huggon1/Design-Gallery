// Unity scene units. See source/parameters.json for the source component fields.
export const TUNING=Object.freeze({run:4.7,block:1,walk:1.88,fullCharge:1,dash:8,dashEnd:1.8,reach:1,nearHit:.9,triggerRadius:.4,damageTime:.15,recovery:.5});
export const YARD=Object.freeze({width:29,height:18,minX:1,maxX:28,minY:1.1,maxY:17.2});
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const octants=['right','down-right','down','down-left','left','up-left','up','up-right'];
function orient(a,dx,dy){
  const length=Math.hypot(dx,dy);
  if(!length)return;
  a.forwardX=dx/length;a.forwardY=dy/length;
  const octant=(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8;
  a.facing8=octants[octant];
  const horizontal=dx<0?'left':'right',vertical=dy<0?'up':'down';
  if(octant%2&&(a.face===horizontal||a.face===vertical))return;
  a.face=Math.abs(dx)>Math.abs(dy)?horizontal:vertical;
}
function move(character,dx,dy){
  character.x=clamp(character.x+dx,YARD.minX,YARD.maxX);
  character.y=clamp(character.y+dy,YARD.minY,YARD.maxY);
}
const directionVector={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
function turnToward(a,b){orient(a,b.x-a.x,b.y-a.y);}
function animate(actor,clip,force=false){
  if(force||actor.clip!==clip){actor.clip=clip;actor.age=0;}
}
function newActor(x,y,face,clip){
  const [forwardX,forwardY]=directionVector[face];
  return {x,y,prevX:x,prevY:y,face,facing8:face,forwardX,forwardY,clip,age:0,impact:false};
}
export function createState(){
  return {player:newActor(12.55,9.05,'right','idle'),partner:newActor(15.05,9.05,'left','idle'),time:0,locked:false,blocking:false,chargeTime:0,
    combatUntil:0,heldAttack:false,heldLock:false,charging:false,dashing:false,recoverUntil:0,movementPausedUntil:0,heavy:false,
    nextCounter:0,health:3,playerHealth:3,feedback:null,hits:0,blocks:0,received:0};
}
export function cancelInput(s){
  s.heldAttack=false;s.heldLock=false;s.chargeTime=0;s.charging=false;s.dashing=false;s.blocking=false;
  if(['block','blockWalk','charge','chargeRun','chargeWalk'].includes(s.player.clip))animate(s.player,s.locked?'fightIdle':'idle');
}
function beginStrike(s,strong){
  s.heavy=strong;
  const fist=strong||Math.random()>.5?2:1;
  animate(s.player,'attack'+fist,true);
  s.player.impact=false;s.dashing=false;s.charging=false;s.chargeTime=0;
  if(strong)s.movementPausedUntil=s.time+.4;
  s.recoverUntil=s.time+TUNING.recovery;s.combatUntil=s.time+1.25;
}
function poseIdle(s,moving,slow){
  if(s.blocking)return moving?'blockWalk':'block';
  if(s.charging)return moving?(slow?'chargeWalk':'chargeRun'):'charge';
  const fight=s.locked||s.time<s.combatUntil;
  if(!moving)return fight?'fightIdle':'idle';
  return slow?(fight?'fightWalk':'walk'):(fight?'fightRun':'run');
}
function setFeedback(s,kind,actor){s.feedback={kind,x:actor.x,y:actor.y,age:0};}
function canHit(attacker,target){
  const dx=target.x-attacker.x,dy=target.y-attacker.y,d=Math.hypot(dx,dy);
  // The source first overlaps the fist sphere with the target trigger. The
  // near-hit zone bypasses its 90° eight-way angular filter at close range.
  if(d<=TUNING.nearHit+1e-8)return true;
  if(d>TUNING.reach+TUNING.triggerRadius)return false;
  const angle=octants.indexOf(attacker.facing8)*Math.PI/4;
  return (Math.cos(angle)*dx+Math.sin(angle)*dy)/d>=Math.SQRT1_2-1e-8;
}
function knockBack(target,source,amount){
  const d=distance(target,source);
  if(d>1e-4)move(target,(target.x-source.x)*amount/d,(target.y-source.y)*amount/d);
}
function strikePartner(s){
  const p=s.player,n=s.partner;
  if(n.clip==='knockout'||!canHit(p,n))return;
  s.hits++;s.health-=s.heavy?2:1;turnToward(n,p);
  animate(n,s.health<=0?'knockout':'recoil',true);
  s.nextCounter=s.time+.62;
  setFeedback(s,'hit',n);knockBack(n,p,s.heavy?.22:.09);
}
function counter(s){
  if(!canHit(s.partner,s.player))return;
  if(s.blocking){
    s.blocks++;setFeedback(s,'guard',s.player);return;
  }
  s.received++;s.playerHealth--;s.movementPausedUntil=s.time+.2;setFeedback(s,'counter',s.player);
  s.charging=false;s.chargeTime=0;s.dashing=false;
  turnToward(s.player,s.partner);animate(s.player,s.playerHealth<=0?'knockout':'recoil',true);knockBack(s.player,s.partner,.12);
}
function tickPartner(s,dt,clips){
  const n=s.partner,p=s.player;
  n.age+=dt;
  if(n.clip==='knockout'){
    if(n.age>=clips[n.clip][n.face].duration+1.15){s.health=3;s.nextCounter=0;animate(n,'idle');}
    return;
  }
  if(n.clip==='attack1'&&!n.impact&&n.age>=TUNING.damageTime){n.impact=true;counter(s);}
  if(n.clip==='recoil'||n.clip==='attack1'){
    if(n.age<clips[n.clip][n.face].duration)return;
    animate(n,'fightIdle');
  }
  turnToward(n,p);
  if(s.nextCounter&&s.time>=s.nextCounter){
    if(canHit(n,p)){animate(n,'attack1',true);n.impact=false;}
    s.nextCounter=0;
  }else animate(n,s.locked||s.time<s.combatUntil?'fightIdle':'idle');
}
function travel(s,dx,dy,slow,dt){
  if((dx||dy)&&s.time+1e-8>=s.movementPausedUntil){
    const speed=(s.blocking?TUNING.block:TUNING.run)*(slow?.4:1);
    move(s.player,dx*speed*dt,dy*speed*dt);
    if(s.locked)turnToward(s.player,s.partner);else orient(s.player,dx,dy);
  }
}
function advanceCharge(s,dt,release){
  const p=s.player,n=s.partner;
  s.chargeTime+=dt;
  if(s.chargeTime+1e-8<TUNING.fullCharge){
    if(release)beginStrike(s,false);
    return;
  }
  if(release||s.chargeTime+1e-8>=TUNING.dashEnd||(s.locked&&distance(p,n)<TUNING.reach)){
    beginStrike(s,true);return;
  }
  s.dashing=true;
  if(s.locked)turnToward(p,n);
  move(p,p.forwardX*TUNING.dash*dt,p.forwardY*TUNING.dash*dt);
  animate(p,'chargeRun');
}
export function stepState(s,dt,input,clips){
  const p=s.player,n=s.partner;
  s.time+=dt;p.prevX=p.x;p.prevY=p.y;n.prevX=n.x;n.prevY=n.y;p.age+=dt;
  if(s.feedback&&(s.feedback.age+=dt)>.18)s.feedback=null;
  const lock=Boolean(input.special),attack=Boolean(input.attack),press=attack&&!s.heldAttack,release=!attack&&s.heldAttack;
  if(lock&&!s.heldLock)s.locked=!s.locked;
  s.heldLock=lock;s.heldAttack=attack;
  let dx=Number(Boolean(input.right))-Number(Boolean(input.left)),dy=Number(Boolean(input.down))-Number(Boolean(input.up));
  const len=Math.hypot(dx,dy);if(len){dx/=len;dy/=len;}
  const slow=Boolean(input.slow);
  if(p.clip==='knockout'){
    if(p.age>=clips.knockout[p.face].duration+1.15){s.playerHealth=3;animate(p,'idle');}
  }else if(s.dashing){
    advanceCharge(s,dt,release);
  }else if(p.clip.startsWith('attack')||p.clip==='recoil'){
    travel(s,dx,dy,slow,dt);
    const clip=clips[p.clip][p.face];
    if(p.clip.startsWith('attack')&&!p.impact&&p.age>=TUNING.damageTime){p.impact=true;strikePartner(s);}
    if(p.age>=clip.duration)animate(p,poseIdle(s,false,slow));
  }else{
    if(s.locked)turnToward(p,n);else if(len)orient(p,dx,dy);
    s.blocking=Boolean(input.grab);
    if(s.blocking){s.charging=false;s.chargeTime=0;}
    if(press&&!s.blocking&&s.time>=s.recoverUntil){s.charging=true;s.chargeTime=0;}
    if(s.charging)advanceCharge(s,dt,release);
    if(!s.dashing&&!p.clip.startsWith('attack')){
      travel(s,dx,dy,slow,dt);
      animate(p,poseIdle(s,Boolean(len),slow));
    }
  }
  // The trainer is a circular foot-level obstacle. Slide around it from either axis.
  if(n.clip!=='knockout'){
    const d=distance(p,n),overlap=.70-d;
    if(overlap>0){
      const [fx,fy]=directionVector[p.face];
      move(p,overlap*(d?(p.x-n.x)/d:-fx),overlap*(d?(p.y-n.y)/d:-fy));
    }
  }
  tickPartner(s,dt,clips);
}
