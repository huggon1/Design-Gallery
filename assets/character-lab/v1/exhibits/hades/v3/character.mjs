import {loadRigAsset,loadMotionBank,drawRigAsset,rigAssetInfo,disposeRigAsset} from './rig-renderer.mjs';

const tileWidth=160,tileHeight=164;
const surface=document.createElement('canvas');
surface.width=375;surface.height=225;
const ink=surface.getContext('2d');
let sheet,metadata,route='重建骨架';
const clamp=n=>Math.max(0,Math.min(1,n));

export async function loadCharacterAsset(){
 sheet=new Image();
 sheet.src=new URL('./assets/body-samples.png',import.meta.url).href;
 [metadata]=await Promise.all([
  fetch(new URL('./assets/body-samples.json',import.meta.url)).then(r=>r.json()),
  sheet.decode(),loadRigAsset().then(loadMotionBank)
 ]);
}
export function characterAssetInfo(){return {...rigAssetInfo(),route}}
export const disposeCharacter=disposeRigAsset;
export function getCharacterCanvas(){return surface}
const shortest=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function sourceView(clip,time,angle){
 const abs=Math.abs(shortest(angle,0))*180/Math.PI;
 if(clip==='run'){
  // A moving 3/4 -> profile observation; the opposite side mirrors the footage.
  const weight=Math.min(clamp((abs-31)/12),clamp((110-abs)/14));
  if(!weight)return;
  const phase=(time/(32/60))%1,frame=1404+phase*48;
  const row=nearest(metadata.clips.swordRun,frame);
  return {row,flip:Math.sin(angle)<0,scale:1.16,weight,source:'持剑跑 · 训练片取样'};
 }
 if(clip==='dash-strike'){
  const weight=clamp((27-Math.abs(abs-135))/10)*clamp((.665-time)/.075)*clamp((time-.105)/.085);
  if(!weight)return;
  const timeline=[[0,303],[.16,303],[.32,305],[.375,306],[.404,307],[.49,309],[.575,313],[.64,315]];
  let f=timeline[0][1];
  for(const [at,frame] of timeline){if(time>=at)f=frame;}
  return {row:nearest(metadata.clips.dashStrike,f),flip:Math.sin(angle)>0,scale:1.48,weight,source:'冲刺前刺 · 训练片取样'};
 }
}
function nearest(rows,frame){return rows.reduce((a,b)=>Math.abs(frame-a.sourceFrame)<=Math.abs(frame-b.sourceFrame)?a:b)}
export function drawCharacter(ctx,{x,y,angle=0,clip='idle',time=0,transition=null,debug=false,studySamples=false}){
 const candidate=studySamples&&sourceView(clip,time,angle);
 const sample=candidate?.weight>=.99?candidate:null;
 ink.setTransform(1,0,0,1,0,0);ink.clearRect(0,0,375,225);ink.translate(187.5,170);
 const anchors=drawRigAsset(ink,{clip,time,angle,transition,alpha:sample?0:1});
 route='训练片多向骨架重建';
 if(sample){
  const {row,flip,scale,weight}=sample;ink.save();ink.globalAlpha=1;
  ink.scale(flip?-scale:scale,scale);
  ink.drawImage(sheet,row.tile%5*tileWidth,Math.floor(row.tile/5)*tileHeight,tileWidth,tileHeight,
    -row.anchor[0],-row.anchor[1],tileWidth,tileHeight);
  ink.restore();route=sample.source+(flip?' · 镜像':'');
 }
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#060a0c69';ctx.beginPath();ctx.ellipse(0,2,22,7,-.12,0,2*Math.PI);ctx.fill();
 ctx.drawImage(surface,-187.5,-170);
 const project=p=>[-p[0]*Math.cos(angle)+p[1]*Math.sin(angle),(p[0]*Math.sin(angle)+p[1]*Math.cos(angle))*.56-p[2]*.87];
 let grip=project(anchors.grip),tip=project(anchors.tip);
 if(sample?.weight>.5&&clip==='dash-strike'&&time<.40){
  const mirror=sample.flip?-1:1;
  grip=[(75-110)*1.48*mirror,(80-141)*1.48];
  tip=[(46-110)*1.48*mirror,(57-141)*1.48];
 }
 if(debug){
  const dots=[...Object.values(anchors).filter(Array.isArray).map(project),grip,tip];ctx.fillStyle='#86edc8';
  for(const p of dots){ctx.beginPath();ctx.arc(...p,1.6,0,Math.PI*2);ctx.fill();}
 }
 ctx.restore();return {...anchors,bladeScreen:{grip,tip}};
}
