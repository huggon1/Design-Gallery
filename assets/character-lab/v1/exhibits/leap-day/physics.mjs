export const TUNING={speed:120,jumpSpeed:370,gravity:1000,fallSpeed:400,wallSlide:58,width:12,height:20,coyote:.055,buffer:.09,wallLock:.1};
export const SECTIONS=[
 {id:'run',label:'自由跳跃',x:128,y:400},
 {id:'platform',label:'短平台',x:240,y:400},
 {id:'wall',label:'墙跳',x:70,y:400,face:-1},
 {id:'one-way',label:'单向平台',x:240,y:400},
];
export function createWorld(area='run'){
 const world={area,width:640,height:432,floor:400,left:16,right:624,ceiling:16,blocks:[]};
 if(area==='platform')world.blocks.push({id:'short-platform',x:296,y:356,w:48,h:12});
 if(area==='one-way'){
  world.blocks.push(
   {id:'divider-upper',x:544,y:0,w:16,h:272},
   {id:'divider-lower',x:544,y:320,w:16,h:48},
   {id:'one-way-tier',x:16,y:320,w:528,h:8,oneWay:true},
  );
  world.returnLane={left:560,right:624,gate:320,exit:368};
 }
 return world;
}
export function createPlayer(spawn=SECTIONS[0],world=createWorld()){return resetPlayer({},spawn,world);}
export function resetPlayer(p,spawn=SECTIONS[0],world=createWorld()){
 const support=world.blocks.find(b=>Math.abs(b.y-spawn.y)<.01&&spawn.x>b.x&&spawn.x<b.x+b.w);
 const grounded=Math.abs(spawn.y-world.floor)<.01||!!support;
 const face=spawn.face??1;
 Object.assign(p,{x:spawn.x,y:spawn.y,vx:face*TUNING.speed,vy:0,face,grounded,support:support?.id||null,wall:0,airStopped:false,airJump:1,coyote:grounded?TUNING.coyote:0,buffer:0,wallLock:0,previousJump:false,time:0,action:grounded?'run':'fall',actionAge:0,runAge:0,jumpAge:0,spinAge:-1,landAge:1,turnAge:1,jumpSerial:0,events:[],highest:spawn.y,history:[]});return p;
}
const overlap=(a,b,c,d)=>a<d-1e-7&&b>c+1e-7;
function atWall(p,w){const r=TUNING.width/2,h=TUNING.height;if(p.x-r<=w.left+.02)return -1;if(p.x+r>=w.right-.02)return 1;
 for(const b of w.blocks){if(b.oneWay||!overlap(p.y-h,p.y,b.y,b.y+b.h))continue;if(Math.abs(p.x+r-b.x)<.02)return 1;if(Math.abs(p.x-r-b.x-b.w)<.02)return -1;}return 0;}
