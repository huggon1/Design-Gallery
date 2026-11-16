// Movement constants and ordering follow NoelFB/Celeste Source/Player/Player.cs.
// This independent training simulation omits campaign actors and audio. The
// Input buffering uses the inspectable XNA 1.4 Input.cs binding (0.08s).
// Bumper launches follow XNA 1.4 ExplodeLaunch; path-platform actors are gym adaptations.
import { createHoldableSystem } from './holdables.js';
export const DT=1/60;
export const C=Object.freeze({maxRun:90,runAccel:1000,runReduce:400,airMult:.65,gravity:900,maxFall:160,fastFall:240,fastAccel:300,jumpY:-105,jumpBoost:40,varJump:.2,coyote:.1,jumpBuffer:.08,dashBuffer:.08,dashSpeed:240,dashTime:.15,dashFreeze:.05,dashCooldown:.2,refillCooldown:.1,dashAttack:.3,superX:260,hyperX:325,hyperY:-52.5,wallJumpX:130,wallJumpY:-105,wallForce:.16,wallBounceX:170,wallBounceY:-160,wallBounceVar:.25,wallSlideTime:1.2,wallSlideStart:20,stamina:110,climbUp:-45,climbDown:80,climbAccel:900,climbUpCost:100/2.2,climbStillCost:10,climbJumpCost:27.5});
const sign=Math.sign;
const approach=(a,b,n)=>a<b?Math.min(a+n,b):Math.max(a-n,b);
// Original timer fields and Engine.DeltaTime are float32. Keeping that precision
// also preserves the coroutine's check-before-subtract frame at fixed 60Hz.
const dec=t=>Math.max(0,Math.fround(Math.fround(t)-Math.fround(DT)));
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const normalizedName=name=>String(name).toLowerCase().replace(/[^a-z0-9]/g,'');
// Monocle Actor movement accumulates fractions and rounds to the nearest pixel.
const round=n=>{const floor=Math.floor(n),fraction=n-floor;return Math.abs(fraction-.5)<1e-9?(floor%2===0?floor:floor+1):Math.round(n);};
const TECH=new Set(['jump','dash','walljump','neutral','climb-jump','climb-hop','wallboost','cornerboost','super','hyper','extended-super','extended-hyper','reverse-super','reverse-hyper','wavedash','reverse-wavedash','demo-hyper','dream-hyper','wallbounce','ultra','ultra-chain','lift-boost','demo-dash','air-dash','dream-enter','dream-exit','dream-jump','spring','bumper','refill','moving-block','pickup','throw','drop','jelly-float']);
const clone=value=>JSON.parse(JSON.stringify(value));
const rect=(entity)=>entity.w!==undefined?entity:{x:entity.x-(entity.r||6),y:entity.y-(entity.r||6),w:(entity.r||6)*2,h:(entity.r||6)*2};

