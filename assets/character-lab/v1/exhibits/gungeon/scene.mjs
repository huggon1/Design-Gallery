import {createSimulation,FIXED_STEP,sections} from './motion.mjs';
import {loadAssets,drawRoom} from './visuals.mjs';
export {sections};
export const options=[];
const labels={idle:'待机',move:'移动瞄准',fire:'射击',reload:'换弹', 'roll-air':'翻滚腾空 · 免伤','roll-ground':'翻滚落地 · 可伤'};
export async function createScene({canvas,onStatus=()=>{}}={}){
 const assets=await loadAssets(),sim=createSimulation();let disposed=false,lastStatus='',viewport={width:480,height:300},muted=true,audio=null;
 const frame=document.createElement('canvas');frame.width=480;frame.height=300;const frameCtx=frame.getContext('2d');
 function sound(type){
  if(muted||!audio||audio.state!=='running')return;
  const table={shot:[160,55,.065,.027,'square'],land:[72,42,.065,.02,'triangle'],roll:[230,85,.11,.014,'triangle'],'reload-start':[540,310,.04,.014,'square'],'reload-end':[710,900,.045,.016,'square'],'target-hit':[370,120,.04,.012,'triangle'],hurt:[210,60,.18,.025,'sawtooth']};
  const v=table[type];if(!v)return;const now=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.type=v[4];o.frequency.setValueAtTime(v[0],now);o.frequency.exponentialRampToValueAtTime(v[1],now+v[2]);g.gain.setValueAtTime(v[3],now);g.gain.exponentialRampToValueAtTime(.0001,now+v[2]);o.start(now);o.stop(now+v[2]+.01);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 function step(dt,input={}){
  if(disposed)return;let aimWorld=null;
  if(input.aim?.active){const scale=Math.min(viewport.width/480,viewport.height/300),ox=(viewport.width-480*scale)/2,oy=(viewport.height-300*scale)/2;aimWorld={x:(input.aim.x*viewport.width-ox)/scale,y:(input.aim.y*viewport.height-oy)/scale,active:true};}
  sim.step(dt,{...input,aimWorld});for(const e of sim.events)sound(e.type);const status=labels[sim.getState().action];if(status!==lastStatus){lastStatus=status;onStatus(status);}
 }
 function draw(ctx,{width=480,height=300,debug=false,trace=false}={}){
  viewport={width,height};drawRoom(frameCtx,sim,assets,{debug,trace});const scale=Math.min(width/480,height/300),w=480*scale,h=300*scale;ctx.save();ctx.fillStyle='#131822';ctx.fillRect(0,0,width,height);ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,(width-w)/2,(height-h)/2,w,h);ctx.restore();
 }
 return{fixedStep:FIXED_STEP,sections,options,step,draw,reset(area=sim.section){sim.reset(area);lastStatus='';},clearInput(){sim.clearInput();},getState(){return sim.getState();},setOption(){},setMuted(v){muted=!!v;},async unlockAudio(){if(disposed)return;if(!audio){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(C)audio=new C();}await audio?.resume();},dispose(){disposed=true;audio?.close();audio=null;}};
}
