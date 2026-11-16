export const CLIPS=Object.freeze({
 idle:{label:'站立',origin:[22,35],durations:Array(11).fill(.083),loop:true},
 idle_to_run:{label:'起步',origin:[27,32],durations:[.03,.03,.03,.03]},
 run:{label:'跑动',origin:[27,32],durations:Array(10).fill(.038),loop:true},
 run_to_idle:{label:'刹停',origin:[30,36],durations:Array(5).fill(.04)},
 jump:{label:'上升',origin:[17,42],durations:Array(4).fill(.065),loop:true},
 fall:{label:'下落',origin:[23,48],durations:Array(4).fill(.065),loop:true},
 wallgrab:{label:'接墙',origin:[28,38],durations:[.07],wall:true},
 wallslide:{label:'滑墙',origin:[28,42],durations:[.10],wall:true},
 wallgrab2:{label:'接墙·第二姿态',origin:[17,46],durations:[.1],wall:true},
 wallslide2:{label:'滑墙·第二姿态',origin:[17,45],durations:[.1],wall:true},
 player_flip:{label:'墙跳翻身',origin:[25,41],durations:[.032,.032,.032,.032,.032,.032,.032,.032,.032,.032,.032]},
 roll:{label:'翻滚',origin:[25,33],durations:[.045,.045,.045,.045,.045,.055,.06]},
 attack:{label:'刀击',origin:[31,42],durations:[.025,.045,.045,.045,.055,.06,.065]},
 precrouch:{label:'压低重心',origin:[22,40],durations:[.04,.04]},
 crouch:{label:'低姿态',origin:[22,40],durations:[.1],loop:true},
 postcrouch:{label:'落地起身',origin:[22,40],durations:[.0425,.0425]},
 slash:{label:'独立刀光',origin:[22,16],durations:[.03,.03,.03,.03,.04]},
 slashfx:{label:'击中白光',origin:[25,25],durations:Array(5).fill(.025)},
 bulletreflect:{label:'弹反火花',origin:[35,32],durations:Array(5).fill(.035)},
 jumpcloud:{label:'起跳尘',origin:[16,51],durations:Array(4).fill(.045)},
 landcloud:{label:'落地尘',origin:[25,14],durations:Array(7).fill(.035)}
});
export const clipDuration=clip=>CLIPS[clip]?.durations.reduce((a,b)=>a+b,0)||1;
export function frameFor(clip,time=0){
 const c=CLIPS[clip]||CLIPS.idle,total=clipDuration(clip);let t=c.loop?((time%total)+total)%total:Math.min(Math.max(0,time),total-.000001),index=0;
 for(;index<c.durations.length-1&&t>=c.durations[index];index++)t-=c.durations[index];
 return {clip:CLIPS[clip]?clip:'idle',index,total,progress:t/c.durations[index],origin:c.origin};
}
export async function loadCharacter(){
 const base=new URL('.',import.meta.url),manifest=await fetch(new URL('assets/manifest.json',base)).then(r=>{if(!r.ok)throw Error('Zero manifest '+r.status);return r.json();});
 const atlas=new Image();atlas.src=new URL(manifest.atlas,base).href;await atlas.decode();
 return {atlas,manifest,base};
}
export function drawFrame(ctx,art,clip,time,x,y,{face=1,alpha=1,scale=1,origin=null,rotation=0,filter='none'}={}){
 const chosen=frameFor(clip,time),f=art.manifest.clips[chosen.clip]?.[chosen.index];if(!f)return chosen;
 const [sx,sy,w,h]=f.rect,[ox,oy]=origin||chosen.origin;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(face*scale,scale);ctx.rotate(rotation);ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=false;ctx.filter=filter;ctx.drawImage(art.atlas,sx,sy,w,h,-ox,-oy,w,h);ctx.restore();return chosen;
}
export function drawActor(ctx,art,p,{alpha=1,ghost=false,x=p.x,y=p.y}={}){
 const clip=p.clip||'idle',wall=CLIPS[clip]?.wall;let face=wall?(p.wall||p.face):p.face;
 return drawFrame(ctx,art,clip,p.clipTime??0,x,y,{face,alpha,filter:ghost?(ghost==='warm'?'brightness(0) saturate(100%) invert(42%) sepia(90%) saturate(1046%) hue-rotate(333deg)':'brightness(0) saturate(100%) invert(72%) sepia(57%) saturate(1263%) hue-rotate(116deg)'):'none'});
}
export function drawSlash(ctx,art,p,{lighting=true}={}){
 if(!p.attack||p.attack.age<.025||p.attack.age>.205)return;
 const a=p.attack,angle=a.angle;
 // The independent cyan arc shares the attack vector while the body keeps its
 // contact plane. Reflecting the source vertically alternates slash handedness.
 ctx.save();ctx.translate(p.x,p.y-20);ctx.rotate(angle);ctx.scale(1,a.serial%2?-1:1);
 const fade=a.age<.15?1:1-(a.age-.15)/.055;
 drawFrame(ctx,art,'slash',a.age-.025,0,0,{alpha:fade});
 // A fitted additive highlight is separate from the two-colour source PNG.
 if(lighting&&a.age<.145){ctx.globalCompositeOperation='lighter';drawFrame(ctx,art,'slash',a.age-.025,0,0,{alpha:Math.max(0,.30*(1-(a.age-.025)/.12))*fade});}
 ctx.restore();
}
export function describeAnimation(art,p){const f=frameFor(p.clip,p.clipTime),source=art.manifest.clips[f.clip][f.index];return {clip:f.clip,frame:f.index,frameCount:CLIPS[f.clip].durations.length,source:source.file.split('/').pop(),origin:[...f.origin],clipTime:p.clipTime,frameDuration:CLIPS[f.clip].durations[f.index]};}
