export const TUNING=Object.freeze({worldWidth:880,worldHeight:540,scale:1.7,speed:225,accelTime:.072,stopTime:.11,playerRadius:12,shotInterval:11/30,tearSpeed:390,inheritVelocity:.65,tearRiseSpeed:24,tearGravity:215,enemySpeed:39});
export const SECTIONS=[{id:'room',label:'绕石 · 四向发射'},{id:'range',label:'弹道 · 起停与射程'},{id:'chase',label:'慢追踪 · 移动发射'}];
export const FLOOR={left:64,right:816,top:98,bottom:478};
const DIR={Up:[0,-1],Down:[0,1],Left:[-1,0],Right:[1,0]};
const FIRE=['Up','Down','Left','Right'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const length=(x,y)=>Math.hypot(x,y);
export function directionFor(x,y,fallback='Down'){return Math.abs(x)>Math.abs(y)?(x>0?'Right':'Left'):y?(y>0?'Down':'Up'):fallback;}
export function createWorld(section='room'){
  return {section,rocks:section==='range'?[]:[{x:354,y:287,r:28},{x:526,y:287,r:28}],
    targets:[{id:'north',x:440,y:124,r:21},{id:'east',x:786,y:287,r:21},{id:'south',x:440,y:455,r:21},{id:'west',x:94,y:287,r:21}].map(t=>({...t,hits:0,flash:0})),
    enemy:section==='chase'?{x:700,y:190,vx:0,vy:0,r:15,flash:0,health:6,respawn:0}:null};
}
export function createState(section='room'){
  return {x:440,y:365,vx:0,vy:0,previousX:440,previousY:365,time:0,section,action:'idle',bodyDirection:'Down',headDirection:'Down',walkTick:0,moving:false,
    shootAge:10,hitAge:10,cooldown:0,invulnerable:0,nextEye:'left',lastEye:null,shots:0,hits:0,landings:0,damageCount:0,tears:[],effects:[],events:[],history:[],shotLog:[],previousFire:{},fireDirection:null};
}
function resolveCircle(p,radius,o){
  const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy),limit=radius+o.r;
  if(d>=limit)return;
  const nx=d?dx/d:1,ny=d?dy/d:0;
  p.x=o.x+nx*limit;p.y=o.y+ny*limit;
  const dot=p.vx*nx+p.vy*ny;if(dot<0){p.vx-=dot*nx;p.vy-=dot*ny;}
}
export function moveInRoom(p,dt,world,r=TUNING.playerRadius){
  p.x+=p.vx*dt;p.y+=p.vy*dt;
  const x=clamp(p.x,FLOOR.left+r,FLOOR.right-r),y=clamp(p.y,FLOOR.top+r,FLOOR.bottom-r);
  if(x!==p.x)p.vx=0;if(y!==p.y)p.vy=0;p.x=x;p.y=y;
  for(const o of world.rocks)resolveCircle(p,r,o);
  for(const o of world.targets)resolveCircle(p,r,o);
}
function chooseFire(p,input){
  let fresh=null;
  const held=FIRE.filter(d=>input['fire'+d]);
  for(const d of held)if(!p.previousFire[d])fresh=d;
  for(const d of FIRE)p.previousFire[d]=Boolean(input['fire'+d]);
  if(fresh)p.fireDirection=fresh;
  if(held.length){if(!held.includes(p.fireDirection))p.fireDirection=held[held.length-1];return p.fireDirection;}
  if(input.attack){
    const aim=input.aim;
    if(aim?.active)return directionFor((aim.x*TUNING.worldWidth)-p.x,(aim.y*TUNING.worldHeight)-p.y,p.headDirection);
    return p.headDirection;
  }
  p.fireDirection=null;return null;
}
function burst(p,tear,type){
  p.effects.push({x:tear.x,y:tear.y,z:Math.max(0,tear.z),age:0,life:16/30,type,seed:tear.id});
  p.events.push({type,x:tear.x,y:tear.y});
  if(type==='land')p.landings++;
}
export function stepState(p,world,input,dt,getEye){
  p.events=[];p.previousX=p.x;p.previousY=p.y;p.time+=dt;p.shootAge+=dt;p.hitAge+=dt;
  p.cooldown=Math.max(0,p.cooldown-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);
  let mx=Number(!!input.right)-Number(!!input.left),my=Number(!!input.down)-Number(!!input.up);
  const n=Math.hypot(mx,my);if(n){mx/=n;my/=n;}
  const tau=n?TUNING.accelTime:TUNING.stopTime,blend=1-Math.exp(-dt/tau);
  p.vx+=(mx*TUNING.speed-p.vx)*blend;p.vy+=(my*TUNING.speed-p.vy)*blend;
  if(Math.abs(p.vx)<.03)p.vx=0;if(Math.abs(p.vy)<.03)p.vy=0;
  moveInRoom(p,dt,world);
  const speed=length(p.vx,p.vy);p.moving=speed>2;
  if(p.moving){p.bodyDirection=directionFor(p.vx,p.vy,p.bodyDirection);p.walkTick=(p.walkTick+dt*30*Math.min(1,speed/TUNING.speed))%20;}else p.walkTick=0;
  const fire=chooseFire(p,input);
  if(fire)p.headDirection=fire;else if(n)p.headDirection=directionFor(mx,my,p.headDirection);
  if(fire&&p.cooldown<1e-7){
    p.shootAge=0;
    const eye=getEye(p,p.nextEye),[dx,dy]=DIR[fire],eyeName=p.nextEye;
    const t={id:++p.shots,x:p.x+eye.x*TUNING.scale,y:p.y,z:-eye.y*TUNING.scale,vz:TUNING.tearRiseSpeed,
      vx:dx*TUNING.tearSpeed+p.vx*TUNING.inheritVelocity,vy:dy*TUNING.tearSpeed+p.vy*TUNING.inheritVelocity,age:0,eye:eyeName,dir:fire};
    p.tears.push(t);p.lastEye=eyeName;p.nextEye=eyeName==='left'?'right':'left';p.cooldown=TUNING.shotInterval;
    p.shotLog.push({id:t.id,time:p.time,x:t.x,y:t.y,z:t.z,vx:t.vx,vy:t.vy,eye:eyeName,head:fire,body:p.bodyDirection,playerVx:p.vx,playerVy:p.vy});
    if(p.shotLog.length>60)p.shotLog.shift();p.events.push({type:'shoot'});
  }
  p.action=fire?(p.moving?'move_fire':'fire'):(p.moving?(n?'walk':'coast'):'idle');
  if(p.hitAge<8/30)p.action='hit';
  for(const t of world.targets)t.flash=Math.max(0,t.flash-dt);
  const alive=[];
  for(const t of p.tears){
    t.age+=dt;t.x+=t.vx*dt;t.y+=t.vy*dt;t.vz-=TUNING.tearGravity*dt;t.z+=t.vz*dt;
    if(t.z<=0){burst(p,t,'land');continue;}
    if(t.x<FLOOR.left||t.x>FLOOR.right||t.y<FLOOR.top||t.y>FLOOR.bottom){burst(p,t,'wall');continue;}
    if(world.rocks.some(o=>length(t.x-o.x,t.y-o.y)<o.r+4)){burst(p,t,'rock');continue;}
    const target=world.targets.find(o=>length(t.x-o.x,t.y-o.y)<o.r+4);
    if(target){target.hits++;target.flash=.18;p.hits++;burst(p,t,'wood');continue;}
    const e=world.enemy;
    if(e&&e.health>0&&length(t.x-e.x,t.y-e.y)<e.r+4){e.health--;e.flash=.18;p.hits++;if(!e.health)e.respawn=1.1;burst(p,t,'wood');continue;}
    alive.push(t);
  }
  p.tears=alive;
  const e=world.enemy;
  if(e){
    e.flash=Math.max(0,e.flash-dt);
    if(e.health<=0){e.respawn-=dt;if(e.respawn<=0)Object.assign(e,{x:700,y:190,vx:0,vy:0,health:6});}
    else{
      const d=length(p.x-e.x,p.y-e.y)||1;e.vx=(p.x-e.x)/d*TUNING.enemySpeed;e.vy=(p.y-e.y)/d*TUNING.enemySpeed;moveInRoom(e,dt,world,e.r);
      if(length(p.x-e.x,p.y-e.y)<TUNING.playerRadius+e.r&&p.invulnerable<=0){
        p.damageCount++;p.invulnerable=1.1;p.hitAge=0;p.action='hit';p.vx+=(p.x-e.x)/d*145;p.vy+=(p.y-e.y)/d*145;p.events.push({type:'hurt'});
      }
    }
  }
  p.effects=p.effects.filter(e=>(e.age+=dt)<e.life);
  p.history.push({time:p.time,x:p.x,y:p.y,vx:p.vx,vy:p.vy,speed});if(p.history.length>600)p.history.shift();
}
