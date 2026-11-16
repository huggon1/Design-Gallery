// ERI renderer adaptation. Source is retained in source/renderer.js.
// Changed only scenery/terrain/goal drawing and ambient snow; character, timing, contact and dash effects are retained.
import { drawCharacter, createCharacterRenderer } from './source/character.js';
import { drawJelly, drawCarryCrystal } from './source/jelly-art.js';

const W=320,H=180,TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=n=>{const x=Math.sin(n*127.1+48.7)*43758.5453;return x-Math.floor(x);};
const wrap=(x,n)=>(x%n+n)%n;
const palettes={
 snow:{sky:'#191136',skyLow:'#684777',far:'#645294',mid:'#3e4276',near:'#233e61',stone:'#344f70',light:'#6796a8',edge:'#9bbac5',dark:'#202c50',mortar:'#293958',snow:'#d7e4e5',snowShade:'#9baec2',moss:'#536d67',gold:'#ecc689'},
 hotel:{sky:'#1c192f',skyLow:'#393048',far:'#4a4054',mid:'#383047',near:'#292a40',stone:'#3d3d52',light:'#6c667b',edge:'#9d8b99',dark:'#27283b',mortar:'#303044',snow:'#d5d9dd',snowShade:'#aaaabd',moss:'#60736b',gold:'#e7ba80'},
 temple:{sky:'#111e32',skyLow:'#283e4f',far:'#3c5663',mid:'#2d4555',near:'#253849',stone:'#344954',light:'#667e85',edge:'#9eafb0',dark:'#21343f',mortar:'#293e48',snow:'#d4e5dc',snowShade:'#93b3b7',moss:'#5e8375',gold:'#e4c381'},
 summit:{sky:'#27213f',skyLow:'#61516b',far:'#75637a',mid:'#514860',near:'#35394f',stone:'#4b4b64',light:'#7b758b',edge:'#b1a3b1',dark:'#303447',mortar:'#3a3c51',snow:'#f0e8eb',snowShade:'#bdb4ca',moss:'#718176',gold:'#f2d5a6'},
};
const themeFor=r=>{
 const text=String(r?.theme||'').toLowerCase();
 if(/snow|alpine/.test(text))return 'snow';
 if(text)return /hotel|resort|interior/.test(text)?'hotel':/temple|dream|ruin/.test(text)?'temple':/summit|dawn|peak/.test(text)?'summit':'snow';
 if(/dream|waking/.test(r?.id||''))return 'temple';
 const chapter=r?.chapter||1;return chapter===1?'snow':chapter<=3?'hotel':chapter<=5?'temple':'summit';
};
function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function rect(c,x,y,w,h,color){if(w<=0||h<=0)return;c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function disk(c,x,y,r,color){x=Math.round(x);y=Math.round(y);r=Math.round(r);c.fillStyle=color;for(let yy=-r;yy<=r;yy++){const span=Math.floor(Math.sqrt(r*r-yy*yy));c.fillRect(x-span,y+yy,span*2+1,1);}}
/** Scanline polygons retain intentional, hard pixel edges at the native resolution. */
function polygon(c,points,color){
 const low=Math.floor(Math.min(...points.map(p=>p[1]))),high=Math.ceil(Math.max(...points.map(p=>p[1])));c.fillStyle=color;
 for(let y=low;y<high;y++){const xs=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]));}xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)c.fillRect(Math.floor(xs[i]),y,Math.ceil(xs[i+1])-Math.floor(xs[i]),1);}
}
function sprite(c,rows,legend,x,y,scale=1){x=Math.round(x);y=Math.round(y);for(let yy=0;yy<rows.length;yy++)for(let xx=0;xx<rows[yy].length;xx++){const color=legend[rows[yy][xx]];if(color)rect(c,x+xx*scale,y+yy*scale,scale,scale,color);}}
function line(c,x,y,x2,y2,color){x=Math.round(x);y=Math.round(y);x2=Math.round(x2);y2=Math.round(y2);const dx=Math.abs(x2-x),dy=-Math.abs(y2-y),sx=x<x2?1:-1,sy=y<y2?1:-1;let err=dx+dy;c.fillStyle=color;for(let safe=0;safe<700;safe++){c.fillRect(x,y,1,1);if(x===x2&&y===y2)break;const e2=2*err;if(e2>=dy){err+=dy;x+=sx;}if(e2<=dx){err+=dx;y+=sy;}}}
function point(e){return {x:Math.round(e.x+(e.w?e.w/2:0)),y:Math.round(e.y+(e.h?e.h/2:0))};}
const pixelLetters={
 '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],
 '2':['110','001','010','100','111'],'3':['110','001','010','001','110'],
 '4':['101','101','111','001','001'],'5':['111','100','110','001','110'],
 '6':['011','100','111','101','111'],'7':['111','001','010','010','010'],
 '8':['111','101','111','101','111'],'9':['111','101','111','001','110'],
 'C':['111','100','100','100','111'],'A':['010','101','111','101','101'],
 'M':['10001','11011','10101','10001','10001'],'P':['110','101','110','100','100'],
 ' ':['00','00','00','00','00'], '/':['001','001','010','100','100']
};
function pixelText(c,text,x,y,color){for(const ch of text){const rows=pixelLetters[ch]||pixelLetters[' '];sprite(c,rows,{'1':color},x,y);x+=rows[0].length+1;}}
const refillRows=['...a...','..aba..','.abbba.','abcccba','.abcba.','..aba..','...a...'];
const berryRows=['..ggg...','.ggggg..','..rrrr..','.rrrrrr.','rryrryrr','rrrrrrrr','.ryrryr.','..rrrr..','...rr...'];

