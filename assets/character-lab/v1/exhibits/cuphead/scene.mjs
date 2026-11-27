import {createState,step as simulate,STEP,WORLD,clamp} from './controller.mjs';
import {loadArt,makeEffect,drawScene,poseFrame} from './art.mjs';
import {createAudio} from './audio.mjs';

export const sections=[{id:'tutorial',label:'纸上练习场'}];
export async function createScene() {
  const art=await loadArt(), audio=createAudio();
  let s=createState(), effects=[], disposed=false;
  const camera={x:0,y:0,span:1280,scale:1,offsetY:0};
  let lastW=0,lastH=0,prev;
  function frameStart() {prev={x:s.x,y:s.y,camera:camera.x,cameraY:camera.y};}
  function cameraTarget() {return clamp(s.x-camera.span*.39,0,Math.max(0,WORLD.width-camera.span));}
  function reset() {
    audio.silence();s=createState();effects=[];camera.x=cameraTarget();camera.y=0;frameStart();
  }
  function step(dt,input) {
    if (disposed) return;
    frameStart();const before=s.time;simulate(s,input,dt);
    const elapsed=s.time-before;
    for (const e of effects) e.age+=elapsed;
    effects=effects.filter(e=>e.age*30<e.count);
    for (const e of s.events) {
      audio.play(e.type);
      const visual=makeEffect(e);if (visual) effects.push(visual);
    }
    camera.x+=(cameraTarget()-camera.x)*(1-Math.exp(-dt*13));
    camera.y+=(Math.min(0,s.y-239)-camera.y)*(1-Math.exp(-dt*22));
  }
  function draw(ctx,view) {
    if (disposed || view.width<=0 || view.height<=0) return;
    if (view.width!==lastW||view.height!==lastH) {
      lastW=view.width;lastH=view.height;
      camera.scale=Math.min(lastH/720,lastW/670);
      camera.span=lastW/camera.scale;
      camera.offsetY=(lastH-720*camera.scale)*.52;
      camera.x=cameraTarget();frameStart();
    }
    drawScene(ctx,art,s,prev,effects,view,camera);
  }
  reset();
  return {fixedStep:STEP,sections,step,draw,reset,
    resetInterpolation(){frameStart();for (const b of s.bullets) {b.prevX=b.x;b.prevY=b.y;}},
    clearInput(){s.held={};s.buffered={};audio.silence();},
    setMuted:audio.setMuted,unlockAudio:audio.unlock,getAudioStream:()=>audio.stream,
    getState:()=>({x:s.x,y:s.y,vx:s.vx,vy:s.vy,ground:s.ground,pose:s.pose,frame:poseFrame(s),face:s.face,
      time:s.time,locked:s.locked,aim:{...s.aim},stats:{...s.stats},meter:s.meter,hitPause:s.hitPause,
      shots:s.bullets.length,cameraX:camera.x,artReady:true,soundReady:audio.ready,section:'tutorial'}),
    dispose(){disposed=true;audio.dispose();effects=[];}};
}
