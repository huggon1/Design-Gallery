export const LEVEL = Object.freeze({width:2220,height:760,ground:660,wall:36,ceiling:28,blocks:[
 {id:'step',x:610,y:612,w:150,h:48},
 {id:'jump',x:810,y:564,w:190,h:12,oneWay:true},
 {id:'upper',x:1010,y:480,w:150,h:12,oneWay:true},
 {id:'tunnel',x:1240,y:550,w:110,h:56},
 {id:'ledge',x:1620,y:574,w:180,h:86},
 {id:'return',x:1810,y:526,w:160,h:12,oneWay:true},
 {id:'high',x:1990,y:478,w:194,h:12,oneWay:true},
]});
export const SECTIONS={run:{x:170,y:660},jump:{x:550,y:660},roll:{x:1190,y:660},climb:{x:1550,y:660},attack:{x:300,y:660}};
export const TUNING={speed:250,acceleration:5600,deceleration:8400,gravity:2200,jump:-550,doubleJump:-475,rollSpeed:440,rollDuration:.4,rollCooldown:.18,standHeight:70,rollHeight:42,width:24};
export const ATTACKS=[{clip:'atkBackStabberA',duration:.34,hit:.17},{clip:'atkBackStabberB',duration:.38,hit:.15},{clip:'atkSaberA',duration:.42,hit:.23}];
export const createWorld=()=>LEVEL;
export function createPlayer(section='run'){const p={};resetPlayer(p,section);return p;}
export function resetPlayer(p,section='run') {Object.assign(p,{...SECTIONS[section]||SECTIONS.run,vx:0,vy:0,face:1,grounded:true,jumps:0,roll:0,rollAge:0,rollRecovery:0,rollCooldown:0,crouched:false,attack:0,attackSerial:0,land:0,doubleFlash:0,drop:0,dropPlatform:null,slam:false,climb:0,climbFrom:null,climbTo:null,wall:0,coyote:.08,buffer:0,time:0,runCycle:0,runTime:0,action:'idle',actionAge:0,jumpAge:0,doubleAge:-1,attackAge:0,combo:0,comboWindow:0,attackQueued:false,struck:false,stopFromRun:false,previous:{},events:[],history:[]});return p;}
const approach=(a,b,n)=>a<b?Math.min(a+n,b):Math.max(a-n,b);
const overlaps=(a,b)=>a.x+a.w>b.x&&a.x<b.x+b.w&&a.y+a.h>b.y&&a.y<b.y+b.h;
export const playerBounds=(p,h=p.roll>0||p.crouched?TUNING.rollHeight:TUNING.standHeight)=>({x:p.x-TUNING.width/2,y:p.y-h,w:TUNING.width,h});
function headroom(p){return p.y-TUNING.standHeight>=LEVEL.ceiling&&!LEVEL.blocks.some(b=>!b.oneWay&&overlaps(playerBounds(p,TUNING.standHeight),b));}
function climbTarget(p,b,side){
 const half=TUNING.width/2,edge=side>0?b.x-half:b.x+b.w+half,target=side>0?b.x+half+4:b.x+b.w-half-4;
 const lift={x:edge-half,y:b.y-TUNING.standHeight,w:TUNING.width,h:p.y-b.y+TUNING.standHeight};
 const across={x:Math.min(edge,target)-half,y:b.y-TUNING.standHeight,w:Math.abs(target-edge)+TUNING.width,h:TUNING.standHeight};
 if(across.y<LEVEL.ceiling||across.x<LEVEL.wall||across.x+across.w>LEVEL.width-LEVEL.wall)return null;
 if(LEVEL.blocks.some(other=>other!==b&&!other.oneWay&&(overlaps(lift,other)||overlaps(across,other))))return null;
 return {from:{x:edge,y:p.y},to:{x:target,y:b.y}};
}
function event(p,type){p.events.push({type,x:p.x,y:p.y,face:p.face});}
export function stepPlayer(p,input={},dt=1/60){
 const previousAction=p.action,previousFacing=p.face;
 p.events=[];p.time+=dt;p.wall=0;p.actionAge+=dt;if(!p.grounded)p.jumpAge+=dt;if(p.doubleAge>=0)p.doubleAge+=dt;
 const wasAttacking=p.attack>0;if(wasAttacking)p.attackAge+=dt;p.comboWindow=Math.max(0,p.comboWindow-dt);
 for(const k of ['rollCooldown','rollRecovery','attack','land','doubleFlash','drop','coyote','buffer'])p[k]=Math.max(0,p[k]-dt);
 const pressed=k=>!!input[k]&&!p.previous[k];const mx=Number(!!input.right)-Number(!!input.left);
 if(pressed('jump'))p.buffer=.10;
 if(p.climb>0){
  p.climb=Math.max(0,p.climb-dt);const t=1-p.climb/.22,lift=Math.min(1,t/.55),across=Math.max(0,(t-.55)/.45);
  p.y=p.climbFrom.y+(p.climbTo.y-p.climbFrom.y)*(1-(1-lift)**2);
  p.x=p.climbFrom.x+(p.climbTo.x-p.climbFrom.x)*(1-(1-across)**2);
  p.vx=0;p.vy=0;p.action='climb';if(p.climb===0){p.grounded=true;p.jumps=0;p.doubleAge=-1;p.slam=false;event(p,'land');}p.previous={...input};return;
 }
 if(mx&&p.roll<=0&&p.attack<=0)p.face=mx;
 if(pressed('dash')&&p.roll<=0&&p.rollCooldown<=0){p.roll=TUNING.rollDuration;p.rollAge=0;p.rollRecovery=0;p.rollDir=mx||p.face;p.face=p.rollDir;p.vy=p.grounded?0:Math.min(p.vy,0);p.attack=0;p.attackQueued=false;event(p,'roll');}
 const startAttack=combo=>{p.combo=combo;p.attack=ATTACKS[combo].duration;p.attackAge=0;p.struck=false;p.attackQueued=false;p.attackSerial++;p.comboWindow=.6;event(p,'attack');};
 if(pressed('attack')&&p.roll<=0){if(p.attack>0)p.attackQueued=true;else startAttack(p.comboWindow>0?(p.combo+1)%3:0);}
 if(wasAttacking&&p.attack<=0&&p.roll<=0){if(p.attackQueued)startAttack((p.combo+1)%3);else p.comboWindow=.25;}
 if(p.attack>0&&!p.struck&&p.attackAge>=ATTACKS[p.combo].hit){p.struck=true;p.events.push({type:'strike',x:p.x,y:p.y,face:p.face,combo:p.combo});}
 
 let height=p.roll>0||p.crouched?TUNING.rollHeight:TUNING.standHeight;
 if(p.roll>0){p.rollAge+=dt;p.roll=Math.max(0,p.roll-dt);p.vx=p.rollDir*TUNING.rollSpeed;p.crouched=true;if(p.roll===0){if(!headroom(p))p.roll=dt;else {p.rollCooldown=TUNING.rollCooldown;p.rollRecovery=.16;p.crouched=false;}}}
 else {p.crouched=(!!input.down&&p.grounded)||!headroom(p);if(p.attack>0&&p.grounded){const thrust=p.attackAge>ATTACKS[p.combo].hit-.035&&p.attackAge<ATTACKS[p.combo].hit+.045;p.vx=approach(p.vx,thrust?p.face*95:0,TUNING.deceleration*dt);}else p.vx=approach(p.vx,p.crouched?0:mx*TUNING.speed,(mx?TUNING.acceleration:TUNING.deceleration)*dt);}
 height=p.roll>0||p.crouched?TUNING.rollHeight:TUNING.standHeight;
 if(p.grounded)p.coyote=.08;
 if(p.buffer>0&&p.roll<=0){
  const support=LEVEL.blocks.find(b=>b.oneWay&&Math.abs(p.y-b.y)<2&&p.x+TUNING.width/2>b.x&&p.x-TUNING.width/2<b.x+b.w);
  if(input.down&&p.grounded&&support){p.drop=.22;p.dropPlatform=support.id;p.grounded=false;p.coyote=0;p.y+=3;p.vy=80;p.buffer=0;event(p,'drop');}
  else if(!headroom(p)){p.buffer=0;}
  else if(input.down&&!p.grounded){p.slam=true;p.vy=820;p.buffer=0;event(p,'slam');}
  else if(p.grounded||p.coyote>0){p.vy=TUNING.jump;p.grounded=false;p.coyote=0;p.jumps=1;p.jumpAge=0;p.doubleAge=-1;p.buffer=0;event(p,'jump');}
  else if(p.jumps<2){p.vy=TUNING.doubleJump;p.jumps=2;p.doubleFlash=.34;p.doubleAge=0;p.jumpAge=0;p.buffer=0;event(p,'double');}
 }
 if(!input.jump&&p.previous.jump&&p.vy<-180&&!p.slam)p.vy=-180;
 const prevY=p.y;const wasGround=p.grounded;const half=TUNING.width/2;
 p.vy=Math.min(p.slam?1050:690,p.vy+(p.roll>.23&&!p.grounded?300:TUNING.gravity)*dt);
 const oldX=p.x;p.x+=p.vx*dt;
 p.x=Math.max(LEVEL.wall+half,Math.min(LEVEL.width-LEVEL.wall-half,p.x));
 if(p.x!==oldX+p.vx*dt)p.vx=0;
 for(const b of LEVEL.blocks){
  if(b.oneWay||!overlaps(playerBounds(p,height),b))continue;
  const side=p.vx>0?1:p.vx<0?-1:0;
  if(side&&p.roll<=0&&!p.crouched&&!p.grounded&&!p.slam&&p.y>b.y&&p.y-b.y<=TUNING.standHeight-6&&mx===side){
   const target=climbTarget(p,b,side);
   if(target){p.climb=.22;p.climbFrom=target.from;p.climbTo=target.to;p.x=target.from.x;p.action='climb';p.actionAge=0;p.vx=0;p.vy=0;event(p,'climb');p.previous={...input};return;}
  }
  if(side>0)p.x=b.x-half;else if(side<0)p.x=b.x+b.w+half;p.wall=side;p.vx=0;
 }
 p.y+=p.vy*dt;p.grounded=false;
 if(p.y>=LEVEL.ground){p.y=LEVEL.ground;p.vy=0;p.grounded=true;}
 if(p.y-height<LEVEL.ceiling){p.y=LEVEL.ceiling+height;p.vy=Math.max(0,p.vy);}
 for(const b of LEVEL.blocks){
  if(p.x+half<=b.x||p.x-half>=b.x+b.w)continue;
  if(p.vy>=0&&prevY<=b.y+1&&p.y>=b.y&&(!b.oneWay||p.drop<=0||p.dropPlatform!==b.id)){p.y=b.y;p.vy=0;p.grounded=true;}
  else if(!b.oneWay&&p.vy<0&&prevY-height>=b.y+b.h-1&&p.y-height<b.y+b.h){p.y=b.y+b.h+height;p.vy=0;}
 }
 if(p.grounded){p.jumps=0;p.doubleAge=-1;if(!wasGround){p.land=p.slam?.20:.10;event(p,p.slam?'impact':'land');p.slam=false;}}
 else if(wasGround&&p.jumps===0)p.jumps=1;

 p.action=p.roll>0?'roll':p.slam?'slam':p.attack>0?'attack':p.land>0?'land':!p.grounded?(p.doubleFlash>0?'double-jump':p.vy<0?'jump':'fall'):p.crouched?'crouch':p.rollRecovery>0?'roll-recover':Math.abs(p.vx)>10?'run':'idle';
 if(p.action==='run'){p.runTime=previousAction==='run'&&previousFacing===p.face?p.runTime+dt*Math.abs(p.vx)/TUNING.speed:0;}else p.runTime=0;
 p.runCycle=p.runTime/(20/30);if(p.action!==previousAction){p.actionAge=0;p.stopFromRun=p.action==='idle'&&previousAction==='run';}
 p.history.push({x:p.x,y:p.y-26});if(p.history.length>170)p.history.shift();
 p.previous={...input};
}
