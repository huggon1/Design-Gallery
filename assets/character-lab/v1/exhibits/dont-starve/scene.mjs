import {createController,EQUIPMENT,NAMES,TARGETS} from './controller.mjs';

export const sections=[{id:'clearing',label:'林间空地',name:'林间空地'}];
export const options=[];
const asset=name=>new URL('./assets/'+name,import.meta.url);
async function loadImage(url){
  const image=new Image();image.src=url;
  await image.decode();return image;
}
export function paintPose(ctx,data,atlas,rows,tool=0){
  for(const [slot,a,b,c,d,tx,ty] of rows){
    const id=data.slots[slot][tool];
    if(id<0)continue;
    const [x,y,w,h,dx,dy,dw,dh]=data.rects[id];
    ctx.save();ctx.transform(a,b,c,d,tx,ty);ctx.drawImage(atlas,x,y,w,h,dx,dy,dw,dh);ctx.restore();
  }
}
function groundTexture(){
  const img=document.createElement('canvas');img.width=480;img.height=360;
  const p=img.getContext('2d');
  let seed=2913;
  function random(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}
  p.fillStyle='#aca482';p.fillRect(0,0,img.width,img.height);
  for(let i=0;i<9000;i++){
    p.fillStyle=random()<.5?'#4a45300b':'#f3e9be0f';
    p.fillRect(random()*480,random()*360,random()*2+1,1);
  }
  for(let i=0;i<82;i++){
    const x=random()*480,y=random()*360,lean=random()>.5?1:-1;
    p.strokeStyle='rgba(76,73,47,'+(.10+.12*random())+')';p.lineWidth=.8;
    p.beginPath();p.moveTo(x-4*lean,y);p.quadraticCurveTo(x-2*lean,y+.2,x,y+2);
    p.lineTo(x-2*lean,y-2);p.moveTo(x+lean,y+1);p.lineTo(x+4*lean,y-2);p.stroke();
  }
  return img;
}
const STATUS={idle_loop:'待机',run_pre:'起步',run_loop:'移动',run_pst:'收步',punch:'空手攻击',atk:'持械攻击',
  pickup:'拾取',pickup_pst:'拾取',chop_pre:'举斧',chop_loop:'砍伐',pickaxe_pre:'举镐',pickaxe_loop:'采矿',pickaxe_pst:'收镐',
  shovel_pre:'举铲',shovel_loop:'挖掘',shovel_pst:'收铲',eat:'进食'};
