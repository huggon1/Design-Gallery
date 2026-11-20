import {createState,stepState,cancelInput,YARD,TUNING} from './controller.mjs';
export const sections=[{id:'yard',label:'训练院'}];
export const options=[{id:'close',label:'近看角色',default:false}];
const UNIT=32;
const source=name=>new URL('./assets/'+name,import.meta.url);
async function loadImage(name){
  const image=new Image();image.src=source(name);
  await image.decode();return image;
}
async function loadData(name){
  const r=await fetch(source(name));if(!r.ok)throw new Error('角色数据加载失败 '+r.status);
  return r.json();
}
function drawActor(ctx,actor,atlas,data,x,y){
  const c=data.clips[actor.clip][actor.face];
  const frameNumber=Math.floor((actor.age+1e-7)*c.fps);
  const index=c.frames[c.loop?frameNumber%c.frames.length:Math.min(c.frames.length-1,frameNumber)];
  const tile=data.tile;
  ctx.drawImage(atlas,index%data.columns*tile,Math.floor(index/data.columns)*tile,tile,tile,
    x-data.anchor[0],y-data.anchor[1],tile,tile);
}
function groundTexture(concrete,fence){
  const floor=document.createElement('canvas');floor.width=YARD.width*UNIT;floor.height=YARD.height*UNIT;
  const c=floor.getContext('2d');c.imageSmoothingEnabled=false;
  c.fillStyle='#848072';c.fillRect(0,0,floor.width,floor.height);
  c.fillStyle=c.createPattern(concrete,'repeat');c.fillRect(0,0,floor.width,floor.height);
  c.fillStyle='#6e6a5e55';c.fillRect(0,0,floor.width,floor.height);
  c.strokeStyle='#dedab94d';c.lineWidth=2;c.strokeRect(111,97,700,384);
  c.strokeStyle='#ddd8b65e';c.beginPath();c.arc(462,288,75,0,Math.PI*2);c.stroke();
  c.fillStyle='#434541';c.fillRect(0,5,8,floor.height);c.fillRect(floor.width-8,5,8,floor.height);
  for(let x=0;x<floor.width;x+=32){
    c.drawImage(fence,x,0);
    c.fillStyle='#272d3338';c.fillRect(x,31,32,4);
    c.drawImage(fence,x,floor.height-22);
  }
  for(let y=32;y<floor.height;y+=63){
    c.fillStyle='#a0a198';c.fillRect(2,y,3,8);c.fillRect(floor.width-6,y,3,8);
  }
  return floor;
}
export async function createScene({onStatus=()=>{}}={}){
  const [atlas,guard,motions,partnerMotions,concrete,fence]=await Promise.all([loadImage('prisoner.png'),loadImage('partner.png'),loadData('motion.json'),loadData('partner.json'),loadImage('concrete.png'),loadImage('fence.png')]);
  const floor=groundTexture(concrete,fence);
  let state=createState(),close=false,lastAction='';
  function reset(){state=createState();lastAction='';}
  function step(dt,input={}){
    stepState(state,dt,input,motions.clips);
    if(lastAction!==state.player.clip){lastAction=state.player.clip;onStatus(lastAction);}
  }
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function draw(ctx,{width,height,interpolationAlpha=1,debug=false}){
    if(!width||!height)return;
    const p=state.player,n=state.partner;
    const mix=(a,b)=>a+(b-a)*interpolationAlpha;
    const coords=a=>[Math.round(mix(a.prevX,a.x)*UNIT),Math.round(mix(a.prevY,a.y)*UNIT)];
    const [px,py]=coords(p),[nx,ny]=coords(n);
    const displayHeight=close?225:484,scale=Math.max(width/(floor.width+12),height/displayHeight);
    const halfW=width/scale/2,halfH=height/scale/2;
    const cameraX=clamp(px+14,Math.min(halfW,floor.width/2),Math.max(floor.width-halfW,floor.width/2));
    const cameraY=clamp(py-14,Math.min(halfH,floor.height/2),Math.max(floor.height-halfH,floor.height/2));
    ctx.fillStyle='#353a36';ctx.fillRect(0,0,width,height);ctx.save();
    ctx.translate(Math.round(width/2-cameraX*scale),Math.round(height/2-cameraY*scale));ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
    ctx.drawImage(floor,0,0);
    function shadow(x,y){
      ctx.fillStyle='#2926204d';ctx.beginPath();ctx.ellipse(x,y-1,11.5,4,0,0,Math.PI*2);ctx.fill();
    }
    shadow(px,py);shadow(nx,ny);
    if(state.locked){
      ctx.strokeStyle='#d6bb6b';ctx.lineWidth=1.4;ctx.setLineDash([5,3]);
      ctx.beginPath();ctx.ellipse(nx,ny,15,6,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    }
    const drawPlayer=()=>drawActor(ctx,p,atlas,motions,px,py);
    const drawPartner=()=>drawActor(ctx,n,guard,partnerMotions,nx,ny);
    if(py<=ny){drawPlayer();drawPartner();}else{drawPartner();drawPlayer();}
    if(state.charging&&!state.dashing&&state.chargeTime>.2){
      const w=26;ctx.fillStyle='#252b2a';ctx.fillRect(px-w/2-1,py-44,w+2,4);
      ctx.fillStyle=state.chargeTime>=1?'#ffda6d':'#d0b56d';ctx.fillRect(px-w/2,py-43,Math.round(w*state.chargeTime),2);
    }
    if(state.feedback){
      const f=state.feedback,age=f.age/.18;
      ctx.save();ctx.globalAlpha=1-age;ctx.strokeStyle=f.kind==='guard'?'#a3d9df':'#ffd886';ctx.lineWidth=2;
      const x=f.x*UNIT,y=f.y*UNIT-15;
      for(let i=0;i<6;i++){const angle=i*Math.PI/3+.3;ctx.beginPath();ctx.moveTo(x+Math.cos(angle)*(5+age*6),y+Math.sin(angle)*(5+age*6));ctx.lineTo(x+Math.cos(angle)*(8+age*9),y+Math.sin(angle)*(8+age*9));ctx.stroke();}
      ctx.restore();
    }
    if(debug){
      ctx.strokeStyle='#f6e8b699';ctx.lineWidth=1;ctx.beginPath();ctx.arc(px,py,TUNING.nearHit*UNIT,0,Math.PI*2);ctx.stroke();
      const angle=Math.round(Math.atan2(p.forwardY,p.forwardX)/(Math.PI/4))*Math.PI/4;
      ctx.beginPath();ctx.moveTo(px,py);ctx.arc(px,py,(TUNING.reach+TUNING.triggerRadius)*UNIT,angle-Math.PI/4,angle+Math.PI/4);ctx.closePath();ctx.stroke();
      ctx.font='9px monospace';ctx.fillStyle='#202420';ctx.fillText(p.clip+' / '+p.face,px-30,py+18);
    }
    ctx.restore();
  }
  function getState(){
    const p=state.player,n=state.partner;
    return {area:'yard',x:p.x,y:p.y,face:p.face,facing8:p.facing8,action:p.clip,actionTime:p.age,attackPhase:p.clip.startsWith('attack')?(p.impact?'recovery':'strike'):null,
      chargeTime:state.chargeTime,charging:state.charging,dashing:state.dashing,blocking:state.blocking,locked:state.locked,heavy:state.heavy,
      hits:state.hits,blocks:state.blocks,received:state.received,partner:{x:n.x,y:n.y,action:n.clip,face:n.face},close};
  }
  return {sections,options,fixedStep:1/120,draw,step,reset,getState,setOption(id,value){if(id==='close')close=Boolean(value);},
    clearInput(){cancelInput(state);},resetInterpolation(){for(const a of [state.player,state.partner]){a.prevX=a.x;a.prevY=a.y;}},dispose(){}};
}