export class Game {
  constructor(room,options={}) {this.onEvent=options.onEvent||(()=>{});this.deaths=0;this.reset(room);}
  reset(room=this.sourceRoom) {
    if(!room)throw new Error('A training room is required');
    this.sourceRoom=clone(room);this.room=clone(room);this.room.width??=320;this.room.height??=180;
    this.room.solids??=[];this.room.hazards??=[];this.room.entities??=[];
    this.time=0;this.frames=0;this.activeFrames=0;this.complete=false;this.events=[];this.techniques=new Set();this.techEvidence=[];this.techCounts={};this.evidenceMatches=new Set();this.freeze=0;this.previousInput={};
    this.spawn();return this;
  }
  spawn() {
    const spawn=this.room.spawn||{x:16,y:149};
    this.player={x:spawn.x,y:spawn.y,w:8,h:11,vx:0,vy:0,facing:1,dashes:this.room.dashes??1,maxDashes:this.room.dashes??1,stamina:C.stamina,state:'normal',grounded:false,ducking:false,wall:0,remX:0,remY:0,jumpGrace:0,jumpBuffer:0,varJump:0,varJumpSpeed:0,dashTime:0,dashAttack:0,dashCooldown:0,refillCooldown:0,dashDir:{x:0,y:0},dashAim:{x:1,y:0},forceTime:0,forceX:0,wallSlide:C.wallSlideTime,retention:0,retainedX:0,maxFall:C.maxFall,landAge:10,landSpeed:0,deathAge:0,deadTimer:0,autoJump:false,autoJumpTimer:0,wallBoost:0,dreamGrace:0,launchFreeze:0,explodeBoostTimer:0};
    this.player.grounded=this.solidAt(this.player.x,this.player.y+1,{vertical:1})!==null;
    if(this.player.grounded)this.player.jumpGrace=C.coyote;
    this.holdables=createHoldableSystem(this);
  }
  emit(type,data={}) {
    const p=this.player,event={type,x:p.x+p.w/2,y:p.y+p.h/2,time:this.time,...data};this.events.push(event);this.onEvent(event);
    if(TECH.has(type)){
      const evidence={name:type,x:event.x,y:event.y,vx:p.vx,vy:p.vy,frame:this.frames,activeFrame:this.activeFrames,time:this.time,input:{...this.currentInput},before:data.before||this.stepBefore||this.motionState(),after:this.motionState(),timing:{dashAge:p.dashStartActiveFrame===undefined?null:(this.activeFrames-p.dashStartActiveFrame)*DT,dashFrames:p.dashStartActiveFrame===undefined?null:this.activeFrames-p.dashStartActiveFrame,landingAge:p.landAge,coyote:p.jumpGrace,jumpBuffer:p.jumpBuffer,dashRemaining:p.dashTime},originalDirection:{...p.originalDash},...data};
      this.techniques.add(type);this.techCounts[type]=(this.techCounts[type]||0)+1;this.techEvidence.push(evidence);if(this.techEvidence.length>512)this.techEvidence.shift();
      for(const [index,requirement]of (this.room.goal?.evidence||[]).entries())if(normalizedName(type)===normalizedName(requirement.tech)&&(!requirement.zone||(event.x>=requirement.zone.x&&event.x<=requirement.zone.x+requirement.zone.w&&event.y>=requirement.zone.y&&event.y<=requirement.zone.y+requirement.zone.h)))this.evidenceMatches.add(index);
      const tech={...event,type:'tech',name:type,evidence};this.events.push(tech);this.onEvent(tech);
    }
  }
  motionState() {const p=this.player;return{state:p.state,x:p.x,y:p.y,vx:p.vx,vy:p.vy,grounded:p.grounded,ducking:p.ducking,dashes:p.dashes,stamina:p.stamina,direction:{...p.dashDir}};}
  hurtbox() {const p=this.player;return{x:p.x,y:p.y,w:8,h:p.ducking?4:9};}
  solids() {return [...this.room.solids,...this.room.entities.filter(e=>(e.type||e.kind)==='movingBlock')];}
  solidAt(x,y,{h=this.player.h,w=this.player.w,ignoreDream=false,vertical=0,ignore=null}={}) {
    const box={x,y,w,h};
    return this.solids().find(s=>s!==ignore&&(!ignoreDream||s.kind!=='dream')&&(!(s.kind==='oneway'||s.oneWay)||(vertical>0&&this.player.y+this.player.h<=s.y))&&overlaps(box,s))||null;
  }
  canStand(x=this.player.x,y=this.player.y) {const p=this.player;return !this.solidAt(x,y-(11-p.h),{h:11});}
  duck(value) {
    const p=this.player;if(value===p.ducking)return true;
    if(!value&&!this.canStand())return false;
    const height=value?6:11;p.y+=p.h-height;p.h=height;p.ducking=value;return true;
  }
  wallAt(dir,distance=1) {return this.solidAt(this.player.x+dir*distance,this.player.y);}
  wallJumpAt(dir) {
    const p=this.player,up=p.dashAttack>0&&p.dashDir.x===0&&p.dashDir.y===-1;
    const spikeDirection=dir>0?'left':'right';
    const spiked=up&&this.room.hazards.some(h=>h.direction===spikeDirection&&overlaps({x:p.x+dir*5,y:p.y,w:p.w,h:p.h},h));
    return this.wallAt(dir,up&&!spiked?5:3);
  }
  beginClimb() {
    const p=this.player;if(p.state==='normal')this.leaveNormal();p.state='climb';p.autoJump=false;p.vx=0;p.vy*=.2;p.wallSlide=1.2;p.climbNoMove=.1;p.wallBoost=0;
    for(let i=0;i<2&&!this.wallAt(p.facing);i++)p.x+=p.facing;
    this.emit('climb');
  }
  leaveNormal() {const p=this.player;p.wallBoost=0;p.retention=0;p.hopWaitX=0;}
  step(raw={}) {
    this.events=[];this.time+=DT;this.frames++;
    const input={x:sign(raw.x||0),y:sign(raw.y||0),aimX:sign(raw.aimX??raw.x??0),aimY:sign(raw.aimY??raw.y??0),gliderY:sign(raw.gliderY??raw.y??0),jump:!!raw.jump,jumpPressed:!!raw.jumpPressed,dashPressed:!!raw.dashPressed,demoPressed:!!raw.demoPressed,grab:!!raw.grab};
    this.currentInput=input;
    const p=this.player;
    this.stepBefore=this.motionState();
    // Virtual inputs update before Engine's freeze branch, independently of
    // frozen player-state timers. Newly pressed buttons get the full buffer.
    for(const key of ['jumpBuffer','dashBuffer','demoBuffer'])p[key]=dec(p[key]||0);
    if(input.jumpPressed)p.jumpBuffer=C.jumpBuffer;
    else if(!input.jump)p.jumpBuffer=0;
    if(input.dashPressed)p.dashBuffer=C.dashBuffer;else if(raw.dash===false)p.dashBuffer=0;
    if(input.demoPressed)p.demoBuffer=C.dashBuffer;else if(raw.demo===false)p.demoBuffer=0;
    // Engine freeze skips the entire scene, while virtual input clocks continue.
    if(p.launchFreeze>0||p.dreamFreeze>0){if(p.launchFreeze>0)p.launchFreeze=dec(p.launchFreeze);if(p.dreamFreeze>0)p.dreamFreeze=dec(p.dreamFreeze);return this.player;}
    if(p.state==='dead'){
      p.deadTimer=dec(p.deadTimer);p.deathAge+=DT;
      if(!p.deadTimer){this.room=clone(this.sourceRoom);this.room.width??=320;this.room.height??=180;this.room.solids??=[];this.room.hazards??=[];this.room.entities??=[];this.techniques.clear();this.techEvidence=[];this.techCounts={};this.evidenceMatches.clear();this.spawn();this.emit('respawn');}
      return this.player;
    }
    if(p.state==='dash-freeze'){
      p.dashAim=this.aim(input);
      if(this.freeze>0){this.freeze--;return this.player;}
      if(p.dashStartup>0){p.dashStartup--;return this.player;}
      p.state='dash';p.dashActivationPending=true;
    }
    this.activeFrames++;this.holdables.tickTimers();p.liftTime=dec(p.liftTime||0);p.liftX=0;p.liftY=0;this.updateMovingBlocks();
    if(p.state==='dead')return this.player;
    if(p.explodeBoostTimer>0){
      if(input.x===sign(p.explodeBoostSpeed)){p.vx=p.explodeBoostSpeed;p.explodeBoostTimer=0;}
      else p.explodeBoostTimer=dec(p.explodeBoostTimer);
    }
    const wasGrounded=p.grounded;
    p.wasGrounded=wasGrounded;
    p.grounded=p.state!=='dream'&&p.vy>=0&&!!this.solidAt(p.x,p.y+1,{vertical:1});
    p.wall=this.wallAt(1)?1:this.wallAt(-1)?-1:0;
    p.landAge+=DT;
    const refillWasReady=p.refillCooldown<=0,forceWasActive=p.forceTime>0,boostWasActive=p.wallBoost>0;
    for(const key of ['jumpGrace','varJump','dashAttack','dashCooldown','refillCooldown','forceTime','wallBoost','dreamGrace'])p[key]=dec(p[key]||0);
    if(p.autoJumpTimer>0){p.autoJumpTimer=dec(p.autoJumpTimer);if(!p.autoJumpTimer)p.autoJump=false;}
    // Refill is checked before state update, including during a grounded dash.
    if(p.grounded){p.jumpGrace=C.coyote;p.dreamGrace=0;p.stamina=C.stamina;p.wallSlide=C.wallSlideTime;p.autoJump=false;if(refillWasReady)this.refillDashes(false);}
    // Native retention is cancelled by a reversal (including a wall jump),
    // rather than restoring stale momentum back toward the wall next frame.
    if(p.retention>0&&sign(p.vx)===-sign(p.retainedX))p.retention=0;
    if(p.retention>0){if(!this.wallAt(sign(p.retainedX))){p.vx=p.retainedX;p.retention=0;if(p.cornerCandidate&&p.vy<0&&Math.abs(p.vx)>90){this.emit('cornerboost',{speed:p.vx});p.cornerCandidate=null;}}else p.retention=dec(p.retention);}
    // WallBoost precedes this frame's MoveX assignment in the source: it reads
    // the previous active update's resolved input, including forced movement.
    if(boostWasActive&&p.moveX===p.wallBoostDir){const before=this.motionState();p.vx=p.moveX*C.wallJumpX;p.stamina+=C.climbJumpCost;p.wallBoost=0;this.emit('wallboost',{before,direction:p.moveX,refund:C.climbJumpCost});}
    if(p.hopWaitX){if(sign(p.vx)===-p.hopWaitX||p.vy>0)p.hopWaitX=0;else if(!this.wallAt(p.hopWaitX)){p.vx=p.hopWaitX*100;p.hopWaitX=0;}}
    const moveX=forceWasActive?p.forceX:input.x;p.moveX=moveX;
    if(moveX&&p.state!=='climb')p.facing=moveX;
    if(p.state==='normal'){this.holdables.beforeNormal(input);if(p.state!=='normal')this.leaveNormal();}
    // Climb jump and normal grab have priority over Dash in Player.cs.
    const climbJumpFirst=p.state==='climb'&&p.jumpBuffer>0&&this.canStand();
    const normalGrabFirst=p.state==='normal'&&input.grab&&!p.holding&&p.stamina+(p.wallBoost>0?27.5:0)>=20&&!p.ducking&&p.vy>=0&&sign(p.vx)!==-p.facing&&(this.wallAt(p.facing,2)||(input.y<1&&[1,2].some(i=>!this.solidAt(p.x,p.y-i)&&this.solidAt(p.x+p.facing*2,p.y-i))));
    if((p.dashBuffer>0||p.demoBuffer>0)&&p.dashes>0&&!p.dashCooldown&&(!p.holding||p.state==='launch')&&!['dream','pickup'].includes(p.state)&&!climbJumpFirst&&!normalGrabFirst){
      this.startDash(input,p.demoBuffer>0);return this.player;
    }
    if(p.state==='dream'){this.updateDream(input);if(p.state==='dead')return this.player;this.holdables.afterStep(input);this.interactions(input);this.checkGoal();return this.player;}
    const stateBeforeUpdate=p.state;
    if(p.state==='pickup')this.holdables.updatePickup(input);
    else if(p.state==='climb')this.updateClimb(input,moveX);
    else if(p.state==='dash')this.updateDash(input);
    else if(p.state==='launch')this.updateLaunch();
    else this.updateNormal(input,moveX);
    if(stateBeforeUpdate!=='normal'&&p.state==='normal')p.maxFall=160;
    if(p.state==='dash'&&p.dashActivationPending){p.dashActivationPending=false;this.activateDash(input);}
    // Native crouch dash has no fixed crouch timer. Falling clears crouch as
    // soon as standing fits, after coyote time, before actor movement.
    if(p.vy>0&&p.ducking&&!p.grounded&&p.jumpGrace<=0&&this.canStand())this.duck(false);
    const speedBeforeLanding=p.vy;
    this.moveAxis(p.vx*DT,'x');if(p.state!=='dream')this.moveAxis(p.vy*DT,'y');
    if(p.cornerCandidate){if(!this.wallAt(p.cornerCandidate.wall)&&Math.abs(p.vx)>90&&p.vy<0){this.emit('cornerboost',{speed:p.vx});p.cornerCandidate=null;}else if((p.cornerCandidate.time=dec(p.cornerCandidate.time))===0)p.cornerCandidate=null;}
    if(p.state!=='dream')p.grounded=p.vy>=0&&!!this.solidAt(p.x,p.y+1,{vertical:1});
    if(p.grounded&&!wasGrounded){p.landAge=0;p.landSpeed=speedBeforeLanding;this.emit('land',{speed:speedBeforeLanding});}
    this.holdables.afterStep(input);this.interactions(input);this.checkGoal();
    if(Math.abs(p.vx)<=240&&!['dash','dash-freeze'].includes(p.state))p.ultraCarried=false;
    if(p.y>this.room.height+12||p.x<-16||p.x>this.room.width+16)this.die();
    this.previousInput=input;return this.player;
  }
  aim(input) {const p=this.player,x=input.aimX??input.x??0,y=input.aimY??input.y??0;if(!x&&!y)return{x:p.facing,y:0};const length=Math.hypot(x,y);return{x:x/length,y:y/length};}
  startDash(input,demo=false) {
    const p=this.player;
    const before=this.motionState();if(p.state==='normal'||p.state==='climb'){const lift=this.liftBoost();p.vx+=lift.x;p.vy+=lift.y;}
    if(p.state==='normal')this.leaveNormal();else if(p.state==='climb')p.retention=0;
    p.beforeDash={x:p.vx,y:p.vy};p.dashStartedOnGround=p.grounded;p.dashLanded=false;p.dashRefilled=false;p.dashAim=this.aim(input);p.originalDash={...p.dashAim};
    p.dashContinuesUltra=!!p.ultraCarried&&Math.abs(p.vx)>240;
    p.dashStartActiveFrame=this.activeFrames;p.dashStartFrame=this.frames;p.dashStartState=before;
    p.dashes--;p.dashCooldown=C.dashCooldown;p.refillCooldown=C.refillCooldown;p.dashAttack=C.dashAttack;p.dashDir={x:0,y:0};p.vx=0;p.vy=0;p.varJump=0;p.state='dash-freeze';
    p.dashBuffer=0;p.demoBuffer=0;
    this.freeze=2;p.dashStartup=1;p.demoDashed=demo;
    if(!p.grounded&&p.ducking&&this.canStand())this.duck(false);else if(!p.ducking&&(demo||input.y===1))this.duck(true);
    p.demoCrouched=demo&&p.ducking;
    this.emit('dash-start',{before,direction:{...p.dashAim},demo});if(demo&&p.ducking)this.emit('demo-dash',{before});if(!p.grounded)this.emit('air-dash',{before});
    for(const block of this.room.entities)if((block.type||block.kind)==='movingBlock'&&block.trigger==='dash')block.active=true;
  }
  activateDash(input) {
    const p=this.player,dir=this.aim(input);p.dashAim={...dir};p.originalDash={...dir};p.state='dash';p.dashTime=Math.fround(C.dashTime);p.dashDir={...dir};
    p.vx=dir.x*C.dashSpeed;p.vy=dir.y*C.dashSpeed;
    if(sign(p.beforeDash.x)===sign(p.vx)&&Math.abs(p.beforeDash.x)>Math.abs(p.vx))p.vx=p.beforeDash.x;
    if(dir.x)p.facing=sign(dir.x);
    if(p.grounded&&dir.x&&dir.y>0&&!this.solidAt(p.x,p.y+1,{vertical:1})?.kind?.includes('dream'))this.slideDash(false);
    this.emit('dash',{before:p.dashStartState,direction:{...p.dashDir},speed:Math.hypot(p.vx,p.vy)});
  }
  updateDash(input) {
    const p=this.player;
    if(p.jumpBuffer>0&&this.canStand()){
      if(p.dashDir.y===0&&p.jumpGrace>0){this.superJump(input);return;}
      const wall=this.wallJumpAt(1)?1:this.wallJumpAt(-1)?-1:0;
      if(wall){this.wallJump(-wall,input,p.dashDir.x===0&&p.dashDir.y===-1);return;}
    }
    if(p.dashActivationPending)return;
    if(p.dashTime>0)p.dashTime=dec(p.dashTime);
    else{
      if(p.dashDir.y<=0){p.vx=p.dashDir.x*160;p.vy=p.dashDir.y*160;if(p.vy<0)p.vy*=.75;}
      p.state='normal';p.autoJump=true;p.autoJumpTimer=0;p.demoDashed=false;
    }
    if(p.dashDir.y===0&&!p.grounded&&p.vy>=0)for(let i=1;i<=3;i++)if(this.solidAt(p.x,p.y+i,{vertical:1})){this.moveAxis(i,'y');break;}
  }
  updateNormal(input,moveX) {
    const p=this.player;
    if(p.wasGrounded&&!p.grounded&&p.vy>=0){const lift=this.liftBoost();if(lift.y<0)p.vy=lift.y;}
    if(!p.holding&&input.grab&&p.stamina+(p.wallBoost>0?27.5:0)>=20&&!p.ducking&&p.vy>=0&&sign(p.vx)!==-p.facing){
      if(this.wallAt(p.facing,2)){this.beginClimb();return;}
      if(input.y<1)for(let i=1;i<=2;i++)if(!this.solidAt(p.x,p.y-i)&&this.solidAt(p.x+p.facing*2,p.y-i)){
        p.y-=i;this.beginClimb();return;
      }
    }
    if(p.ducking){if(p.grounded&&input.y!==1)this.duck(false);}
    else if(!p.holding&&p.grounded&&input.y===1&&p.vy>=0)this.duck(true);
    const carry=this.holdables.profile(input);
    if(p.ducking&&p.grounded)p.vx=approach(p.vx,0,500*DT);
    else {const mult=(p.grounded?1:C.airMult)*carry.accelMultiplier;const acceleration=Math.abs(p.vx)>carry.maxRun&&sign(p.vx)===moveX?C.runReduce:C.runAccel;p.vx=approach(p.vx,moveX*carry.maxRun,acceleration*mult*DT);}
    p.maxFall=approach(p.maxFall,carry.fallTarget??(input.y===1&&p.vy>=160?240:160),300*DT);
    if(!p.grounded){
      let max=p.maxFall;
      if(!p.holding&&(moveX===p.facing||(!moveX&&input.grab))&&input.y!==1&&p.vy>=0&&p.wallSlide>0&&this.wallAt(p.facing)&&this.canStand()){
        this.duck(false);max=160+(20-160)*(p.wallSlide/1.2);p.wallSlide=dec(p.wallSlide);this.emit('wall-slide',{direction:p.facing});
      }
      p.vy=approach(p.vy,max,C.gravity*carry.gravityMultiplier*(Math.abs(p.vy)<40&&(input.jump||p.autoJump)?.5:1)*DT);
    }
    if(p.varJump>0){if(input.jump||p.autoJump)p.vy=Math.min(p.vy,p.varJumpSpeed);else p.varJump=0;}
    if(p.jumpBuffer>0){
      if(p.jumpGrace>0){this.jump(input,p.dreamGrace>0?'dream-jump':'jump');return;}
      if(this.canStand()){
        const wall=this.wallJumpAt(1)?1:this.wallJumpAt(-1)?-1:0;
        if(wall){
          if(!p.holding&&input.grab&&p.facing===wall&&p.stamina>0)this.climbJump(input);
          else this.wallJump(-wall,input,p.dashAttack>0&&p.dashDir.x===0&&p.dashDir.y===-1);
        }
      }
    }
  }
  updateLaunch() {
    const p=this.player;
    p.vy=approach(p.vy,160,(p.vy<0?450:225)*DT);
    p.vx=approach(p.vx,0,200*DT);
    if(Math.hypot(p.vx,p.vy)<220)p.state='normal';
  }
  explodeLaunch(from,input) {
    const p=this.player,hurt=this.hurtbox(),dx=hurt.x+hurt.w/2-from.x,dy=hurt.y+hurt.h/2-from.y,length=Math.hypot(dx,dy);
    if(p.state==='normal')this.leaveNormal();else if(p.state==='climb')p.retention=0;
    let x=length?dx/length:0,y=length?dy/length:-1;
    // Bumper calls ExplodeLaunch with snapUp=false and sidesOnly=false.
    if(y<=.65&&y>=-.55){y=0;x=sign(x);}
    p.vx=280*x;p.vy=280*y;
    if(p.vy<=50){p.vy=Math.min(-150,p.vy);p.autoJump=true;}
    p.explodeBoostTimer=0;
    if(p.vx){
      if(input.x===sign(p.vx))p.vx*=1.2;
      else{p.explodeBoostTimer=.01;p.explodeBoostSpeed=p.vx*1.2;}
    }
    this.refillDashes(false);p.stamina=110;p.dashCooldown=.2;p.state='launch';p.launchFreeze=Math.fround(.1);
    this.emit('bumper',{direction:{x,y},speed:Math.hypot(p.vx,p.vy)});
  }
  clearJump() {const p=this.player;if(p.state==='climb')p.retention=0;if(p.state!=='normal')p.maxFall=160;p.jumpBuffer=0;p.jumpGrace=0;p.dashAttack=0;p.wallSlide=1.2;p.wallBoost=0;p.grounded=false;p.state='normal';p.demoDashed=false;p.autoJump=false;p.autoJumpTimer=0;p.dashActivationPending=false;}
  liftBoost() {
    const p=this.player,block=this.solids().find(s=>s.liftX!==undefined&&overlaps({x:p.x,y:p.y+1,w:p.w,h:p.h},s));
    if(block)this.setLiftSpeed(block.liftX||0,block.liftY||0);
    const x=p.liftX||p.liftY?p.liftX:p.liftTime>0?p.lastLiftX:0,y=p.liftX||p.liftY?p.liftY:p.liftTime>0?p.lastLiftY:0;
    return{x:Math.max(-250,Math.min(250,x||0)),y:Math.max(-130,Math.min(0,y||0))};
  }
  setLiftSpeed(x,y) {const p=this.player;p.liftX=x;p.liftY=y;if(x||y){p.lastLiftX=x;p.lastLiftY=y;p.liftTime=.16;}}
  jump(input,type='jump',details={}) {
    const p=this.player,lift=this.liftBoost(),before=details.before||this.motionState();this.clearJump();p.vx+=40*(p.moveX??input.x)+lift.x;p.vy=-105+lift.y;p.varJump=.2;p.varJumpSpeed=p.vy;this.emit(type,{...details,before,lift});if(lift.x||lift.y)this.emit('lift-boost',{before,lift});
  }
  superJump(input) {
    const p=this.player,duck=p.ducking,refilled=!!p.dashRefilled,original=p.originalDash?.x||p.dashDir.x,reverse=!!original&&p.facing===-sign(original),wavedash=duck&&!p.dashStartedOnGround&&p.originalDash?.y>0&&p.dashLanded&&refilled,demo=p.demoDashed&&p.demoCrouched,dream=p.dreamGrace>0&&!p.grounded,before=this.motionState();
    const lift=this.liftBoost();this.clearJump();this.duck(false);p.vx=(260*p.facing+lift.x)*(duck?1.25:1);p.vy=(-105+lift.y)*(duck?.5:1);p.varJump=.2;p.varJumpSpeed=p.vy;
    const data={before,lift,extended:refilled,reverse,demo,dream};this.emit(duck?'hyper':'super',data);
    if(refilled)this.emit(duck?'extended-hyper':'extended-super',data);if(reverse)this.emit(duck?'reverse-hyper':'reverse-super',data);if(wavedash)this.emit('wavedash',data);if(wavedash&&reverse)this.emit('reverse-wavedash',data);if(duck&&demo)this.emit('demo-hyper',data);if(duck&&dream)this.emit('dream-hyper',data);
    if(lift.x||lift.y)this.emit('lift-boost',data);
  }
  wallJump(dir,input,bounce=false) {
    const p=this.player,before=this.motionState(),wall=this.wallAt(-dir,5);if(!this.liftBoost().x&&!this.liftBoost().y&&wall?.liftX!==undefined)this.setLiftSpeed(wall.liftX||0,wall.liftY||0);const lift=this.liftBoost();this.duck(false);this.clearJump();p.vx=(bounce?170:130)*dir+lift.x;p.vy=(bounce?-160:-105)+lift.y;p.varJump=bounce?.25:.2;p.varJumpSpeed=p.vy;p.facing=dir;
    if((p.moveX??input.x)&&!bounce){p.forceX=dir;p.forceTime=.16;}else p.forceTime=0;
    this.holdables.wallJump(dir);
    this.emit(bounce?'wallbounce':'walljump',{direction:dir,before,lift});if(!(p.moveX??input.x)&&!bounce)this.emit('neutral',{before,lift});
    if(lift.x||lift.y)this.emit('lift-boost',{before,lift});
  }
  climbJump(input) {
    const p=this.player,wall=p.facing,before=p.vx,stateBefore=this.motionState(),cost=p.grounded?0:27.5;
    p.stamina-=cost;this.jump(input,'climb-jump',{before:stateBefore,cost});
    if(!(p.moveX??input.x)){p.wallBoost=.2;p.wallBoostDir=-wall;}
    if(Math.abs(before)>90)p.cornerCandidate={wall,time:.1};
  }
  updateClimb(input,moveX) {
    const p=this.player;p.climbNoMove=dec(p.climbNoMove);
    if(p.jumpBuffer>0&&this.canStand()){if(input.x===-p.facing)this.wallJump(-p.facing,input);else this.climbJump(input);return;}
    if(!input.grab||p.stamina<=0){const lift=this.liftBoost();p.vx+=lift.x;p.vy+=lift.y;p.state='normal';p.retention=0;return;}
    if(!this.wallAt(p.facing)){
      if(p.vy<0)this.climbHop();
      p.state='normal';p.retention=0;return;
    }
    if(!p.climbNoMove&&input.y<0&&this.slipCheck()){this.climbHop();p.state='normal';p.retention=0;return;}
    const target=p.climbNoMove?0:input.y<0?-45:input.y>0&&!p.grounded?80:0;
    p.vx=0;p.vy=approach(p.vy,target,900*DT);
    if(!p.climbNoMove){if(target<0)p.stamina-=(100/2.2)*DT;else if(!target)p.stamina-=10*DT;}
    if(p.stamina<=0)p.state='normal';
  }
  slipCheck() {
    const p=this.player,x=p.facing>0?p.x+p.w:p.x-1;
    return !this.solids().some(s=>(x>=s.x&&x<s.x+s.w)&&((p.y>=s.y&&p.y<s.y+s.h)||(p.y+4>=s.y&&p.y+4<s.y+s.h)));
  }
  climbHop() {
    const p=this.player;p.hopWaitX=this.wallAt(p.facing)?p.facing:0;
    if(!p.hopWaitX)p.vx=100*p.facing;
    p.vy=Math.min(p.vy,-120);p.forceX=0;p.forceTime=.2;this.emit('climb-hop',{direction:p.facing});
  }
  moveAxis(amount,axis) {
    const p=this.player,key=axis==='x'?'remX':'remY';p[key]+=amount;let move=round(p[key]);p[key]-=move;
    const direction=sign(move);
    while(move){
      const x=p.x+(axis==='x'?direction:0),y=p.y+(axis==='y'?direction:0);
      const solid=this.solidAt(x,y,{vertical:axis==='y'?direction:0});
      if(solid){this.collision(axis,direction,solid);p[key]=0;break;}
      p[axis]+=direction;move-=direction;
    }
  }
  moveExact(amount,axis) {
    const p=this.player,dir=sign(amount);
    for(let i=0;i<Math.abs(amount);i++){const x=p.x+(axis==='x'?dir:0),y=p.y+(axis==='y'?dir:0);if(this.solidAt(x,y,{vertical:axis==='y'?dir:0}))return false;p[axis]+=dir;}
    return true;
  }
  collision(axis,direction,solid) {
    const p=this.player;
    if(solid.kind==='dream'&&p.dashAttack>0&&(p.dashDir.x||p.dashDir.y)){
      if(p.state==='normal')this.leaveNormal();
      p.state='dream';p.vx=p.dashDir.x*240;p.vy=p.dashDir.y*240;p.dreamMin=.1;p.dashAttack=0;p.stamina=110;p.dreamBlock=solid.id||'dream';this.emit('dream-enter');return false;
    }
    if(axis==='x'){
      if(p.state==='dash'&&p.grounded&&!this.solidAt(p.x+direction,p.y+p.h-6,{h:6})){this.duck(true);return false;}
      if(p.state==='dash'&&p.vy===0){for(let i=1;i<=4;i++)for(const dy of [i,-i])if(!this.solidAt(p.x+direction,p.y+dy)&&this.solidAt(p.x+direction,p.y+dy-sign(dy))){this.moveExact(dy,'y');this.moveExact(direction,'x');this.emit('corner-correct',{axis:'dash',amount:dy});return true;}}
      if(p.retention<=0){p.retainedX=p.vx;p.retention=.06;}p.vx=0;p.dashAttack=0;return false;
    }
    if(direction<0){
      const correction=p.dashAttack>0&&Math.abs(p.vx)<.01?5:4;
      for(const directionX of [-1,1])if(p.vx*directionX>=0)for(let i=1;i<=correction;i++){const dx=i*directionX;if(!this.solidAt(p.x+dx,p.y-1)){p.x+=dx;p.y--;this.emit('corner-correct',{axis:'jump',amount:dx});return true;}}
      if(p.varJump<.15)p.varJump=0;
    }else{
      if(p.state==='dash'&&!p.dashStartedOnGround)for(const directionX of [-1,1])if(p.vx*directionX>=0)for(let i=1;i<=4;i++){const dx=i*directionX;if(!this.solidAt(p.x+dx,p.y+1,{vertical:1})){this.moveExact(dx,'x');this.moveExact(1,'y');this.emit('corner-correct',{axis:'dash-down',amount:dx});return true;}}
      if(p.dashDir.x&&p.dashDir.y>0&&p.vy>0)this.slideDash(true);
    }
    p.dashAttack=0;p.vy=0;return false;
  }
  slideDash(airLanding) {
    const p=this.player,advanced=airLanding&&p.state!=='dash'&&!p.dashStartedOnGround&&Math.abs(p.beforeDash?.x||0)>240&&Math.abs(p.vx)>240;
    p.dashDir={x:sign(p.dashDir.x),y:0};p.vy=0;p.vx*=1.2;this.duck(true);p.dashLanded=airLanding;
    if(airLanding)this.emit('dash-slide',{speed:Math.abs(p.vx),multiplier:1.2});
    if(advanced){this.emit('ultra',{speed:Math.abs(p.vx),multiplier:1.2});if(p.dashContinuesUltra)this.emit('ultra-chain',{speed:Math.abs(p.vx),multiplier:1.2});p.ultraCarried=true;}
  }
  updateDream(input) {
    const p=this.player;p.dreamMin=dec(p.dreamMin);
    p.remX+=p.vx*DT;p.remY+=p.vy*DT;const dx=round(p.remX),dy=round(p.remY);p.x+=dx;p.y+=dy;p.remX-=dx;p.remY-=dy;
    const inside=this.room.solids.some(s=>s.kind==='dream'&&overlaps(p,s));
    if(!inside){
      if(this.solidAt(p.x,p.y,{ignoreDream:true})){
        let safe=false;for(let x=1;x<=5&&!safe;x++)for(const offsetX of [-x,x]){if(safe)break;for(let y=1;y<=5&&!safe;y++)for(const offsetY of [-y,y])if(!this.solidAt(p.x+offsetX,p.y+offsetY)){p.x+=offsetX;p.y+=offsetY;safe=true;break;}}
        if(!safe){this.die();return;}
      }
      if(!p.dreamMin){
        p.state='normal';p.maxFall=160;p.dreamFreeze=Math.fround(.05);
        const jumped=p.jumpBuffer>0&&p.dashDir.x;
        if(jumped)this.jump(input,'dream-jump');
        else{
          p.autoJump=true;p.autoJumpTimer=0;
          if(p.dashDir.y>=0||p.dashDir.x){
            if(p.dashDir.x>0&&this.solidAt(p.x-5,p.y))this.moveAxis(-5,'x');
            else if(p.dashDir.x<0&&this.solidAt(p.x+5,p.y))this.moveAxis(5,'x');
            if(input.grab&&input.x&&this.wallAt(input.x,2)){p.facing=input.x;this.beginClimb();}
          }
        }
        p.stamina=110;this.refillDashes(false);p.jumpGrace=p.dashDir.x?.1:0;p.dreamGrace=p.jumpGrace;p.dreamExitActiveFrame=this.activeFrames;this.emit('dream-exit',{jumped:!!jumped});
      }
    }
  }
  refillDashes(event=true,count=this.player.maxDashes) {const p=this.player;if(p.dashes>=count)return false;const before=this.motionState();p.dashes=count;p.dashRefilled=true;if(event)this.emit('refill',{before,dashes:count});return true;}
  updateMovingBlocks() {
    const p=this.player;
    for(const block of this.room.entities){
      if((block.type||block.kind)!=='movingBlock'||!block.path?.length)continue;
      block.active??=block.trigger!=='dash';if(!block.active)continue;
      block.pathIndex??=1;block.pathDirection??=1;
      const target=block.path[block.pathIndex]||block.path[0],dx=target.x-block.x,dy=target.y-block.y,length=Math.hypot(dx,dy),distance=Math.min(length,(block.speed||40)*DT);
      const moveX=length?dx/length*distance:0,moveY=length?dy/length*distance:0;
      const riding=overlaps({x:p.x,y:p.y+1,w:p.w,h:p.h},block)&&p.y+p.h<=block.y+1;
      block.x+=moveX;block.y+=moveY;block.liftX=moveX/DT;block.liftY=moveY/DT;
      if(riding){p.x+=moveX;p.y+=moveY;this.setLiftSpeed(block.liftX,block.liftY);if(!block.wasRidden)this.emit('moving-block');}block.wasRidden=riding;
      if(overlaps(p,block)&&!riding){
        this.setLiftSpeed(block.liftX,block.liftY);
        if(moveX)p.x=moveX>0?block.x+block.w:block.x-p.w;else if(moveY)p.y=moveY>0?block.y+block.h:block.y-p.h;
        if(this.solidAt(p.x,p.y,{ignore:block}))this.die();
      }
      if(length<=distance+.001){block.pathIndex+=block.pathDirection;if(block.pathIndex>=block.path.length||block.pathIndex<0){block.pathDirection*=-1;block.pathIndex+=block.pathDirection*2;}}
    }
  }
  interactions(input={x:0}) {
    const p=this.player;
    if(p.state==='dead')return;
    for(const entity of this.room.entities){
      if(p.state==='dead')return;
      const type=entity.type||entity.kind;if(entity.cooldown>0){entity.cooldown=dec(entity.cooldown);if(!entity.cooldown)entity.active=true;continue;}
      if(!['refill','spring','bumper'].includes(type))continue;
      const contact=this.hurtbox(),box=rect(entity);
      if(type==='bumper'&&entity.w===undefined){const cx=Math.max(contact.x,Math.min(entity.x,contact.x+contact.w)),cy=Math.max(contact.y,Math.min(entity.y,contact.y+contact.h));if((entity.x-cx)**2+(entity.y-cy)**2>=(entity.r??12)**2)continue;}
      else if(!overlaps(contact,box))continue;
      if(type==='refill'){
        if(this.refillDashes(true,entity.dashes||p.maxDashes)||p.stamina<110){p.stamina=110;entity.cooldown=entity.respawn??2.5;entity.active=false;this.emit('refill-touch',{id:entity.id});}
      }else if(type==='spring'){
        if(p.state==='dream')continue;
        const direction=entity.direction||'up';if(direction==='up'&&p.vy<0)continue;
        this.clearJump();this.duck(false);p.stamina=110;this.refillDashes(false);p.varJump=.2;p.autoJump=true;p.autoJumpTimer=direction==='up'?0:.1;
        if(direction==='up')p.y=rect(entity).y-p.h;
        p.vx=direction==='left'?-240:direction==='right'?240:0;p.vy=direction==='up'?-185:-140;p.varJumpSpeed=p.vy;entity.cooldown=.2;this.emit('spring',{direction});
      }else{
        entity.cooldown=.6;
        this.explodeLaunch({x:box.x+box.w/2,y:box.y+box.h/2},input);
      }
    }
    const hurt=this.hurtbox();
    for(const hazard of this.room.hazards){
      if(!overlaps(hurt,hazard))continue;
      const dir=hazard.direction;
      if(!dir||dir==='up'&&p.vy>=0&&hurt.y+hurt.h<=hazard.y+hazard.h||dir==='down'&&p.vy<=0||dir==='left'&&p.vx>=0||dir==='right'&&p.vx<=0){this.die();break;}
    }
  }
  checkGoal() {
    if(this.complete)return;
    const goal=this.room.goal;if(!goal||!overlaps(this.player,goal)||this.player.state==='dead')return;
    const required=this.room.requiredTech||goal.requires||[],names=Array.isArray(required)?required:[required];
    if(!names.every(name=>[...this.techniques].some(t=>normalizedName(t)===normalizedName(name))))return;
    if(goal.counts&&!Object.entries(goal.counts).every(([name,count])=>Object.entries(this.techCounts).reduce((sum,[tech,n])=>sum+(normalizedName(tech)===normalizedName(name)?n:0),0)>=count))return;
    if(goal.holding){const held=this.holdables.held,type=held?.type||held?.kind;if(!held||goal.holding!==true&&held.id!==goal.holding&&type!==goal.holding&&!(goal.holding==='jelly'&&type==='glider'))return;}
    if(goal.evidence&&!goal.evidence.every((_,index)=>this.evidenceMatches.has(index)))return;
    if(goal.minSpeed&&Math.abs(this.player.vx)<goal.minSpeed)return;
    this.complete=true;this.emit('complete',{room:this.room.id});
  }
  die() {const p=this.player;if(p.state==='dead')return;this.holdables.drop('death');p.state='dead';p.deadTimer=.3;p.deathAge=0;p.vx=p.vy=0;this.deaths++;this.emit('death');this.techniques.clear();this.techEvidence=[];this.techCounts={};this.evidenceMatches.clear();}
  snapshot() {
    const p=this.player;
    return {room:this.room.id,time:this.time,frames:this.frames,deaths:this.deaths,complete:this.complete,techniques:[...this.techniques],techCounts:{...this.techCounts},techEvidence:this.techEvidence.slice(-64).map(e=>({...e})),events:this.events.map(e=>({...e})),player:{...p,dashDir:{...p.dashDir},dashAim:{...p.dashAim},beforeDash:p.beforeDash?{...p.beforeDash}:null}};
  }
}

export default Game;
