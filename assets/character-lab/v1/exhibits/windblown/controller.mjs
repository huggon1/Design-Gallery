// H is the neutral visible body height. Values are video-constrained fits, not engine data.
export const H=2.067;
export const PARAMS={walkSpeed:4.2*H,runPeriod:.55,acceleration:90,braking:110,dashDistance:6.4*H,dashWindup:0,dashTravel:15/120,dashRecovery:4/120,dashBuffer:.14,attackBuffer:.18,radius:.21};
export const WORLD={platforms:[{id:'west',x:-150,z:-100,w:178,d:200},{id:'east',x:70,z:-100,w:80,d:200},{id:'north',x:28,z:-100,w:42,d:116},{id:'south',x:28,z:36,w:42,d:64},{id:'island-a',x:39,z:18,w:6,d:16},{id:'island-b',x:53,z:18,w:6,d:16}],obstacles:[{x:7,z:-2,r:.65},{x:14,z:12,r:.7},{x:22,z:-8,r:.75},{x:24,z:25,r:.6},{x:75,z:25,r:.6}],targets:[{x:5,z:-5,r:.45},{x:19,z:6,r:.45},{x:32,z:-12,r:.45}]};WORLD.target=WORLD.targets[0];
const spawn={x:-5.5,z:0,facing:2.1};export const SPAWNS={open:spawn,run:spawn,gaps:spawn,combat:spawn};
export const ATTACKS=[{duration:.60,active:[.25,.4333],chain:.45,lunge:.25*H,root:[[0,0],[.17,0],[.23,.04],[.32,.39],[.40,.25*H],[.60,.25*H]]},{duration:.54,active:[.05,.30],chain:.40,lunge:.30*H,root:[[0,0],[.04,0],[.12,.28*H],[.24,.30*H],[.54,.30*H]]},{duration:118/120,active:[.2333,.4167],chain:118/120,lunge:.45*H,root:[[0,0],[.17,0],[.24,.16*H],[.34,.45*H],[118/120,.45*H]]}];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function rootCurve(keys,t){if(t<=keys[0][0])return keys[0][1];if(t>=keys.at(-1)[0])return keys.at(-1)[1];let i=0;while(keys[i+1][0]<t)i++;const [a,b]=[keys[i],keys[i+1]],d=b[0]-a[0],u=(t-a[0])/d;const slope=j=>{if(j===0||j===keys.length-1)return 0;const x=(keys[j][1]-keys[j-1][1])/(keys[j][0]-keys[j-1][0]),y=(keys[j+1][1]-keys[j][1])/(keys[j+1][0]-keys[j][0]);return x*y<=0?0:2*x*y/(x+y);};return (2*u**3-3*u*u+1)*a[1]+(u**3-2*u*u+u)*d*slope(i)+(-2*u**3+3*u*u)*b[1]+(u**3-u*u)*d*slope(i+1);}
// Visible source displacements across the first 16.7 ms intervals: roughly
// half distance on reveal, then three quarters, close to nine tenths, then arrival.
export function dashCurve(t){
 t=clamp(t,0,1);
 return 1-(1-t)**3.85;
}
function pointAt(x,z,world){return world.platforms.find(s=>x>=s.x&&x<=s.x+s.w&&z>=s.z&&z<=s.z+s.d);}
export function platformAt(x,z,world=WORLD,pad=0){const center=pointAt(x,z,world);if(!center)return;for(let i=0;pad&&i<12;i++){const a=i/12*Math.PI*2;if(!pointAt(x+Math.cos(a)*pad,z+Math.sin(a)*pad,world))return;}return center;}
export function createPlayer(spawn={}){const p={};resetPlayer(p,spawn);return p;}
export function resetPlayer(p,spawn={}){Object.assign(p,{x:spawn.x??0,z:spawn.z??0,y:0,vx:0,vz:0,facing:spawn.facing??Math.PI/2,visualFacing:spawn.facing??Math.PI/2,action:'idle',actionTime:0,time:0,walkPhase:0,runTime:0,moveBlend:0,combo:0,comboTime:-9,hitCount:0,dashCount:0,falls:0,last:{},dashBuffer:0,attackBuffer:0,freeze:0,turn:0,phase:'settle',eventId:0,reverseAge:999,moveDir:spawn.facing??Math.PI/2,platform:platformAt(spawn.x??0,spawn.z??0)?.id??'west',safe:{x:spawn.x??0,z:spawn.z??0},dash:null,hitDone:false,hitTargets:[],events:[],foot:0});}
function event(p,type,more={}){p.events.push({id:p.eventId++,type,t:p.time,x:p.x,z:p.z,...more});if(p.events.length>120)p.events.shift();}
function walk(p,dx,dz,world){const r=PARAMS.radius;let x=p.x+dx,z=p.z+dz;for(const o of world.obstacles){const d=Math.hypot(x-o.x,z-o.z);if(d<o.r+r){const f=(o.r+r)/(d||1);x=o.x+(x-o.x)*f;z=o.z+(z-o.z)*f;}}if(platformAt(x,z,world,r)){p.x=x;p.z=z;return;}if(platformAt(x,p.z,world,r))p.x=x;if(platformAt(p.x,z,world,r))p.z=z;}
function startDash(p,dir,world){if(p.action==='attack')event(p,'cancel',{from:'attack',combo:p.combo,at:p.actionTime});p.action='dash';p.actionTime=0;p.dashBuffer=0;p.dashCount++;p.facing=dir;p.visualFacing=dir;p.vx=p.vz=0;const dx=Math.sin(dir),dz=Math.cos(dir);let distance=PARAMS.dashDistance;for(let s=.08;s<distance;s+=.06){if(world.obstacles.some(o=>Math.hypot(p.x+dx*s-o.x,p.z+dz*s-o.z)<o.r+PARAMS.radius)){distance=Math.max(0,s-.1);break;}}p.dash={x:p.x,z:p.z,dx,dz,distance,from:platformAt(p.x,p.z,world)?.id,to:platformAt(p.x+dx*distance,p.z+dz*distance,world,PARAMS.radius)?.id??null};event(p,'dash',{distance,dx,dz,to:p.dash.to});}
function startAttack(p,dir,next=false){p.action='attack';p.actionTime=0;p.attackBuffer=0;p.combo=next?(p.combo+1)%3:0;p.facing=dir;p.visualFacing=dir;p.vx=p.vz=0;p.hitDone=false;p.hitTargets=[];event(p,'attack',{combo:p.combo});}
export function stepPlayer(p,dt,input={},world=WORLD){
 p.time+=dt;p.reverseAge+=dt;p.events=p.events.filter(e=>p.time-e.t<8);
 for(const k of ['dash','attack']){if(input[k]&&!p.last[k])p[k+'Buffer']=PARAMS[k+'Buffer'];else p[k+'Buffer']=Math.max(0,p[k+'Buffer']-dt);p.last[k]=!!input[k];}
 let sx=(input.right?1:0)-(input.left?1:0),sy=(input.down?1:0)-(input.up?1:0);const len=Math.hypot(sx,sy);if(len){sx/=len;sy/=len;}const mx=sx*.83205+sy*.5547,mz=-sx*.5547+sy*.83205,moveDir=len?Math.atan2(mx,mz):p.facing,aimDir=Number.isFinite(input.aimAngle)?input.aimAngle:moveDir;
 if(p.freeze>0){p.freeze=Math.max(0,p.freeze-dt);return;}
 p.actionTime+=dt;const dashDuration=PARAMS.dashWindup+PARAMS.dashTravel+PARAMS.dashRecovery;
 if(p.action==='fall'){p.phase='return';p.y=-5*smooth(p.actionTime/.38);if(p.actionTime>.58){p.x=p.safe.x;p.z=p.safe.z;p.y=0;p.action='land';p.actionTime=0;event(p,'recover');}return;}
 if((p.dashBuffer>0||(input.dash&&input.autoDash))&&(p.action!=='dash'||p.actionTime>=dashDuration)){startDash(p,len?moveDir:aimDir,world);}
 if(p.action==='dash'){
  const d=p.dash,t=(p.actionTime-PARAMS.dashWindup)/PARAMS.dashTravel,e=dashCurve(t);p.x=d.x+d.dx*d.distance*e;p.z=d.z+d.dz*d.distance*e;p.y=Math.sin(clamp(t,0,1)*Math.PI)*.16;p.phase=t<0?'anticipation':t<1?'travel':'recovery';const dv=(dashCurve(t+.001)-dashCurve(t-.001))/.002*d.distance/PARAMS.dashTravel;p.vx=d.dx*dv;p.vz=d.dz*dv;
  if(p.actionTime>=PARAMS.dashWindup+PARAMS.dashTravel&&!d.landed){d.landed=true;if(!d.to){p.action='fall';p.actionTime=0;p.falls++;event(p,'fall');return;}p.safe={x:p.x,z:p.z};p.platform=d.to;event(p,'land',{crossing:d.from!==d.to});}
  if(p.actionTime>=dashDuration){p.action='land';p.actionTime=0;p.y=0;p.vx=p.vz=0;}return;
 }
 if(p.action==='attack'){
  const a=ATTACKS[p.combo],t=p.actionTime;p.phase=t<a.active[0]?'anticipation':t<a.active[1]?'strike':'recovery';const lunge=rootCurve(a.root,t)-rootCurve(a.root,t-dt);walk(p,Math.sin(p.facing)*lunge+mx*PARAMS.walkSpeed*.48*dt*len,Math.cos(p.facing)*lunge+mz*PARAMS.walkSpeed*.48*dt*len,world);p.moveBlend=len?.65:0;if(len){p.runTime+=dt*.65;p.walkPhase=p.runTime/.55*Math.PI*2;}
  if(t>=a.active[0]&&!p.hitDone){p.hitDone=true;event(p,'slash',{combo:p.combo,facing:p.facing});}
  if(t>=a.active[0]&&t<=a.active[1])for(const [i,target]of (world.targets??[world.target]).entries()){if(p.hitTargets.includes(i))continue;const d=Math.hypot(target.x-p.x,target.z-p.z),angle=Math.atan2(target.x-p.x,target.z-p.z);if(d<2.65&&Math.abs(angleDelta(p.facing,angle))<1.2){p.hitTargets.push(i);p.hitCount++;p.freeze=.025;event(p,'hit',{combo:p.combo,target:i,tx:target.x,tz:target.z});}}
  if(p.attackBuffer>0&&t>=a.chain){startAttack(p,aimDir,true);return;}if(t<a.duration)return;p.action='idle';p.actionTime=0;p.comboTime=p.time;
 }
 if(p.attackBuffer>0){startAttack(p,aimDir);return;}
 const landing=p.action==='land'&&p.actionTime<.075;p.phase=landing?'landing':len?'stride':'settle';const targetSpeed=len?PARAMS.walkSpeed:0,step=(len?PARAMS.acceleration:PARAMS.braking)*dt,dvx=mx*targetSpeed-p.vx,dvz=mz*targetSpeed-p.vz,k=Math.min(1,step/(Math.hypot(dvx,dvz)||1));p.vx+=dvx*k;p.vz+=dvz*k;const beforeX=p.x,beforeZ=p.z;walk(p,p.vx*dt,p.vz*dt,world);if(Math.abs(p.x-beforeX)<1e-6)p.vx=0;if(Math.abs(p.z-beforeZ)<1e-6)p.vz=0;
 const speed=Math.hypot(p.vx,p.vz);p.moveBlend=0;if(len&&speed>.3&&Math.abs(angleDelta(p.moveDir,moveDir))>2.1){p.reverseAge=0;event(p,'turn');}if(len)p.moveDir=moveDir;if(speed>.1){p.facing=moveDir;const delta=angleDelta(p.visualFacing,p.facing);p.turn=delta;p.visualFacing+=delta*(1-Math.exp(-35*dt));p.runTime+=dt*speed/PARAMS.walkSpeed;p.walkPhase=p.runTime/.55*Math.PI*2;p.foot+=speed*dt;if(p.foot>PARAMS.walkSpeed*.55/2){p.foot=0;event(p,'foot');}}else p.turn*=Math.exp(-14*dt);
 if(!landing)p.action=speed>.1?'run':'idle';p.y=0;p.platform=platformAt(p.x,p.z,world)?.id??p.platform;if(platformAt(p.x,p.z,world,.25))p.safe={x:p.x,z:p.z};
}
