// Reconstructed from the native player_move/player_idle tracks. See research/sources.md.
export const SPEED=450*1.05, WORLD={width:2048,height:1536};
export const STRIDE={y:[-24,-14,-29,-24,-14,-29,-24],sx:[1,1.2,.9,1,1.2,.9,1],sy:[1,.8,1.1,1,.8,1.1,1],left:[[15,18],[11.5003,16.286],[-16.8894,18.0515],[-15,19],[-12.0619,19.9366],[-.132312,20.8938],[15,18]],right:[[-16,18],[-11.4325,20.0598],[12.6265,20.136],[13,20],[14.98,17.9527],[-7.66991,20.822],[-16,18]],la:[-29.1,12.2,67.7,76.5,109.1,-14.5,-29.1],ra:[61.3,104.8,-47.8,-33.5,29.1,41.6,61.3]};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=(t,n)=>((t%n)+n)%n;
const mix=(a,b,t)=>a+(b-a)*t;
function sample(a,t,body=false){let f=wrap(t,.6)*10,i=Math.min(5,Math.floor(f)),u=f-i;const c=body?[1,.5,1,1,.5,2][i]:1;u=c<1?1-Math.pow(1-u,1/c):Math.pow(u,c);return Array.isArray(a[0])?a[i].map((v,k)=>mix(v,a[i+1][k],u)):mix(a[i],a[i+1],u);}
function breath(t){const p=wrap(t,1),x=p<.5?p*2:(1-p)*2;let u=x;for(let i=0;i<6;i++)u=clamp(u-(1.5*u-1.5*u*u+u*u*u-x)/(1.5-3*u+3*u*u),0,1);return u*u*(3-2*u);}
export function poseAt(clip,time,facing=1){const moving=clip==='walk',b=breath(time),l=moving?sample(STRIDE.left,time):[15,18],r=moving?sample(STRIDE.right,time):[-16,18];return {clip,time,frame:moving?Math.floor((wrap(time,.6)+1e-7)*10)%6:Math.floor(wrap(time,1)*6),phase:moving?wrap(time,.6)/.6:wrap(time,1),y:moving?sample(STRIDE.y,time,true):-24+b*5,sx:moving?sample(STRIDE.sx,time,true):1+b*.15,sy:moving?sample(STRIDE.sy,time,true):1-b*.15,facing,left:{x:l[0],y:l[1],angle:moving?sample(STRIDE.la,time)*Math.PI/180:0,sx:1},right:{x:r[0],y:r[1],angle:moving?sample(STRIDE.ra,time)*Math.PI/180:0,sx:moving?-1:1}};}
const expo=t=>t>=1?1:1-Math.pow(2,-10*t);
export function recoilAt(age){if(age<0||age>=.2)return 0;return age<.1?25*expo(age/.1):25*(1-expo((age-.1)/.1));}
export function weaponPose(player){const age=player.shotAge,angle=player.gunAngle,recoil=recoilAt(age);return {x:player.x-2,y:player.y-10,angle,recoil,phase:age<.035?'fire':age<.1?'recoil':age<.2?'return':player.targetId?'aim':'rest',muzzle:{x:player.x-2+Math.cos(angle)*(56-recoil),y:player.y-10+Math.sin(angle)*(56-recoil)}};}
function segmentDistance(px,py,ax,ay,bx,by){let dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(px-ax-dx*t,py-ay-dy*t);}
export function createSimulation({onEvent=()=>{}}={}){
const s={time:0,section:'arena',player:{},enemies:[],bullets:[],effects:[],materials:[],shots:0,hits:0,pickups:0,damageTaken:0};
s.reset=(section='arena')=>{s.time=0;s.section=section;s.shots=0;s.hits=0;s.pickups=0;s.damageTaken=0;s.player={x:1024,y:768,prevX:1024,prevY:768,vx:0,vy:0,facing:1,action:'idle',clipTime:0,walkTime:0,gunAngle:0,shotAge:10,cooldown:0,targetId:null,invuln:0,hp:15,maxHp:15,speedBonus:5,harvesting:8};s.bullets=[];s.effects=[];s.materials=[{x:900,y:870},{x:945,y:900},{x:985,y:925}];s.enemies=[{id:'target-a',kind:'target',x:1280,y:730,r:26,hp:120,maxHp:120},{id:'target-b',kind:'target',x:915,y:500,r:26,hp:120,maxHp:120},{id:'target-c',kind:'target',x:760,y:920,r:26,hp:120,maxHp:120}];if(section==='arena')s.enemies.push({id:'chaser-a',kind:'chaser',x:1550,y:1070,r:24,hp:36,maxHp:36},{id:'chaser-b',kind:'chaser',x:535,y:620,r:24,hp:36,maxHp:36});};
s.step=(dt,input={})=>{
 if(!(dt>0&&Number.isFinite(dt)))return;dt=Math.min(dt,.05);s.time+=dt;const p=s.player;p.prevX=p.x;p.prevY=p.y;
 let mx=Number(!!input.right)-Number(!!input.left),my=Number(!!input.down)-Number(!!input.up),len=Math.hypot(mx,my);if(len>1){mx/=len;my/=len;}
 p.x=clamp(p.x+mx*SPEED*dt,26,WORLD.width-26);p.y=clamp(p.y+my*SPEED*dt,26,WORLD.height-26);p.vx=(p.x-p.prevX)/dt;p.vy=(p.y-p.prevY)/dt;
 const action=len?'walk':'idle',oldClip=p.action===action?p.clipTime:0;if(p.action!==action){p.clipTime=0;p.action=action;}else p.clipTime+=dt*(action==='walk'?1.05:1);if(mx)p.facing=mx>0?1:-1;
 if(len){p.walkTime+=dt*1.05;for(const k of [.1,.4])if(Math.floor((oldClip-k)/.6)<Math.floor((p.clipTime-k)/.6)){s.effects.push({kind:'dust',x:p.x,y:p.y+12,age:0});onEvent('step');}}
 p.invuln=Math.max(0,p.invuln-dt);p.shotAge+=dt;if(p.shotAge>=.2)p.cooldown=Math.max(0,p.cooldown-dt);
 for(const e of s.enemies){e.flash=Math.max(0,(e.flash||0)-dt);if(e.dead){e.dead-=dt;if(e.dead<=0){e.dead=0;e.hp=e.maxHp;e.x=e.homeX;e.y=e.homeY;}continue;}if(e.kind==='chaser'){const d=Math.hypot(p.x-e.x,p.y-12-e.y);e.x+=(p.x-e.x)/(d||1)*67*dt;e.y+=(p.y-12-e.y)/(d||1)*67*dt;if(d<46&&!p.invuln){p.hp=Math.max(1,p.hp-1);p.invuln=1;s.damageTaken++;s.effects.push({kind:'hurt',x:p.x,y:p.y-20,age:0});onEvent('hurt');}}
 if(e.kx){e.x+=e.kx*dt;e.y+=e.ky*dt;e.kx*=Math.exp(-12*dt);e.ky*=Math.exp(-12*dt);}}
 let nearest=null,min=450;for(const e of s.enemies){if(e.dead)continue;const d=Math.hypot(e.x-(p.x-2),e.y-(p.y-10));if(d<min){min=d;nearest=e;}}
 if(p.shotAge<.2){const locked=s.enemies.find(e=>e.id===p.targetId&&!e.dead);if(locked)nearest=locked;}p.targetId=nearest?.id||null;if(nearest)p.gunAngle=Math.atan2(nearest.y-(p.y-10),nearest.x-(p.x-2));else if(p.shotAge>=.2)p.gunAngle=p.facing===1?0:Math.PI;
 if(nearest&&p.cooldown<=1e-8&&p.shotAge>=.2){p.shotAge=0;p.cooldown=1;const w=weaponPose(p),a=p.gunAngle;s.bullets.push({x:w.muzzle.x,y:w.muzzle.y,prevX:w.muzzle.x,prevY:w.muzzle.y,vx:Math.cos(a)*3000,vy:Math.sin(a)*3000,age:0,pierce:1,damage:12,hit:[]});s.shots++;onEvent('shot');}
 for(const b of s.bullets){b.prevX=b.x;b.prevY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.age+=dt;for(const e of s.enemies){if(e.dead||b.hit.includes(e.id))continue;if(segmentDistance(e.x,e.y,b.prevX,b.prevY,b.x,b.y)<e.r+3){b.hit.push(e.id);e.flash=.1;e.hp-=b.damage;e.kx=Math.sign(b.vx)*15*16;e.ky=Math.sign(b.vy)*15*16;s.hits++;s.effects.push({kind:'hit',x:e.x,y:e.y,age:0,damage:b.damage});onEvent('hit');if(e.hp<=0){e.homeX=e.x;e.homeY=e.y;e.dead=1;s.materials.push({x:e.x,y:e.y+12});}if(b.pierce--<=0){b.age=2;break;}b.damage*=.5;}}}
 s.bullets=s.bullets.filter(b=>b.age<.5);for(const f of s.effects)f.age+=dt;s.effects=s.effects.filter(f=>f.age<.65);
 s.materials=s.materials.filter(m=>{const d=Math.hypot(m.x-p.x,m.y-p.y);if(d<75){m.x+=(p.x-m.x)*Math.min(1,dt*13);m.y+=(p.y-m.y)*Math.min(1,dt*13);}if(d<20){s.pickups++;onEvent('pickup');return false;}return true;});
};s.reset();return s;
}
