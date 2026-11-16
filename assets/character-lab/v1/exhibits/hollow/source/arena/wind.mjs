/** Mantis wind blade: source FSM motion plus explicitly unverified box dimensions.
 * q.x/y are the projectile origin; targets/hazards use center-X / bottom-Y.
 * See research/wind-refinement.md for source levels and remaining prefab fields.
 */
export const WIND_GEOMETRY=Object.freeze({
  sourceCollider:'box2d',sourceScale:1.5,dimensionsVerified:false,dimensionErrorBound:null,
  width:2,height:.6,offsetX:0,offsetY:0,haloWidth:6.68,haloHeight:2.3,
  provenance:'box type and local scale: original scene index; width/height/offset: retained calibration candidate, not extracted original dimensions',
});
export const WIND_SOURCE=Object.freeze({
  repository:'windplusflower/hk-api-skill',commit:'fdac21584342cdaf04f521aa23b36ac71f7a6eea',
  asset:'level486',gameObjectPathId:150,fsmPathId:1776,gameBuild:'unverified',
  speed:33,force:24,shortSpeed:16.5,shortForce:12,verticalSpeed:1.1,pairedVerticalSpeed:-2.2,
  duOffsetY:-.5,cornerThresholdY:19,cornerVerticalSpeed:2,recycleAfter:6,
});
const EPS=1e-8;
const finite=n=>Number.isFinite(n);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function core(q){return {x:q.x+q.offsetX,y:q.y+q.offsetY-q.h/2,prevX:q.prevX+q.offsetX,prevY:q.prevY+q.offsetY-q.h/2,w:q.w,h:q.h};}
export function createWind(options={}){
  const {id,actorId,x=0,y=0}=options;
  if(id===undefined||!finite(x+y))throw new TypeError('Wind needs a stable id and finite origin');
  const facing=Math.sign(options.facing??1)||1,variant=options.variant??'single';
  const scaleX=options.scaleX??1,mass=options.mass??1;
  if(!['single','wide','short'].includes(variant)||!finite(scaleX+mass)||scaleX<=0||mass<=0)throw new RangeError('Wind variant, scale and mass must be valid');
  const candidate=options.core??{},w=candidate.w??WIND_GEOMETRY.width,h=candidate.h??WIND_GEOMETRY.height;
  const offsetX=candidate.offsetX??0,offsetY=candidate.offsetY??0;
  if(![w,h,offsetX,offsetY].every(finite)||w<=0||h<=0)throw new RangeError('Wind candidate core needs positive finite dimensions');
  const vertical=options.vertical??(options.high?'down':'up'),short=variant==='short';
  const du=variant==='single'&&vertical==='up',sourceSpawnY=options.sourceY??null;
  if(sourceSpawnY!==null&&!finite(sourceSpawnY))throw new TypeError('sourceY names the finite original Throw Point world Y');
  // The original Corner Shot check follows Set DU's -.5 world translation.
  // Relative arena Y is a separate coordinate system and never selects it.
  const sourceEntryY=sourceSpawnY===null?null:sourceSpawnY+(du?-.5:0);
  const corner=du&&sourceEntryY!==null&&sourceEntryY>=19;
  const sourceCase=variant==='single'?(du?'DU':'UD'):`${short?'NARROW':'WIDE'} ${facing>0?'L':'R'}`;
  const startY=y+(du&&options.offsetDU!==false?-.5:0);
  return {id:String(id),actorId,kind:'wind',x,y:startY,prevX:x,prevY:startY,
    vx:facing*(short?16.5:33)*scaleX,vy:variant==='single'?(du?(corner?2:1.1):-1.1):-2.2,
    ax:-facing*(short?12:24)*scaleX/mass,ay:0,facing,variant,vertical,scaleX,mass,
    sourceCase,sourceSpawnY,sourceEntryY,corner,
    age:0,time:0,lifetime:options.lifetime??6,active:true,visible:true,
    anim:'Projectile',animTime:0,w,h,offsetX,offsetY,geometryVerified:false,
    stepId:0,stepDt:0,pathStart:0,pathEnd:0,hitFlash:0,tinkCooldown:0,struckAttackIds:[]};
}
export function stepWind(q,dt){
  if(!finite(dt)||dt<=0||!q.active)return q;
  q.prevX=q.x;q.prevY=q.y;q.pathStart=q.age;q.stepDt=dt;q.stepId++;
  const elapsed=Math.min(dt,Math.max(0,q.lifetime-q.age));
  // Constant force, mass=1 and zero drag are the explicit prefab assumptions.
  q.x+=q.vx*elapsed+.5*q.ax*elapsed*elapsed;q.y+=q.vy*elapsed+.5*q.ay*elapsed*elapsed;
  q.vx+=q.ax*elapsed;q.vy+=q.ay*elapsed;
  q.age+=elapsed;q.time=q.age;q.animTime+=elapsed;q.pathEnd=q.age;
  q.hitFlash=Math.max(0,q.hitFlash-dt);q.tinkCooldown=Math.max(0,q.tinkCooldown-dt);
  if(q.age>=q.lifetime-EPS){q.active=false;q.visible=false;}
  return q;
}
export function windTarget(q){
  if(!q?.active)return null;
  return {id:q.id,actorId:q.actorId,kind:'wind',...core(q),damageable:false,givesSoul:false,pogoable:true,
    hitType:'parry',parryMode:'tink',pathId:q.stepId,pathStart:q.pathStart,pathEnd:q.pathEnd,stepDt:q.stepDt,
    geometryVerified:false};
}
export function windHazard(q){
  if(!q?.active)return null;
  return {type:'rect',id:q.id,actorId:q.actorId,kind:'wind',...core(q),damage:1,direction:Math.sign(q.vx)||q.facing,
    pathId:q.stepId,pathStart:q.pathStart,pathEnd:q.pathEnd,stepDt:q.stepDt,geometryVerified:false};
}
export function strikeWind(q,{kind,attackId,x,y}={}){
  if(!q?.active||!['side','up','down'].includes(kind))return [];
  const key=attackId===undefined?null:String(attackId);
  if(key!==null&&q.struckAttackIds.includes(key))return [];
  if(key!==null){q.struckAttackIds.push(key);if(q.struckAttackIds.length>64)q.struckAttackIds.shift();}
  if(q.tinkCooldown>EPS)return [];
  q.hitFlash=.09;q.tinkCooldown=.25;
  return [{type:'windTink',targetId:q.id,actorId:q.actorId,attackId,kind,mode:'tink',damage:0,
    x:finite(x)?x:q.x+q.offsetX,y:finite(y)?y:q.y+q.offsetY}];
}
function intervalHit(origin,delta,low,high,state){
  if(Math.abs(delta)<EPS)return origin>low+EPS&&origin<high-EPS;
  let enter=(low-origin)/delta,exit=(high-origin)/delta;
  if(enter>exit)[enter,exit]=[exit,enter];
  state.enter=Math.max(state.enter,enter);state.exit=Math.min(state.exit,exit);
  return state.enter<state.exit-EPS&&state.exit>0&&state.enter<1;
}
function bodyContact(h,p,previous){
  if(!p||![p.x,p.y,p.width,p.height].every(finite))return null;
  const prev=previous??p,pw=prev.width??p.width,ph=prev.height??p.height;
  const q0x=h.prevX??h.x,q0y=(h.prevY??h.y)+h.h/2,q1x=h.x,q1y=h.y+h.h/2;
  const p0x=prev.x??p.x,p0y=(prev.y??p.y)+ph/2,p1x=p.x,p1y=p.y+p.height/2;
  const state={enter:0,exit:1};
  if(!intervalHit(q0x-p0x,(q1x-q0x)-(p1x-p0x),-(h.w+Math.max(pw,p.width))/2,(h.w+Math.max(pw,p.width))/2,state))return null;
  if(!intervalHit(q0y-p0y,(q1y-q0y)-(p1y-p0y),-(h.h+Math.max(ph,p.height))/2,(h.h+Math.max(ph,p.height))/2,state))return null;
  const time=clamp(state.enter,0,1);
  return {...h,contactTime:time,contactX:q0x+(q1x-q0x)*time,contactY:q0y+(q1y-q0y)*time};
}
/** Relative swept AABB, rather than the union of two world-space paths. */
export function windContact(q,p,previousPlayer){
  const h=windHazard(q);return h?bodyContact(h,p,previousPlayer):null;
}
/** Same contract for a serialized hazard (used by the encounter bridge). */
export function windHazardContact(h,p,previousPlayer){
  if(!h||h.kind!=='wind'||![h.x,h.y,h.w,h.h].every(finite)||h.w<=0||h.h<=0)return null;
  return bodyContact(h,p,previousPlayer);
}
/** Exact continuous SAT for a fixed-size box and a convex polygon translating
 * during the same time interval. The previous polygon belongs to this swing.
 * Point is the core center at contact time, not an extracted surface-hit point.
 */