export class Renderer {
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.frame=surface(W,H);this.c=this.frame.getContext('2d',{alpha:false});
  this.camera={x:0,y:0};this.cameraReady=false;this.clock=0;this.echoCharacter=createCharacterRenderer();this.echoes=[];this.echoClock=0;this.room=null;this.roomCache=null;this.backgrounds=new Map();this.particles=[];this.contacts=[];this.seenEvents=new WeakSet();this.previous={};this.shake=0;this.flash=0;this.ambient=[];this.resize();
 }
 reset(){this.cameraReady=false;this.room=null;this.roomCache=null;this.particles=[];this.contacts=[];this.echoes=[];this.previous={};this.seenEvents=new WeakSet();this.shake=0;this.flash=0;this.echoClock=this.clock;drawCharacter.reset?.();this.echoCharacter.reset();}
 resize(){if(this.canvas.width!==W)this.canvas.width=W;if(this.canvas.height!==H)this.canvas.height=H;this.ctx.imageSmoothingEnabled=false;this.c.imageSmoothingEnabled=false;}
 // Gallery adaptation: a neutral stage preserves ERI character rendering and effects.
 background(){const image=surface(W,H);rect(image.getContext('2d'),0,0,W,H,'#343434');return image;}

 worldToScreen(x,y){return {x:x-this.camera.x,y:y-this.camera.y};}
 roomArt(room,camera){
  if(this.room===room&&this.roomCache)return this.roomCache;
  this.room=room;const image=surface(room.width||W,room.height||H),c=image.getContext('2d');
  for(const s of room.solids||[])if(s.kind==='boundary')this.solid(c,s);
  for(const s of room.solids||[])if(s.kind!=='boundary')this.solid(c,s);
  this.roomCache={image,x:0,y:0,theme:'neutral',p:{},decor:[]};return this.roomCache;
 }
 solid(c,s){
  rect(c,s.x,s.y,s.w,s.h,s.kind==='boundary'?'#555555':'#606060');
  rect(c,s.x,s.y,s.w,1,'#c2c2c2');
  rect(c,s.x,s.y,1,s.h,'#888888');rect(c,s.x+s.w-1,s.y,1,s.h,'#202020');
  if(s.kind==='oneway')rect(c,s.x,s.y+2,s.w,1,'#969696');
 }
 burst(x,y,count,color,speed=30){for(let i=0;i<count;i++){const a=hash(i+this.clock*30)*TAU,v=speed*(.4+hash(i+19)*.6);this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-8,life:.23+hash(i+5)*.25,max:.5,color,size:i%4===0?2:1});}if(this.particles.length>95)this.particles.splice(0,this.particles.length-95);}
 events(game,dt){
  const p=game.player||{},state=String(p.state||''),dash=state==='dash'||state==='dream';
  const roomId=game.room?.id;
  if(this.previous.roomId!==roomId||this.previous.deaths!==game.deaths){drawCharacter.reset?.();this.particles=[];this.contacts=[];this.echoes=[];this.seenEvents=new WeakSet();}
  const events=(Array.isArray(game.events)?game.events:[]).filter(e=>e&&typeof e==='object'&&!this.seenEvents.has(e));
  const landed=events.some(e=>e.type==='land'||e.type==='ultra'),ultra=events.some(e=>e.type==='ultra');
  for(const e of events){if(!e||typeof e!=='object'||this.seenEvents.has(e))continue;this.seenEvents.add(e);const type=e.type||e.name||'',x=e.x??p.x+4,y=e.y??p.y+6;
   if(/death|die/.test(type)){this.burst(x,y,22,'#df7897',55);this.shake=Math.max(this.shake,2.3);this.flash=.13;}
   else if(/^(dash|spring|holdable-spring|bumper)$/.test(type)){this.burst(x,y,7,/spring/.test(type)?'#d2c389':'#9cd9dd',30);this.shake=Math.max(this.shake,1);}
   else if(/refill|berry|collect|checkpoint|goal|complete/.test(type))this.burst(x,y,9,/berry/.test(type)?'#eaa299':'#bdedba',28);
   else if(/^(hyper|super|ultra)$/.test(type)){
    // Technique labels describe the same action; only its physical event kicks dust.
    const direction=Math.sign(p.vx)||p.facing||1,cx=p.x+(p.w||8)/2,cy=p.y+(p.h||11);
    const skid=type==='ultra';this.burst(cx,cy,3,'#bacbd5',skid?13:16);
    for(const q of this.particles.slice(-3)){q.vx=-direction*(Math.abs(q.vx)+8);q.vy=-Math.abs(q.vy)*(skid?.2:.45);q.life=Math.min(q.life,skid?.16:.2);q.size=1;}
    this.contacts.push({x:cx,y:cy,wall:false,direction,skid,life:.12});
   }
   else if(/^(land|jump|walljump|wallbounce|climb-jump|climb-hop)$/.test(type)){
    if(type==='land'&&ultra)continue;
    const wall=/walljump|wallbounce/.test(type),side=typeof e.direction==='number'?e.direction:-(p.wall||p.facing||1);
    const cx=wall?(side>0?p.x:p.x+(p.w||8)):p.x+(p.w||8)/2,cy=wall?p.y+(p.h||11)/2:p.y+(p.h||11);
    this.burst(cx,cy,4,'#bacbd5',18);this.contacts.push({x:cx,y:cy,wall,life:.12});
   }
  }
  if(p.grounded&&!this.previous.grounded&&this.previous.roomId===roomId&&!landed)this.burst(p.x+4,p.y+(p.h||11),5,'#cad9dd',17);
  for(const q of this.contacts||[])q.life-=dt;this.contacts=(this.contacts||[]).filter(q=>q.life>0);
  this.previous={roomId,deaths:game.deaths,dash,grounded:p.grounded};
  for(const q of this.particles){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=Math.exp(-dt*2);q.vy+=dt*45;}this.particles=this.particles.filter(q=>q.life>0);this.shake=Math.max(0,this.shake-dt*12);this.flash=Math.max(0,this.flash-dt);
 }
 drawSky(c){rect(c,0,0,W,H,'#343434');}

 hazard(c,h,time){
  const x=Math.round(h.x),y=Math.round(h.y),w=Math.round(h.w),height=Math.round(h.h),dir=h.direction||h.dir||'up';
  if(/lava|water|acid/.test(h.kind||'')){rect(c,x,y,w,height,'#7a3455');for(let xx=0;xx<w;xx+=4){const rise=Math.round(Math.sin(xx*.3+time*3));rect(c,x+xx,y+rise,4,2,'#d57988');rect(c,x+xx+1,y+rise+2,2,1,'#f0b2a1');}return;}
  const ink=(xx,yy,ww,hh,color)=>rect(c,xx,yy,ww,hh,color);
  const horizontal=dir==='up'||dir==='down',length=horizontal?w:height,depth=horizontal?height:w;
  for(let n=0;n<length;n+=4){
   for(let d=0;d<Math.min(depth,8);d++){const span=d<2?1:3;let xx,yy;if(dir==='down'){xx=x+n+2-span/2;yy=y+depth-1-d;}else if(dir==='left'){xx=x+d;yy=y+n+2-span/2;}else if(dir==='right'){xx=x+depth-1-d;yy=y+n+2-span/2;}else{xx=x+n+2-span/2;yy=y+d;}
    ink(xx,yy,horizontal?span:1,horizontal?1:span,d===0?'#e1c9d5':d<3?'#ac7898':'#744d72');
   }
  }
 }
 entity(c,e,time,game){
  if(e.collected||e.removed||e.visible===false)return;
  const type=e.type||e.kind||'',p=point(e),x=p.x,y=p.y,bob=Math.round(Math.sin(time*2.6+(e.x||0)*.07));
  const dormant=(e.active===false&&e.cooldown===undefined)||e.cooldown>0||e.respawnTimer>0;
  const double=type==='doublerefill'||e.dashes>=2;
  if(type==='book'){
   const yy=y-2+bob;
   c.save();c.globalAlpha=.12;disk(c,x,yy,10,'#8cf6db');c.restore();
   rect(c,x-6,yy-5,12,10,'#182c45');rect(c,x-5,yy-5,4,8,'#f7e8bd');rect(c,x+1,yy-5,4,8,'#d6d1b3');
   rect(c,x-6,yy+4,6,2,'#43c4c4');rect(c,x+1,yy+4,5,2,'#338bba');rect(c,x,yy-4,1,10,'#886a80');
   rect(c,x-4,yy-3,2,1,'#9f95a3');rect(c,x+2,yy-3,2,1,'#9f95a3');rect(c,x-4,yy,3,1,'#b1a4a6');
   if(Math.sin(time*2+x)>.65){rect(c,x+8,yy-7,1,3,'#b4f9da');rect(c,x+7,yy-6,3,1,'#b4f9da');}return;
  }
  if(type==='portal'){
   const xx=Math.round(e.x),yy=Math.round(e.y),w=e.w||18,h=e.h||28,lit=e.active!==false;
   rect(c,xx-2,yy+7,w+4,h-7,'#202a48');polygon(c,[[xx,yy+8],[xx+3,yy+2],[xx+w/2,yy],[xx+w-3,yy+2],[xx+w,yy+8],[xx+w,yy+h],[xx,yy+h]],'#7385ae');
   polygon(c,[[xx+3,yy+9],[xx+5,yy+5],[xx+w/2,yy+3],[xx+w-5,yy+5],[xx+w-3,yy+9],[xx+w-3,yy+h],[xx+3,yy+h]],lit?'#294f79':'#252d4d');
   c.save();c.globalAlpha=.18;disk(c,xx+w/2,yy+h/2,17,'#6bdedb');c.restore();
   for(let i=0;i<7;i++){const py=yy+7+wrap(i*5-time*9,h-8),px=xx+4+Math.floor(hash(i+e.x)*Math.max(1,w-8));rect(c,px,py,i%3===0?2:1,1,lit?'#7ee3dc':'#526484');}
   rect(c,xx+2,yy+9,1,h-10,'#b5dbe1');rect(c,xx+w-3,yy+9,1,h-10,'#6587b5');rect(c,xx-3,yy+h,w+6,3,'#9eb3c4');rect(c,xx-2,yy+h+3,w+4,2,'#394e71');
   if(e.trialIndex!==undefined)pixelText(c,String(e.trialIndex+1).padStart(2,'0'),xx+Math.floor(w/2)-3,yy-9,'#f4dfb0');return;
  }
  if(type==='mentor'||type==='npc'){
   sprite(c,['....hhh....','...hhhhh...','...hsssh...','...hsesh...','....sss....','...cgggc...','..ccgggcc..','..scgggcs..','...cgggc...','...bbbbb...','...bb.bb...','..bbb.bbb..'],{h:'#d8c9bc',s:'#cfa59f',e:'#363451',c:'#764a76',g:'#a28d92',b:'#343651'},x-5,e.y+(e.h||12)-12);return;
  }
  if(type==='campfire'){
   line(c,x-8,y+5,x+7,y+8,'#846782');line(c,x+8,y+5,x-7,y+8,'#b08d91');
   polygon(c,[[x-5,y+4],[x-5,y],[x-2,y-3],[x-1,y-8-bob],[x+2,y-3],[x+5,y],[x+4,y+5]],'#e57b75');polygon(c,[[x-2,y+5],[x-2,y],[x+1,y-4],[x+3,y+4]],'#ffdc91');return;
  }
  if(type==='sign'||type==='districtSign'){
   rect(c,x-1,y,2,16,'#806a80');rect(c,x-14,y-9,28,12,'#263853');rect(c,x-14,y-9,28,1,'#9ba9be');
   c.font='5px monospace';c.textAlign='center';c.fillStyle='#d9d6c3';c.fillText(String(e.label||e.title||'CAMP').slice(0,12),x,y-2);c.textAlign='start';return;
  }
  if(type==='bench'){rect(c,e.x,e.y,e.w||24,3,'#a08793');rect(c,e.x+2,e.y+3,2,7,'#4d4967');rect(c,e.x+(e.w||24)-4,e.y+3,2,7,'#4d4967');return;}
  if(type==='dream'){
   const xx=Math.round(e.x),yy=Math.round(e.y),w=e.w||24,h=e.h||24;rect(c,xx,yy,w,h,'#222137');rect(c,xx+1,yy+1,w-2,h-2,'#171f36');
   c.save();c.beginPath();c.rect(xx+1,yy+1,w-2,h-2);c.clip();for(let i=0;i<Math.max(9,w*h/32);i++){const px=xx+wrap(hash(i+xx)*w+time*(i%2?3:-2),w),py=yy+wrap(hash(i+yy+21)*h+time*(1+i%3),h);rect(c,px,py,1,1,['#a6c8b4','#9a9cc3','#d0b6c3','#6da5b9'][i%4]);}c.restore();rect(c,xx,yy,w,1,'#a19bbb');rect(c,xx,yy,1,h,'#777799');rect(c,xx+w-1,yy,1,h,'#505875');rect(c,xx,yy+h-1,w,1,'#505875');return;
  }
  if(type==='zip'||type==='movingBlock'){
   const from=e.path?.[0]||e.from||e.start||{x:e.startX??e.x,y:e.startY??e.y},to=e.path?.[e.path.length-1]||e.to||e.end||{x:e.endX??e.x+45,y:e.endY??e.y};
   const anchor=(e.w||20)/2;
   line(c,from.x+anchor,from.y+3,to.x+anchor,to.y+3,'#151d2e');line(c,from.x+anchor,from.y+4,to.x+anchor,to.y+4,'#91828a');
   for(const a of[from,to]){disk(c,a.x+anchor,a.y+3,3,'#2b3043');disk(c,a.x+anchor,a.y+3,2,'#b79588');rect(c,a.x+anchor,a.y+2,1,3,'#594951');}
   const w=e.w||20,h=e.h||12;rect(c,e.x,e.y,w,h,'#3b303d');rect(c,e.x+1,e.y+1,w-2,h-2,'#8c665f');rect(c,e.x+1,e.y,w-2,2,'#d3ad8b');rect(c,e.x+3,e.y+4,w-6,h-6,'#5b454b');for(let i=4;i<w-2;i+=5)rect(c,e.x+i,e.y+2,1,h-3,'#b2826b');rect(c,e.x+2,e.y+h-2,w-4,1,'#312d3d');rect(c,e.x+w/2-1,e.y+4,2,2,e.active?'#b8ceb0':'#d2aa81');return;
  }
  if(type==='refill'||type==='doublerefill'){
   if(dormant){sprite(c,refillRows,{a:'#526978'},x-3,y-3);return;}
   c.save();c.globalAlpha=.15;disk(c,x,y+bob,7,double?'#e5a3c0':'#98e3c4');c.restore();
   sprite(c,refillRows,{a:double?'#875974':'#497e79',b:double?'#dfa2be':'#8cddbb',c:'#e3efcf'},x-3,y-3+bob);
   if(double){rect(c,x-5,y+bob,1,1,'#efc4d4');rect(c,x+5,y+bob,1,1,'#efc4d4');}return;
  }
  if(type==='spring'||type==='wallSpring'){
   const direction=e.direction||e.dir;
   const vertical=type==='wallSpring'||direction==='left'||direction==='right',pressed=e.timer>0||e.compressed>0||e.cooldown>0;
   c.save();c.translate(Math.round(e.x),Math.round(e.y));if(vertical){c.translate(direction==='left'?0:4,8);c.rotate(direction==='left'?-Math.PI/2:Math.PI/2);}
   const w=e.w||10;rect(c,0,3,w,3,'#3a3847');rect(c,1,2,w-2,2,'#907978');rect(c,2,pressed?2:0,w-4,1,'#ecd09d');for(let i=2;i<w-1;i+=3){rect(c,i,pressed?3:1,1,2,'#ae8b8e');rect(c,i+1,2,1,1,'#d4b9aa');}c.restore();return;
  }
  if(type==='bumper'){
   const r=e.r||8;disk(c,x,y,r+1,'#26374b');disk(c,x,y,r,dormant?'#4e5f74':'#4e7994');disk(c,x,y,r-2,dormant?'#82949c':'#86b8c5');disk(c,x+1,y+1,r-4,dormant?'#526171':'#4e718c');
   rect(c,x-2,y-3,3,1,'#d6e5de');rect(c,x-3,y-2,1,2,'#d6e5de');
   for(let i=0;i<4;i++){const a=i*TAU/4+time*.4,xx=Math.round(Math.cos(a)*(r-1)),yy=Math.round(Math.sin(a)*(r-1));rect(c,x+xx,y+yy,1,1,'#d6d4aa');}return;
  }
  if(type==='bubble'){
   const radius=e.r||8;disk(c,x,y,radius+1,'#29494a');disk(c,x,y,radius,dormant?'#587276':'#5eab8e');disk(c,x,y,radius-2,dormant?'#354f63':'#abd0a1');disk(c,x+1,y+1,radius-4,'#4e9986');rect(c,x-3,y-4,3,1,'#dce7b8');rect(c,x-4,y-3,1,2,'#dce7b8');
   if(!dormant){rect(c,x-1,y-2,2,5,'#e4edc6');rect(c,x-2,y-1,4,2,'#e4edc6');}return;
  }
  if(type==='jelly'){drawJelly(c,e,time,game.player);return;}
  if(type==='carryCrystal'){drawCarryCrystal(c,e,time);return;}
  if(type==='strawberry'||type==='berry'){
   if(e.winged){const flap=Math.round(Math.sin(time*8)*2);sprite(c,['..aa','aaab','abb.'],{a:'#d5dbdb',b:'#8d9eae'},x-8,y-3+flap);sprite(c,['aa..','baaa','.bba'],{a:'#d5dbdb',b:'#8d9eae'},x+4,y-3-flap);}
   sprite(c,berryRows,{g:'#6e8a76',r:'#bd637c',y:'#ebc395'},x-4,y-4+bob);rect(c,x-2,y-2+bob,2,1,'#e69a9a');return;
  }
  if(type==='checkpoint'){
   line(c,x,y-14,x,y+2,'#91868b');const warm=e.activated||e.active;for(let i=0;i<7;i++)rect(c,x+1+i,y-14+Math.round(Math.sin(time*3+i*.6)),1,5-i*.4,warm?'#cc8798':'#6b849a');rect(c,x-2,y+2,5,2,'#655c6d');return;
  }
  if(type==='falling'||type==='crumble'||type==='moving'||type==='dashblock'){
   this.solid(c,{...e,kind:type==='dashblock'?'bare':'platform'},palettes[themeFor(game.room)]);if(type==='crumble')line(c,e.x+3,e.y+2,e.x+(e.w||16)-3,e.y+(e.h||8)-2,'#393749');return;
  }
  // Smaller optional gym objects stay within the same material palette.
  if(type==='key'){rect(c,x-3,y-2,4,4,'#d6bb8a');rect(c,x-2,y-1,2,2,'#4c4a5d');rect(c,x+1,y,5,1,'#d6bb8a');rect(c,x+4,y+1,1,2,'#d6bb8a');}
 }
 goal(){}
 decoration(){}
 renderTrace(points,markers=[],ctx=this.c){
  if(!Array.isArray(points)||!points.length)return;
  ctx.save();ctx.globalAlpha=.48;let lastDot=null;
  for(const p of points){
   if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
   // Select actual samples; no interpolated or fabricated character animation.
   if(!lastDot||Math.hypot(p.x-lastDot.x,p.y-lastDot.y)>=3){rect(ctx,p.x-1,p.y-1,2,2,'#18283d');rect(ctx,p.x,p.y,1,1,'#c8c0a4');lastDot=p;}
  }
  ctx.globalAlpha=.78;
  for(const p of markers||[]){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
   if(p.kind==='death'){line(ctx,p.x-2,p.y-2,p.x+2,p.y+2,'#dca0b0');line(ctx,p.x-2,p.y+2,p.x+2,p.y-2,'#dca0b0');continue;}
   const color=/land|refill/.test(p.kind||'')?'#c2d8b7':/dash/.test(p.kind||'')?'#e4ba9e':'#c7bfdb';
   rect(ctx,p.x-3,p.y-3,2,1,color);rect(ctx,p.x+2,p.y-3,2,1,color);rect(ctx,p.x-3,p.y+3,2,1,color);rect(ctx,p.x+2,p.y+3,2,1,color);
   if(p.dx||p.dy)line(ctx,p.x,p.y,p.x+(p.dx||0)*3,p.y+(p.dy||0)*3,color);
  }
  ctx.restore();
 }

 drawTrainingOverlay(c,overlay){if(overlay?.enabled)this.renderTrace(overlay.trace||[],overlay.markers||[],c);}
 render(game,dt=1/60){
  if(!game?.room)return;dt=clamp(dt,0,.05);this.clock+=dt;const t=this.clock;this.events(game,dt);
  const room=game.room,p=game.player||{x:20,y:100,w:8,h:11},c=this.c;
  const target={x:clamp(p.x-156+clamp((p.vx||0)*.07,-16,16),0,Math.max(0,(room.width||W)-W)),y:clamp(p.y-104,0,Math.max(0,(room.height||H)-H))};
  const teleported=!this.cameraReady||this.cameraRoom!==room||Math.abs(p.x-(this.lastPlayerX??p.x))>120||Math.abs(p.y-(this.lastPlayerY??p.y))>100;
  const follow=1-Math.exp(-dt*18);
  if(teleported)this.camera={...target};else {this.camera.x+=(target.x-this.camera.x)*follow;this.camera.y+=(target.y-this.camera.y)*follow;}
  this.cameraReady=true;this.cameraRoom=room;this.lastPlayerX=p.x;this.lastPlayerY=p.y;
  const camera={x:Math.round(this.camera.x),y:Math.round(this.camera.y)};this.camera={...camera};
  const district=room.world?clamp(Math.floor((p.x-64)/544),0,7):null;
  const districtTheme=district===null?null:['snow','hotel','snow','summit','temple','temple','snow','summit'][district];
  const cache=this.roomArt(room,camera,districtTheme),visible=e=>e.x+(e.w||24)>camera.x-40&&e.x<camera.x+W+40&&e.y+(e.h||24)>camera.y-40&&e.y<camera.y+H+40;
  c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';this.drawSky(c,cache.theme,t,camera);
  c.save();const sx=this.shake>.2?Math.round(Math.sin(this.clock*119)*this.shake):0,sy=this.shake>.2?Math.round(Math.cos(this.clock*103)*this.shake):0;c.translate(-camera.x+sx,-camera.y+sy);
  // Terrain hides the buried parts of shared death strips while gaps stay visible.
  for(const h of room.hazards||[])if(visible(h))this.hazard(c,h,t);
  // Cables and dream interiors appear behind the climber; all objects remain crisp.
  for(const s of room.solids||[])if(s.kind==='dream')this.entity(c,{...s,type:'dream'},t,game);
  for(const e of room.entities||[])if(e.type==='dream'||e.type==='zip'||e.type==='movingBlock')this.entity(c,e,t,game);
  c.drawImage(cache.image,cache.x,cache.y);
  for(const s of room.solids||[])if(s.dynamic||s.moving)this.solid(c,s,cache.p);
  for(const d of cache.decor)this.decoration(c,d,t);
  if(room.world){
   for(const district of room.districts||[])for(let row=0;row<4;row++){
    const x=district.x+24,y=320+row*336;
    if(!visible({x,y:y-45,w:100,h:48}))continue;
    rect(c,x+5,y-29,2,29,'#6d6b8d');rect(c,x+71,y-29,2,29,'#6d6b8d');
    rect(c,x,y-44,80,19,'#25324f');rect(c,x,y-44,80,1,'#a4b6cc');rect(c,x+1,y-43,78,1,'#526e91');rect(c,x+2,y-27,76,1,'#142b47');
    pixelText(c,String(district.index+1).padStart(2,'0')+' / CAMP',x+17,y-37,'#d6e5dc');
    if(row===0){this.entity(c,{type:'campfire',x:x+52,y:y-12,w:10,h:12},t,game);}
    else this.entity(c,{type:'bench',x:x+29,y:y-10,w:26,h:10},t,game);
   }
  }
  this.drawTrainingOverlay(c,game.trainingOverlay);
  this.goal(c,room.goal,t,game.complete);
  for(const e of room.entities||[])if(visible(e)&&e.type!=='dream'&&e.type!=='zip'&&e.type!=='movingBlock')this.entity(c,e,t,game);
  for(const q of this.contacts||[]){c.save();c.globalAlpha=q.life/.12*.72;if(q.wall){rect(c,q.x,q.y-3,1,6,'#e3e4db');rect(c,q.x+(q.life>.06?1:-1),q.y-1,1,2,'#a7c3cc');}else if(q.direction){rect(c,q.x-q.direction*(q.skid?6:4),q.y-1,q.skid?5:3,1,'#bacbd5');}else{rect(c,q.x-4,q.y-1,8,1,'#e3e4db');rect(c,q.x-6,q.y,2,1,'#9fbdc8');rect(c,q.x+5,q.y,2,1,'#9fbdc8');}c.restore();}
  // Speed wakes are directional and sparse; the character owns body echoes and hair.
  const speed=Math.hypot(p.vx||0,p.vy||0),dash=p.state==='dash'||p.state==='dream';
  if(speed>190){const dx=(p.vx||0)/speed,dy=(p.vy||0)/speed;for(let i=0;i<(dash?3:2);i++){const phase=hash(i+Math.floor(t*24)),offset=(i-1)*3,xx=p.x+4-dx*(5+phase*8)-dy*offset,yy=p.y+6-dy*(5+phase*8)+dx*offset;line(c,xx,yy,xx-dx*(2+phase*4),yy-dy*(2+phase*4),dash?'#c1d8df':'#788da8');}}
  if(dash&&dt>0&&this.clock-this.echoClock>.035){
   this.echoClock=this.clock;const image=surface(32,32),ec=image.getContext('2d');
   ec.translate(16-(p.x+4),26-(p.y+(p.h||11)));this.echoCharacter.reset();this.echoCharacter.draw(ec,p,t,0);
   ec.setTransform(1,0,0,1,0,0);ec.globalCompositeOperation='source-atop';rect(ec,0,0,32,32,'#94c7db');
   this.echoes.push({image,x:p.x+4-16,y:p.y+(p.h||11)-26,life:.13});
  }
  for(const echo of this.echoes){echo.life-=dt;c.globalAlpha=clamp(echo.life/.13,0,1)*.48;c.drawImage(echo.image,Math.round(echo.x),Math.round(echo.y));}c.globalAlpha=1;this.echoes=this.echoes.filter(echo=>echo.life>0);
  drawCharacter(c,p,t,dt);
  for(const q of this.particles){c.globalAlpha=clamp(q.life/q.max,0,1);rect(c,q.x,q.y,q.size,q.size,q.color);}c.globalAlpha=1;
  c.restore();
  if(this.flash>0){c.save();c.globalAlpha=this.flash*.7;rect(c,0,0,W,H,'#c3a4bb');c.restore();}
  this.ctx.setTransform(1,0,0,1,0,0);this.ctx.imageSmoothingEnabled=false;this.ctx.drawImage(this.frame,0,0,this.canvas.width,this.canvas.height);
 }
}
