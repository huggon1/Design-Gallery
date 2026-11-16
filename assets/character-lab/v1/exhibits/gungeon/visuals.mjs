import {animationFor,handAnchor,TUNING,clamp,COLUMNS,ROOM} from './motion.mjs';
export async function loadAssets(){
 const manifest=await fetch(new URL('./assets/manifest.json',import.meta.url)).then(r=>r.json());const images={};
 await Promise.all(Object.entries(manifest).map(async([name,m])=>{const im=new Image();im.src=new URL(`./assets/${m.file}`,import.meta.url).href;await im.decode();images[name]=im;}));return{images,manifest};
}
export function gunPose(p,time){
 const age=time-p.lastShot,recoil=age<.15?2.8*Math.exp(-age*35):0,anchor=handAnchor(p);
 const reload=p.reloadRemaining>0,progress=reload?1-p.reloadRemaining/TUNING.reloadDuration:0;
 const sprite=reload?`SPMA_reload_00${progress<.5?1:2}`:age<.12?`SPMA_fire_00${Math.min(3,Math.floor(age/.04)+1)}`:'SPMA_idle_001';
 return{x:anchor.x-Math.cos(p.angle)*recoil,y:anchor.y-Math.sin(p.angle)*recoil,angle:p.angle+(reload?-.6*Math.sin(progress*Math.PI):0),flip:Math.cos(p.angle)<0?-1:1,sprite,age,progress,reload};
}
function gun(ctx,p,time,assets,debug){
 const pose=gunPose(p,time),{images,manifest}=assets,im=images[pose.sprite];if(!im)return;
 const points=manifest[pose.sprite].native.attachPoints,primary=points.find(p=>p.name==='PrimaryHand')?.position||{x:.3125,y:.1875};
 const grip={x:primary.x*16,y:im.height-primary.y*16};
 ctx.save();ctx.translate(Math.round(pose.x),Math.round(pose.y));ctx.rotate(pose.angle);ctx.scale(1,pose.flip);ctx.imageSmoothingEnabled=false;ctx.drawImage(im,-grip.x,-grip.y);
 if(pose.age<.095&&!pose.reload){const frame=Math.min(3,Math.floor(pose.age/.032)+1),flash=images[`spacepistol_flare_00${frame}`];if(flash)ctx.drawImage(flash,im.width-grip.x-1,-grip.y+1-flash.height/2);}
 const hand=images.marine_hand_001;if(hand)ctx.drawImage(hand,-2,-1);
 if(debug){ctx.fillStyle='#8af7e6';ctx.fillRect(-.5,-.5,1,1);ctx.strokeStyle='#8af7e6';ctx.lineWidth=.4;ctx.strokeRect(-grip.x,-grip.y,im.width,im.height);}
 ctx.restore();
}
export function drawMarine(ctx,p,time,assets,{debug=false,animation=null,gunVisible=true}={}){
 ctx.imageSmoothingEnabled=false;
 const a=animation||animationFor(p),name=`${a.clip}_${String(a.frame+1).padStart(3,'0')}`,im=assets.images[name];
 const x=Math.round(p.x),y=Math.round(p.y),rolling=p.rollElapsed>=0;
 ctx.fillStyle='#151b29aa';ctx.beginPath();ctx.ellipse(x,y-1,7.5,3,0,0,Math.PI*2);ctx.fill();
 const behind=Math.sin(p.angle)<-.2;if(gunVisible&&!rolling&&behind)gun(ctx,p,time,assets,debug);
 ctx.save();if(p.hurtRemaining>0&&Math.floor(p.hurtRemaining*16)%2===0)ctx.filter='brightness(2.2)';
 if(im){ctx.save();ctx.translate(x,y);ctx.scale(a.mirror?-1:1,1);ctx.drawImage(im,-12,-27);ctx.restore();}
 ctx.restore();if(gunVisible&&!rolling&&!behind)gun(ctx,p,time,assets,debug);
 if(debug){ctx.save();ctx.strokeStyle='#b0dfd8';ctx.lineWidth=.45;ctx.strokeRect(x-12,y-27,24,27);ctx.strokeStyle='#f2c95c';ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+3);ctx.stroke();ctx.restore();}
 return{name,...a};
}
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
function target(ctx,t){
 const x=Math.round(t.x+t.tilt),y=t.y;ctx.fillStyle='#181b25aa';ctx.beginPath();ctx.ellipse(x,y+1,13,4,0,0,7);ctx.fill();
 rect(ctx,x-2,y-14,4,15,'#342735');rect(ctx,x-8,y-24,16,21,'#382631');rect(ctx,x-9,y-23,18,17,t.flash>0?'#ffeac0':'#9c684b');
 rect(ctx,x-7,y-22,3,15,'#c18d5a');rect(ctx,x-3,y-22,1,15,'#593e36');rect(ctx,x+5,y-22,1,15,'#644134');rect(ctx,x-8,y-6,16,3,'#5f443b');
 rect(ctx,x-5,y-19,10,10,'#e2c7a3');rect(ctx,x-3,y-17,6,6,'#944a44');rect(ctx,x-1,y-15,2,2,'#f3dbab');
}
function column(ctx,c){const x=c.x,y=c.y;rect(ctx,x-15,y-4,30,8,'#151b29aa');rect(ctx,x-13,y-7,26,8,'#242638');rect(ctx,x-11,y-25,22,20,'#393b54');rect(ctx,x-10,y-25,6,19,'#4a5066');rect(ctx,x+6,y-25,4,20,'#2a3045');rect(ctx,x-13,y-30,26,7,'#252c41');rect(ctx,x-12,y-30,24,3,'#667386');rect(ctx,x-9,y-30,16,1,'#89928c');rect(ctx,x-12,y-2,24,2,'#5b596c');}
export function drawRoom(ctx,sim,assets,{debug=false,trace=false}={}){
 rect(ctx,0,0,480,300,'#131822');rect(ctx,16,28,448,254,'#171b2a');
 for(let y=51;y<270;y+=16)for(let x=24;x<456;x+=16){const n=((x*13+y*17)>>>0)%5;rect(ctx,x,y,15,15,['#343344','#383647','#353545','#393747','#333443'][n]);rect(ctx,x+1,y+14,13,1,'#292d3c');if(n===2)rect(ctx,x+10,y+2,3,1,'#424052');}
 rect(ctx,26,48,428,2,'#101626');rect(ctx,26,269,428,4,'#181e2b');
 // Brick wall uses the same one-pixel grid as the source character.
 for(let row=0;row<3;row++)for(let i=0;i<25;i++){let x=16+i*18+(row%2?-9:0);rect(ctx,x,27+row*7,17,6,row===0?'#7f7d8a':row===1?'#666879':'#4b5169');rect(ctx,x,27+row*7,17,1,'#93908f');}
 for(let y=48;y<281;y+=14){rect(ctx,16,y,10,13,'#5e6075');rect(ctx,17,y,3,12,'#89858b');rect(ctx,454,y,10,13,'#4a4d66');rect(ctx,460,y,3,12,'#777586');}
 for(let x=16;x<464;x+=18){rect(ctx,x,274,17,7,'#66697a');rect(ctx,x,274,17,2,'#999291');}
 // Low, warm lights keep the room legible without obscuring aiming.
 for(const x of [29,447]){rect(ctx,x-2,94,5,10,'#262338');rect(ctx,x-1,91,3,5,'#f6c68c');rect(ctx,x,90,1,4,'#fff0c7');rect(ctx,x-3,100,7,2,'#8d5d52');}
 ctx.fillStyle='#c2c0ba';ctx.font='6px monospace';ctx.fillText('MARINE  /  MOVEMENT & AIM',35,41);
 ctx.fillStyle='#868397';ctx.fillText('KEEP OF THE LEAD LORD · STUDY ROOM',232,41);
 if(sim.section==='roll-lane'){
  rect(ctx,36,181,410,1,'#5a4659');rect(ctx,36,252,410,1,'#5a4659');
  for(let x=42;x<440;x+=12){rect(ctx,x,217,5,1,'#62515d');}
  ctx.fillStyle='#cda28e';ctx.font='6px monospace';ctx.fillText('DODGE LANE',39,176);ctx.fillStyle='#8c697b';ctx.fillText('←  SLOW VOLLEY',365,177);
  for(const y of [188,208,246]){rect(ctx,438,y-4,8,8,'#2b2538');rect(ctx,439,y-3,6,6,'#91616b');rect(ctx,440,y-1,4,2,'#f3aca3');}
 }else{
  ctx.fillStyle='#747384';ctx.font='6px monospace';ctx.fillText('STRAFE • TURN • FIRE • RELOAD',40,256);
 }
 if(trace&&sim.path.length>1){ctx.strokeStyle='#87b0ba66';ctx.lineWidth=.65;ctx.beginPath();sim.path.forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));ctx.stroke();}
 const objects=[...COLUMNS.map(c=>({y:c.y,draw:()=>column(ctx,c)})),...sim.targets.map(t=>({y:t.y,draw:()=>target(ctx,t)})),{y:sim.player.y,draw:()=>drawMarine(ctx,sim.player,sim.time,assets,{debug})}];objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
 for(const b of sim.bullets){const x=Math.round(b.x),y=Math.round(b.y);if(b.enemy){rect(ctx,x-3,y-2,7,5,'#44263e');rect(ctx,x-2,y-3,5,7,'#44263e');rect(ctx,x-2,y-2,5,5,'#ef718b');rect(ctx,x-1,y-1,3,3,'#fff0d8');}else{ctx.save();ctx.translate(x,y);ctx.rotate(b.angle);rect(ctx,-3,-1,6,2,'#e7ad5a');rect(ctx,0,-1,3,2,'#ffefd0');ctx.restore();}}
 for(const e of sim.effects){ctx.globalAlpha=clamp(e.life/.15,0,1);if(e.type==='helmet'){const i=Math.min(12,Math.floor((e.max-e.life)*20)+1),im=assets.images[`marine_helmet_off_${String(i).padStart(3,'0')}`];if(im)ctx.drawImage(im,Math.round(e.x-im.width/2),Math.round(e.y-im.height/2));}else{const colors={dust:'#a29aa1',wood:'#d5a16e',spark:'#ffd49b',casing:'#bc9854',magazine:'#1a2335',hurt:'#efb2a6'};ctx.fillStyle=colors[e.type]||'#d8c3a4';const s=e.type==='dust'?2:e.type==='magazine'?3:1;ctx.fillRect(Math.round(e.x),Math.round(e.y),s,s);}ctx.globalAlpha=1;}
 const p=sim.player,s=sim.getState();
 const armorAge=sim.time-p.lastArmorBreak;if(armorAge<.3){ctx.save();ctx.strokeStyle=`rgba(159,221,238,${1-armorAge/.3})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.armorBreakX,p.armorBreakY-7,8+armorAge*230,0,7);ctx.stroke();ctx.restore();}
 if(p.aim.active&&p.rollElapsed<0){const x=p.aim.x,y=p.aim.y;ctx.strokeStyle='#dfbf8190';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x-2,y);ctx.moveTo(x+2,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y-2);ctx.moveTo(x,y+2);ctx.lineTo(x,y+5);ctx.stroke();}
 rect(ctx,25,8,430,16,'#131822');
 ctx.font='7px monospace';ctx.fillStyle='#d7d4c9';ctx.fillText('THE MARINE',31,19);
 for(let i=0;i<6;i++){rect(ctx,104+i*6,12,4,5,i<p.hp?'#e09896':'#46445b');}rect(ctx,145,12,5,5,p.armor>0?'#88a9bf':'#343b4a');
 ctx.fillStyle='#b5a896';ctx.fillText('MARINE SIDEARM',284,19);for(let i=0;i<10;i++)rect(ctx,380+i*6,12,3,6,i<p.ammo?'#d9bc74':'#4f4758');
 if(p.reloadRemaining>0){rect(ctx,p.x-12,p.y-32,24,2,'#222837');rect(ctx,p.x-12,p.y-32,24*s.reloadProgress,2,'#e6bf7d');}
 if(p.rollElapsed>=0){rect(ctx,p.x-12,p.y+7,24,2,'#252638');rect(ctx,p.x-12,p.y+7,24*s.rollProgress,2,s.invulnerable?'#94c1d1':'#d6928f');}
 ctx.font='6px monospace';ctx.fillStyle=s.invulnerable?'#a0d5dd':'#a69eae';const status=s.action==='roll-air'?'AIRBORNE  /  BULLETS PASS':s.action==='roll-ground'?'LANDED  /  VULNERABLE':s.action==='reload'?'RELOADING  0.96s':'WASD MOVE    MOUSE AIM + FIRE    SPACE / L / RMB ROLL    U RELOAD';ctx.fillText(status,29,292);
 if(debug){ctx.strokeStyle='#b9dbc980';ctx.lineWidth=.5;ctx.strokeRect(ROOM.left,ROOM.top,ROOM.right-ROOM.left,ROOM.bottom-ROOM.top);for(const c of COLUMNS){ctx.beginPath();ctx.arc(c.x,c.y,c.r+6,0,7);ctx.stroke();}ctx.beginPath();ctx.arc(p.x,p.y-7,6,0,7);ctx.stroke();ctx.fillStyle='#e2ddc3';ctx.fillText(`${s.animation.sprite}  ${p.vx.toFixed(0)},${p.vy.toFixed(0)}`,35,64);}
}