export async function createScene({onStatus=()=>{}}={}){
  const [data,atlas]=await Promise.all([
    fetch(asset('motion.json')).then(r=>{if(!r.ok)throw Error('威尔逊动作载入失败');return r.json();}),loadImage(asset('symbols.webp'))]);
  const controller=createController(data),floor=groundTexture();
  let camera={x:0,y:0},oldCamera={...camera},status='',muted=true,audio=null,lastTick=-1;
  const viewUnit=42,depth=.68;
  const props={tree:.33,rock:.19,sapling:.19,flint:.135};
  function impactSound(kind){
    if(muted||!audio||audio.state!=='running')return;
    const now=audio.currentTime,osc=audio.createOscillator(),amp=audio.createGain();
    const pitch=({chop:195,mine:1110,dig:145,pickup:640})[kind]||235;
    osc.type=kind==='mine'?'sine':'triangle';osc.frequency.setValueAtTime(pitch,now);
    osc.frequency.exponentialRampToValueAtTime(pitch*.48,now+.065);amp.gain.setValueAtTime(.045,now);amp.gain.exponentialRampToValueAtTime(.0001,now+.09);
    osc.connect(amp);amp.connect(audio.destination);osc.start(now);osc.stop(now+.095);
  }
  function step(dt,input){
    oldCamera={...camera};controller.step(dt,input);
    const s=controller.state;
    camera.x+=(s.x-camera.x)*(1-Math.exp(-6*dt));camera.y+=(s.y-camera.y)*(1-Math.exp(-6*dt));
    const latest=s.events.at(-1);
    if(latest&&latest.at!==lastTick){lastTick=latest.at;impactSound(latest.kind);}
    const next=NAMES[s.equipment]+' · '+STATUS[s.action];if(next!==status){status=next;onStatus(next);}
  }
  function reset(){controller.reset();camera={x:0,y:0};oldCamera={...camera};status='';lastTick=-1;}
  function draw(ctx,{width,height,interpolationAlpha=1,debug=false}){
    const scale=Math.max(.64,Math.min(1.6,height/510)),w=width/scale,h=height/scale;
    const s=controller.state,t=Math.min(1,Math.max(0,interpolationAlpha));
    const px=s.prevX+(s.x-s.prevX)*t,py=s.prevY+(s.y-s.prevY)*t;
    const cx=oldCamera.x+(camera.x-oldCamera.x)*t,cy=oldCamera.y+(camera.y-oldCamera.y)*t;
    const sx=x=>(x-cx)*viewUnit+w*.50,sy=y=>(y-cy)*viewUnit*depth+h*.56;
    ctx.save();ctx.scale(scale,scale);
    ctx.save();ctx.translate(sx(0),sy(0));ctx.fillStyle=ctx.createPattern(floor,'repeat');ctx.fillRect(-sx(0),-sy(0),w,h);ctx.restore();
    const edge=ctx.createRadialGradient(w*.5,h*.47,h*.15,w*.5,h*.47,Math.max(w*.7,h*.8));
    edge.addColorStop(0,'#433c3100');edge.addColorStop(1,'#51452b36');ctx.fillStyle=edge;ctx.fillRect(0,0,w,h);
    const corners=[[-13.35,-8.85],[13.35,-8.85],[13.35,8.85],[-13.35,8.85]];
    ctx.save();ctx.strokeStyle='#50492f52';ctx.lineWidth=1;ctx.setLineDash([7,8]);ctx.beginPath();corners.forEach(([x,y],i)=>i?ctx.lineTo(sx(x),sy(y)):ctx.moveTo(sx(x),sy(y)));ctx.closePath();ctx.stroke();ctx.restore();
    const latest=s.events.at(-1),since=latest?s.time-latest.at:Infinity;
    function prop(o){
      if(o.id==='flint'&&(s.recovery.flint||0)>s.time)return;
      const size=o.scale||props[o.prop],react=latest?.target===o.id&&since<.24;
      ctx.save();ctx.translate(sx(o.x),sy(o.y));ctx.fillStyle='#332e2530';ctx.beginPath();
      const shadowWidth={tree:18,rock:30,sapling:10,flint:5}[o.prop]||12;
      ctx.ellipse(0,0,shadowWidth,shadowWidth*.25,0,0,Math.PI*2);ctx.fill();
      if(react){const decay=1-since/.24;ctx.rotate(Math.sin(since*45)*.065*decay);ctx.translate(0,-2*Math.sin(since*45)*decay);}
      // Fade the canopy when it falls between the camera and Wilson at a rear work stand.
      if(o.prop==='tree'&&py<o.y&&Math.abs(px-o.x)<.85&&o.y-py<2.5)ctx.globalAlpha=.43;
      ctx.scale(size,size);paintPose(ctx,data,atlas,data.props[o.prop]);ctx.restore();
      if(react&&o.id!=='flint'){
        const factor=since/.24;ctx.fillStyle=o.id==='rock'?'#e3d6a4':'#66503b';
        for(let i=0;i<4;i++){const ax=(i-1.6)*16,ay=-12-4*(i%2);ctx.fillRect(sx(o.x)+ax*factor,sy(o.y)-12+ay*Math.sin(factor*Math.PI),2.5,2);}
      }
    }
    const visible=Object.entries(TARGETS).map(([id,o])=>({...o,id}));
    const draws=visible.map(o=>({y:o.y,draw:()=>prop(o)}));
    draws.push({y:py,draw(){
      ctx.save();ctx.translate(sx(px),sy(py));ctx.fillStyle='#312b263d';ctx.beginPath();ctx.ellipse(0,1,14,4.3,0,0,Math.PI*2);ctx.fill();
      const actorScale=.245;ctx.scale(s.mirror?-actorScale:actorScale,actorScale);
      paintPose(ctx,data,atlas,controller.rows,s.action==='eat'?0:EQUIPMENT.indexOf(s.equipment));ctx.restore();
    }});
    draws.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
    ctx.save();ctx.fillStyle='#eee6d5e8';ctx.strokeStyle='#655d49';ctx.lineWidth=1;
    const label='K  '+NAMES[s.equipment];ctx.font='14px system-ui';const badge=ctx.measureText(label).width+24;
    ctx.beginPath();ctx.roundRect(14,14,badge,29,4);ctx.fill();ctx.stroke();ctx.fillStyle='#322e24';ctx.fillText(label,26,34);
    if(debug){ctx.font='12px monospace';ctx.fillText(s.action+' / '+s.direction+' / '+controller.frame(),18,65);}
    ctx.restore();ctx.restore();
  }
  return {sections,options,fixedStep:1/120,step,draw,reset,clearInput:()=>controller.clear(),resetInterpolation:()=>{controller.resetInterpolation();oldCamera={...camera};},
    getState(){const s=controller.state;return {...s,section:'clearing',events:s.events.map(e=>({...e})),frame:controller.frame(),camera:{...camera},audio:{muted,state:audio?.state||'locked'}};},
    setMuted(value){muted=Boolean(value);},async unlockAudio(){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!audio&&AC)audio=new AC();if(audio?.state==='suspended')await audio.resume();},
    dispose(){if(audio)audio.close().catch(()=>{});}
  };
}
