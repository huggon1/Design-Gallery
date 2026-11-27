import {ART_SCALE, MOVE, WORLD, clamp} from './controller.mjs';

// Grids preserve the padding in the source sheets. Ground poses share a sole anchor.
const grids={
  Idle:[5,1], Aiming:[5,5], Shooting:[6,5], Duck:[4,4], Duck_Shoot:[6,1],
  Run:[4,4], Run_Shoot_Straight:[4,4], Run_Shoot_Diagonal:[4,4],
  Jump:[4,2], Parry:[4,2], Parried:[4,2], Dash_Air:[4,2], Dash_Ground:[4,2],
  Special_Attack_Ground:[7,5], Special_Attack_Air:[6,5],
  Jump_Dust:[7,2], Dash_Dust:[7,2], Walk_Dust:[19,1], Parry_Spark:[5,2],
  Peashooter_Loop:[4,2], PeaShooter_Spawn:[4,1], PeaShooter_Death:[6,1],
  Peashooter_Special_Loop:[4,2], PeaShooter_Special_Death:[5,2], Cards_Red:[6,1],
};
export async function loadArt() {
  const names=[...Object.keys(grids),'Pyramid','Block','Sphere_Parry','BackGround'];
  return Object.fromEntries(await Promise.all(names.map(async name=>{
    const im=new Image();im.src=new URL('assets/'+name+'.webp',import.meta.url);
    await im.decode();return [name,im];
  })));
}
function cell(ctx,art,name,index,x,y,{scale=1,face=1,angle=0,anchor=.5}={}) {
  const image=art[name], [cols,rows]=grids[name];
  const w=image.width/cols,h=image.height/rows;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(face*scale,scale);
  ctx.drawImage(image,index%cols*w,Math.floor(index/cols)*h,w,h,-w/2,-h*anchor,w,h);
  ctx.restore();
}
const idleOrder=[0,1,2,3,4,4,3,2,1,0,0,0];
export function poseFrame(s) {
  const tick=Math.floor(s.poseAge*24+.00001);
  switch (s.pose) {
    case 'Idle': return idleOrder[tick%12];
    case 'Aiming': return s.row*5+idleOrder[tick%12];
    case 'Shooting': return s.row*6+3+Math.min(2,Math.floor((MOVE.shotInterval-s.shotCooldown)*30));
    case 'Duck': return tick<5?tick:5+((tick-5)%10);
    case 'Duck_Shoot':return 3+Math.min(2,Math.floor((MOVE.shotInterval-s.shotCooldown)*30));
    case 'Dash_Air': case 'Dash_Ground': return Math.min(7,Math.floor(s.poseAge*8/MOVE.dashTime));
    case 'Jump': case 'Parry': case 'Parried':return Math.floor(s.poseAge*30)%8;
    case 'Special_Attack_Ground':case 'Special_Attack_Air':{
      const cols=grids[s.pose][0];return s.row*cols+Math.min(cols-1,Math.floor(s.poseAge*cols/.35));
    }
    default:return Math.floor(s.stride*24)%16;
  }
}
const hints=[
  {x:291,y:249,title:'THE TUTORIAL',detail:'A / D 移动　·　按住 J 连射',size:43},
  {x:887,y:265,title:'跳上方块',detail:'长按跳得更高',arrow:92},
  {x:1174,y:168,title:'空中冲刺',detail:'起跳后按 L',arrow:101},
  {x:1515,y:204,title:'拍击反弹',detail:'靠近粉球时再按一次跳',arrow:100},
  {x:2025,y:252,title:'豌豆枪 EX',detail:'命中或拍击攒牌　·　U 消耗一张',arrow:143},
];
function caption(c,h) {
  c.save();c.translate(h.x,h.y);c.fillStyle='#352f29';c.textAlign='center';
  c.font=h.size?'bold '+h.size+'px Georgia, serif':'bold 28px "Songti SC", serif';c.fillText(h.title,0,0);
  c.font='18px "Songti SC", Georgia, serif';c.fillText(h.detail,0,31);
  if (h.arrow) {
    c.strokeStyle='#756f63';c.lineWidth=1.6;c.beginPath();c.moveTo(-4,44);
    c.quadraticCurveTo(1,61,2,h.arrow);c.lineTo(-2,h.arrow-8);c.moveTo(2,h.arrow);c.lineTo(5,h.arrow-9);c.stroke();
  }
  c.restore();
}
function plank(c,p) {
  const {x,y,w}=p;
  c.fillStyle='#eeeae1';c.strokeStyle='#827c74';c.lineWidth=2;c.beginPath();
  c.moveTo(x,y+2);c.lineTo(x+23,y-13);c.lineTo(x+w-5,y-13);c.lineTo(x+w,y+1);
  c.lineTo(x+w-5,y+15);c.quadraticCurveTo(x+w*.58,y+19,x+6,y+14);c.closePath();c.fill();c.stroke();
  c.fillStyle='#c3beb5';c.beginPath();c.moveTo(x,y+2);c.quadraticCurveTo(x+w*.52,y+5,x+w,y+1);
  c.lineTo(x+w-5,y+14);c.quadraticCurveTo(x+w*.51,y+18,x+6,y+13);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#8a827648';c.lineWidth=1;
  for (let i=8;i<w-10;i+=5) {c.beginPath();c.moveTo(x+i,y+11+(i%3));c.lineTo(x+i+5,y+5);c.stroke();}
}
function paintStage(c,art,s,left,span) {
  for (const h of hints) if (h.x>left-220&&h.x<left+span+220) caption(c,h);
  c.strokeStyle='#605a4a40';c.lineWidth=1.3;c.beginPath();
  c.moveTo(40,WORLD.floor+2);c.bezierCurveTo(650,WORLD.floor,1320,WORLD.floor+4,2460,WORLD.floor+1);c.stroke();
  const b=WORLD.block;
  c.drawImage(art.Block,b.x-13,b.y-23,b.w+34,WORLD.floor-b.y+36);
  plank(c,WORLD.shelf);
  WORLD.targets.forEach((t,i)=>{
    c.save();c.translate(t.x,t.y);c.rotate(Math.sin(s.flashes[i]*60)*s.flashes[i]*.27);
    c.drawImage(art.Pyramid,-45,-110,90,112);c.restore();
  });
  c.save();
  if (s.orbCooldown>0) c.globalAlpha=s.orbCooldown>.38?.14:1-s.orbCooldown/.45;
  c.drawImage(art.Sphere_Parry,WORLD.orb.x-43,WORLD.orb.y-43,86,86);c.restore();
}
const effects={
  jump:['Jump_Dust',14,.67],land:['Jump_Dust',14,.55],foot:['Walk_Dust',19,.67],
  dash:['Dash_Dust',14,.79],parry:['Parry_Spark',9,.95],
  shot:['PeaShooter_Spawn',4,.8],hit:['PeaShooter_Death',6,.6],exHit:['PeaShooter_Special_Death',9,.72],
};
export function makeEffect(e) {
  const spec=effects[e.type];if (!spec) return null;
  const [name,count,scale]=spec;
  const y=e.type==='dash'?e.y-58:e.type==='jump'||e.type==='land'||e.type==='foot'?e.y-13:e.y;
  return {...e,y,name,count,scale,age:0};
}
function drawEffect(c,art,e) {
  const frame=Math.floor(e.age*30);if (frame>=e.count) return;
  cell(c,art,e.name,frame,e.x,e.y,{scale:e.scale,face:e.type==='shot'?1:e.face,angle:e.type==='shot'?e.angle:0});
}
function drawHud(c,art,s,width,height,scale) {
  const unit=clamp(scale,.65,1.2);
  c.save();c.translate(22*unit,height-21*unit);c.scale(unit,unit);
  c.fillStyle='#f4e8ce';c.strokeStyle='#342d27';c.lineWidth=1.5;
  c.fillRect(-5,-10,27,20);c.strokeRect(-5,-10,27,20);
  c.fillStyle='#312b27';c.font='bold 13px Georgia, serif';c.textBaseline='middle';c.fillText('EX',0,0);
  for (let i=0;i<5;i++) {
    const x=36+i*21, filled=clamp(s.meter-i,0,1);
    c.fillStyle='#d5d0c5';c.strokeStyle='#5b554b';c.lineWidth=1;c.fillRect(x-8,-11,16,22);c.strokeRect(x-8,-11,16,22);
    if (filled>0) {c.save();c.beginPath();c.rect(x-10,12-24*filled,20,24*filled);c.clip();cell(c,art,'Cards_Red',5,x,0,{scale:.81});c.restore();}
  }
  c.restore();
}
export function drawScene(ctx,art,s,prev,effects,{width,height,interpolationAlpha=1,debug=false},cam) {
  const a=clamp(interpolationAlpha,0,1);
  ctx.drawImage(art.BackGround,0,0,width,height);
  const x=prev.x+(s.x-prev.x)*a, y=prev.y+(s.y-prev.y)*a;
  const left=prev.camera+(cam.x-prev.camera)*a;
  const top=prev.cameraY+(cam.y-prev.cameraY)*a;
  ctx.save();
  ctx.beginPath();ctx.moveTo(width*.063,height*.074);ctx.lineTo(width*.931,height*.070);
  ctx.lineTo(width*.96,height*.878);ctx.lineTo(width*.032,height*.882);ctx.closePath();ctx.clip();
  ctx.translate(0,cam.offsetY);ctx.scale(cam.scale,cam.scale);ctx.translate(-left,-top);
  paintStage(ctx,art,s,left,cam.span);
  ctx.fillStyle='#49403927';ctx.beginPath();
  const shadowY=s.ground?s.y:WORLD.floor;
  ctx.ellipse(x,shadowY+1,s.duck?61:38,4.5,0,0,2*Math.PI);ctx.fill();
  for (const e of effects) if (!['hit','shot','exHit','parry'].includes(e.type)) drawEffect(ctx,art,e);
  const soleOffset=s.ground?(s.pose==='Idle'?6:s.pose.startsWith('Run')?3:4)*ART_SCALE:0;
  cell(ctx,art,s.pose,poseFrame(s),x,y+soleOffset,{scale:ART_SCALE,face:s.face,anchor:1});
  for (const b of s.bullets) {
    const bx=b.prevX+(b.x-b.prevX)*a,by=b.prevY+(b.y-b.prevY)*a;
    const frame=Math.min(7,Math.floor(b.age*30));const index=frame<6?frame:6+Math.floor(b.age*24)%2;
    cell(ctx,art,b.ex?'Peashooter_Special_Loop':'Peashooter_Loop',index,bx,by,{scale:b.ex?.78:.72,angle:b.angle});
  }
  for (const e of effects) if (['hit','shot','exHit','parry'].includes(e.type)) drawEffect(ctx,art,e);
  if (debug) {
    ctx.strokeStyle='#168778';ctx.lineWidth=1.6;ctx.strokeRect(x-25,y-(s.duck?54:105),50,s.duck?54:105);
    ctx.beginPath();ctx.arc(WORLD.orb.x,WORLD.orb.y,62,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#11544e';ctx.font='17px monospace';ctx.fillText(s.pose+' · '+(poseFrame(s)+1),x-50,y-205);
  }
  ctx.restore();drawHud(ctx,art,s,width,height,cam.scale);
}