function emit(p,type){p.events.push({type,x:p.x,y:p.y,face:p.face});}
function launch(p,type){
 p.vy=-TUNING.jumpSpeed;p.grounded=false;p.airStopped=false;p.support=null;p.buffer=0;p.coyote=0;p.jumpAge=0;p.jumpSerial++;
 if(type==='wall'){p.face=-p.wall;p.wall=0;p.wallLock=TUNING.wallLock;p.airJump=1;p.vx=p.face*TUNING.speed;}
 if(type==='double'){p.airJump=0;p.spinAge=0;}else p.spinAge=-1;
 emit(p,type);
}
export function stepPlayer(p,input={},dt=1/120,world=createWorld()){
 const oldAction=p.action,wasGround=p.grounded,r=TUNING.width/2,h=TUNING.height;
 p.events=[];p.time+=dt;p.actionAge+=dt;p.jumpAge+=dt;p.landAge+=dt;p.turnAge+=dt;if(p.spinAge>=0)p.spinAge+=dt;
 p.wallLock=Math.max(0,p.wallLock-dt);p.coyote=Math.max(0,p.coyote-dt);p.buffer=Math.max(0,p.buffer-dt);
 if(input.jump&&!p.previousJump)p.buffer=TUNING.buffer;
 if(p.grounded)p.coyote=TUNING.coyote;
 p.wall=p.wallLock>0?0:atWall(p,world);
 if(p.wall!==p.face&&!p.airStopped)p.wall=0;
 if(!p.grounded&&p.wall){p.airStopped=true;p.face=-p.wall;p.airJump=1;p.spinAge=-1;}
 if(p.buffer>0){if(p.grounded||p.coyote>0)launch(p,'jump');else if(p.wall)launch(p,'wall');else if(p.airJump>0)launch(p,'double');}
 p.vx=p.airStopped&&!p.grounded?0:p.face*TUNING.speed;
 const oldX=p.x;p.x+=p.vx*dt;
 const sides=[{x:world.left-32,y:-10000,w:32,h:20000},{x:world.right,y:-10000,w:32,h:20000},...world.blocks.filter(b=>!b.oneWay)];
 let contact=0;
 // All axes share the same open-edge overlap. A shrunken side range leaves
 // fractional corner gaps that the vertical sweep cannot recover afterward.
 for(const b of sides){if(!overlap(p.y-h,p.y,b.y,b.y+b.h))continue;
  if(p.vx>0&&oldX+r<=b.x+.02&&p.x+r>b.x){p.x=b.x-r;contact=1;}
  if(p.vx<0&&oldX-r>=b.x+b.w-.02&&p.x-r<b.x+b.w){p.x=b.x+b.w+r;contact=-1;}
 }
 if(contact){if(p.grounded){p.face=-contact;p.vx=p.face*TUNING.speed;p.turnAge=0;emit(p,'turn');}else if(p.wallLock<=0){p.wall=contact;p.airStopped=true;p.face=-contact;p.vx=0;p.airJump=1;p.spinAge=-1;}}
 p.vy=Math.min(TUNING.fallSpeed,p.vy+TUNING.gravity*dt);
 if(p.wall&&!p.grounded&&p.wallLock<=0)p.vy=Math.min(p.vy,TUNING.wallSlide);
 const oldY=p.y;p.y+=p.vy*dt;p.grounded=false;p.support=null;
 let landing=world.floor;
 for(const b of world.blocks){if(!overlap(p.x-r,p.x+r,b.x,b.x+b.w))continue;
  if(p.vy>=0&&oldY<=b.y+.05&&p.y>=b.y){if(b.y<=landing){landing=b.y;p.support=b.id;}}
  else if(!b.oneWay&&p.vy<0&&oldY-h>=b.y+b.h-.05&&p.y-h<=b.y+b.h){p.y=b.y+b.h+h;p.vy=0;emit(p,'ceiling');}
 }
 if(p.y>=landing&&p.vy>=0){p.y=landing;p.vy=0;p.grounded=true;p.airStopped=false;p.vx=p.face*TUNING.speed;p.airJump=1;p.wall=0;p.spinAge=-1;if(!wasGround){p.landAge=0;emit(p,'land');}if(p.buffer>0)launch(p,'jump');}
 if(world.ceiling!==undefined&&p.y-h<world.ceiling){p.y=world.ceiling+h;p.vy=Math.max(0,p.vy);}
 p.x=Math.max(world.left+r,Math.min(world.right-r,p.x));
 // A wall caught in mid-air turns into the ground-side reversal on landing.
 if(p.grounded){const wall=atWall(p,world);if(wall===p.face){p.face=-wall;p.vx=p.face*TUNING.speed;p.turnAge=0;emit(p,'turn');}}
 p.highest=Math.min(p.highest,p.y);p.action=p.wall&&!p.grounded?'wall':p.grounded?(p.landAge<.07?'land':'run'):p.spinAge>=0?'double':p.vy<0?'jump':'fall';
 if(p.action!==oldAction)p.actionAge=0;
 if(p.grounded)p.runAge+=dt;else p.runAge=0;
 p.history.push({x:p.x,y:p.y-h/2});if(p.history.length>180)p.history.shift();p.previousJump=!!input.jump;
}
