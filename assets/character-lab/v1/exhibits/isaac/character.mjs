// Source frames, delays, mirrors and pivots come from the archived player ANM2.
export async function loadCharacter(){
  const [data,image]=await Promise.all([
    fetch(new URL('./assets/animations.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Isaac animation data unavailable');return r.json();}),
    new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=new URL('./assets/character_001_isaac.png',import.meta.url).href;})
  ]);
  return {data,image};
}
export const DIRECTIONS=['Down','Right','Up','Left'];
const tintedFrames=new WeakMap();
function tintedCrop(image,f){
  const tint=[f.RedTint??255,f.GreenTint??255,f.BlueTint??255],offset=[f.RedOffset||0,f.GreenOffset||0,f.BlueOffset||0];
  if(tint.every(x=>x===255)&&offset.every(x=>x===0))return null;
  let cache=tintedFrames.get(image);if(!cache){cache=new Map();tintedFrames.set(image,cache);}
  const key=[f.XCrop,f.YCrop,f.Width,f.Height,...tint,...offset].join(',');if(cache.has(key))return cache.get(key);
  const canvas=document.createElement('canvas');canvas.width=f.Width;canvas.height=f.Height;const c=canvas.getContext('2d');
  c.drawImage(image,f.XCrop,f.YCrop,f.Width,f.Height,0,0,f.Width,f.Height);const pixels=c.getImageData(0,0,f.Width,f.Height);
  for(let i=0;i<pixels.data.length;i+=4)if(pixels.data[i+3])for(let k=0;k<3;k++)pixels.data[i+k]=Math.min(255,pixels.data[i+k]*tint[k]/255+offset[k]);
  c.putImageData(pixels,0,0);cache.set(key,canvas);return canvas;
}
export function sampleTrack(frames,tick){
  if(!frames?.length)return null;
  let t=Math.max(0,tick);
  for(let i=0;i<frames.length;i++){
    const f=frames[i];
    if(t<f.Delay||i===frames.length-1)return {...f,keyframe:i};
    t-=f.Delay;
  }
}
export function poseFor(data,{bodyDirection='Down',headDirection='Down',walkTick=0,moving=false,shootAge=10,hitAge=10}={}){
  const bodyClip='Walk'+bodyDirection,headClip='Head'+headDirection;
  // Head* is a pose bank in the game: frames 0/1 = open, 2/3 = squeezed.
  const headTick=shootAge<2/data.fps?2:0;
  const bodyTick=moving?walkTick%data.animations[bodyClip].FrameNum:0;
  const body=sampleTrack(data.animations[bodyClip].layers['1'],bodyTick);
  const head=sampleTrack(data.animations[headClip].layers['4'],headTick);
  const eyes={};
  for(const [eye,id] of [['left','1'],['right','2']])eyes[eye]=sampleTrack(data.animations[headClip].nulls[id],headTick);
  if(hitAge<8/data.fps){
    const a=data.animations.Hit;
    const hit=Object.entries(a.layers).map(([id,frames])=>({id,frame:sampleTrack(frames,hitAge*data.fps)})).filter(x=>x.frame?.Visible);
    if(hit.length)return {body,head,eyes,bodyClip,headClip,bodyTick,headTick,hit};
  }
  return {body,head,eyes,bodyClip,headClip,bodyTick,headTick,hit:null};
}
export function drawFrame(ctx,image,f){
  if(!f?.Visible)return;
  ctx.save();ctx.translate(f.XPosition,f.YPosition);ctx.rotate((f.Rotation||0)*Math.PI/180);ctx.scale(f.XScale/100,f.YScale/100);
  ctx.globalAlpha*=(f.AlphaTint??255)/255;
  const tinted=tintedCrop(image,f);
  if(tinted)ctx.drawImage(tinted,-f.XPivot,-f.YPivot);else ctx.drawImage(image,f.XCrop,f.YCrop,f.Width,f.Height,-f.XPivot,-f.YPivot,f.Width,f.Height);ctx.restore();
}
export function drawCharacter(ctx,actor,state,{x=state.x,y=state.y,scale=1.7,layers='both',anchors=false,shadow=true}={}){
  const pose=poseFor(actor.data,state);
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
  if(shadow){ctx.fillStyle='#1b101c66';ctx.beginPath();ctx.ellipse(0,0,10,4,0,0,Math.PI*2);ctx.fill();}
  if(pose.hit&&layers==='both'){
    for(const h of pose.hit)drawFrame(ctx,actor.image,h.frame);
  }else{
    if(layers!=='head')drawFrame(ctx,actor.image,pose.body);
    if(layers!=='body')drawFrame(ctx,actor.image,pose.head);
  }
  if(anchors){
    ctx.lineWidth=.45;ctx.strokeStyle='#f3c987';ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.moveTo(0,-5);ctx.lineTo(0,5);ctx.stroke();
    for(const [name,f]of Object.entries(pose.eyes)){ctx.fillStyle=name==='left'?'#80e5ee':'#ffd174';ctx.beginPath();ctx.arc(f.XPosition,f.YPosition,.9,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();return pose;
}
