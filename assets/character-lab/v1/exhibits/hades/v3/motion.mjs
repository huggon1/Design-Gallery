// Hand-authored reconstruction from linked reference poses. Durations are fitted study values.
export const CLIPS={
 idle:{label:'站立',duration:1.6,loop:true,stages:[0,1,1],distance:0},
 run:{label:'跑动',duration:32/60,loop:true,stages:[0,.65,1],distance:0},
 start:{label:'起步',duration:.09,stages:[0,.5,1],distance:0},
 stop:{label:'停步',duration:.12,stages:[0,.5,1],distance:0},
 turn:{label:'反向',duration:.10,stages:[0,.5,1],distance:0},
 dash:{label:'冲刺',duration:.23,stages:[.08,.74,1],distance:0,cancelDashAt:.18},
 'slash-1':{label:'第一横斩',duration:.40,stages:[.13,.31,1],distance:25,cancelMoveAt:.23,cancelDashAt:.04},
 'slash-2':{label:'过顶下劈',duration:.36,stages:[.34,.62,1],distance:35,cancelMoveAt:.25,cancelDashAt:.04},
 thrust:{label:'第三前刺',duration:.40,stages:[.24,.51,1],distance:55,cancelMoveAt:.29,cancelDashAt:.04},
 'dash-strike':{label:'冲刺前刺',duration:.67,stages:[.043,.20,1],distance:19,cancelMoveAt:.31,cancelDashAt:.135},
 'recover-1':{label:'横斩收势',duration:.16,stages:[0,0,1],distance:0},
 'recover-2':{label:'下劈收势',duration:.17,stages:[0,0,1],distance:0},
 'recover-3':{label:'前刺收势',duration:.19,stages:[0,0,1],distance:0}
};
for(const c of Object.values(CLIPS))c.frames=Math.ceil(c.duration*120)+1;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const neutral={hip:[0,0,53],chest:[0,1,78],head:[0,3,97],footL:[-11,4,1],footR:[11,-4,1],kneeL:[-10,9,29],kneeR:[10,6,29],handL:[-21,5,53],handR:[22,7,53],elbowL:[-22,0,70],elbowR:[24,0,71],blade:[.2,-.8,-.35],twist:0,hipYaw:0,cloth:0};
const P=(v={})=>structuredClone({...neutral,...v});
// Adjacent attacks share their complete contact-settled pose, including feet and blade orientation.
const end1=P({hip:[-1,4,50],chest:[-3,10,75],head:[0,13,94],footL:[-12,15,1],footR:[13,-18,1],handR:[-24,12,55],elbowR:[-7,18,64],handL:[-24,-6,63],elbowL:[-24,-5,73],blade:[-1,-.32,-.2],twist:.72,hipYaw:.18,cloth:.65});
const end2=P({hip:[0,4,49],chest:[1,14,72],head:[0,19,91],footL:[-12,-15,1],footR:[12,17,1],handR:[9,28,45],elbowR:[23,11,61],handL:[-22,-9,61],blade:[.05,.73,-.69],twist:-.12,hipYaw:-.13,cloth:.7});
const end3=P({hip:[0,9,47],chest:[0,23,69],head:[0,29,89],footL:[-10,26,1],footR:[11,-26,1],handR:[5,48,67],elbowR:[15,29,68],handL:[-25,-11,65],elbowL:[-24,-6,74],blade:[-.06,1,.035],twist:.17,hipYaw:.13,cloth:.8});
const keys={
 'slash-1':[
 [0,P()], [.19,P({hip:[2,-4,50],chest:[4,-3,77],head:[0,3,95],handR:[27,-13,75],elbowR:[26,-12,76],handL:[-16,9,64],blade:[.48,-.85,.3],twist:-.58,hipYaw:-.24,cloth:-.3})],
 [.32,P({hip:[1,0,49],chest:[3,6,74],head:[0,11,93],footL:[-12,17,3],footR:[12,-8,1],handR:[26,14,67],elbowR:[25,4,72],handL:[-22,0,65],blade:[.95,.32,.04],twist:-.3,hipYaw:-.08,cloth:.2})],
 [.46,P({hip:[-1,4,49],chest:[-2,11,73],head:[0,13,93],footL:[-12,19,1],footR:[12,-13,1],handR:[-3,34,59],elbowR:[17,21,68],handL:[-25,-6,64],blade:[-.55,.83,-.08],twist:.34,hipYaw:.11,cloth:.8})],
 [.64,P({...end1,handR:[-27,16,53],blade:[-1,.06,-.22],twist:.8,cloth:1.1})], [1,end1]],
 'slash-2':[
 [0,end1], [.18,P({hip:[-1,-2,48],chest:[-2,-2,76],head:[0,3,96],footL:[-12,13,1],footR:[12,-9,7],handR:[-12,1,99],elbowR:[7,-6,83],handL:[-15,14,69],blade:[-.28,-.55,.78],twist:.2,hipYaw:.02,cloth:.2})],
 [.34,P({hip:[0,-3,48],chest:[1,-1,75],head:[0,3,95],footL:[-12,3,1],footR:[12,16,3],handR:[5,7,108],elbowR:[21,-1,86],handL:[-14,18,68],blade:[.04,-.35,.94],twist:-.28,hipYaw:-.18,cloth:-.2})],
 [.48,P({hip:[0,4,46],chest:[2,14,68],head:[0,19,88],footL:[-12,-9,1],footR:[12,23,1],handR:[6,36,76],elbowR:[20,18,73],handL:[-20,-3,64],blade:[.04,.95,.3],twist:-.12,hipYaw:-.1,cloth:.8})],
 [.64,P({...end2,hip:[0,7,46],chest:[1,18,66],head:[0,24,85],handR:[9,37,42],elbowR:[23,19,57],blade:[.03,.55,-.84],cloth:1.2})], [1,end2]],
 thrust:[
 [0,end2], [.27,P({hip:[0,-8,46],chest:[2,-2,72],head:[0,3,92],footL:[-10,-8,5],footR:[11,-11,1],handR:[17,-10,69],elbowR:[28,-18,73],handL:[-13,12,68],blade:[-.1,1,.04],twist:-.52,hipYaw:-.23,cloth:-.2})],
 [.42,P({...end3,hip:[0,9,44],chest:[0,26,63],head:[0,34,85],footL:[-10,32,1],footR:[11,-23,1],handR:[4,57,66],elbowR:[14,34,67],blade:[-.04,1,.025],twist:.23,cloth:1.25})],
 [.58,P({...end3,hip:[0,9,41],chest:[0,27,66],head:[0,34,87],handR:[4,55,67],blade:[-.04,1,.025],cloth:1.1})], [1,end3]],
 dash:[
 [0,P({hip:[0,-1,47],chest:[0,12,67],head:[0,19,86],handR:[22,-15,58],blade:[.3,-1,.18],cloth:.4})],
 [.16,P({hip:[0,0,35],chest:[0,25,53],head:[0,34,72],footL:[-9,15,6],footR:[10,-28,8],handR:[22,-23,53],elbowR:[25,-8,60],handL:[-22,-10,57],blade:[.2,-1,.1],twist:-.08,cloth:1.5})],
 [.72,P({hip:[0,1,37],chest:[0,24,57],head:[0,33,77],footL:[-9,-24,4],footR:[10,24,1],handR:[21,-18,55],handL:[-23,-11,57],blade:[.2,-1,.1],cloth:1.3})],
 [1,P({hip:[0,2,50],chest:[0,8,75],head:[0,12,94],cloth:.4})]],
 'dash-strike':[
 [0,P({hip:[0,0,35],chest:[0,25,53],head:[0,34,72],footL:[-9,15,6],footR:[10,-28,8],handR:[20,4,57],elbowR:[26,-8,61],blade:[-.05,1,.02],cloth:1.5})],
 [.24,P({hip:[0,6,35],chest:[0,28,52],head:[0,36,73],footL:[-10,28,1],footR:[11,-25,3],handR:[7,55,58],elbowR:[16,31,60],handL:[-24,-13,53],blade:[-.04,1,.02],twist:.15,cloth:1.6})],
 [.53,P({hip:[0,9,38],chest:[0,25,56],head:[0,32,78],footL:[-10,23,1],footR:[11,-22,1],handR:[8,47,59],elbowR:[18,27,61],handL:[-25,-13,55],blade:[-.04,1,.02],twist:.12,cloth:1.2})],
 [1,P({hip:[0,4,49],chest:[0,11,73],head:[0,16,92],handR:[19,20,58],blade:[.1,.94,-.2],cloth:.55})]],
 'recover-1':[[0,end1],[1,P()]],'recover-2':[[0,end2],[1,P()]],'recover-3':[[0,end3],[1,P()]]
};
// Positions are authored in lateral / forward / upright axes, with the feet on z=1.
const swordReady=P({hip:[0,0,52],chest:[0,3,78],head:[0,6,96],handR:[13,11,71],elbowR:[20,2,62],handL:[-17,6,54],blade:[.20,-.92,.30],twist:-.14});
const longJab=P({hip:[2,4,39],chest:[0,24,59],head:[-1,30,75],footL:[-6,13,1],footR:[8,-37,1],handR:[2,55,70],elbowR:[8,39,68],handL:[-15,-6,60],elbowL:[-19,-2,63],blade:[-.04,1,.30],twist:.14,hipYaw:.08,cloth:1.52});
const upright=P({hip:[0,2,48],chest:[0,7,74],head:[0,9,94],footL:[-6,8,1],footR:[7,-10,1],handR:[11,13,71],elbowR:[19,7,63],handL:[-14,1,55],blade:[.02,.16,.99],twist:.08,cloth:.53});
keys['dash-strike']=[
 [0,P({...longJab,hip:[0,-2,38],chest:[0,18,61],head:[0,22,80],handR:[9,31,66],elbowR:[18,18,64],footR:[8,-30,3]})],
 [.08,longJab],[.25,P({...longJab,hip:[1,5,40],handR:[2,57,72]})],
 [.48,longJab],[.555,P({...longJab,hip:[1,6,43],chest:[0,20,63],handR:[6,47,72],blade:[-.03,.94,.36]})],
 [.62,upright],[.77,upright],[1,swordReady]];
