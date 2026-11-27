// World coordinates use a 720-high reference frame. y is the sole of the standing body.
export const STEP = 1 / 120;
export const WORLD = {
  width: 2500, floor: 574, spawn: 240,
  block: {x: 865, w: 156, y: 464},
  shelf: {x: 1035, w: 275, y: 375},
  orb: {x: 1515, y: 382},
  targets: [{x: 626, y: 574}, {x: 2030, y: 574}],
};
export const MOVE = {
  run: 490, dash: 1100, dashTime: .30, dashRecover: .1,
  jump: 960, hold: .16, gravity: 4360, terminal: 1620,
  rebound: 1200, slapTime: 8 / 30, hitPause: 4 / 60,
  shotSpeed: 2250, shotInterval: .11, exSpeed: 1500,
};
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const ART_SCALE = 1.42;
const halfBody = 25;
const surfaces = [{id:'block', ...WORLD.block}, {id:'shelf', ...WORLD.shelf}];

export function createState() {
  return {
    x: WORLD.spawn, y: WORLD.floor, vx: 0, vy: 0, face: 1, ground: 'floor',
    time: 0, pose: 'Idle', poseAge: 0, stride: 0, aim: {x:1,y:0}, row: 2,
    held: {}, buffered: {}, holdTime: 0, dashTime: 0, dashCooldown: 0, dashFace: 1, airDashUsed: false,
    canSlap: true, slap: 0, rebound: 0, hitPause: 0, orbCooldown: 0, ignoredShelf: false,
    locked: false, duck: false, firing: false, shotCooldown: 0, exTime: 0, exAim: null,
    meter: 0, footTime: 0, stats: {shots:0, hits:0, dashes:0, parries:0, ex:0},
    flashes: WORLD.targets.map(()=>0), bullets: [], events: [],
  };
}
function emit(s, type, x=s.x, y=s.y, angle=0) {
  s.events.push({type,x,y,angle,face:s.face});
}
function updateAim(s, horizontal, vertical) {
  if (s.duck) { horizontal=s.face; vertical=0; }
  if (!horizontal && !vertical) horizontal=s.face;
  const length=Math.hypot(horizontal,vertical);
  s.aim={x:horizontal/length,y:vertical/length};
  s.row=vertical<0 ? (horizontal?1:0) : vertical>0 ? (horizontal?3:4) : 2;
}
// The offsets correspond to the fingertip in the forward-facing 116 x 142 shooting cells.
function muzzle(s) {
  const offsets=[[30,-119],[54,-97],[58,-52],[52,-26],[29,-10]];
  let [x,y]=offsets[s.row];
  if (!s.ground) {x=s.aim.x*s.face*30; y=-54+s.aim.y*32;}
  else if (s.duck) {x=65;y=-28;}
  return {x:s.x+x*ART_SCALE*s.face,y:s.y+y*ART_SCALE};
}
function fire(s, ex=false) {
  const {x,y}=muzzle(s);
  const aim=ex?s.exAim:s.aim, angle=Math.atan2(aim.y,aim.x);
  s.bullets.push({x,y,prevX:x,prevY:y,dx:aim.x,dy:aim.y,angle,age:0,ex});
  emit(s,ex?'exShot':'shot',x,y,angle);
  if (!ex) s.stats.shots++;
}
function horizontalMove(s, dx) {
  const b=WORLD.block;
  let next=s.x+dx;
  if (s.y>b.y+.1 && s.y-55<WORLD.floor) {
    if (dx>0 && s.x+halfBody<=b.x+.01) next=Math.min(next,b.x-halfBody);
    if (dx<0 && s.x-halfBody>=b.x+b.w-.01) next=Math.max(next,b.x+b.w+halfBody);
  }
  s.x=clamp(next,115,WORLD.width-115);
}
function overlaps(s, b) {return s.x+halfBody>b.x && s.x-halfBody<b.x+b.w;}
function verticalMove(s, dt, jumpHeld) {
  if (s.ground && s.ground!=='floor' && !overlaps(s,WORLD[s.ground])) s.ground=null;
  if (s.ground || s.dashTime>0 || s.exTime>0) return;
  if (s.holdTime>0 && jumpHeld) {s.vy=-MOVE.jump; s.holdTime=Math.max(0,s.holdTime-dt);}
  else {s.holdTime=0;s.vy=Math.min(MOVE.terminal,s.vy+MOVE.gravity*dt);}
  const last=s.y;
  s.y+=s.vy*dt;
  if (s.vy<0) return;
  const landed=surfaces.find(p=>!(p.id==='shelf' && s.ignoredShelf) && overlaps(s,p) && last<=p.y+.001 && s.y>=p.y);
  if (!landed && s.y<WORLD.floor) return;
  s.ground=landed?.id||'floor'; s.y=landed?.y??WORLD.floor;
  s.vy=0; s.holdTime=0; s.canSlap=true; s.slap=0; s.rebound=0; s.airDashUsed=false;
  emit(s,'land');
}
function jumpOrSlap(s, down) {
  if (s.ground) {
    if (down && s.ground==='shelf') {
      s.ignoredShelf=true; s.ground=null; s.vy=90; return;
    }
    s.ground=null; s.vy=-MOVE.jump; s.holdTime=MOVE.hold;
    emit(s,'jump');
  } else if (s.canSlap) {
    s.canSlap=false; s.slap=MOVE.slapTime; emit(s,'slap');
  }
}
function checkSlap(s) {
  if (s.slap<=0 || s.orbCooldown>0) return;
  if (Math.hypot(s.x-WORLD.orb.x,s.y-67-WORLD.orb.y)>62) return;
  s.holdTime=0; s.slap=0; s.rebound=8/30; s.hitPause=MOVE.hitPause; s.orbCooldown=.75;
  s.canSlap=true; s.vy=-MOVE.rebound; s.meter=Math.min(5,s.meter+1); s.stats.parries++;
  emit(s,'parry',WORLD.orb.x,WORLD.orb.y);
}
function advanceBullets(s,dt) {
  s.bullets=s.bullets.filter(b=>{
    b.prevX=b.x; b.prevY=b.y; b.age+=dt;
    const distance=dt*(b.ex?MOVE.exSpeed:MOVE.shotSpeed);
    b.x+=b.dx*distance; b.y+=b.dy*distance;
    for (const [index,t] of WORLD.targets.entries()) {
      const tx=t.x, ty=t.y-80;
      const along=clamp((tx-b.prevX)*b.dx+(ty-b.prevY)*b.dy,0,distance);
      const x=b.prevX+b.dx*along,y=b.prevY+b.dy*along;
      if (Math.hypot(x-tx,y-ty)>(b.ex?48:32)) continue;
      s.stats.hits++; s.flashes[index]=.26;
      if (!b.ex) s.meter=Math.min(5,s.meter+.12);
      emit(s,b.ex?'exHit':'hit',x,y,b.angle);
      return false;
    }
    return b.age<1.2 && b.x>=0 && b.x<=WORLD.width && b.y<WORLD.floor+12 && b.y>-220;
  });
}
function selectPose(s) {
  if (s.exTime>0) return s.ground?'Special_Attack_Ground':'Special_Attack_Air';
  if (s.dashTime>0) return s.dashGround?'Dash_Ground':'Dash_Air';
  if (!s.ground) return s.rebound>0?'Parried':s.slap>0?'Parry':'Jump';
  if (s.duck) return s.firing?'Duck_Shoot':'Duck';
  if (s.vx) return s.firing?(s.row===1?'Run_Shoot_Diagonal':'Run_Shoot_Straight'):'Run';
  if (s.firing) return 'Shooting';
  return s.locked?'Aiming':'Idle';
}
export function step(s, input={}, dt=STEP) {
  s.events=[];
  const jump=s.buffered.jump || (input.jumpPressed ?? (input.jump&&!s.held.jump));
  const dash=s.buffered.dash || (input.dash&&!s.held.dash);
  const ex=s.buffered.ex || (input.special&&!s.held.special);
  s.held={jump:!!input.jump,dash:!!input.dash,special:!!input.special};
  if (s.hitPause>0) {s.buffered={jump,dash,ex};s.hitPause=Math.max(0,s.hitPause-dt);return;}
  s.buffered={};
  s.time+=dt;
  for (const key of ['dashCooldown','orbCooldown','slap','rebound']) s[key]=Math.max(0,s[key]-dt);
  s.shotCooldown=Math.max(input.attack?-dt:0,s.shotCooldown-dt);
  s.flashes=s.flashes.map(n=>Math.max(0,n-dt));
  const h=Number(!!input.right)-Number(!!input.left), v=Number(!!input.down)-Number(!!input.up);
  s.locked=!!(input.grab&&s.ground); s.duck=!!(s.ground&&v>0&&!s.locked);
  if (s.dashTime<=0 && s.exTime<=0) {
    if (h) s.face=h;
    updateAim(s,h,v);
    if (dash && s.dashCooldown<=0 && !s.airDashUsed) {
      s.dashTime=MOVE.dashTime; s.dashGround=!!s.ground; s.airDashUsed=!s.ground;
      s.dashFace=s.face; s.slap=0; s.rebound=0; s.holdTime=0; s.vy=0; s.stats.dashes++;
      emit(s,'dash');
    } else if (ex && s.meter>=1) {
      s.meter-=1; s.exTime=.35; s.exAim={...s.aim}; s.stats.ex++; s.holdTime=0; s.vy=0;
      emit(s,'ex');
    } else if (jump) jumpOrSlap(s,input.down);
  }
  if (s.dashTime>0) {
    s.vx=MOVE.dash*s.dashFace;
    horizontalMove(s,s.vx*dt);
    s.dashTime=Math.max(0,s.dashTime-dt);
    if (s.dashTime<1e-7) {s.dashTime=0; s.dashCooldown=MOVE.dashRecover; if (!s.ground) s.airDashUsed=true;}
  } else if (s.exTime>0) {
    s.vx=0;
    const before=s.exTime; s.exTime=Math.max(0,s.exTime-dt);
    if (before>.14 && s.exTime<=.14) fire(s,true);
  } else {
    s.vx=(s.locked||s.duck)?0:h*MOVE.run;
    horizontalMove(s,s.vx*dt);
  }
  verticalMove(s,dt,input.jump);
  if (s.ignoredShelf && s.y>WORLD.shelf.y+2) s.ignoredShelf=false;
  checkSlap(s);
  s.firing=!!(input.attack && !s.dashTime && !s.exTime);
  if (s.firing && s.shotCooldown<1e-7) { fire(s); s.shotCooldown+=MOVE.shotInterval; }
  advanceBullets(s,dt);
  const pose=selectPose(s);
  if (s.pose!==pose) s.poseAge=0; else s.poseAge+=dt;
  s.pose=pose;
  if (pose.startsWith('Run')) {
    s.stride+=dt;s.footTime+=dt;
    if (s.footTime>=1/3) {s.footTime-=1/3;emit(s,'foot',s.x-24*s.face,s.y);}
  } else {s.stride=0;s.footTime=0;}
}
