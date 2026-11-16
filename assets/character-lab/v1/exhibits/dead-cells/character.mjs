import {ATTACKS,TUNING} from './physics.mjs';
// Frame order and original canvas offsets come from the archived atlas.
// Durations are this study's configuration; the atlas does not contain timing.
export const ART_SCALE=1.25;
export const TIMING={runFps:30,idleFps:18,start:.1,stop:.16,double:.34,rollStart:4/60,rollRecover:.16};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function poseFor(p){
 const age=p.actionAge||0;
 if(p.roll>0){if(p.rollAge<TIMING.rollStart)return {clip:'rollStart',phase:p.rollAge/TIMING.rollStart};return {clip:'rolling',phase:(p.rollAge-TIMING.rollStart)/(TUNING.rollDuration-TIMING.rollStart)};}
 if(p.attack>0)return {clip:ATTACKS[p.combo].clip,phase:p.attackAge/ATTACKS[p.combo].duration};
 if(p.climb>0)return {clip:'endClimb',phase:1-p.climb/.22};
 if(!p.grounded){
  if(p.slam)return {clip:'jumpDown',phase:1};
  if(p.vy<-95)return {clip:'jumpUp',phase:p.jumpAge/.17};
  if(p.vy<100)return {clip:'jumpTransition',phase:(p.vy+95)/195};
  return {clip:'jumpDown',phase:age/.15};
 }
 if(p.land>0)return {clip:'land',phase:1-p.land/.1};
 if(p.crouched)return {clip:'crouchIdle',seconds:p.time,fps:12,loop:true};
 if(p.rollRecovery>0){const t=TIMING.rollRecover-p.rollRecovery;return t<.08?{clip:'rollEnd',phase:t/.08}:{clip:Math.abs(p.vx)>10?'rollRun':'rollIdle',phase:(t-.08)/.08};}
 if(p.action==='run'){
  if(p.runTime<TIMING.start)return {clip:'idleRun',phase:p.runTime/TIMING.start};
  return {clip:'run',seconds:p.runTime-TIMING.start,fps:TIMING.runFps,loop:true};
 }
 if(p.stopFromRun&&age<TIMING.stop)return {clip:'runIdle',phase:age/TIMING.stop};
 return {clip:'idle',seconds:age,fps:TIMING.idleFps,loop:true};
}
export function frameFor(manifest,pose){
 const anim=manifest.animations[pose.clip];
 if(!anim)throw new Error(`Missing character animation: ${pose.clip}`);
 const index=pose.loop?Math.floor(pose.seconds*pose.fps)%anim.count:clamp(Math.floor((pose.phase||0)*anim.count),0,anim.count-1);
 return {...pose,index,frame:anim.frames[index]};
}
const loadImage=async url=>{const im=new Image();im.src=url;await im.decode();return im;};
function tint(image,color){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,c.width,c.height);return c;}
export async function loadCharacter(){
 const base=new URL('./assets/character/',import.meta.url),manifest=await fetch(new URL('manifest.json',base)).then(r=>{if(!r.ok)throw Error('角色图集加载失败');return r.json();});
 const images=Object.fromEntries(await Promise.all(Object.entries(manifest.images).map(async([k,v])=>[k,await loadImage(new URL(v,base).href)])));
 images.headMassTint=tint(images.headMass,'#44303b');images.glowTint=tint(images.glow,'#c8e6e9');images.fxTint=tint(images.fx,'#e5faff');
 const sounds={};await Promise.all(Object.entries(manifest.sounds||{}).map(async([k,v])=>{try{sounds[k]=await fetch(new URL(v,base)).then(r=>r.arrayBuffer());}catch{}}));
 return {manifest,images,sounds};
}
function drawFrame(c,image,f){c.drawImage(image,f.x,f.y,f.w,f.h,f.ox-f.ow/2,f.oy-f.oh/2-1,f.w,f.h);}
function rootOffset(p,pose){
 // endClimb is authored around the gripping hand. The controller tracks feet.
 if(pose.clip==='endClimb'){const f=pose.frame;return f.oh/2+1-f.oy-f.h;}
 if(!p.grounded||!['rolling','rollStart','rollEnd'].includes(pose.clip))return 0;
 const f=pose.frame,offset=pose.clip==='rolling'?7:1;
 // The mod's roll pivot settles the body; the floor constrains extended feet.
 return Math.min(offset,f.oh/2+1-f.oy-f.h);
}
export function headPosition(p,character){const pose=frameFor(character.manifest,poseFor(p)),f=pose.frame;return {x:p.x+(f.head[0]-f.ow/2)*p.face*ART_SCALE,y:p.y+(f.head[1]-f.oh/2-1+rootOffset(p,pose))*ART_SCALE};}
export function drawActor(ctx,p,character,x,y,alpha=1,ghost=false){
 const pose=frameFor(character.manifest,poseFor(p)),f=pose.frame,im=character.images;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(p.face*ART_SCALE,ART_SCALE);ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.translate(0,rootOffset(p,pose));
 // Keep the source canvas origin for every frame, including larger sword canvases.
 drawFrame(ctx,im.body,f);drawFrame(ctx,im.glowTint,f);
 const hx=f.head[0]-f.ow/2,hy=f.head[1]-f.oh/2-1;
 ctx.drawImage(im.headMassTint,Math.round(hx-10),Math.round(hy-16),17,18);
 ctx.drawImage(im.head,Math.round(hx-6),Math.round(hy-12));
 if(!ghost&&p.attack>0){
  const names=['fxAtkBackstabberA','fxAtkBackstabberB','fxSaberA'],fx=character.manifest.effects[names[p.combo]],start=ATTACKS[p.combo].hit-.035,t=p.attackAge-start;
  if(t>=0&&t<.105){const ef=fx.frames[Math.min(fx.count-1,Math.floor(t/.105*fx.count))];drawFrame(ctx,im.fxTint,ef);}
 }
 ctx.restore();return {clip:pose.clip,frame:pose.index,source:f.name};
}
