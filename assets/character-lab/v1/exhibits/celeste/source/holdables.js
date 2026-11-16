// Independent behavioral implementation. Audited references and deliberately
// unsupported interactions are documented in docs/CELESTE-HOLDABLES.md.
export const HOLD = Object.freeze({pickupTime:.16,minHold:.35,carryY:-12,recoil:80,jellyRegrab:.3,crystalRegrab:.1,jellyRun:108.00001,slowRun:70});
const DT=1/60;
const dec=t=>Math.max(0,Math.fround(Math.fround(t||0)-Math.fround(DT)));
const approach=(a,b,n)=>a<b?Math.min(a+n,b):Math.max(a-n,b);
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const round=n=>{const f=Math.floor(n),r=n-f;return Math.abs(r-.5)<1e-9?(f%2===0?f:f+1):Math.round(n);};
const type=e=>e.type||e.kind;
export const isHoldable=e=>['jelly','glider','carryCrystal'].includes(type(e));
export const holdableBox=(e,dx=0,dy=0)=>({x:e.x-4+dx,y:e.y-10+dy,w:8,h:10});
export const pickupBox=e=>({x:e.x-(type(e)==='carryCrystal'?8:10),y:e.y-16,w:type(e)==='carryCrystal'?16:20,h:22});

export function createHoldableSystem(game){
  let pickup=null;
  const bodies=()=>game.room.entities.filter(isHoldable);
  const held=()=>bodies().find(e=>e.id===game.player.holding&&!e.removed)||null;
  const emit=(name,data={})=>game.emit(name,data);
  function initialize(){
    pickup=null;
    const p=game.player;p.holding=null;p.minHoldTimer=0;p.holdCannotDuck=false;
    bodies().forEach((e,i)=>{
      e.id??=`holdable-${i}`;e.vx??=0;e.vy??=0;e.remX=0;e.remY=0;e.held=false;e.removed=false;e.cannotHoldTimer=0;e.gravityTimer=0;e.highFrictionTimer=0;e.noGravityTimer=0;e.startX=e.x;e.startY=e.y;
      e.open=false;e.wasFloating=false;
      e.slowFall=type(e)!=='carryCrystal';e.slowRun=type(e)==='carryCrystal';
    });
  }
  function solid(box,vertical=0,previous=box){
    return game.solids().find(s=>{
      if(s.kind==='oneway'||s.oneWay){if(vertical<=0||previous.y+previous.h>s.y)return false;}
      return overlap(box,s);
    })||null;
  }
  function carry(){
    const e=held(),p=game.player;if(!e){p.holding=null;pickup=null;return;}
    const cx=p.x+p.w/2,feet=p.y+p.h;
    if(pickup){
      const raw=Math.min(1,pickup.age/HOLD.pickupTime),t=raw<.5?4*raw**3:1-(-2*raw+2)**3/2;
      const start=pickup.offset,control={x:start.x+Math.sign(start.x)*2,y:HOLD.carryY-2};
      e.x=cx+(1-t)**2*start.x+2*(1-t)*t*control.x;
      e.y=feet+(1-t)**2*start.y+2*(1-t)*t*control.y+t*t*HOLD.carryY;
    }else{e.x=cx;e.y=feet+HOLD.carryY;}
    e.vx=e.vy=0;e.held=true;
  }
  function pickupEntity(e){
    const p=game.player;
    if(p.holding||e.removed||e.held||e.cannotHoldTimer>0)return false;
    game.duck(false);p.holding=e.id;p.minHoldTimer=Math.fround(HOLD.minHold);p.state='pickup';
    pickup={age:0,oldSpeed:{x:p.vx,y:p.vy},varJump:p.varJump,offset:{x:e.x-(p.x+p.w/2),y:e.y-(p.y+p.h)}};
    p.vx=p.vy=0;e.vx=e.vy=0;e.bubble=false;e.held=true;e.highFrictionTimer=.5;
    emit('pickup',{id:e.id,kind:type(e)});carry();return true;
  }
  function resolveRelease(e,forceX){
    // Holdable.Release first pushes a held object out of solid geometry.
    if(!solid(holdableBox(e)))return;
    if(forceX)for(let n=1;n<=10;n++)if(!solid(holdableBox(e,Math.sign(forceX)*n,0))){e.x+=Math.sign(forceX)*n;break;}
    for(let n=0;n<64&&solid(holdableBox(e));n++)e.y++;
    // The source loop has no bound; this guard keeps malformed gym rooms finite.
    if(solid(holdableBox(e)))e.removed=true;
  }
  function release(input={}){
    const e=held(),p=game.player;if(!e)return false;
    const drop=input.y===1,dir=p.facing<0?-1:1;
    carry();resolveRelease(e,drop?0:dir);
    e.held=false;e.open=false;e.wasFloating=false;e.cannotHoldTimer=Math.fround(e.slowFall?HOLD.jellyRegrab:HOLD.crystalRegrab);e.gravityTimer=Math.fround(.1);e.noGravityTimer=0;e.remX=e.remY=0;
    e.vx=drop?0:dir*(e.slowFall?100:200);e.vy=drop?0:e.slowFall?-40:-80;
    if(!e.slowFall&&!drop)e.noGravityTimer=Math.fround(.1);
    p.holding=null;p.minHoldTimer=0;pickup=null;
    if(!drop)p.vx-=HOLD.recoil*dir;
    emit(drop?'drop':'throw',{id:e.id,kind:type(e),objectVx:e.vx,objectVy:e.vy,recoil:drop?0:-HOLD.recoil*dir});return true;
  }
  function drop(reason='drop'){
    const e=held();if(!e){game.player.holding=null;pickup=null;return false;}
    const result=release({y:1});if(reason!=='drop')emit('holdable-drop',{reason,id:e.id});return result;
  }
  function beforeNormal(input){
    const p=game.player,e=held();
    if(e){
      if(!input.grab&&p.minHoldTimer<=0)release(input);
      if(p.holding&&p.grounded&&input.y===1&&p.vy>=0&&!p.holdCannotDuck){drop();game.duck(true);}
      else if(p.grounded&&input.y!==1)p.holdCannotDuck=false;
      return false;
    }
    if(!input.grab||p.stamina<20||p.ducking)return false;
    const entity=bodies().find(e=>!e.removed&&!e.held&&e.cannotHoldTimer<=0&&overlap(p,pickupBox(e)));
    return entity?pickupEntity(entity):false;
  }
  function updatePickup(input={}){
    const p=game.player,e=held();
    if(!e||!pickup){p.state='normal';return false;}
    pickup.age+=DT;
    if(pickup.age+1e-9<HOLD.pickupTime){carry();return true;}
    const saved=pickup;p.vx=saved.oldSpeed.x;p.vy=Math.min(saved.oldSpeed.y,0);p.varJump=saved.varJump;p.state='normal';pickup=null;
    if(e.slowFall){
      if(p.gliderBoostTimer>0&&p.gliderBoostDir?.y<0){p.vy=Math.min(p.vy,-240*Math.abs(p.gliderBoostDir.y));p.gliderBoostTimer=0;emit('jelly-boost',{id:e.id});}
      else if(p.vy<0)p.vy=Math.min(p.vy,-105);
      if(p.grounded&&input.y===1)p.holdCannotDuck=true;
    }
    carry();emit('pickup-complete',{id:e.id,kind:type(e)});return true;
  }
  function tickTimers(){
    const p=game.player;p.minHoldTimer=dec(p.minHoldTimer);
    for(const e of bodies())for(const key of ['cannotHoldTimer','gravityTimer'])e[key]=dec(e[key]);
  }
  function profile(input={}){
    const e=held(),p=game.player;
    if(!e)return{maxRun:90,accelMultiplier:1,fallTarget:null,gravityMultiplier:1};
    let maxRun=e.slowRun?70:e.slowFall&&!p.grounded?HOLD.jellyRun:90;
    const active=e.slowFall&&p.forceTime<=0,gliderY=input.gliderY??input.y;
    if(e.slowFall&&!p.grounded)p.holdCannotDuck=input.y===1;
    return{maxRun,accelMultiplier:e.slowFall&&!p.grounded?.5:1,fallTarget:active?(gliderY===1?120:gliderY===-1?24:40):null,gravityMultiplier:active?.5:1};
  }
  function moveBody(e,amount,axis){
    const key=axis==='x'?'remX':'remY';e[key]+=amount;let move=round(e[key]);e[key]-=move;const dir=Math.sign(move);
    while(move){
      const previous=holdableBox(e),box=holdableBox(e,axis==='x'?dir:0,axis==='y'?dir:0);
      if(solid(box,axis==='y'?dir:0,previous)){
        if(axis==='x')e.vx*=e.slowFall?-1:-.4;
        else if(dir<0)e.vy*=e.slowFall?-.5:0;
        else e.vy=!e.slowFall&&e.vy>140?e.vy*-.6:0;
        e[key]=0;break;
      }
      e[axis]+=dir;move-=dir;
    }
  }
  function updateFree(e){
    if(e.removed||e.held)return;
    if(e.bubble){e.y=e.startY+Math.sin(game.time*Math.PI*.6)*1;return;}
    e.highFrictionTimer=dec(e.highFrictionTimer);
    const grounded=!!solid(holdableBox(e,0,1),1,holdableBox(e));
    if(grounded){
      let target=0;if(!solid(holdableBox(e,3,1),1,holdableBox(e,3,0)))target=20;else if(!solid(holdableBox(e,-3,1),1,holdableBox(e,-3,0)))target=-20;
      e.vx=approach(e.vx,target,800*DT);
    }else if(!e.gravityTimer){
      const friction=e.slowFall?(e.vy>=0&&e.highFrictionTimer>0?10:40):(e.vy<0?175:350);
      e.vx=approach(e.vx,0,friction*DT);
      if(e.noGravityTimer>0)e.noGravityTimer=dec(e.noGravityTimer);else{const gravity=e.slowFall?(e.vy>=-30?100:200):(Math.abs(e.vy)<=30?400:800);e.vy=approach(e.vy,e.slowFall?30:200,gravity*DT);}
    }
    moveBody(e,e.vx*DT,'x');moveBody(e,e.vy*DT,'y');
    if(e.x<4){e.x=4;e.vx=Math.abs(e.vx);}if(e.x>game.room.width-4){e.x=game.room.width-4;e.vx=-Math.abs(e.vx);}
    if(e.y-10<0){e.y=10;e.vy=Math.abs(e.vy)*.5;}
    if(e.y-10>game.room.height+16){e.removed=true;emit('holdable-lost',{id:e.id});}
    for(const spring of game.room.entities){
      if(type(spring)!=='spring'||spring.cooldown>0||!overlap(holdableBox(e),spring))continue;
      const direction=spring.direction||'up';
      if(direction==='up'&&e.vy>=0){e.vx*=.5;e.vy=-160;e.noGravityTimer=.15;emit('holdable-spring',{id:e.id});}
      else if(direction==='right'&&e.vx<=0||direction==='left'&&e.vx>=0){e.vx=direction==='right'?160:-160;e.vy=-80;e.noGravityTimer=.1;emit('holdable-spring',{id:e.id});}
    }
  }
  function afterStep(input={}){
    for(const e of bodies())updateFree(e);
    carry();
    const e=held(),p=game.player;
    if(e){
      e.open=!!(e.slowFall&&!p.grounded&&p.vy>20);
      const floating=e.open&&p.state==='normal'&&p.forceTime<=0;
      if(floating&&!e.wasFloating)emit('jelly-float',{id:e.id,fallTarget:profile(input).fallTarget});
      e.wasFloating=floating;
    }
  }
  function wallJump(dir){if(held()?.slowFall){game.player.forceX=dir;game.player.forceTime=.26;}}
  initialize();
  return{reset:initialize,tickTimers,beforeNormal,updatePickup,profile,afterStep,release,drop,wallJump,get held(){return held();},get entities(){return bodies();}};
}