export function windPolygonContact(target,polygon,previousPolygon){
  if(!target||!Array.isArray(polygon)||polygon.length<3||!polygon.every(v=>Array.isArray(v)&&v.length>=2&&v.every(finite)))return null;
  const {x,y,w,h}=target;if(![x,y,w,h].every(finite)||w<=0||h<=0)return null;
  const x0=target.prevX??x,y0=(target.prevY??y)+h/2,x1=x,y1=y+h/2;
  let px=0,py=0;
  if(previousPolygon?.length===polygon.length){
    px=polygon[0][0]-previousPolygon[0][0];py=polygon[0][1]-previousPolygon[0][1];
    if(!polygon.every(([vx,vy],i)=>Math.abs(vx-previousPolygon[i][0]-px)<1e-5&&Math.abs(vy-previousPolygon[i][1]-py)<1e-5))return null;
  }
  const startX=x0+px,startY=y0+py,dx=x1-startX,dy=y1-startY;
  const axes=[[1,0],[0,1]];
  for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];const nx=a[1]-b[1],ny=b[0]-a[0];if(Math.abs(nx)+Math.abs(ny)>EPS)axes.push([nx,ny]);}
  const state={enter:0,exit:1};
  for(const [nx,ny] of axes){
    const projections=polygon.map(([vx,vy])=>vx*nx+vy*ny),radius=Math.abs(nx)*w/2+Math.abs(ny)*h/2;
    if(!intervalHit(startX*nx+startY*ny,dx*nx+dy*ny,Math.min(...projections)-radius,Math.max(...projections)+radius,state))return null;
  }
  const time=clamp(state.enter,0,1);
  return {time,x:x0+(x1-x0)*time,y:y0+(y1-y0)*time,pointType:'core-center-at-contact'};
}
export function windIntersectsPolygon(target,polygon,previousPolygon){return !!windPolygonContact(target,polygon,previousPolygon);}
