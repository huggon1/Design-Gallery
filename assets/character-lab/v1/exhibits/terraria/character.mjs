export const COLORS={skin:'#ff7d5a',hair:'#d75a37',eye:'#695a4b',shirt:'#afa58c',undershirt:'#a0b4d7',pants:'#ffe6af',shoes:'#a0693c'};
export const CELL={width:40,height:56,footX:20,footY:54};
// Source frame indices. The composite arm grid is independent of the leg atlas.
export function armCell(frame){if(frame===0)return [2,0];if(frame<5)return [frame+2,0];if(frame===5)return [2,1];if([6,11,12,13,18,19].includes(frame))return [3,1];if(frame>=7&&frame<=10)return [4,1];if([14,17].includes(frame))return [5,1];return [6,1];}
export const WALK_FRAMES=Array.from({length:14},(_,i)=>i+6);
function load(name){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error(`Terraria layer failed: ${name}`));img.src=new URL(`./assets/${name}.png`,import.meta.url).href;});}
function tint(img,color){const out=document.createElement('canvas');out.width=img.width;out.height=img.height;const c=out.getContext('2d');c.drawImage(img,0,0);if(color){c.globalCompositeOperation='multiply';c.fillStyle=color;c.fillRect(0,0,out.width,out.height);c.globalCompositeOperation='destination-in';c.drawImage(img,0,0);}return out;}
export async function loadCharacter(){const palette=[COLORS.skin,null,COLORS.eye,COLORS.skin,COLORS.undershirt,COLORS.skin,COLORS.shirt,COLORS.skin,COLORS.undershirt,COLORS.skin,COLORS.skin,COLORS.pants,COLORS.shoes,COLORS.shirt];const original=await Promise.all(palette.map((_,i)=>load(`Player_0_${i}`)));const hair=await load('Player_Hair_1'),hook=await load('Projectile_13');return {layers:original.map((img,i)=>tint(img,palette[i])),hair:tint(hair,COLORS.hair),hook,cache:new Map()};}
function compose(actor,body,legs,hidden=[]){const key=`${body}:${legs}:${hidden.join(',')}`;if(actor.cache.has(key))return actor.cache.get(key);const out=document.createElement('canvas');out.width=40;out.height=56;const c=out.getContext('2d');c.imageSmoothingEnabled=false;const [col,row]=armCell(body);const bob=[7,8,9,14,15,16].includes(body)?-2:0;
 const grid=(id,x,y)=>{if(!hidden.includes(id))c.drawImage(actor.layers[id],x*40,y*56,40,56,0,bob,40,56);};
 const tall=(id,f)=>{if(!hidden.includes(id))c.drawImage(actor.layers[id],0,f*56,40,56,0,0,40,56);};
 grid(3,body===5?1:0,0);
 for(const id of [7,5,8,13])grid(id,col,row+2);
 for(const id of [10,11,12])tall(id,legs);
 grid(4,1,1);grid(6,1,1);grid(4,body===5?1:0,0);grid(6,body===5?1:0,0);
 for(const id of [0,1,2])tall(id,body);
 if(!hidden.includes('hair'))c.drawImage(actor.hair,0,Math.max(0,body-6)*56,40,56,0,0,40,56);
 const shoulderAfter=![1,2,5].includes(body);
 const shoulder=()=>{for(const id of [7,8,13,6])grid(id,0,1);};
 if(!shoulderAfter)shoulder();for(const id of [7,9,8,13,6])grid(id,col,row);if(shoulderAfter)shoulder();
 actor.cache.set(key,out);return out;
}
export function animationFor(p){return {clip:p.action,frame:p.bodyFrame,bodyFrame:p.bodyFrame,legFrame:p.legFrame,arm:armCell(p.bodyFrame),hairFrame:Math.max(0,p.bodyFrame-6),footAnchor:[20,54],frameCounter:p.frameCounter};}
export function drawCharacter(ctx,p,actor,{x=p.x,y=p.y,scale=1,face=p.face,hidden=[]}={}){const image=compose(actor,p.bodyFrame,p.legFrame,hidden);ctx.save();ctx.translate(Math.round(x),Math.round(y+(p.gfxOffY||0)));ctx.scale(face*scale,scale);ctx.imageSmoothingEnabled=false;ctx.drawImage(image,-20,-54);ctx.restore();}
export function drawPose(ctx,actor,{bodyFrame=0,legFrame=bodyFrame,x=0,y=0,scale=1,face=1,hidden=[]}={}){drawCharacter(ctx,{bodyFrame,legFrame,x,y,face,gfxOffY:0},actor,{scale,hidden});}
