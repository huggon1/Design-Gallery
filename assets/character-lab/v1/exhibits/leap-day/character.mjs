export async function loadCharacter(){
 const base=new URL('./assets/character/',import.meta.url);
 const response=await fetch(new URL('manifest.json',base));
 if(!response.ok)throw new Error(`Yolk manifest: ${response.status}`);
 const manifest=await response.json(),image=new Image();
 image.src=new URL(manifest.image,base).href;await image.decode();
 return {manifest,image};
}
export function animationFor(p,{manifest}){
 const clips=manifest.animations;
 let name=p.action==='wall'?'slide':p.action==='double'?'double':p.grounded?'run':p.vy<0?'jump':'fall';
 if(!clips[name])name=name==='fall'&&clips.jump?'jump':'stand';
 const clip=clips[name],frames=clip.frames;
 const age=name==='run'?p.runAge:name==='double'?p.spinAge:name==='jump'||name==='fall'?p.jumpAge:p.actionAge;
 const duration=frames.reduce((sum,f)=>sum+f.durationMs,0);
 let time=Math.max(0,age*1000);time=clip.loop?time%duration:Math.min(time,duration-.001);
 let index=0;while(index<frames.length-1&&time>=frames[index].durationMs)time-=frames[index++].durationMs;
 return {clip:name,frame:index,source:frames[index].name};
}
export function drawCharacter(ctx,p,character){
 const pose=animationFor(p,character),f=character.manifest.animations[pose.clip].frames[pose.frame],anchor=f.anchor||character.manifest.anchor;
 const face=p.wall&&!p.grounded?-p.wall:p.face;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(face*.5,.5);
 ctx.drawImage(character.image,f.x,f.y,f.w,f.h,-anchor[0],-anchor[1],f.w,f.h);ctx.restore();
}