const sweepTiming=[0,.075,.135,.19,.31,1];
keys['slash-1'].forEach((key,i)=>{key[0]=sweepTiming[i]});
Object.assign(end1,{hip:[-3,7,41],chest:[-8,16,64],head:[-8,23,83],footL:[-13,25,1],footR:[13,-28,1],
 handR:[-30,18,56],elbowR:[-10,19,63],handL:[-21,-12,56],blade:[-1,.03,.35],twist:.83});
Object.assign(keys['slash-1'][4][1],end1);
// The training series crosses the body low, leaps briefly for the downward cut,
// and loads the third thrust by first pulling the weapon to the rear hip.
for(const [phase,pose] of keys['slash-1']){
 if(phase===0)Object.assign(pose,swordReady);
 if(phase>=.135&&phase<.31){pose.hip[2]-=6;pose.chest[1]+=9;pose.chest[2]-=8;pose.handR[1]+=8;pose.handR[2]-=6;pose.head[1]+=9;}
}
for(const [phase,pose] of keys['slash-2']){
 if(phase===.18||phase===.34){pose.hip[2]+=34;pose.chest[1]-=7;pose.chest[2]+=34;pose.head[1]-=8;pose.head[2]+=34;pose.handR[2]+=31;pose.elbowR[2]+=30;pose.handL[2]+=22;pose.elbowL[2]+=20;}
 if(phase===.48||phase===.64){pose.chest[1]+=9;pose.handR[1]+=7;pose.hip[2]-=8;pose.head[1]+=9;}
}
for(const [phase,pose] of keys.thrust){
 if(phase===.27){pose.hip[1]-=4;pose.handR[1]-=7;}
 if(phase===.42||phase===.58){pose.head[1]+=8;pose.chest[1]+=6;pose.handR[1]+=9;pose.handR[2]+=6;pose.footR[1]-=6;}
}
function hermite(a,b,ma,mb,t,span){const t2=t*t,t3=t2*t;return (2*t3-3*t2+1)*a+(t3-2*t2+t)*span*ma+(-2*t3+3*t2)*b+(t3-t2)*span*mb;}
// Nonzero Catmull–Rom tangents pass through swing keys. Only terminal settled poses have zero tangent.
function sample(ks,u){let i=0;while(i<ks.length-2&&u>ks[i+1][0])i++;const a=ks[i],b=ks[i+1],prev=ks[Math.max(0,i-1)],next=ks[Math.min(ks.length-1,i+2)],span=b[0]-a[0],t=clamp((u-a[0])/span,0,1),out={};
 for(const k of Object.keys(neutral)){const calc=(av,bv,pv,nv)=>hermite(av,bv,i===0?0:(bv-pv)/(b[0]-prev[0]),i+1===ks.length-1?0:(nv-av)/(next[0]-a[0]),t,span);out[k]=Array.isArray(a[1][k])?a[1][k].map((v,j)=>calc(v,b[1][k][j],prev[1][k][j],next[1][k][j])):calc(a[1][k],b[1][k],prev[1][k],next[1][k]);}
 // Blade direction is spherical, with unwrapped yaw, so a swing never crosses a zero-length vector.
 const dirs=ks.map(q=>{const d=q[1].blade,l=Math.hypot(...d);return [Math.atan2(d[0],d[1]),Math.asin(d[2]/l)];});for(let j=1;j<dirs.length;j++){while(dirs[j][0]-dirs[j-1][0]>Math.PI)dirs[j][0]-=Math.PI*2;while(dirs[j][0]-dirs[j-1][0]<-Math.PI)dirs[j][0]+=Math.PI*2;}
 const angles=[0,1].map(j=>hermite(dirs[i][j],dirs[i+1][j],i===0?0:(dirs[i+1][j]-dirs[Math.max(0,i-1)][j])/(b[0]-prev[0]),i+1===ks.length-1?0:(dirs[Math.min(ks.length-1,i+2)][j]-dirs[i][j])/(next[0]-a[0]),t,span));out.blade=[Math.sin(angles[0])*Math.cos(angles[1]),Math.cos(angles[0])*Math.cos(angles[1]),Math.sin(angles[1])];return out;}
