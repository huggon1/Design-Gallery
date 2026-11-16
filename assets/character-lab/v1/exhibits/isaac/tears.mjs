import {sampleTrack,drawFrame} from './character.mjs';
export const TEAR_CLIP='RegularTear6';
export async function loadTears(){
  const [data,image]=await Promise.all([
    fetch(new URL('./assets/tears.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Tear frames unavailable');return r.json();}),
    new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=new URL('./assets/bulletatlas.png',import.meta.url).href;})
  ]);return {data,image};
}
export function drawTear(ctx,assets,x,y,scale=1.7){
  const clip=assets.data.tear.animations[TEAR_CLIP];ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
  for(const frames of Object.values(clip.layers))drawFrame(ctx,assets.image,sampleTrack(frames,0));ctx.restore();
}
export function drawSplash(ctx,assets,x,y,age,scale=1.7){
  const clip=assets.data.splash.animations.Poof,tick=age*assets.data.splash.fps;if(tick>=clip.frames)return;
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
  for(const frames of Object.values(clip.layers))drawFrame(ctx,assets.image,sampleTrack(frames,tick));ctx.restore();
}
