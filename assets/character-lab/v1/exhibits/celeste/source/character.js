// Original hand-pixelled climber. Coordinates are collider top-left, pixels stay
// on the native grid. No source-game sprite sheets are included or downloaded.
// Independently authored 14-pixel-tall frames, on the game's 320×180 grid.
// The face, jacket, trousers and boots each read as one compact color mass.
const INK='#202232';
const BASE={o:INK,k:'#2a2634',B:'#708ac4',C:'#494f87',I:'#a3b4db',G:'#62526c',g:'#857287',f:'#ffe3cf',F:'#edbba9',p:'#493040',P:'#704553',d:'#d1acaa',t:'#8b7b88',s:'#fff0de'};
const HAIR=[{h:'#234979',r:'#5cb8ef',l:'#a3ddff'},{h:'#8e293e',r:'#d94759',l:'#ed6a72'},{h:'#925089',r:'#ee91d4',l:'#ffc7ed'}];
const HEAD=['..rrrr..','.hrrrrr.','hrrrrrr.','hrrrfff.','hrrfffk.','.hrfff..'];
const HEAD_UP=['..rrrr..','.hrrrrr.','hrrrrff.','hrrfffk.','hrrffff.','.hrff...'];
const IDLE=['.GGoo...','oGGBBB..','oGCBBIfo','.oCBBBfo','..oBBBo.','...pp...'];
const RUN_A=['.GGoo...','oGGBBB..','oGCBBIBf','.oCBBBff','..oBBB..','...pp...'];
const RUN_B=['..GGoo..','.oGGBBB.','foGCBBIB','ffoCBBB.','...oBBB.','....pp..'];
const RUN_C=['.GGoo...','oGGBBB..','oGCBBIff','.oCBBBf.','..oBBB..','...pp...'];
// Contact, recoil, passing and flight, then the opposite leg leads.
const RUN_LEGS=[
 ['...pPp....','..pP.pp...','.pP...p...','.dd...dd..','dd.....dd.'],
 ['...pPp....','...pPpp...','..pP.pp...','..dd.pd...','.dd..dd...'],
 ['...pPp....','...pPp....','...pPpp...','...ddpd...','...dd.dd..'],
 ['...pPpp...','...pPPp...','..ppPp....','..ddpp....','....dd....'],
 ['...pPp....','..pp.Pp...','..p...Pp..','.dd...dd..','dd.....dd.'],
 ['...pPp....','...ppPp...','...pp.Pp..','...dp.dd..','...dd..dd.'],
 ['...pPp....','...pPp....','..ppPp....','..dpdd....','.dd.dd....'],
 ['..ppPp....','..pPPp....','...pPpp...','...ppdd...','...dd.....'],
];
const STAND=['...pPp....','...p.p....','...d.d....','..dd.dd...'];
const RISE=['...pPpp...','..pPPpPp..','..dd..pp..','.dd...d...','......dd..'];
const APEX=['...pPpp...','..pP.pp...','..dd..pp..','.dd...dd..','.......dd.'];
const FALL=['...pPp....','...pPpp...','..pP.Pp...','..dd..d...','.dd...dd..'];
const AIR=['.GGoo...','oGGBBB..','fGCBBIff','f.CBBB.f','..oBBB..','...pp...'];
const REACH=['......ff','.GGoo.Bf','oGGBBBB.','oGCBBI..','.oCBBB..','..oBBB..'];
const CLIMB=['......ff','.....oBf','.GGooBB.','oGGBBB..','oGCBBI..','.oCBBB..','..oBBB..'];
const CARRY=['ff.....ff','BB.....BB','.BB...BB.','..BBBBB..','.GCBBIB..','.oCBBB...','..oBBB...'];
const CLIMB_LEGS=[
 ['...pPp....','...pPpp...','...p.dd...','...d......','..dd......'],
 ['...pPp....','..ppPp....','..dd.p....','.....d....','.....dd...'],
];
const DUCK=['.GGoo....','oGGBBBf..','.oCBBBff.','..pPPpp..','.dd..dd..'];
const DASH=['...GGoo....','..oGGBBBff.','pppGCBBBff.','dpppBBBB...','ddd.pp.....'];
const LAND=['.GGooo...','oGGBBBB..','.GCBBIBff','.oBBBBBf.','..ppPPp..','.dd..dd..'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function surface(w,h){if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(w,h);if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}return null;}
function pixels(ctx,map,x,y,palette){for(let yy=0;yy<map.length;yy++)for(let xx=0;xx<map[yy].length;xx++){const color=palette[map[yy][xx]];if(color){ctx.fillStyle=color;ctx.fillRect(x+xx,y+yy,1,1);}}}
function linePixels(ctx,x0,y0,x1,y1,size){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;for(let i=0;i<80;i++){ctx.fillRect(x0-Math.floor(size/2),y0-Math.floor(size/2),size,size);if(x0===x1&&y0===y1)break;const q=2*err;if(q>=dy){err+=dy;x0+=sx;}if(q<=dx){err+=dx;y0+=sy;}}}