function knee(hip,foot,side){const a=[hip[0]+side*7,hip[1],hip[2]-1],b=[foot[0],foot[1],foot[2]+6],v=b.map((x,i)=>x-a[i]),len=Math.hypot(...v),d=Math.min(51,Math.max(.01,len)),n=v.map(x=>x/len),s=(25*25-27*27+d*d)/(2*d),h=Math.sqrt(Math.max(0,625-s*s)),pole=[side*.1,1,0],dot=pole.reduce((q,x,i)=>q+x*n[i],0),q=pole.map((x,i)=>x-dot*n[i]),l=Math.hypot(...q);return a.map((x,i)=>x+s*n[i]+h*q[i]/l);}
// Sagittal trajectory read from the visible trailing boot, crossing, extended
// front boot and contact. The opposite leg is half a stride out of phase.
const strideKeys=[[0,26,1],[.12,1,1],[.24,-23,1],[.34,-36,9],[.46,-39,20],[.57,-23,20],[.68,-2,18],[.78,24,11],[.88,34,5],[1,26,1]];
function gaitFoot(u,side){
 const phase=(u+(side==='R'?.5:0))%1;
 let i=0;while(i<strideKeys.length-2&&phase>strideKeys[i+1][0])i++;
 const [a,y0,z0]=strideKeys[i],[b,y1,z1]=strideKeys[i+1],t=(phase-a)/(b-a);
 return [side==='L'?-9:8,mix(y0,y1,t)*1.15,mix(z0,z1,t)];
}
const footPlans={
 'slash-1':{L:{a:[-11,4,1],b:[-13,50,1],start:.04,end:.23,lift:9},R:{a:[11,-4,1],b:[13,-3,1],start:.76,end:1,lift:2}},
 'slash-2':{L:{a:[-12,15,1],b:[-12,15,1],start:0,end:1,lift:0},R:{a:[13,-18,1],b:[12,47,1],start:.08,end:.47,lift:13}},
 thrust:{L:{a:[-12,-15,1],b:[-10,73,1],start:.17,end:.43,lift:12},R:{a:[12,17,1],b:[11,21,1],start:.78,end:1,lift:3}}
};
function plantedFeet(p,id,u){const plan=footPlans[id];if(!plan)return;const root=rootCurve(id,u)*CLIPS[id].distance;for(const side of ['L','R']){const f=plan[side],q=clamp((u-f.start)/(f.end-f.start),0,1);p['foot'+side]=f.a.map((v,i)=>mix(v,f.b[i],smooth(q)));p['foot'+side][1]-=root;p['foot'+side][2]+=Math.sin(q*Math.PI)*f.lift;}}
export function poseFor(id,t,turn=0){const c=CLIPS[id]||CLIPS.idle,u=(c.loop?((t%c.duration)+c.duration)%c.duration:clamp(t,0,c.duration))/c.duration;let p;
 if(keys[id])p=sample(keys[id],u);
 else if(['run','start','stop','turn'].includes(id)){
  const strength=id==='start'?smooth(u):id==='stop'?1-smooth(u):1;
  const gait=id==='run'?u:id==='stop'?.14+.15*u:u*.17;
  const phase=gait*2*Math.PI,step=Math.sin(phase),lift=(1-Math.cos(phase*2))*.95;
  const footL=gaitFoot(gait,'L'),footR=gaitFoot(gait,'R');
  p=P({hip:[1.8*step,1,47+lift],chest:[-1.1*step,22,70+lift],head:[-.5*step,29,90+lift],
  footL:footL.map((v,i)=>mix(swordReady.footL[i],v,strength)),footR:footR.map((v,i)=>mix(swordReady.footR[i],v,strength)),
  handR:[13,23+step*2,69+lift],elbowR:[20,9+step*2,61+lift],
  handL:[-15,1-step*14,53+lift],elbowL:[-21,-4-step*7,65+lift],
  blade:[.08,-.32+step*.045,.95],twist:-.10+step*.08,hipYaw:-step*.14,cloth:.65+.22*step});
 }
 else{const b=Math.sin(u*Math.PI*2);p=P({...swordReady,chest:[0,3,78+b*.45],handR:[13,11,71+b*.35],cloth:b*.04});}
 plantedFeet(p,id,u);
 if(id==='slash-2'&&u<.50){
  const h=34*Math.pow(Math.sin(Math.PI*u/.50),1.15),fold=clamp(h/28,0,1);
  for(const side of ['L','R']){
   const foot=p['foot'+side];foot[0]=mix(foot[0],side==='L'?-5:6,fold);
   foot[1]=mix(foot[1],side==='L'?-5:3,fold);
   foot[2]=1+h+(side==='L'?1:4)*fold;
  }
 }
 if(id==='thrust'||id==='recover-3'){const weight=id==='thrust'?smooth((u-.22)/.18):id==='recover-3'?1-smooth(u):Math.sin(Math.PI*Math.min(1,u/.95));p.chest[1]+=10*weight;p.chest[2]-=6*weight;p.head[1]+=8*weight;p.head[2]-=4*weight;const drop=id==='dash-strike'?10:14;p.handR[2]-=drop*weight;p.elbowR[2]-=(drop+1)*weight;p.handL[2]-=8*weight;p.elbowL[2]-=8*weight;}
 for(const side of ['L','R']){p['foot'+side][2]=Math.max(1,p['foot'+side][2]);p['knee'+side]=knee(p.hip,p['foot'+side],side==='L'?-1:1);}return p;}
export function rootCurve(id,u){const c=CLIPS[id];if(!c?.distance)return 0;return smooth((u-c.stages[0])/(c.stages[1]-c.stages[0]));}
export function phaseOf(id,t){const c=CLIPS[id]||CLIPS.idle;if(c.loop)return id==='run'?'着地 / 后蹬 / 前摆':'呼吸';const u=t/c.duration;return u<c.stages[0]?'预备':u<c.stages[1]?'挥击 / 位移':'收势';}
export function frameOf(id,t){const c=CLIPS[id]||CLIPS.idle;return Math.floor(clamp((c.loop?t%c.duration:t)/c.duration,0,.99999)*c.frames);}
export function supportFor(id,t){const u=t/(CLIPS[id]?.duration||1);return id==='slash-1'?(u<.4?'right':'left'):id==='slash-2'?(u<.4?'left':'right'):id==='thrust'?(u<.4?'right':'left'):'both';}
