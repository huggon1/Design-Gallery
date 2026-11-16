import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createCanvas,Image} from '@napi-rs/canvas';
class LocalImage extends Image { set src(value) { super.src = fs.readFileSync(fileURLToPath(value)); } }
globalThis.Image = LocalImage;
globalThis.fetch = async url => ({ok:true,json:async()=>JSON.parse(fs.readFileSync(fileURLToPath(url),'utf8'))});
const art=await import('../../art.mjs');
const manifest=await art.loadArt();
assert.equal(manifest.footOffset,1.390625);
assert.equal(art.clipInfo('SlashEffect').fps,40);
assert.equal(art.clipInfo('Run').loopStart,6);
const run=manifest.clips.knight.Run;
assert.equal(art.sampleFrame(run,13/12),run.frames[6]);
assert.equal(art.sampleFrame(manifest.clips.knight.SlashEffect,.15,{hold:false}),null);
assert.equal(art.sampleFrame(manifest.clips.knight.SlashEffect,.025),manifest.clips.knight.SlashEffect.frames[1]);
for(const group of Object.values(manifest.clips))for(const clip of Object.values(group))for(const key of clip.frames)assert.ok(manifest.frames[key],`Missing frame ${key}`);
const cv=createCanvas(1500,1140),ctx=cv.getContext('2d');ctx.fillStyle='#1a2431';ctx.fillRect(0,0,1500,1140);
const poses=[['Idle',.2],['Run',.62],['Airborne',.11],['Fall',.2],['Slash',.075,'side'],['SlashAlt',.075,'side',true],['UpSlash',.075,'up'],['DownSlash',.075,'down'],['Dash',.08],['Double Jump',.12],['Fireball1 Cast',.12],['Scream',.11],['NA Big Slash',.18,'great'],['NA Dash Slash',.1,'dashslash'],['NA Cyclone',.1,'cyclone'],['Quake Antic',.12]];
for(let i=0;i<poses.length;i++){
 const [anim,animTime,kind,alternate]=poses[i];const col=i%4,row=Math.floor(i/4),x=col*375+190,y=row*240+198;
 ctx.save();ctx.strokeStyle='#58637b';ctx.beginPath();ctx.moveTo(col*375+15,y);ctx.lineTo(col*375+360,y);ctx.stroke();ctx.translate(x,y);ctx.scale(64,-64);
 const p={x:0,y:0,facing:1,grounded:true,anim,animTime};art.drawKnight(ctx,p,animTime);if(kind)art.drawAttack(ctx,{kind,alternate,x:0,y:0,facing:1,time:animTime});ctx.restore();
 ctx.fillStyle='#d8e3f0';ctx.font='15px sans-serif';ctx.fillText(`${anim}: ${(animTime*1000).toFixed(0)}ms`,col*375+14,row*240+225);
}
ctx.fillStyle='#d8e3f0';ctx.font='15px sans-serif';ctx.fillText('Original HUD assets. Soul 66/99, HP 4/5.',20,1002);art.drawHud(ctx,{soul:66,hp:4,maxHp:5,time:.3},90,1070,28);
fs.writeFileSync(new URL('./renderer-contact.png',import.meta.url),cv.toBuffer('image/png'));
const report={sourceGitBlobSha:manifest.source.gitBlobSha,frames:Object.keys(manifest.frames).length,atlasCount:manifest.atlases.length,assertions:['all clip references resolve','Run LoopSection resumes at source frame 6','40fps slash effect ends at 150ms','blank lead frames retained','collider-derived foot origin 1.390625'],render:'renderer-contact.png'};
fs.writeFileSync(new URL('./renderer-check.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);
const spells=createCanvas(1800,1550),q=spells.getContext('2d');q.fillStyle='#1a2431';q.fillRect(0,0,1800,1550);
const scenes=[
 ['Fireball antic', {kind:'fireball',phase:'antic',phaseTime:.05,time:.05,level:2}, 'Fireball Antic'],
 ['Shade Soul projectile →', {kind:'fireball',phase:'projectile',time:.08,level:2,vx:40,y:1.1}, 'Idle'],
 ['Vengeful Spirit projectile →', {kind:'fireball',phase:'projectile',time:.08,level:1,vx:40,y:1.1}, 'Idle'],
 ['Howling Wraiths', {kind:'scream',phase:'burst',phaseTime:.1,time:.25,level:1}, 'Scream'],
 ['Abyss Shriek', {kind:'scream',phase:'burst',phaseTime:.1,time:.25,level:2}, 'Scream 2'],
 ['Abyss Shriek ending', {kind:'scream',phase:'end',phaseTime:.1,time:.55,level:2}, 'Scream End 2'],
 ['Desolate Dive fall', {kind:'dive',phase:'fall',phaseTime:.1,time:.35,level:1,y:3}, 'Quake Fall'],
 ['Desolate Dive land', {kind:'dive',phase:'land',phaseTime:.1,time:.45,level:1}, 'Quake Land'],
 ['Descending Dark land', {kind:'dive',phase:'land',phaseTime:.1,time:.45,level:2}, 'Quake Land 2'],
 ['Monarch Wings', null, 'Double Jump'],
 ['Nail art charge', null, 'Idle'],
 ['Focus', null, 'Focus'],
];
for(let i=0;i<scenes.length;i++){
 const [label,spell,anim]=scenes[i];const col=i%3,row=Math.floor(i/3),x=col*600+300,y=row*360+325;
 q.save();q.beginPath();q.rect(col*600,row*360,600,360);q.clip();q.strokeStyle='#58637b';q.beginPath();q.moveTo(col*600+15,y);q.lineTo(col*600+585,y);q.stroke();q.translate(x,y);q.scale(35,-35);
 const p={x:0,y:spell?.phase==='fall'?3:0,facing:1,grounded:true,anim,animTime:.1,chargeReady:label==='Nail art charge',charge:label==='Nail art charge'?1.5:0,focusing:label==='Focus',focusTimer:.7};
 if(label==='Monarch Wings')art.drawWings(q,{x:0,y:0,facing:1,time:.12});art.drawKnight(q,p,.1);
 if(spell)art.drawSpell(q,{x:0,y:0,facing:1,...spell},.1);q.restore();q.fillStyle='#d8e3f0';q.font='16px sans-serif';q.fillText(label,col*600+15,row*360+22);
}
q.fillStyle='#d8e3f0';q.font='16px sans-serif';q.fillText('Soul fill 0, 33, 66, 99. Native source fill and full-orb face.',20,1475);
[0,33,66,99].forEach((s,i)=>art.drawHud(q,{soul:s,hp:4,maxHp:5,time:.3},80+i*430,1520,24));
fs.writeFileSync(new URL('./spells-contact.png',import.meta.url),spells.toBuffer('image/png'));
// Calling a spell antic must keep projectile pixels absent.
let calls=0;const spy=new Proxy({}, {get:(_,key)=>key==='drawImage'?()=>calls++:()=>{}});
assert.equal(art.drawSpell(spy,{kind:'fireball',phase:'antic',phaseTime:.05,level:2,x:0,y:0}),false);assert.equal(calls,0);
console.log('PASS: casting antic and projectile layers stay separate. Saved spells-contact.png.');
