/** Godhome foundation controller. Independent of the preserved lab module.
 * World units; Y up; player/target y is their collider bottom.
 * One stepPlayer call advances FIXED_DT. DOM input and display scheduling live outside.
 */
import {resolveLoadout,getNailProfile,getNailDamage,nailEffectPose} from './loadout.mjs';
import {windPolygonContact} from './wind.mjs';
export const FIXED_DT = 1 / 50;
export const TUNING = Object.freeze({
  runSpeed:8.3, jumpSpeed:16.65, jumpSteps:9, jumpMinSteps:4, gravity:79, fallSpeed:20,
  dashSpeed:20, dashDuration:.25, dashCooldown:.6,shadowCooldown:1.5,
  doubleJumpSteps:9,doubleJumpBuffer:.2,wallSlideSpeed:-8,wallJumpSpeed:16,wallJumpLock:10,wallStickySteps:3,
  attackDuration:.35, attackCooldown:.41, attackRecovery:.1,alternateReset:.6,
  attackActiveStart:.02, attackActiveEnd:.1,
  jumpBuffer:.1, attackBuffer:.12, dashBuffer:.12,castBuffer:.12,coyoteTime:.06,
  bounceSpeed:12, bounceDuration:.25, recoilSpeed:3.75, recoilDuration:.18,
  hitFreeze:.04, hurtFreeze:.301, hurtDuration:.2, hurtSpeed:15, hurtLift:7.5, invulnerable:1.3,
  bodyWidth:.5, bodyHeight:1.28125, spriteRootOffset:1.390625, landDuration:.24,
  soulPerHit:11,reserveSoulPerHit:6,reserveTransferPause:1,spellCost:33,focusStartup:.25,focusDrainInterval:.027,focusHealRecovery:.2,
});
const DT=FIXED_DT, EPS=1e-7, buttons=['jump','attack','dash','hurt','focus','cast'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const intersects=(a,b)=>a.left<b.right-EPS&&a.right>b.left+EPS&&a.bottom<b.top-EPS&&a.top>b.bottom+EPS;
const targetBox=t=>({left:t.x-t.w/2,right:t.x+t.w/2,bottom:t.y,top:t.y+t.h});
const damageableTarget=t=>t.damageable!==false&&t.hitType!=='parry';
const solidBox=s=>({left:s.x,right:s.x+s.w,bottom:s.y-s.h,top:s.y});
const push=(out,p,type,detail={})=>out.push({type,x:p.x,y:p.y,time:p.time,...detail});

export function createPlayer(spawn={}) {
  const p={
    x:0,y:0,vx:0,vy:0,facing:1,renderFacing:1,grounded:true,
    width:TUNING.bodyWidth,height:TUNING.bodyHeight,hp:5,maxHp:5,baseNailDamage:21,nailDamage:21,dead:false,soul:0,maxSoul:99,spellLevel:2,loadout:{},
    reserveSoul:0,reserveVessels:3,maxReserveSoul:99,reserveTransferDelay:1,
    time:0,ticks:0,anim:'Idle',animTime:0,
    airPhase:'ground',airTime:0,airFrame:0,fallTime:0,flightId:0,landTime:TUNING.landDuration,
    jumpSteps:-1,jumpedSteps:0,jumpReleasePending:false,coyoteRemaining:0,headBumpRemaining:0,
    doubleJumped:false,doubleJumpSteps:-1,doubleJumpTime:-1,wall:0,wallSliding:false,wallLock:0,wallKickDirection:0,wallUnstick:0,wallJumpTime:-1,
    attack:null,attackSerial:0,attackCooldown:0,alternate:false,lastSideTime:-10,
    dashing:false,dashTime:0,dashDirection:1,dashCooldown:0,airDashed:false,
    shadowEnabled:true,shadowDashing:false,shadowCooldown:0,shadowDashElapsed:-1,lastShadowDashTime:-10,
    bounceRemaining:0,recoilRemaining:0,recoilDirection:0,
    hurt:null,invulnerable:0,invulElapsed:0,freezeRemaining:0,damageMode:'full',diveInvulnerable:0,
    focusing:false,focusTimer:0,focusPhase:'',focusPhaseTime:0,focusDrainTimer:0,focusDrained:0,focusReleasePending:false,focusFinishTime:-1,
    casting:null,castSerial:0,projectiles:[],windPathSeen:{},
    queue:{jump:null,attack:null,dash:null,cast:null},previous:{},pendingPressed:{},pendingReleased:{},pendingAim:{},
    ...spawn,
  };
  p.loadout=resolveLoadout(p.loadout);
  p.baseNailDamage=spawn.baseNailDamage??spawn.nailDamage??21;
  p.nailDamage=getNailDamage(p.baseNailDamage,p.loadout);
  p.reserveVessels=clamp(Math.floor(p.reserveVessels),0,3);p.maxReserveSoul=p.reserveVessels*33;
  p.soul=clamp(Math.floor(p.soul),0,p.maxSoul);p.reserveSoul=clamp(Math.floor(p.reserveSoul),0,p.maxReserveSoul);
  p.renderFacing=p.facing;
  if(!p.grounded){p.airPhase=p.vy>3.5?'rise':p.vy>=-3.5?'apex':'fall';p.airFrame=p.airPhase==='rise'?3:p.airPhase==='apex'?5:6;}
  return p;
}
export function resetPlayer(p,spawn={}) {
  for(const key of Object.keys(p))delete p[key];
  Object.assign(p,createPlayer(spawn));return p;
}
/** Release input without rewriting the world or the animation currently playing. */
export function clearInput(p) {
  p.queue={jump:null,attack:null,dash:null,cast:null};p.previous={};p.pendingPressed={};p.pendingReleased={};p.pendingAim={};
  p.jumpReleasePending=true;p.focusReleasePending=true;return p;
}
export function playerBox(p){return {left:p.x-p.width/2,right:p.x+p.width/2,bottom:p.y,top:p.y+p.height};}
export function bodyIntersects(p,box){return intersects(playerBox(p),box);}

// Retained source nail geometry. Each swing captures its own facing.
const POLYGONS={
  side:[[-1.2709147,.7413744],[-1.9154043,.34023],[-2.0418284,-.1750279],[-1.6737577,-.443555],[-.0747072,-.6419125],[.0078668,.9683739]],
  alt:[[-1.217212,.9806359],[-2.38991,.5705993],[-2.6464114,-.0792437],[-2.1236799,-.5379019],[-.3672335,-.6931571],[-.2434342,1.0901221]],
  up:[[-.4705164,1.4424964],[.471546,1.4633876],[1.0817832,.6738139],[1.1484641,-.890397],[-1.2853814,-.8659905],[-1.0722543,.6188976]],
  down:[[1.2783164,.6065824],[1.119068,-.8765929],[.5875434,-1.6216662],[-.4472086,-1.6460726],[-1.0696145,-.7312644],[-1.3820535,.6370943]],
  wall:[[-1.2709147,.7413744],[-1.9154043,.34023],[-2.0418284,-.1750279],[-1.7475108,-.4870122],[-.15625,-.7890625],[-.0681712,1.0156245]],
};
export function attackPolygon(p,a=p.attack) {
  if(!a)return [];
  const pose=nailEffectPose(a),poly=POLYGONS[pose.key];if(!poly)return [];
  return poly.map(([x,y])=>[p.x-(pose.offsetX+x*pose.scaleX)*a.facing,p.y+TUNING.spriteRootOffset+pose.offsetY+y*pose.scaleY]);
}
export function polygonIntersectsBox(poly,box) {
  if(poly.length<3)return false;
  const rectangle=[[box.left,box.bottom],[box.right,box.bottom],[box.right,box.top],[box.left,box.top]],axes=[[1,0],[0,1]];
  for(let n=0;n<poly.length;n++){const a=poly[n],b=poly[(n+1)%poly.length];axes.push([a[1]-b[1],b[0]-a[0]]);}
  for(const [nx,ny]of axes){const a=poly.map(([x,y])=>x*nx+y*ny),b=rectangle.map(([x,y])=>x*nx+y*ny);
    if(Math.max(...a)<Math.min(...b)||Math.max(...b)<Math.min(...a))return false;}
  return true;
}
function readInput(raw,p) {
  const i={move:Math.abs(raw.move||0)<.2?0:Math.sign(raw.move),up:!!raw.up,down:!!raw.down};
  const pressed={},released={},freshPressed={};
  for(const key of buttons){i[key]=!!raw[key];
    freshPressed[key]=!!raw.pressed?.[key]||(i[key]&&!p.previous[key]);
    pressed[key]=freshPressed[key]||!!p.pendingPressed[key];
    released[key]=!!raw.released?.[key]||(!i[key]&&!!p.previous[key])||!!p.pendingReleased[key];}
  return {i,pressed,released,freshPressed};
}
function floorContact(p,world) {
  if(p.vy>EPS)return false;
  if(world.bounds?.bottom!==undefined&&Math.abs(p.y-world.bounds.bottom)<=EPS)return true;
  return (world.solids||[]).some(s=>p.x+p.width/2>s.x+EPS&&p.x-p.width/2<s.x+s.w-EPS&&Math.abs(p.y-s.y)<=EPS);
}
function wallContact(p,world) {
  const b=playerBox(p);let wall=0;
  for(const s of world.solids||[]){const r=solidBox(s);if(b.bottom>=r.top-.02||b.top<=r.bottom+.02)continue;
    if(Math.abs(b.right-r.left)<.012)wall=1;if(Math.abs(b.left-r.right)<.012)wall=-1;}
  if(world.bounds?.left!==undefined&&Math.abs(b.left-world.bounds.left)<.012)wall=-1;
  if(world.bounds?.right!==undefined&&Math.abs(b.right-world.bounds.right)<.012)wall=1;return wall;
}
function setAirStart(p,bounce=false) {
  p.flightId++;p.airTime=0;p.fallTime=0;p.airPhase=bounce?'rise':'start';p.airFrame=bounce?3:0;
}
function startJump(p,request,out,kind='jump') {
  p.grounded=false;p.coyoteRemaining=0;p.jumpSteps=0;p.jumpedSteps=0;p.jumpReleasePending=request.released;
  p.bounceRemaining=0;p.recoilRemaining=0;p.doubleJumpSteps=-1;p.doubleJumpTime=-1;p.vy=TUNING.jumpSpeed;p.queue.jump=null;setAirStart(p);
  push(out,p,kind);
}
function startWallJump(p,request,out) {
  const direction=-p.wall;startJump(p,request,out,'wallJump');
  p.wallKickDirection=direction;p.facing=direction;p.wallLock=TUNING.wallJumpLock+1;p.wallJumpTime=0;
  p.wallSliding=false;p.wall=0;p.wallUnstick=0;p.airDashed=false;p.doubleJumped=false;
}
function startDoubleJump(p,out) {
  p.jumpSteps=-1;p.jumpReleasePending=false;p.doubleJumped=true;p.doubleJumpSteps=0;p.doubleJumpTime=0;
  p.bounceRemaining=0;p.queue.jump=null;p.wallLock=0;setAirStart(p,true);push(out,p,'doubleJump');
}
function cancelAttack(p,out,reason) {
  if(p.attack)push(out,p,'attackCancel',{id:p.attack.id,reason});p.attack=null;
}
function startDash(p,request,out) {
  const direction=p.wallSliding?-p.wall:request.facing;
  cancelAttack(p,out,'dash');p.dashing=true;p.dashTime=0;p.dashDirection=direction;p.facing=direction;
  p.dashCooldown=TUNING.dashCooldown;p.queue.dash=null;p.jumpSteps=-1;p.bounceRemaining=0;p.recoilRemaining=0;
  p.doubleJumpSteps=-1;p.doubleJumpTime=-1;p.wallLock=0;p.wallSliding=false;
  p.shadowDashing=p.shadowEnabled&&p.shadowCooldown<=EPS;
  if(p.shadowDashing){p.shadowCooldown=TUNING.shadowCooldown;p.shadowDashElapsed=0;p.lastShadowDashTime=p.time;}
  if(!p.grounded){p.airDashed=true;if(p.airPhase!=='fall'){p.airPhase='apex';p.airFrame=Math.max(5,p.airFrame);}}
  push(out,p,'dash',{facing:p.dashDirection,shadow:p.shadowDashing});
}
function startAttack(p,request,out) {
  const wall=p.wallSliding,profile=getNailProfile(p.loadout),kind=wall?'side':request.up?'up':request.down&&!p.grounded?'down':'side';
  if(kind==='side'&&p.time-p.lastSideTime>TUNING.alternateReset+EPS)p.alternate=false;
  const a={kind,id:++p.attackSerial,time:0,duration:profile.attackDuration,active:false,
    facing:wall?p.wall:request.facing,wall,alt:kind==='side'&&!wall&&p.alternate,hits:[],
    damage:getNailDamage(p.baseNailDamage,p.loadout),rangeScale:wall?1:profile.rangeScale,mantis:!wall&&profile.mantis};
  if(kind==='side'&&!wall){p.alternate=!p.alternate;p.lastSideTime=p.time;}
  p.attack=a;p.attackCooldown=profile.attackCooldown;p.queue.attack=null;
  push(out,p,'slash',{kind,id:a.id,alt:a.alt,facing:a.facing,wall,rangeScale:a.rangeScale});
}
function cancelFocus(p,out,reason) {
  if(p.focusing&&p.focusPhase==='heal'&&(reason==='full'||reason==='empty'))p.focusFinishTime=0;
  if(reason==='hurt'||reason==='cast')p.focusFinishTime=-1;
  if(p.focusing)push(out,p,'focusCancel',{reason,spent:p.focusDrained});
  p.focusing=false;p.focusTimer=0;p.focusPhase='';p.focusPhaseTime=0;p.focusDrainTimer=0;p.focusDrained=0;p.focusReleasePending=false;
}
function startFocus(p,out) {
  cancelAttack(p,out,'focus');p.focusing=true;p.focusTimer=0;p.focusPhase='start';p.focusPhaseTime=0;
  p.focusDrainTimer=0;p.focusDrained=0;p.focusReleasePending=false;p.focusFinishTime=-1;p.recoilRemaining=0;push(out,p,'focusStart');
}
function advanceFocus(p,i,out) {
  if(!p.focusing)return;
  if(!i.focus||p.focusReleasePending||!p.grounded){cancelFocus(p,out,'release');return;}
  p.focusTimer+=DT;let elapsed=DT;
  if(p.focusPhase==='start'||p.focusPhase==='heal'){
    const wait=p.focusPhase==='start'?TUNING.focusStartup:TUNING.focusHealRecovery;
    p.focusPhaseTime+=DT;if(p.focusPhaseTime<wait-EPS)return;
    elapsed=Math.max(0,p.focusPhaseTime-wait);p.focusPhase='drain';p.focusPhaseTime=0;
  }
  p.focusPhaseTime+=elapsed;p.focusDrainTimer+=elapsed;
  while(p.focusDrainTimer>=TUNING.focusDrainInterval-EPS&&p.focusDrained<33&&p.soul>0){
    p.focusDrainTimer-=TUNING.focusDrainInterval;p.focusDrained++;p.soul--;p.reserveTransferDelay=TUNING.reserveTransferPause;
  }
  if(p.focusDrained===33){
    p.hp=Math.min(p.maxHp,p.hp+1);push(out,p,'heal',{hp:p.hp,soul:p.soul});
    p.focusDrained=0;p.focusDrainTimer=0;p.focusPhase='heal';p.focusPhaseTime=0;
    if(p.hp>=p.maxHp||p.soul<33)cancelFocus(p,out,p.hp>=p.maxHp?'full':'empty');
  }
}
function startCast(p,request,out) {
  p.queue.cast=null;
  if(p.soul<TUNING.spellCost){push(out,p,'emptySoul');return;}
  const kind=request.up?'scream':request.down?'dive':'fireball';
  cancelFocus(p,out,'cast');cancelAttack(p,out,'cast');p.soul-=TUNING.spellCost;p.reserveTransferDelay=TUNING.reserveTransferPause;
  if(kind==='dive')p.diveInvulnerable=0;
  p.jumpSteps=-1;p.doubleJumpSteps=-1;p.doubleJumpTime=-1;p.bounceRemaining=0;p.recoilRemaining=0;p.wallSliding=false;p.wallLock=0;
  p.casting={id:++p.castSerial,kind,time:0,phase:'antic',phaseTime:0,level:p.spellLevel,facing:request.facing,
    startedGrounded:p.grounded,hits:[],anim:kind==='dive'?'Quake Antic':kind==='scream'?'Scream Start':'Fireball Antic',animTime:0,startedTick:p.ticks};
  p.vx=0;p.vy=kind==='dive'&&p.grounded?11:0;
  if(kind==='dive'&&p.grounded){p.grounded=false;setAirStart(p,true);}
  push(out,p,'cast',{kind,id:p.casting.id,level:p.spellLevel,facing:request.facing,soul:p.soul});
}
function spellHit(p,out,t,c,kind,damage,stage) {
  if(!damageableTarget(t))return;
  const contactY=Number.isFinite(c.y)?c.y:p.y+1.1;
  push(out,p,'hit',{targetId:t.id,kind,attackId:c.id,damage,...(stage?{stage}:{}),x:t.x,y:clamp(contactY,t.y,t.y+t.h),freeze:0});
}
function setCastPhase(c,phase,anim) {c.phase=phase;c.phaseTime=0;if(anim){c.anim=anim;c.animTime=0;}}
function advanceCast(p,world,out) {
  const c=p.casting;if(!c)return;
  p.vx=0;
  if(c.startedTick===p.ticks)return;
  c.time+=DT;c.phaseTime+=DT;c.animTime+=DT;
  if(c.kind==='fireball'){
    p.vy=0;
    if(c.phase==='antic'&&c.time>=.1-EPS){
      setCastPhase(c,'cast',`Fireball${c.level>1?2:1} Cast`);
      p.projectiles.push({id:c.id,kind:'fireball',phase:'projectile',x:p.x+c.facing*.7,y:p.y+1.1,
        vx:c.facing*(c.level>1?45:40),time:0,level:c.level,facing:c.facing,hits:[],life:c.level>1?.475:.45});
      push(out,p,'projectile',{kind:'fireball',id:c.id,level:c.level,facing:c.facing});
    }
    if(c.phase==='cast')p.vx=-c.facing;
    if(c.time>=.4-EPS)p.casting=null;
  }else if(c.kind==='scream'){
    p.vy=0;
    if(c.phase==='antic'&&c.time>=.1-EPS){setCastPhase(c,'burst',c.level>1?'Scream 2':'Scream');push(out,p,'spellBurst',{kind:'scream',id:c.id,level:c.level});}
    if(c.phase==='burst'){
      const pulse=Math.floor((c.phaseTime+EPS)/.1),area={left:p.x-2.3,right:p.x+2.3,bottom:p.y+.6,top:p.y+5.4};
      for(const t of world.targets||[]){const key=`${t.id}:${pulse}`;
        if(damageableTarget(t)&&pulse<(c.level>1?4:3)&&!c.hits.includes(key)&&intersects(area,targetBox(t))){c.hits.push(key);spellHit(p,out,t,c,'scream',c.level>1?20:13);}}
      if(c.phaseTime>=.3-EPS)setCastPhase(c,'roarEnd');
    }else if(c.phase==='roarEnd'&&c.phaseTime>=.15-EPS)setCastPhase(c,'end',c.level>1?'Scream End 2':'Scream End');
    else if(c.phase==='end'&&c.phaseTime>=.05-EPS)p.casting=null;
  }else if(c.phase==='antic'){
    if(!c.startedGrounded)p.vy=0;
    if(c.time>=.25-EPS){setCastPhase(c,'fall',c.level>1?'Quake Fall 2':'Quake Fall');p.damageMode='hazardOnly';p.grounded=false;p.vy=-50;}
  }else if(c.phase==='fall'){
    p.vy=-50;
    for(const t of world.targets||[]){const key=`${t.id}:fall`;if(damageableTarget(t)&&!c.hits.includes(key)&&intersects(playerBox(p),targetBox(t))){c.hits.push(key);spellHit(p,out,t,c,'diveFall',15);}}
    if(p.grounded){setCastPhase(c,'land',c.level>1?'Quake Land 2':'Quake Land');p.vy=0;push(out,p,'spellBurst',{kind:'dive',id:c.id,level:c.level,facing:c.facing});}
  }else if(c.phase==='land'){
    p.vy=0;const area={left:p.x-4,right:p.x+4,bottom:p.y,top:p.y+2.8};
    // Quake Blast frame 2 enables hitboxes, frame 4 disables them. Q Mega
    // starts at body frame 7, then enables its own frames 2 through 5.
    const stage=c.phaseTime>=.1-EPS&&c.phaseTime<.2-EPS?'impact':
      c.level>1&&c.phaseTime>=.45-EPS&&c.phaseTime<.65-EPS?'aftershock':null;
    if(stage)for(const t of world.targets||[]){const key=`${t.id}:${stage}`;
      if(damageableTarget(t)&&!c.hits.includes(key)&&intersects(area,targetBox(t))){c.hits.push(key);
        spellHit(p,out,t,c,'dive',stage==='aftershock'?15:c.level>1?(t.x<p.x?35:30):20,stage);}}
    if(c.phaseTime>=(c.level>1?.7:.75)-EPS){p.casting=null;p.damageMode='full';p.diveInvulnerable=.4;push(out,p,'spellEnd',{kind:'dive',id:c.id});}
  }
}
function advanceProjectiles(p,world,out) {
  for(const b of p.projectiles){const oldX=b.x;b.time+=DT;b.x+=b.vx*DT;
    const area={left:Math.min(oldX,b.x)-.8,right:Math.max(oldX,b.x)+.8,bottom:b.y-.6,top:b.y+.6};
    for(const t of world.targets||[])if(damageableTarget(t)&&!b.hits.includes(t.id)&&intersects(area,targetBox(t))){b.hits.push(t.id);spellHit(p,out,t,b,'fireball',b.level>1?30:15);}
    if(b.level<=1&&(world.solids||[]).some(s=>intersects(area,solidBox(s))))b.life=0;
  }
  p.projectiles=p.projectiles.filter(b=>b.time<b.life);
}
/** direction is the requested knockback direction (-1 left, +1 right). */
export function hurtPlayer(p,{damage=1,direction=-p.facing,hazard=false}={}) {
  const out=[];if(p.dead||!hazard&&(p.invulnerable>EPS||p.shadowDashing||p.damageMode==='hazardOnly'||p.diveInvulnerable>EPS))return out;
  const dir=Math.sign(direction)||-p.facing;
  p.hp=Math.max(0,p.hp-damage);p.dead=p.hp<=0;
  cancelAttack(p,out,'hurt');p.dashing=false;p.shadowDashing=false;p.dashTime=0;p.jumpSteps=-1;p.bounceRemaining=0;p.recoilRemaining=0;
  p.doubleJumpSteps=-1;p.doubleJumpTime=-1;p.wallSliding=false;p.wallLock=0;cancelFocus(p,out,'hurt');p.casting=null;p.damageMode='full';p.diveInvulnerable=0;
  p.hurt={phase:'freeze',time:0,duration:TUNING.hurtDuration,direction:dir};p.invulnerable=TUNING.invulnerable;p.invulElapsed=0;p.focusFinishTime=-1;
  // StartRecoil resets motion and selects Stun before FreezeMoment. The recoil
  // vector begins after the real-time freeze, and uses scaled simulation time.
  p.vx=0;p.vy=0;
  p.freezeRemaining=Math.max(p.freezeRemaining,TUNING.hurtFreeze);
  p.anim='Stun';p.animTime=0;p.renderFacing=-dir;
  push(out,p,'hurt',{damage,hp:p.hp,direction:dir,freeze:TUNING.hurtFreeze,hazard});
  if(p.dead)push(out,p,'death');return out;
}
function moveAndCollide(p,world,out) {
  const wasGrounded=p.grounded,oldY=p.y,oldVy=p.vy,rects=(world.solids||[]).map(solidBox),bounds=world.bounds||{};
  let nx=p.x+p.vx*DT;
  for(const r of rects){
    if(p.y>=r.top-EPS||p.y+p.height<=r.bottom+EPS)continue;
    if(p.vx>0&&p.x+p.width/2<=r.left+EPS&&nx+p.width/2>=r.left)nx=Math.min(nx,r.left-p.width/2);
    if(p.vx<0&&p.x-p.width/2>=r.right-EPS&&nx-p.width/2<=r.right)nx=Math.max(nx,r.right+p.width/2);
  }
  nx=clamp(nx,(bounds.left??-Infinity)+p.width/2,(bounds.right??Infinity)-p.width/2);
  if(Math.abs(nx-(p.x+p.vx*DT))>EPS)p.vx=0;p.x=nx;
  let ny=p.y+p.vy*DT,land=false,head=false;
  for(const r of rects){
    if(p.x+p.width/2<=r.left+EPS||p.x-p.width/2>=r.right-EPS)continue;
    if(p.vy<=0&&oldY>=r.top-EPS&&ny<=r.top){ny=Math.max(ny,r.top);land=true;}
    else if(p.vy>0&&oldY+p.height<=r.bottom+EPS&&ny+p.height>=r.bottom){ny=Math.min(ny,r.bottom-p.height);head=true;}
  }
  if(bounds.bottom!==undefined&&ny<=bounds.bottom){ny=bounds.bottom;land=true;}
  if(bounds.top!==undefined&&ny+p.height>=bounds.top){ny=bounds.top-p.height;head=true;}
  p.y=ny;
  if(land){p.vy=0;p.grounded=true;p.airDashed=false;p.jumpSteps=-1;p.bounceRemaining=0;p.doubleJumped=false;p.doubleJumpSteps=-1;p.doubleJumpTime=-1;p.wallLock=0;p.wallSliding=false;
    if(!wasGrounded){p.airPhase='land';p.landTime=0;push(out,p,'land',{speed:-oldVy});}
  }else p.grounded=false;
  if(head){p.vy=0;p.jumpSteps=-1;p.doubleJumpSteps=-1;p.headBumpRemaining=.06;push(out,p,'headBump');}
  p.wall=wallContact(p,world);
}
function updateAirPose(p) {
  if(p.grounded){
    if(p.airPhase==='land'){p.landTime+=DT;if(p.landTime>=TUNING.landDuration-EPS)p.airPhase='ground';}
    else p.airPhase='ground';return;
  }
  p.airTime+=DT;
  if(p.doubleJumpSteps>=0&&p.doubleJumpSteps<=4){p.airPhase='rise';p.airFrame=3;return;}
  if(p.airPhase==='ground'||p.airPhase==='land'){
    p.airPhase=p.vy>3.5?'rise':p.vy>=-3.5?'apex':'fall';p.airFrame=p.airPhase==='rise'?3:p.airPhase==='apex'?5:6;p.fallTime=0;
  }
  if(!p.dashing){
    if(p.airPhase!=='fall'){
      if(p.vy<-3.5){p.airPhase='fall';p.fallTime=0;}
      else if(p.vy<=3.5)p.airPhase='apex';
      else if(p.airTime<=.08+EPS&&p.airPhase==='start')p.airPhase='start';
      else p.airPhase='rise';
    }
  }
  let frame;
  if(p.airPhase==='start')frame=Math.min(2,Math.floor(p.airTime/.04));
  else if(p.airPhase==='rise')frame=Math.min(4,2+Math.floor(Math.max(0,p.airTime-.08)/.06));
  else if(p.airPhase==='apex')frame=5;
  else {p.fallTime+=DT;const step=Math.floor(p.fallTime*16+EPS);frame=step<3?6+step:9+(step-3)%3;}
  p.airFrame=p.airPhase==='fall'?frame:Math.max(p.airFrame,frame);
}
function chooseAnimation(p,i) {
  let name,time,facing=p.facing;
  if(p.hurt){name=p.hurt.phase==='freeze'?'Stun':'Recoil';time=p.hurt.time;facing=-p.hurt.direction;}
  else if(p.dashing){name=p.shadowDashing?'Shadow Dash':'Dash';time=p.dashTime;facing=p.dashDirection;}
  else if(p.casting){const c=p.casting;name=c.anim||'Fireball Antic';time=c.animTime;facing=c.facing;}
  else if(p.focusing){name=p.focusPhase==='heal'?'Focus Get':'Focus';time=p.focusPhase==='heal'?p.focusPhaseTime:p.focusTimer;}
  else if(p.attack){const a=p.attack;name=a.wall?'Wall Slash':a.kind==='up'?'UpSlash':a.kind==='down'?'DownSlash':a.alt?'SlashAlt':'Slash';time=a.time;facing=a.facing;}
  else if(p.wallLock>0){name='Walljump';time=p.wallJumpTime;facing=p.wallKickDirection;}
  else if(p.doubleJumpSteps>=0||p.doubleJumpTime>=0&&p.doubleJumpTime<.5-EPS){name='Double Jump';time=p.doubleJumpTime;}
  else if(p.wallSliding){name='Wall Slide';time=p.anim==='Wall Slide'?p.animTime+DT:0;facing=p.wall;}
  else if(p.focusFinishTime>=0&&p.grounded&&!i.move){name='Focus Get Once';time=p.focusFinishTime;}
  else if(!p.grounded){name='Airborne';time=(p.airFrame+.001)/16;}
  else if(p.airPhase==='land'&&(!i.move||p.landTime<.06)){name='Land';time=p.landTime;}
  else {name=i.move?'Run':'Idle';time=p.anim===name?p.animTime+DT:0;}
  p.anim=name;p.animTime=time;p.renderFacing=facing;
}
function windMotionForStep(p,targets){
  const motion=new Map();
  for(const target of targets||[])if(target.kind==='wind'){
    const recorded=Number.isFinite(target.pathId),replayed=recorded&&p.windPathSeen[target.id]===target.pathId;
    // The producer may retain the last path while paused. Its endpoint remains
    // a valid target, while an already-observed trajectory belongs to the past.
    motion.set(target.id,replayed?{...target,prevX:target.x,prevY:target.y}:target);
    if(recorded)p.windPathSeen[target.id]=target.pathId;
  }
  return motion;
}
function applyNailHits(p,world,out,previousPosition,windMotion) {
  const a=p.attack;if(!a)return;
  if(!a.active){a.previousPolygon=null;a.previousPolygonTick=-1;return;}
  const poly=attackPolygon(p,a);
  const previousPoly=a.previousPolygonTick===p.ticks-1?a.previousPolygon:
    attackPolygon(previousPosition,a);
  for(const target of world.targets||[]){
    if(a.hits.includes(target.id))continue;
    const windContact=target.kind==='wind'?windPolygonContact(windMotion.get(target.id)||target,poly,previousPoly):null;
    if(target.kind==='wind'?!windContact:!polygonIntersectsBox(poly,targetBox(target)))continue;
    a.hits.push(target.id);
    const damaging=damageableTarget(target),strikeFacing=a.wall?-a.facing:a.facing,contactFreeze=damaging?TUNING.hitFreeze:0;
    p.freezeRemaining=Math.max(p.freezeRemaining,contactFreeze);
    if(damaging&&target.givesSoul!==false){
      const offered=p.soul<p.maxSoul?TUNING.soulPerHit:TUNING.reserveSoulPerHit;
      const mainGain=Math.min(offered,p.maxSoul-p.soul),reserveGain=Math.min(offered-mainGain,p.maxReserveSoul-p.reserveSoul);
      p.soul+=mainGain;p.reserveSoul+=reserveGain;
      if(mainGain+reserveGain>0)push(out,p,'soulGain',{amount:mainGain+reserveGain,mainGain,reserveGain,soul:p.soul,reserveSoul:p.reserveSoul,targetId:target.id});
    }
    const contact={targetId:target.id,kind:a.kind,attackId:a.id,facing:strikeFacing,damage:damaging?a.damage:0,
      x:windContact?.x??target.x,y:windContact?.y??clamp(p.y+1.1,target.y,target.y+target.h),freeze:contactFreeze,
      ...(windContact?{contactTime:windContact.time,motionPathId:target.pathId}:{} )};
    if(damaging)push(out,p,'hit',contact);
    else push(out,p,'parry',{...contact,mode:target.parryMode||'tink'});
    if(a.kind==='down'&&!p.grounded&&target.pogoable!==false){p.jumpSteps=-1;p.doubleJumpSteps=-1;p.doubleJumpTime=-1;p.doubleJumped=false;p.bounceRemaining=TUNING.bounceDuration;p.vy=TUNING.bounceSpeed;p.airDashed=false;setAirStart(p,true);push(out,p,'pogo',{targetId:target.id});}
    else if(a.kind==='side'){p.recoilRemaining=TUNING.recoilDuration;p.recoilDirection=-strikeFacing;}
    else if(a.kind==='up'){p.jumpSteps=-1;p.jumpReleasePending=true;p.vy=Math.min(p.vy,0);}
  }
  a.previousPolygon=poly;a.previousPolygonTick=p.ticks;
}
export function stepPlayer(p,rawInput={},world={}) {
  const out=[],{i,pressed,released,freshPressed}=readInput(rawInput,p);
  if(p.freezeRemaining>EPS){
    p.freezeRemaining=Math.max(0,p.freezeRemaining-DT);
    for(const key of buttons){if(pressed[key])p.pendingPressed[key]=true;if(released[key])p.pendingReleased[key]=true;}
    if(freshPressed.attack)p.pendingAim.attack={up:i.up,down:i.down,facing:i.move||p.facing};
    if(freshPressed.dash)p.pendingAim.dash={facing:i.move||p.facing};
    if(freshPressed.cast)p.pendingAim.cast={up:i.up,down:i.down,facing:i.move||p.facing};
    p.previous=i;return out;
  }
  const savedAim=p.pendingAim;p.pendingPressed={};p.pendingReleased={};p.pendingAim={};p.previous=i;
  p.time+=DT;p.ticks++;
  const previousPosition={x:p.x,y:p.y},windMotion=windMotionForStep(p,world.targets);
  const shadowBefore=p.shadowCooldown;
  if(p.invulnerable>EPS)p.invulElapsed+=DT;
  for(const key of ['attackCooldown','dashCooldown','shadowCooldown','invulnerable','diveInvulnerable','headBumpRemaining','reserveTransferDelay'])p[key]=Math.max(0,p[key]-DT);
  if(shadowBefore>EPS&&p.shadowCooldown<=EPS)push(out,p,'shadowReady');
  for(const [key,end]of [['doubleJumpTime',.6],['wallJumpTime',.4],['shadowDashElapsed',1.7],['focusFinishTime',.23]])if(p[key]>=0){p[key]+=DT;if(p[key]>=end-EPS)p[key]=-1;}
  if(p.attack){p.attack.time+=DT;if(p.attack.time>=p.attack.duration-EPS)p.attack=null;}
  if(p.dashing){p.dashTime+=DT;if(p.dashTime>=TUNING.dashDuration-EPS){p.dashing=false;p.shadowDashing=false;p.dashTime=0;p.vx=0;p.vy=0;push(out,p,'dashEnd');}}
  if(p.hurt){
    if(p.hurt.time>=p.hurt.duration-EPS){p.hurt=null;p.vx=0;p.vy=0;}
    else {p.hurt.phase='recoil';p.hurt.time+=DT;}
  }
  const wasGrounded=p.grounded;p.grounded=floorContact(p,world);
  if(p.grounded){p.airDashed=false;p.doubleJumped=false;p.coyoteRemaining=TUNING.coyoteTime;}
  else p.coyoteRemaining=Math.max(0,p.coyoteRemaining-DT);
  p.wall=wallContact(p,world);
  p.wallSliding=!!p.wall&&!p.grounded&&p.vy<=0&&!p.dashing&&!p.hurt&&!p.casting&&!p.focusing&&p.doubleJumpSteps<0&&p.wallLock<=0;
  if(wasGrounded&&!p.grounded&&p.airPhase==='ground')p.airFrame=6;
  for(const [key,request]of Object.entries(p.queue))if(request){request.age+=DT;
    const limit=key==='jump'&&!p.grounded&&!p.doubleJumped?TUNING.doubleJumpBuffer:TUNING[`${key}Buffer`];
    if(request.age>limit+EPS)p.queue[key]=null;}
  if(released.jump)p.jumpReleasePending=true;
  if(i.move)p.facing=i.move;
  // Source FixedUpdate: after recovery, changing the rendered facing cancels
  // the old swing. Cooldown continues independently, including Quick Slash.
  if(p.attack&&p.attack.time>=TUNING.attackRecovery-EPS&&i.move&&i.move!==p.attack.facing&&!p.wallSliding&&p.wallLock<=0)cancelAttack(p,out,'turn');
  if(pressed.jump)p.queue.jump={age:0,released:!i.jump};
  if(pressed.attack)p.queue.attack={age:0,...(!freshPressed.attack&&savedAim.attack||{up:i.up,down:i.down,facing:i.move||p.facing})};
  if(pressed.dash)p.queue.dash={age:0,...(!freshPressed.dash&&savedAim.dash||{facing:i.move||p.facing})};
  if(pressed.cast)p.queue.cast={age:0,...(!freshPressed.cast&&savedAim.cast||{up:i.up,down:i.down,facing:i.move||p.facing})};
  if(released.jump&&!pressed.jump&&p.queue.jump)p.queue.jump.released=true;
  if(pressed.hurt){out.push(...hurtPlayer(p,{damage:1,direction:-p.facing}));if(p.freezeRemaining>EPS)return out;}
  if(p.dead){p.vx=0;p.vy=0;chooseAnimation(p,i);return out;}
  const attackRecovered=!p.attack||p.attack.time>=TUNING.attackRecovery-EPS;
  if(!p.hurt&&!p.dashing&&!p.casting&&p.queue.cast&&attackRecovered)startCast(p,p.queue.cast,out);
  if(!p.hurt&&!p.dashing&&!p.casting&&!p.focusing&&i.focus&&p.grounded&&p.hp<p.maxHp&&p.soul>=33&&attackRecovered)startFocus(p,out);
  advanceFocus(p,i,out);
  // Source reserve FSM transfers one point after Wait(.005). The fixed 50 Hz
  // adaptation consumes one transfer per simulation step, after its 1s pause.
  if(!p.dead&&p.reserveTransferDelay<=EPS&&p.reserveSoul>0&&p.soul<p.maxSoul){
    p.soul++;p.reserveSoul--;push(out,p,'soulTransfer',{amount:1,soul:p.soul,reserveSoul:p.reserveSoul});
  }
  // Grounded jump and ordinary attack coexist; ability changes preserve the input bank.
  if(!p.hurt&&!p.casting&&!p.focusing){
    if(p.queue.jump&&!p.dashing){
      if((p.grounded||p.coyoteRemaining>EPS)&&p.headBumpRemaining<=EPS)startJump(p,p.queue.jump,out);
      else if(p.wall&&!p.grounded)startWallJump(p,p.queue.jump,out);
      else if(!p.grounded&&!p.doubleJumped&&!p.attack&&p.bounceRemaining<=EPS)startDoubleJump(p,out);
    }
    if(p.queue.dash&&p.dashCooldown<=EPS&&!p.dashing&&(p.grounded||!p.airDashed||p.wallSliding)&&(!p.attack||p.attack.time>=TUNING.attackRecovery-EPS))startDash(p,p.queue.dash,out);
    if(p.queue.attack&&!p.dashing&&!p.attack&&p.attackCooldown<=EPS)startAttack(p,p.queue.attack,out);
  }
  let gravity=true;
  if(p.hurt){p.vx=p.hurt.direction*TUNING.hurtSpeed;p.vy=TUNING.hurtLift;p.grounded=false;gravity=false;}
  else if(p.casting){advanceCast(p,world,out);gravity=p.casting?.kind==='dive'&&p.casting.phase==='antic'&&p.casting.startedGrounded;}
  else if(p.focusing){p.vx=0;}
  else if(p.dashing){p.vx=p.dashDirection*TUNING.dashSpeed;p.vy=0;}
  else {
    p.vx=i.move*TUNING.runSpeed;
    if(p.recoilRemaining>EPS){p.recoilRemaining=Math.max(0,p.recoilRemaining-DT);
      p.vx=p.recoilDirection*TUNING.recoilSpeed+(Math.sign(p.vx)===p.recoilDirection?p.vx:0);}
    if(p.wallLock>0){const step=TUNING.wallJumpLock+1-p.wallLock;
      if(step>5&&i.move===p.wallKickDirection)p.wallLock=0;
      else {p.vx=p.wallKickDirection*(TUNING.wallJumpSpeed-(TUNING.wallJumpSpeed-TUNING.runSpeed)*step/TUNING.wallJumpLock);p.wallLock--;}}
    if(p.jumpSteps>=0){
      if(!i.jump)p.jumpReleasePending=true;
      if(p.jumpReleasePending&&p.jumpedSteps>=TUNING.jumpMinSteps){p.jumpSteps=-1;p.vy=Math.min(0,p.vy);}
      else if(p.jumpSteps<=TUNING.jumpSteps){p.vy=TUNING.jumpSpeed;p.jumpSteps++;p.jumpedSteps++;}
      else p.jumpSteps=-1;
    }else if(released.jump&&p.vy>0&&p.bounceRemaining<=EPS&&p.doubleJumpSteps<0)p.vy=0;
    if(p.doubleJumpSteps>=0){
      if(p.doubleJumpSteps<=TUNING.doubleJumpSteps){if(p.doubleJumpSteps>3)p.vy=TUNING.jumpSpeed*1.1;p.doubleJumpSteps++;}
      else p.doubleJumpSteps=-1;
    }
    if(p.bounceRemaining>EPS){p.bounceRemaining=Math.max(0,p.bounceRemaining-DT);p.vy=p.bounceRemaining>EPS?TUNING.bounceSpeed:0;}
    if(p.wallSliding){
      if(i.move===-p.wall)p.wallUnstick++;else p.wallUnstick=0;
      if(p.wallUnstick>=TUNING.wallStickySteps){p.wallSliding=false;p.wallUnstick=0;}
      else {p.vy=Math.max(p.vy,TUNING.wallSlideSpeed);p.vx=0;}
    }
  }
  if(gravity&&!p.dashing&&!p.grounded)p.vy=Math.max(-TUNING.fallSpeed,p.vy-TUNING.gravity*DT);
  moveAndCollide(p,world,out);updateAirPose(p);
  if(!p.wall)p.wallSliding=false;
  if(p.attack?.wall&&!p.wallSliding)cancelAttack(p,out,'leftWall');
  if(p.attack){p.attack.active=p.attack.time>=TUNING.attackActiveStart-EPS&&p.attack.time<TUNING.attackActiveEnd-EPS;applyNailHits(p,world,out,previousPosition,windMotion);}
  advanceProjectiles(p,world,out);
  chooseAnimation(p,i);return out;
}
