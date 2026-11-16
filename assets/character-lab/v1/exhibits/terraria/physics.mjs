export const TUNING=Object.freeze({tickRate:60,width:20,height:42,maxRunSpeed:3,runAcceleration:.08,runSlowdown:.2,gravity:.4,maxFallSpeed:10,jumpSpeed:5.01,jumpHeight:15,hookRange:300,hookShootSpeed:11.5,hookRetractSpeed:11,hookPullSpeed:11});
export const SECTIONS=[{id:'practice',label:'贯通练习场'}];
export const WORLD={width:1088,height:320,floor:256};
const approach=(v,to,amount)=>v<to?Math.min(v+amount,to):Math.max(v-amount,to);
const overlap=(x,y,b)=>x+10>b.x+.001&&x-10<b.x+b.w-.001&&y>b.y+.001&&y-42<b.y+b.h-.001;
export function createWorld(){return {...WORLD,solids:[{id:'ground',x:0,y:256,w:1088,h:64},{id:'left',x:0,y:0,w:16,h:320},{id:'right',x:1072,y:0,w:16,h:320},{id:'step',x:400,y:240,w:96,h:16},{id:'two',x:544,y:224,w:32,h:32},{id:'wall',x:912,y:48,w:32,h:208},{id:'lip',x:864,y:48,w:48,h:16}],platforms:[{id:'lower',x:592,y:176,w:160,h:8,oneWay:true},{id:'upper',x:688,y:96,w:160,h:8,oneWay:true},{id:'return-lower',x:960,y:176,w:96,h:8,oneWay:true},{id:'return-upper',x:960,y:96,w:96,h:8,oneWay:true}]};}
export function createPlayer(_area='practice'){const start=[136,256];return {x:start[0],y:start[1],prevX:start[0],prevY:start[1],vx:0,vy:0,face:1,grounded:true,support:'ground',section:'practice',action:'idle',actionAge:0,time:0,ticks:0,hold:0,previous:{},gfxOffY:0,stepCount:0,legFrame:0,bodyFrame:0,frameCounter:0,hook:{phase:'idle',x:0,y:0,vx:0,vy:0,travel:0},events:[],history:[],jumpOrigin:null,maxJumpHeight:0,jumpSerial:0,lastLandSpeed:0,airborneTicks:0,dropThrough:null};}
function emit(p,type,extra={}){p.events.push({type,x:p.x,y:p.y,tick:p.ticks,...extra});}
function lineHit(x1,y1,x2,y2,b){let lo=0,hi=1;const dx=x2-x1,dy=y2-y1;for(const [q,s,min,max] of [[x1,dx,b.x,b.x+b.w],[y1,dy,b.y,b.y+b.h]]){if(Math.abs(s)<1e-9){if(q<min||q>max)return null;}else{let a=(min-q)/s,z=(max-q)/s;if(a>z)[a,z]=[z,a];lo=Math.max(lo,a);hi=Math.min(hi,z);if(lo>hi)return null;}}return lo;}
function returnHook(p){p.hook.phase='returning';p.hook.age=0;}
function startHook(p,w,input){const h=p.hook;if(h.phase!=='idle'){returnHook(p);emit(p,'hook-release');return;}let aim=input.aimWorld;const dx=aim?aim.x-p.x:(input.left?-1:input.right?1:p.face)*.8;const dy=aim?aim.y-(p.y-21):input.down?.8:input.up?-1:-.65;const len=Math.hypot(dx,dy)||1;Object.assign(h,{phase:'flying',x:p.x,y:p.y-21,vx:dx/len*TUNING.hookShootSpeed,vy:dy/len*TUNING.hookShootSpeed,travel:0,age:0});p.face=dx>=0?1:-1;emit(p,'hook-shot');}
function updateHook(p,w){const h=p.hook;h.age=(h.age||0)+1;
 if(h.phase==='flying'){const remaining=TUNING.hookRange-h.travel,dist=Math.min(TUNING.hookShootSpeed,remaining);const nx=h.x+h.vx/TUNING.hookShootSpeed*dist,ny=h.y+h.vy/TUNING.hookShootSpeed*dist;let nearest=null;for(const b of [...w.solids,...w.platforms]){const t=lineHit(h.x,h.y,nx,ny,b);if(t!==null&&(nearest===null||t<nearest.t))nearest={t,b};}if(nearest){h.x+=(nx-h.x)*nearest.t;h.y+=(ny-h.y)*nearest.t;h.phase='pull';h.anchor=nearest.b.id;p.hold=0;emit(p,'hook-latch',{x:h.x,y:h.y});}else{h.x=nx;h.y=ny;h.travel+=dist;if(h.travel>=TUNING.hookRange-1e-6)returnHook(p);}}
 else if(h.phase==='returning'){const dx=p.x-h.x,dy=p.y-21-h.y,len=Math.hypot(dx,dy);if(len<=TUNING.hookRetractSpeed+4)h.phase='idle';else{h.x+=dx/len*TUNING.hookRetractSpeed;h.y+=dy/len*TUNING.hookRetractSpeed;}}
}
function horizontal(p,input){const d=Number(!!input.right)-Number(!!input.left);if(d){p.face=d;if(d<0&&p.vx>-3){if(p.vx>.2)p.vx-=.2;p.vx=Math.max(-3,p.vx-.08);}else if(d>0&&p.vx<3){if(p.vx<-.2)p.vx+=.2;p.vx=Math.min(3,p.vx+.08);}else if(Math.abs(p.vx)>3)p.vx=approach(p.vx,d*3,p.grounded?.2:.1);}else p.vx=approach(p.vx,0,p.grounded?.2:.1);}
function jump(p){p.vy=-5.01;p.hold=15;p.grounded=false;p.support=null;p.jumpOrigin=p.y;p.maxJumpHeight=0;p.jumpSerial++;emit(p,'jump');}
function move(p,w){const oldX=p.x,oldY=p.y,wasGrounded=p.grounded;let nx=p.x+p.vx;
 for(const b of w.solids){if(!overlap(nx,p.y,b))continue;const raise=p.y-b.y;if(wasGrounded&&raise>0&&raise<=16.01&&p.vy>=0&&w.solids.every(q=>q===b||!overlap(nx,b.y,q))){p.y=b.y;p.gfxOffY+=raise;p.stepCount++;emit(p,'step');continue;}if(p.vx>0)nx=Math.min(nx,b.x-10);else if(p.vx<0)nx=Math.max(nx,b.x+b.w+10);p.vx=0;}
 const minX=16+TUNING.width/2,maxX=w.width-16-TUNING.width/2;if(nx<minX&&p.vx<0||nx>maxX&&p.vx>0)p.vx=0;p.x=Math.max(minX,Math.min(maxX,nx));const previousY=p.y;let ny=p.y+p.vy;p.grounded=false;p.support=null;
 const candidates=[...w.solids,...w.platforms];for(const b of candidates){if(p.x+10<=b.x+.001||p.x-10>=b.x+b.w-.001)continue;if(b.oneWay){if(p.dropThrough===b.id||p.vy<0||previousY>b.y+.01)continue;if(ny>=b.y){ny=Math.min(ny,b.y);p.grounded=true;p.support=b.id;}}
 else if(p.vy>=0&&previousY<=b.y+.01&&ny>=b.y){ny=Math.min(ny,b.y);p.grounded=true;p.support=b.id;}
 else if(p.vy<0&&previousY-42>=b.y+b.h-.01&&ny-42<b.y+b.h){ny=Math.max(ny,b.y+b.h+42);p.vy=0;p.hold=0;emit(p,'ceiling');}}
 if(p.grounded){if(!wasGrounded&&p.airborneTicks>2){p.lastLandSpeed=p.vy;emit(p,'land',{speed:p.vy});}p.vy=0;p.hold=0;p.airborneTicks=0;}else p.airborneTicks++;
 p.y=ny;if(p.dropThrough){const b=w.platforms.find(b=>b.id===p.dropThrough);if(!b||p.y-42>b.y+b.h)p.dropThrough=null;}
 if(['pull','hang'].includes(p.hook.phase)){const movement=Math.hypot(p.x-oldX,p.y-oldY);p.hook.phase=movement<.08?'hang':'pull';p.grounded=false;}
}
export function tick(p,w,input={}){p.events=[];p.prevX=p.x;p.prevY=p.y;p.ticks++;p.time=p.ticks/60;p.actionAge+=1/60;p.gfxOffY=approach(p.gfxOffY,0,(1+Math.abs(p.vx)/3)*1.2);
 const freshJump=!!input.jump&&!p.previous.jump,freshHook=!!(input.hook||input.special)&&!p.previous.hook;
 if(freshHook)startHook(p,w,input);updateHook(p,w);
 let attached=['pull','hang'].includes(p.hook.phase);
 if(attached&&freshJump){const resting=Math.hypot(p.vx,p.vy)<2;returnHook(p);attached=false;if(resting&&!input.down)jump(p);else{p.vy+=.01;p.hold=0;}emit(p,'hook-release');}
 if(attached){const dx=p.hook.x-p.x,dy=p.hook.y-(p.y-21),len=Math.hypot(dx,dy)||1,factor=Math.min(1,11/len);p.vx=dx*factor;p.vy=dy*factor;p.face=dx>=0?1:-1;p.hold=0;}
 else{horizontal(p,input);if(input.down&&p.grounded&&p.support!=='ground'&&w.platforms.some(b=>b.id===p.support)){p.dropThrough=p.support;p.y+=.5;p.grounded=false;p.support=null;emit(p,'drop');}
  if(freshJump&&p.grounded)jump(p);else if(input.jump&&p.hold>0&&p.vy!==0){p.vy=-5.01;p.hold--;}else if(!input.jump)p.hold=0;p.vy=Math.min(10,p.vy+.4);}
 move(p,w);if(p.jumpOrigin!==null)p.maxJumpHeight=Math.max(p.maxJumpHeight,p.jumpOrigin-p.y);
 const oldAction=p.action;
 p.action=attached?(p.hook.phase==='hang'?'hook-hang':'hook-pull'):p.hook.phase==='flying'?'hook-shot':!p.grounded?(p.vy<0?(p.hold>0?'jump-hold':'jump-rise'):'fall'):p.gfxOffY>.5?'step':Math.abs(p.vx)<.001?'idle':(input.left&&p.vx>0||input.right&&p.vx<0)?'turn':!input.left&&!input.right?'brake':'walk';
 if(oldAction!==p.action)p.actionAge=0;
 if(!p.grounded||attached){p.frameCounter=0;p.legFrame=5;}else if(Math.abs(p.vx)>.001){p.frameCounter+=Math.abs(p.vx)*1.3;while(p.frameCounter>8){p.frameCounter-=8;p.legFrame++;}if(p.legFrame<6)p.legFrame=19;else if(p.legFrame>19)p.legFrame=6;}else{p.legFrame=0;p.frameCounter=0;}
 p.bodyFrame=attached?(Math.abs(p.hook.y-(p.y-21))>Math.abs(p.hook.x-p.x)?p.hook.y<p.y-21?2:4:3):!p.grounded?5:p.legFrame;
 p.previous={jump:!!input.jump,hook:!!(input.hook||input.special)};p.history.push({x:p.x,y:p.y,vx:p.vx,vy:p.vy,time:p.time,action:p.action});if(p.history.length>360)p.history.shift();
}
