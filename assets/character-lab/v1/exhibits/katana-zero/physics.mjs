// World units are original sprite pixels. x is body centre; y is the foot plane.
export const TUNING=Object.freeze({width:12,height:30,runSpeed:185,acceleration:2600,friction:3100,airAcceleration:1400,gravity:1040,jumpSpeed:370,jumpCut:235,wallJumpX:245,wallJumpY:355,wallSlideSpeed:48,wallLock:.14,coyote:.075,inputBuffer:.11,attackDuration:.34,attackActiveStart:.025,attackActiveEnd:.145,attackCooldown:.34,rollDuration:.34,rollCooldown:.46,slowScale:.22,slowDrain:.21,slowRefill:.15});
export const WORLD=Object.freeze({width:1960,height:380,floor:300,solids:[
 {id:'floor',x:-20,y:300,w:2000,h:80,kind:'floor'},
 {id:'left-boundary',x:-18,y:-80,w:18,h:460,kind:'boundary'}, {id:'right-boundary',x:1960,y:-80,w:18,h:460,kind:'boundary'},
 {id:'short',x:500,y:250,w:100,h:10,kind:'platform'},
 {id:'west-1',x:660,y:250,w:74,h:10,kind:'platform'},
 {id:'west-2',x:750,y:210,w:74,h:10,kind:'platform'},
 {id:'west-3',x:840,y:170,w:74,h:10,kind:'platform'},
 {id:'west-4',x:930,y:130,w:84,h:10,kind:'platform'},
 {id:'wall-west',x:1014,y:130,w:18,h:118,kind:'wall'},
 {id:'bridge',x:1032,y:130,w:90,h:10,kind:'platform'},
 {id:'wall-east',x:1122,y:90,w:18,h:158,kind:'wall'},
 {id:'summit',x:1140,y:90,w:66,h:10,kind:'platform'},
 {id:'east-4',x:1206,y:130,w:86,h:10,kind:'platform'},
 {id:'east-3',x:1292,y:170,w:86,h:10,kind:'platform'},
 {id:'east-2',x:1378,y:210,w:86,h:10,kind:'platform'},
 {id:'east-1',x:1464,y:250,w:86,h:10,kind:'platform'}
],target:{x:380,y:280},emitter:{x:1845,y:282},shotInterval:2.25,bulletSpeed:260});
export const SPAWNS=Object.freeze({course:{x:140,y:300}});
export const sections=[{id:'course',label:'贯通练习场'}];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const approach=(x,y,d)=>x<y?Math.min(x+d,y):Math.max(x-d,y);
const active=a=>a&&a.age>=TUNING.attackActiveStart&&a.age<TUNING.attackActiveEnd;
export function createPlayer(section='course'){return resetPlayer({},section);}
export function resetPlayer(p,section='course'){
 section='course';const spawn=SPAWNS.course;
 Object.assign(p,{...spawn,spawnX:spawn.x,vx:0,vy:0,face:1,grounded:true,wall:0,wallAge:0,wallGrace:0,lastWall:0,wallLock:0,wallJumpAge:99,coyote:TUNING.coyote,jumpBuffer:0,attackBuffer:0,rollBuffer:0,attack:null,attackCooldown:0,roll:null,rollCooldown:0,invulnerable:false,clip:'idle',clipTime:0,runTime:0,action:'idle',actionAge:0,transition:null,prevInput:{},time:0,realTime:0,timeScale:1,energy:1,slow:false,prevSlow:false,slowExhausted:false,bufferedAngle:null,hitstop:0,damageAge:99,targetFlash:0,emitterFlash:0,bulletSerial:0,attackSerial:0,shotTimer:1.3,bullets:[],events:[],eventHistory:[],history:[],section,stats:{jumps:0,wallJumps:0,rolls:0,strikes:0,targetHits:0,parries:0,contacts:0,returnedHits:0}});return p;
}
function emit(p,type,more={}){const event={type,x:p.x,y:p.y,time:p.time,...more};p.events.push(event);p.eventHistory.push(event);if(p.eventHistory.length>80)p.eventHistory.shift();}
export function clearInput(p){p.prevInput={};p.jumpBuffer=0;p.attackBuffer=0;p.rollBuffer=0;}
function setClip(p,clip,time=null){if(p.clip!==clip){p.clip=clip;p.clipTime=0;}if(time!==null)p.clipTime=time;}
function setAction(p,action){if(p.action!==action){p.action=action;p.actionAge=0;}}
export function bodyBounds(p){const h=p.roll?15:TUNING.height;return {x:p.x-TUNING.width/2,y:p.y-h,w:TUNING.width,h};}
function wallAt(p){
 const b=bodyBounds(p);let wall=0;
 for(const r of WORLD.solids){if(b.y+2>=r.y+r.h||p.y-3<=r.y)continue;if(Math.abs(p.x+TUNING.width/2-r.x)<1.1)wall=1;if(Math.abs(p.x-TUNING.width/2-r.x-r.w)<1.1)wall=-1;}
 return wall;
}
function moveBody(p,dt){
 const half=TUNING.width/2,h=p.roll?15:TUNING.height;
 p.x+=p.vx*dt;
 for(const r of WORLD.solids){if(p.y<=r.y||p.y-h>=r.y+r.h)continue;if(p.x+half>r.x&&p.x-half<r.x+r.w){if(p.vx>0)p.x=r.x-half;else if(p.vx<0)p.x=r.x+r.w+half;p.vx=0;}}
 const oldY=p.y,oldGround=p.grounded;p.grounded=false;p.y+=p.vy*dt;
 for(const r of WORLD.solids){if(p.x+half<=r.x+.001||p.x-half>=r.x+r.w-.001)continue;
  if(p.vy>=0&&oldY<=r.y+.5&&p.y>=r.y){p.y=r.y;p.vy=0;p.grounded=true;}
  else if(p.vy<0&&oldY-h>=r.y+r.h-.5&&p.y-h<=r.y+r.h){p.y=r.y+r.h+h;p.vy=0;}
 }
 if(p.grounded&&!oldGround){emit(p,'land');p.wallJumpAge=99;p.transition={clip:'postcrouch',age:0,duration:.085};}
 p.wall=wallAt(p);
 if(p.y>WORLD.height+80){const stats={...p.stats},time=p.time,realTime=p.realTime;resetPlayer(p,p.section);Object.assign(p,{stats,time,realTime});emit(p,'resetFall');}
}
function attackAngle(p,input){
 if(input.aimWorld){const dx=input.aimWorld.x-p.x,dy=input.aimWorld.y-(p.y-20);if(Math.hypot(dx,dy)>12)return Math.atan2(dy,dx);}
 const dx=(input.right?1:0)-(input.left?1:0),dy=(input.down?1:0)-(input.up?1:0);
 return Math.atan2(dy,dx||(!dy?p.face:0));
}
function strikeContains(p,x,y){
 if(!active(p.attack))return false;
 const dx=x-p.x,dy=y-(p.y-19),length=Math.hypot(dx,dy);
 if(length>86||length<4)return false;
 return (dx*Math.cos(p.attack.angle)+dy*Math.sin(p.attack.angle))/length>.18;
}
function tickProjectiles(p,dt){
 p.shotTimer-=dt;
 if(p.shotTimer<=0&&!p.bullets.some(b=>!b.reflected)){
  p.bullets.push({id:++p.bulletSerial,x:WORLD.emitter.x-15,y:WORLD.emitter.y,vx:-WORLD.bulletSpeed,vy:0,reflected:false,life:7});p.shotTimer=WORLD.shotInterval;p.emitterFlash=.1;emit(p,'shot',{x:WORLD.emitter.x-15,y:WORLD.emitter.y});
 }
 for(const b of p.bullets){
  b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(!b.reflected&&strikeContains(p,b.x,b.y)){
   const a=p.attack.angle;b.reflected=true;b.vx=Math.cos(a)*WORLD.bulletSpeed*1.5;b.vy=Math.sin(a)*WORLD.bulletSpeed*1.5;p.hitstop=.066;p.stats.parries++;p.attackCooldown=Math.min(p.attackCooldown,.11);emit(p,'reflect',{x:b.x,y:b.y,angle:a});
  }
  const body=bodyBounds(p);
  if(!b.reflected&&!p.invulnerable&&b.x>body.x-3&&b.x<body.x+body.w+3&&b.y>body.y&&b.y<p.y){b.life=0;p.stats.contacts++;p.damageAge=0;emit(p,'contact',{x:b.x,y:b.y});}
  if(b.reflected&&Math.abs(b.x-WORLD.emitter.x)<14&&Math.abs(b.y-WORLD.emitter.y)<22){b.life=0;p.stats.returnedHits++;p.emitterFlash=.28;emit(p,'returnHit',{x:WORLD.emitter.x,y:WORLD.emitter.y});}
  if(b.x<-25||b.x>WORLD.width+25||b.y<-80||b.y>WORLD.floor+20)b.life=0;
  // Terrain consumes bullets; the open firing lane stays clear.
  if(WORLD.solids.some(r=>r.kind!=='boundary'&&b.x>r.x&&b.x<r.x+r.w&&b.y>r.y&&b.y<r.y+r.h))b.life=0;
 }
 p.bullets=p.bullets.filter(b=>b.life>0);
}
export function stepPlayer(p,input={},realDt=1/120){
 p.events=[];p.realTime+=realDt;
 const fresh=k=>!!input[k]&&!p.prevInput[k];
 if(fresh('jump'))p.jumpBuffer=TUNING.inputBuffer;
 if(fresh('attack')){p.attackBuffer=TUNING.inputBuffer;p.bufferedAngle=attackAngle(p,input);}
 if(fresh('dash')||fresh('special'))p.rollBuffer=TUNING.inputBuffer;
 const wantsSlow=!!(input.slow||input.grab);
 if(!wantsSlow&&p.energy>.2)p.slowExhausted=false;
 p.slow=wantsSlow&&!p.slowExhausted&&p.energy>0;
 if(p.slow){p.energy=Math.max(0,p.energy-TUNING.slowDrain*realDt);if(p.energy===0)p.slowExhausted=true;}
 else p.energy=Math.min(1,p.energy+TUNING.slowRefill*realDt);
 if(p.slow!==!!p.prevSlow)emit(p,p.slow?'slowEnter':'slowExit');p.prevSlow=p.slow;
 p.timeScale=p.slow?TUNING.slowScale:1;
 p.prevInput={...input};
 if(p.hitstop>0){p.hitstop=Math.max(0,p.hitstop-realDt);return;}
 const dt=realDt*p.timeScale;p.time+=dt;p.clipTime+=dt;p.actionAge+=dt;p.runTime+=dt;p.damageAge+=dt;p.wallJumpAge+=dt;
 for(const k of ['jumpBuffer','attackBuffer','rollBuffer','attackCooldown','rollCooldown','wallLock','wallGrace','targetFlash','emitterFlash'])p[k]=Math.max(0,p[k]-dt);
 const move=(input.right?1:0)-(input.left?1:0);
 p.coyote=p.grounded?TUNING.coyote:Math.max(0,p.coyote-dt);
 p.wall=wallAt(p);if(p.wall&&!p.grounded){p.lastWall=p.wall;p.wallGrace=.08;}
 if(p.transition){p.transition.age+=dt;if(p.transition.age>=p.transition.duration)p.transition=null;}
 if(p.attack){p.attack.age+=dt;if(p.attack.age>=TUNING.attackDuration)p.attack=null;}
 if(p.roll){p.roll.age+=dt;if(p.roll.age>=TUNING.rollDuration){p.roll=null;p.transition={clip:'postcrouch',age:0,duration:.085};}}
 // Ground roll locks direction while the body rotates, then restores movement.
 if(p.rollBuffer>0&&p.grounded&&!p.roll&&p.rollCooldown<=0&&(!p.attack||p.attack.age>.20)){
  p.attack=null;p.roll={age:0,dir:move||p.face};p.face=p.roll.dir;p.rollCooldown=TUNING.rollCooldown;p.rollBuffer=0;p.stats.rolls++;p.transition=null;emit(p,'roll');
 }
 if(p.attackBuffer>0&&!p.attack&&p.attackCooldown<=0&&(!p.roll||p.roll.age>.27)){
  p.roll=null;const angle=p.bufferedAngle??attackAngle(p,input);p.attack={age:0,angle,serial:++p.attackSerial,hitTarget:false,air:!p.grounded};if(Math.abs(Math.cos(angle))>.12)p.face=Math.sign(Math.cos(angle));p.attackCooldown=TUNING.attackCooldown;p.attackBuffer=0;p.stats.strikes++;p.transition=null;emit(p,'strike',{angle});
 }
 if(p.jumpBuffer>0&&(!p.roll||p.roll.age>.26)&&(!p.attack||p.attack.age>.19)){
  if(p.grounded||p.coyote>0){p.vy=-TUNING.jumpSpeed;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.roll=null;p.stats.jumps++;p.transition=null;emit(p,'jump');}
  else if(p.wallGrace>0){const wall=p.wall||p.lastWall;p.vx=-wall*TUNING.wallJumpX;p.vy=-TUNING.wallJumpY;p.face=-wall;p.wallLock=TUNING.wallLock;p.wallJumpAge=0;p.jumpBuffer=0;p.wallGrace=0;p.wall=0;p.stats.wallJumps++;p.transition=null;emit(p,'wallJump',{wall});}
 }
 if(!input.jump&&p.vy<-TUNING.jumpCut&&p.wallJumpAge>.19&&!p.attack)p.vy=approach(p.vy,-TUNING.jumpCut,3600*dt);
 const previousSpeed=p.vx,previousFace=p.face;
 if(p.roll){const a=p.roll.age;p.vx=p.roll.dir*(a<.25?285-110*a:approach(240,0,(a-.25)*1700));}
 else if(active(p.attack)){
  const a=(p.attack.age-TUNING.attackActiveStart)/(TUNING.attackActiveEnd-TUNING.attackActiveStart);p.vx=Math.cos(p.attack.angle)*(480*(1-a)+100);
  if(p.attack.air)p.vy=Math.sin(p.attack.angle)*330;
 }
 else if(p.attack&&p.attack.age<.025)p.vx*=Math.exp(-dt*16);
 else if(p.wallLock<=0){
  p.vx=approach(p.vx,move*TUNING.runSpeed,(move?(p.grounded?TUNING.acceleration:TUNING.airAcceleration):p.grounded?TUNING.friction:450)*dt);
  if(move&&!p.attack)p.face=move;
 }
 if(p.grounded&&!p.attack&&!p.roll){
  if(move&&(Math.abs(previousSpeed)<5||previousFace!==p.face))p.transition={clip:'idle_to_run',age:0,duration:.12};
  if(!move&&Math.abs(previousSpeed)>8&&p.vx===0)p.transition={clip:'run_to_idle',age:0,duration:.20};
 }
 p.vy=Math.min(540,p.vy+TUNING.gravity*dt);
 if(p.wall&&!p.grounded&&move===p.wall&&p.vy>=0&&!p.attack&&p.wallJumpAge>.12){p.wallAge+=dt;p.vy=p.wallAge<.07?0:Math.min(p.vy,TUNING.wallSlideSpeed);}else p.wallAge=0;
 p.invulnerable=!!p.roll&&p.roll.age>=.025&&p.roll.age<.275;
 moveBody(p,dt);
 if(active(p.attack)&&!p.attack.hitTarget&&strikeContains(p,WORLD.target.x,WORLD.target.y)){p.attack.hitTarget=true;p.stats.targetHits++;p.targetFlash=.24;p.hitstop=.045;emit(p,'targetHit',{x:WORLD.target.x,y:WORLD.target.y,angle:p.attack.angle});}
 tickProjectiles(p,dt);
 if(p.attack){setAction(p,p.attack.age<.025?'strike_prepare':active(p.attack)?'strike_active':'strike_recover');setClip(p,'attack',p.attack.age);}
 else if(p.roll){setAction(p,p.roll.age<.05?'roll_enter':p.roll.age<.265?'roll_rotate':'roll_recover');setClip(p,'roll',p.roll.age);}
 else if(p.wall&&!p.grounded&&move===p.wall){setAction(p,'wall_slide');setClip(p,p.wallAge<.07?'wallgrab':'wallslide',p.wallAge);}
 else if(!p.grounded){if(p.wallJumpAge<.38){setAction(p,'wall_jump');setClip(p,'player_flip',p.wallJumpAge);}else{setAction(p,p.vy<0?'jump':'fall');setClip(p,p.vy<0?'jump':'fall');}}
 else if(p.transition){setAction(p.transition.clip);setClip(p,p.transition.clip,p.transition.age);}
 else if(Math.abs(p.vx)>8){setAction(p,'run');setClip(p,'run',p.runTime);}
 else {setAction(p,'idle');setClip(p,'idle');}
 p.history.push({x:p.x,y:p.y,time:p.time,vx:p.vx,vy:p.vy});p.history=p.history.filter(h=>p.time-h.time<2.4);
}
