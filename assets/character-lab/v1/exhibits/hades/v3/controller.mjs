import {CLIPS,poseFor,rootCurve,phaseOf,frameOf,supportFor} from './motion.mjs';
import {WORLD,LANDMARKS,DUMMIES,SOLIDS} from '../world.mjs';
export {CLIPS,poseFor,rootCurve,phaseOf,frameOf,supportFor,WORLD};
export const TUNING={bodyHeight:98,runSpeed:414,acceleration:9200,brake:10500,turnRate:26,gaitCycleDistance:221,dashDistance:216,dashMoveTime:.145,dashRepeatTime:.18,dashRecharge:.62,inputBuffer:.16,hitstop:.028,collisionRadius:13};
export const SECTIONS=[{id:'movement',label:'走位与起停'},{id:'reflex',label:'二连冲刺长道'},{id:'blade',label:'基础剑练习桩'},{id:'link',label:'远端冲刺前刺'}];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function createWorld(section='movement'){const w={};resetWorld(w,section);return w;}
export function resetWorld(w,section='movement'){
 Object.assign(w,{x:WORLD.spawn.x,y:WORLD.spawn.y,prevX:WORLD.spawn.x,prevY:WORLD.spawn.y,vx:0,vy:0,time:0,action:'idle',actionTime:0,prevAction:'idle',prevActionTime:0,angle:.6,prevAngle:.6,targetAngle:.6,charges:2,recharge:0,combo:0,comboExpiry:0,attackBuffer:0,dashBuffer:0,dashWindow:0,dashMotion:null,hitstop:0,hits:0,hitThisAction:false,dashCount:0,gaitDistance:0,gaitPhase:0,prevGaitPhase:0,lastFoot:-1,runTime:0,rootProgress:0,rootAngle:0,transition:null,serial:0,section,previous:{},lastInput:{},particles:[],events:[],trace:[],cameraShake:0,cameraX:0,cameraY:0,prevCameraX:0,prevCameraY:0,visited:['spawn'],dummyHits:{},lastHit:null,trajectory:[]});
 if(section==='link'||section==='blade'){
  const dummy=DUMMIES.find(p=>p.id==='blade');
  const dx=section==='link'?144:97,dy=section==='link'?144:0;
  w.x=w.prevX=w.cameraX=w.prevCameraX=dummy.x+dx;
  w.y=w.prevY=w.cameraY=w.prevCameraY=dummy.y+dy;
  w.angle=w.prevAngle=w.targetAngle=Math.atan2(-dx,-dy);
 }
}
export function clearInput(w){w.previous={};w.attackBuffer=0;w.dashBuffer=0;}
export function animationTime(w){return w.action==='run'?w.gaitPhase*CLIPS.run.duration:w.actionTime;}
function event(w,type,data={}){w.events.push({type,time:w.time,...data});if(w.events.length>48)w.events.shift();}
function begin(w,id,angle=w.angle,blend=.045){
 const from={clip:w.action,time:animationTime(w)};w.action=id;w.actionTime=0;w.angle=angle;w.targetAngle=angle;w.serial++;w.rootProgress=0;w.rootAngle=angle;w.hitThisAction=false;w.transition={...from,elapsed:0,duration:blend};
 if(['slash-1','slash-2','thrust','dash-strike'].includes(id)){w.attackBuffer=0;w.comboExpiry=CLIPS[id].duration+.39;event(w,'windup',{clip:id});}
}
function dash(w,angle){begin(w,'dash',angle,.025);w.charges--;w.dashCount++;w.recharge=TUNING.dashRecharge;w.dashWindow=.29;w.dashBuffer=0;w.dashMotion={elapsed:0,progress:0,angle};event(w,'dash');}
const isAttack=id=>['slash-1','slash-2','thrust','dash-strike'].includes(id),mobile=id=>['idle','run','start','stop','turn'].includes(id),recover=id=>id.startsWith('recover-');
export function advance(w,dt,input={}){
 w.prevX=w.x;w.prevY=w.y;w.prevAngle=w.angle;w.prevAction=w.action;w.prevActionTime=w.actionTime;w.prevGaitPhase=w.gaitPhase;w.prevCameraX=w.cameraX;w.prevCameraY=w.cameraY;w.time+=dt;w.lastInput={...input};
 let ix=Number(!!input.right)-Number(!!input.left),iy=Number(!!input.down)-Number(!!input.up),m=Math.hypot(ix,iy);if(m){ix/=m;iy/=m;}const dashDown=!!(input.dash||input.jump),attackDown=!!input.attack;
 if(dashDown&&!w.previous.dash)w.dashBuffer=TUNING.inputBuffer;if(attackDown&&!w.previous.attack)w.attackBuffer=TUNING.inputBuffer;
 w.previous={dash:dashDown,attack:attackDown};w.attackBuffer=Math.max(0,w.attackBuffer-dt);w.dashBuffer=Math.max(0,w.dashBuffer-dt);w.dashWindow=Math.max(0,w.dashWindow-dt);w.comboExpiry=Math.max(0,w.comboExpiry-dt);w.recharge=Math.max(0,w.recharge-dt);if(w.recharge===0&&!w.dashMotion)w.charges=2;
 w.cameraShake=Math.max(0,w.cameraShake-dt*28);for(const p of w.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=200*dt;}w.particles=w.particles.filter(p=>p.life>0);
 if(w.hitstop>0){w.hitstop=Math.max(0,w.hitstop-dt);followCamera(w,dt);return;}
 if(w.transition){w.transition.elapsed+=dt;if(w.transition.elapsed>=w.transition.duration)w.transition=null;}
 const aim=input.aimWorld?.active?Math.atan2(input.aimWorld.x-w.x,input.aimWorld.y-w.y):m?Math.atan2(ix,iy):w.targetAngle;
 if(m&&mobile(w.action))w.targetAngle=Math.atan2(ix,iy);
 const c=CLIPS[w.action],canDash=mobile(w.action)||recover(w.action)||(w.action==='dash'?w.actionTime>=TUNING.dashRepeatTime:w.actionTime>=(c.cancelDashAt??.045));
 if(w.dashBuffer>0&&w.charges>0&&canDash)dash(w,m?Math.atan2(ix,iy):w.targetAngle);
 else if((w.attackBuffer>0||attackDown)&&w.action==='dash'&&w.actionTime>=.008&&w.dashWindow>0){begin(w,'dash-strike',aim,0);w.dashWindow=0;}
 else if((w.attackBuffer>0||attackDown)&&(mobile(w.action)||recover(w.action))){if(w.comboExpiry===0)w.combo=0;begin(w,['slash-1','slash-2','thrust'][w.combo%3],aim,.024);w.combo=(w.combo+1)%3;}
 else if(m&&(recover(w.action)||(isAttack(w.action)&&!attackDown&&w.actionTime>=(CLIPS[w.action].cancelMoveAt??.23))))begin(w,'run',Math.atan2(ix,iy),.06);
 if(mobile(w.action)){
  const da=angleDiff(w.targetAngle,w.angle);w.angle+=clamp(da,-TUNING.turnRate*dt,TUNING.turnRate*dt);
  if(m&&['idle','stop'].includes(w.action))begin(w,'start',w.angle,.055);
  if(!m&&['run','start','turn'].includes(w.action))begin(w,'stop',w.angle,.055);
  if(m&&w.action==='run'&&Math.abs(da)>2.2)begin(w,'turn',w.angle,.045);
  const tx=ix*TUNING.runSpeed,ty=iy*TUNING.runSpeed,dx=tx-w.vx,dy=ty-w.vy,d=Math.hypot(dx,dy),f=d?Math.min(1,(m?TUNING.acceleration:TUNING.brake)*dt/d):0;w.vx+=dx*f;w.vy+=dy*f;
  if(!w.dashMotion){w.x+=w.vx*dt;w.y+=w.vy*dt;}
 }else {w.vx=0;w.vy=0;}
 const clip=CLIPS[w.action],old=w.actionTime;w.actionTime+=dt;
 if(w.dashMotion){const d=w.dashMotion;d.elapsed+=dt;const u=clamp(d.elapsed/TUNING.dashMoveTime,0,1),p=u<.15?u*u/.15*.5:u<.85?.075+(u-.15):.775+(u-.85)-(u-.85)*(u-.85)/.3,progress=clamp(p/.85,0,1),dist=(progress-d.progress)*TUNING.dashDistance;w.x+=Math.sin(d.angle)*dist;w.y+=Math.cos(d.angle)*dist;w.vx=Math.sin(d.angle)*dist/dt;w.vy=Math.cos(d.angle)*dist/dt;d.progress=progress;if(u===1)w.dashMotion=null;}
 if(isAttack(w.action)){
  const progress=rootCurve(w.action,w.actionTime/clip.duration),previous=rootCurve(w.action,old/clip.duration),distance=(progress-previous)*clip.distance;w.x+=Math.sin(w.rootAngle)*distance;w.y+=Math.cos(w.rootAngle)*distance;
  if(old<=clip.duration*clip.stages[0]&&w.actionTime>=clip.duration*clip.stages[0])event(w,'swing',{clip:w.action});
  const u=w.actionTime/clip.duration;if(!w.hitThisAction&&u>=clip.stages[0]&&u<=clip.stages[1])for(const dummy of DUMMIES){const dx=dummy.x-w.x,dy=dummy.y-w.y,dist=Math.hypot(dx,dy),dot=(dx*Math.sin(w.angle)+dy*Math.cos(w.angle))/Math.max(1,dist);if(dist<140&&dot>.38){w.hitThisAction=true;w.hits++;w.dummyHits[dummy.id]=(w.dummyHits[dummy.id]||0)+1;w.hitstop=TUNING.hitstop;w.cameraShake=2;w.lastHit={id:dummy.id,time:w.time,clip:w.action};event(w,'hit',{clip:w.action,id:dummy.id});for(let i=0;i<14;i++){const a=i*2.399;w.particles.push({x:dummy.x,y:dummy.y,z:35,vx:Math.cos(a)*115,vy:Math.sin(a)*115,vz:35+(i%4)*25,life:.18+(i%3)*.07});}break;}}
 }
 w.x=clamp(w.x,WORLD.left+25,WORLD.right-25);w.y=clamp(w.y,WORLD.top+25,WORLD.bottom-25);
 if(!w.dashMotion)for(const o of SOLIDS){const dx=w.x-o.x,dy=w.y-o.y,d=Math.hypot(dx,dy),r=o.r+TUNING.collisionRadius;if(d<r){const a=d>.001?Math.atan2(dy,dx):0;w.x=o.x+Math.cos(a)*r;w.y=o.y+Math.sin(a)*r;}}
 const distance=Math.hypot(w.x-w.prevX,w.y-w.prevY);if(mobile(w.action)&&distance>.0001){w.gaitDistance+=distance;w.gaitPhase=(w.gaitDistance/TUNING.gaitCycleDistance)%1;w.runTime=w.gaitPhase*CLIPS.run.duration;const foot=Math.floor(w.gaitDistance/(TUNING.gaitCycleDistance/2));if(foot!==w.lastFoot){w.lastFoot=foot;event(w,'foot');}}
 if(!clip.loop&&w.actionTime>=clip.duration){const was=w.action;
  if(['slash-1','slash-2','thrust'].includes(was)&&(attackDown||w.attackBuffer>0)){begin(w,['slash-1','slash-2','thrust'][w.combo%3],aim,was==='thrust'?.075:0);w.combo=(w.combo+1)%3;}
  else if(['slash-1','slash-2','thrust'].includes(was)&&CLIPS['recover-'+(was==='slash-1'?1:was==='slash-2'?2:3)])begin(w,'recover-'+(was==='slash-1'?1:was==='slash-2'?2:3),w.angle,0);
  else begin(w,m?'run':'idle',w.angle,.055);
 }
 for(const point of LANDMARKS)if(Math.hypot(w.x-point.x,w.y-point.y)<130&&!w.visited.includes(point.id))w.visited.push(point.id);
 if(!w.trace.length||w.time-w.trace.at(-1).time>=.016){w.trace.push({x:w.x,y:w.y,time:w.time,action:w.action,speed:Math.hypot(w.vx,w.vy)});if(w.trace.length>800)w.trace.shift();}
 followCamera(w,dt);
}
function followCamera(w,dt){const tx=w.x+w.vx*.10,ty=w.y+w.vy*.10,f=1-Math.exp(-dt*11);w.cameraX=mix(w.cameraX,tx,f);w.cameraY=mix(w.cameraY,ty,f);}