export function createCharacterRenderer(){
  const cache=new Map();let hair=[],stride=0,previous=null;
  function reset(){hair=[];stride=0;previous=null;}
  function frameFor(p,time,dt){
    const vx=p.vx||0,vy=p.vy||0,state=p.state||'normal';
    const dying=state==='dead'||p.dead===true;
    const duck=!!(p.ducking||p.ducked);
    let name='idle',head=HEAD,hx=-3,hy=-14,body=IDLE,bx=-4,by=-8,legs=STAND,ly=-4,angle=0;
    let runFrame=0;
    if(p.grounded&&Math.abs(vx)>12){stride+=Math.abs(vx)*dt/40;runFrame=Math.floor(stride*8)%8;name='run'+runFrame;body=[RUN_A,RUN_C,RUN_B,RUN_C,RUN_A,RUN_C,RUN_B,RUN_C][runFrame];legs=RUN_LEGS[runFrame];const bob=[0,1,0,-1,0,1,0,-1][runFrame];hy+=bob;by+=bob;hx+=1;}
    else if(state==='climb'||(!p.grounded&&p.wall&&vy>25&&p.stamina>0)){const step=Math.floor(time*(Math.abs(vy)>5?9:2))%2;name='climb'+step;body=CLIMB;bx=-4;by=-10+(step&&Math.abs(vy)>5?1:0);legs=CLIMB_LEGS[step];head=HEAD_UP;hx=-2;hy=-15;}
    else if(!p.grounded){
      if(vy<-35){name='rise';body=REACH;by=-9;legs=RISE;head=HEAD_UP;hy=-15;}
      else if(vy<35){name='apex';body=AIR;legs=APEX;hy=-14;}
      else{name='fall';body=AIR;legs=FALL;hy=-13;}
    }
    else{const breath=Math.sin(time*2.4)>.62?1:0;hy-=breath;by-=breath;name='idle'+breath;}
    if(p.grounded&&(p.landAge??99)<.12&&(p.landSpeed||0)>80&&!duck){name='land';body=LAND;by=-6;legs=[];hy=-13;}
    if(duck||state==='dash-freeze'){name=state==='dash-freeze'?'anticipation':'duck';body=DUCK;bx=-4;by=-4;legs=[];hy=-11;hx=-2;}
    if(state==='dash'||state==='dream'){
      const direction=p.dashDir||p.dashAim||{x:vx,y:vy};let dx=Number(direction.x)||0,dy=Number(direction.y)||0;
      if(Math.abs(dx)+Math.abs(dy)<.1)dx=p.facing||1;
      angle=Math.round(Math.atan2(dy,Math.abs(dx))*4/Math.PI)*Math.PI/4;
      name='dash'+Math.round(angle*4/Math.PI);body=DASH;bx=-7;by=-7;legs=[];hx=0;hy=-12;
    }
    if(p.holding&&!dying&&state!=='dash'){name+='carry';body=CARRY;bx=-4;by=-9;}
    const blink=name.startsWith('idle')&&((time%4.4)>4.26);
    return{name,head,hx,hy,body,bx,by,legs,ly,angle,blink,dying};
  }
  function sprite(ctx,pose,palette,paletteIndex){
    const key=pose.name+':'+pose.by+':'+paletteIndex+':'+(pose.blink?1:0);
    let image=cache.get(key);
    function paint(c){
      pixels(c,pose.body,pose.bx,pose.by,palette);
      pixels(c,pose.legs,-5,pose.ly,palette);
      pixels(c,pose.head,pose.hx,pose.hy,palette);
      if(pose.blink){c.fillStyle=palette.f;c.fillRect(pose.hx+6,pose.hy+4,1,1);c.fillStyle=INK;c.fillRect(pose.hx+6,pose.hy+5,1,1);}
    }
    if(!image){image=surface(48,48);if(image){const c=image.getContext('2d');c.imageSmoothingEnabled=false;c.translate(24,32);paint(c);
      if(pose.angle){
        const source=c.getImageData(0,0,48,48),target=c.createImageData(48,48),cos=Math.cos(pose.angle),sin=Math.sin(pose.angle);
        // Explicit nearest-pixel inverse rotation keeps diagonal dashes crisp;
        // Canvas fillRect rotations would otherwise antialias their tiny edges.
        for(let y=0;y<48;y++)for(let x=0;x<48;x++){
          const dx=x+.5-24,dy=y+.5-25,sx=Math.floor(24+dx*cos+dy*sin),sy=Math.floor(25-dx*sin+dy*cos);
          if(sx<0||sx>=48||sy<0||sy>=48)continue;const a=(sy*48+sx)*4,b=(y*48+x)*4;
          for(let q=0;q<4;q++)target.data[b+q]=source.data[a+q];
        }
        c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,48,48);c.putImageData(target,0,0);
      }
      cache.set(key,image);}}
    if(image)ctx.drawImage(image,-24,-32);else paint(ctx);
  }
  function updateHair(root,facing,p,dt){
    const teleported=previous&&Math.hypot(root.x-previous.x,root.y-previous.y)>36;
    if(!hair.length||teleported){hair=Array.from({length:6},(_,i)=>({x:root.x-facing*i*.4,y:root.y+i*1.05,vx:0,vy:0}));}
    const steps=Math.max(1,Math.ceil(dt/.012)),step=dt/steps;
    for(let iter=0;iter<steps;iter++){
      hair[0].x=root.x;hair[0].y=root.y;
      for(let i=1;i<hair.length;i++){
        const node=hair[i],parent=hair[i-1];
        const wind=clamp((p.vx||0)*.017,-3,3);
        const tx=parent.x-facing*.4-wind,ty=parent.y+1.05+clamp((p.vy||0)*.003,-.7,.9);
        node.vx+=(tx-node.x)*95*step;node.vy+=(ty-node.y)*95*step;
        const drag=Math.exp(-11*step);node.vx*=drag;node.vy*=drag;node.x+=node.vx*step;node.y+=node.vy*step;
        const dx=node.x-parent.x,dy=node.y-parent.y,d=Math.hypot(dx,dy),limit=i<3?3.4:2.8;
        if(d>limit){node.x=parent.x+dx/d*limit;node.y=parent.y+dy/d*limit;}
      }
    }
    previous={...root};
  }
  function drawHair(ctx,origin,palette){
    const points=hair.map(n=>({x:Math.round(n.x-origin.x),y:Math.round(n.y-origin.y)}));
    for(const outline of [true,false])for(let i=points.length-1;i>0;i--){const size=Math.max(1,5-Math.floor(i*.7));ctx.fillStyle=outline?palette.h:i>3?palette.h:palette.r;linePixels(ctx,points[i-1].x,points[i-1].y,points[i].x,points[i].y,size);}
    ctx.fillStyle=palette.l;for(let i=1;i<4&&i<points.length;i++)ctx.fillRect(points[i].x-1,points[i].y-1,1,1);
  }
  function draw(ctx,p,time=0,dt=1/60){
    if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
    dt=clamp(Number.isFinite(dt)?dt:1/60,0,1/20);
    const pose=frameFor(p,time,dt),facing=(p.state==='climb'&&p.wall?p.wall:p.facing)<0?-1:1;
    const origin={x:Math.floor(p.x+(p.w||8)/2),y:Math.floor(p.y+(p.h||11))};
    const paletteIndex=p.dashes>=2?2:p.dashes>0?1:0,palette={...BASE,...HAIR[paletteIndex]};
    let rx=pose.hx,ry=pose.hy+3;
    if(pose.angle){const y=ry+7,x=rx;rx=x*Math.cos(pose.angle)-y*Math.sin(pose.angle);ry=-7+x*Math.sin(pose.angle)+y*Math.cos(pose.angle);}
    updateHair({x:origin.x+rx*facing,y:origin.y+ry},facing,p,dt);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(origin.x,origin.y);
    if(pose.dying){
      const age=Math.max(0,Number(p.deathAge)||0),progress=clamp(age/.4,0,1);
      if(age<.035){ctx.scale(facing,1);sprite(ctx,pose,palette,paletteIndex);}
      else{for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8,r=4+progress*23,x=Math.round(Math.cos(a)*r),y=Math.round(-9+Math.sin(a)*r);ctx.globalAlpha=Math.max(0,1-progress);ctx.fillStyle=[palette.r,palette.B,palette.f,palette.l][i%4];ctx.fillRect(x-1,y-1,3,3);ctx.fillStyle='#fff1e8';ctx.fillRect(x,y,1,1);}}
    }else{
      drawHair(ctx,origin,palette);
      ctx.scale(facing,1);sprite(ctx,pose,palette,paletteIndex);
      if(p.state==='dash-freeze'){ctx.fillStyle='#f7f5e6';ctx.fillRect(5,-11,1,1);ctx.fillRect(6,-10,1,1);}
      if((p.stamina||0)<20&&p.state==='climb'&&Math.floor(time*12)%2){ctx.fillStyle='#ffc0a0';ctx.fillRect(3,-15,1,1);}
    }
    ctx.restore();
  }
  return{draw,reset};
}
const singleton=createCharacterRenderer();
export const drawCharacter=(ctx,p,time,dt)=>singleton.draw(ctx,p,time,dt);
drawCharacter.reset=()=>singleton.reset();
