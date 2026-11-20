import * as T from './assets/vendor/three.module.js';
import {GLTFLoader} from './assets/vendor/GLTFLoader.mjs';
import {CLIPS,poseFor} from './motion.mjs';
let rig=null,pending=null,failure=null;let bank=null;const spriteCache=new Map();const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion(),own=p=>V(-p[0],p[2],p[1]);
const axisY=V(0,1,0);
function correctRightHandGrip(){
 const hand=rig.handR,wrist=position(hand),grip=position(rig.haveR),n=grip.clone().sub(wrist).normalize(),d=rig.weaponAxis.clone().applyQuaternion(rig.haveR.getWorldQuaternion(Q())).normalize();
 n.addScaledVector(d,-n.dot(d)).normalize();const bend=d.clone().cross(n).normalize(),baseDistance=grip.clone().sub(wrist).dot(n),samples=[];let corrected=0;
 for(const mesh of rig.meshes){if(!mesh.isSkinnedMesh||/StygianBlade/.test(mesh.name))continue;const si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight,pos=mesh.geometry.attributes.position,handIndex=mesh.skeleton.bones.indexOf(hand);if(handIndex<0)continue;
  for(let i=0;i<si.count;i++){
   let weight=0;for(let j=0;j<4;j++)if(si.getComponent(i,j)===handIndex)weight+=sw.getComponent(i,j);if(weight<.6)continue;
   const p=mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld),along=p.clone().sub(wrist).dot(n),q=p.clone().sub(grip),t=T.MathUtils.clamp((along-baseDistance+.5)/6.5,0,1),fade=T.MathUtils.smoothstep(along,baseDistance-.8,baseDistance+.8);if(fade<.001)continue;
   const axial=q.dot(d),thickness=T.MathUtils.clamp(q.dot(bend)*.06,-.2,.25),radius=1.3+thickness,theta=.15+t*Math.PI*.98;
   const closed=grip.clone().addScaledVector(d,axial).addScaledVector(n,radius*Math.cos(theta)).addScaledVector(bend,radius*Math.sin(theta));
   const local=mesh.worldToLocal(p.lerp(closed,fade));pos.setXYZ(i,local.x,local.y,local.z);corrected++;if(samples.length<4)samples.push({along,t,fade});
  }
  pos.needsUpdate=true;mesh.geometry.computeBoundingSphere();
 }
 rig.correctedFingerVertices=corrected;rig.fingerCorrectionDebug={method:'right-hand rest-mesh curl around the original HaveR hilt; original source has no finger skin weights',corrected,samples};return corrected;
}
export async function loadRigAsset(){
 if(rig)return true;if(pending)return pending;
 pending=(async()=>{
  const gltf=await new GLTFLoader().loadAsync(new URL('./assets/zagreus-phan21.glb',import.meta.url).href);
  const scene=new T.Scene(),heading=new T.Group(),normalizer=new T.Group(),model=gltf.scene;scene.add(heading);heading.add(normalizer);normalizer.add(model);
  model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y,factor=108/height;
  normalizer.scale.setScalar(factor);normalizer.position.set(-(bounds.min.x+bounds.max.x)*factor/2,-bounds.min.y*factor,0);
  const bones=new Map(),meshes=[];model.traverse(o=>{if(o.isBone)bones.set(o.name,o);if(o.isMesh){meshes.push(o);o.frustumCulled=false;const mats=Array.isArray(o.material)?o.material:[o.material];o.material=mats.map(m=>{const map=m.map||m.emissiveMap;if(map)map.colorSpace=T.SRGBColorSpace;return new T.MeshBasicMaterial({map,color:new T.Color(1,1,1),side:T.DoubleSide,transparent:m.transparent,alphaTest:m.alphaTest||.05,depthWrite:true});});if(o.material.length===1)o.material=o.material[0];}});
  const find=name=>bones.get(name)||[...bones.values()].find(b=>b.name.toLowerCase()===name.toLowerCase());
  if(!find('Hip')||!find('ArmR')||!find('LegL'))throw Error('Rig is missing required Hip / ArmR / LegL bones');
  heading.updateMatrixWorld(true);const r=find('HandR').getWorldPosition(V()),l=find('HandL').getWorldPosition(V()),right=r.sub(l);normalizer.rotation.y=Math.atan2(right.z,right.x)-Math.PI;heading.updateMatrixWorld(true);
  // Retain all original bind matrices and bone-local rest transforms.
  const rest=new Map([...bones.values()].map(b=>[b,{position:b.position.clone(),quaternion:b.quaternion.clone(),scale:b.scale.clone()}]));
  const skinMeshes=meshes.filter(m=>m.isSkinnedMesh);
  const classifications=skinMeshes.map(m=>{
    const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight,sums=new Map();if(si&&sw)for(let i=0;i<si.count;i++)for(let j=0;j<4;j++){const idx=si.getComponent(i,j),weight=sw.getComponent(i,j);if(weight>0){const name=m.skeleton.bones[idx]?.name||'?';sums.set(name,(sums.get(name)||0)+weight);}}
    const weights=[...sums].sort((a,b)=>b[1]-a[1]),total=weights.reduce((s,a)=>s+a[1],0),dominant=weights[0]?.[0]||'';return {mesh:m,name:m.name,vertices:m.geometry.attributes.position.count,dominant,share:weights[0]?.[1]/total,weights:weights.slice(0,5)};
  });
  const leftWeapons=classifications.filter(x=>(/HaveL|WeaponL/i.test(x.dominant)&&x.share>.7)||/StygianBlade_Left/.test(x.name));for(const a of leftWeapons)a.mesh.visible=false;
  let rightWeapon=classifications.find(x=>(/HaveR|WeaponR/i.test(x.dominant)&&x.share>.7)||/StygianBlade_Right/.test(x.name))?.mesh;
  const handR=find('HandR'),haveR=find('HaveR')||handR;
  let weaponAxis=V(0,1,0),tipIndices=[],weaponNormal=V(0,1,0);
  if(rightWeapon){const a=rightWeapon.geometry.attributes.position,h=handR.getWorldPosition(V()),points=[];for(let i=0;i<a.count;i++){const p=rightWeapon.localToWorld(V().fromBufferAttribute(a,i));points.push({index:i,p,d:p.distanceToSquared(h)});}points.sort((a,b)=>b.d-a.d);tipIndices=points.slice(0,16).map(p=>p.index);const tip=points.slice(0,Math.max(5,Math.ceil(points.length*.035))).reduce((v,p)=>v.add(p.p),V()).multiplyScalar(1/Math.max(5,Math.ceil(points.length*.035)));weaponAxis=tip.sub(h).normalize().applyQuaternion(haveR.getWorldQuaternion(Q()).invert());}
  weaponNormal.applyQuaternion(haveR.getWorldQuaternion(Q()).invert());weaponNormal.addScaledVector(weaponAxis,-weaponNormal.dot(weaponAxis)).normalize();
  const surface=document.createElement('canvas');surface.width=320;surface.height=192;const renderer=new T.WebGLRenderer({canvas:surface,alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(320,192,false);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0,0);
  const camera=new T.OrthographicCamera(-150,150,125/Math.hypot(.56,.87),-55/Math.hypot(.56,.87),.1,1000);camera.position.set(0,232*.56/.87,232);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  const ghost=new T.MeshBasicMaterial({color:'#ec6046',side:T.DoubleSide});
  rig={scene,heading,normalizer,model,bones,find,meshes,rest,surface,renderer,camera,ghost,weaponAxis,weaponNormal,tipIndices,rightWeapon,haveR,handR,factor,sourceHeight:height,classifications,lastPose:null,anchors:{},renders:0};
  correctRightHandGrip();
  return true;
 })().catch(e=>{failure=e.message;pending=null;throw Error('Zagreus 角色资源加载失败：'+e.message+'。请重试进入。');});return pending;
}
function position(b){return b.getWorldPosition(V());}
function setWorldQuaternion(b,q){const parent=b.parent.getWorldQuaternion(Q());b.quaternion.copy(parent.invert().multiply(q));b.updateMatrixWorld(true);}
function aimBone(b,child,vector){if(!b||!child||vector.lengthSq()<1e-8)return;const current=position(child).sub(position(b)).normalize();if(current.lengthSq()<.1)return;const delta=Q().setFromUnitVectors(current,vector.clone().normalize());setWorldQuaternion(b,delta.multiply(b.getWorldQuaternion(Q())));}
function solveLimb(name,midName,endName,target,pole){
 const b=rig.find(name),mid=rig.find(midName),end=rig.find(endName);if(!b||!mid||!end)return;
 const a=position(b),c0=position(end),m0=position(mid),l1=a.distanceTo(m0),l2=m0.distanceTo(c0),v=target.clone().sub(a),distance=v.length(),d=Math.min(l1+l2-.001,Math.max(Math.abs(l1-l2)+.001,distance)),n=v.normalize(),along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(.0001,l1*l1-along*along));
 const perp=pole.clone().sub(a);perp.addScaledVector(n,-perp.dot(n));if(perp.lengthSq()<.0001)perp.copy(V(0,0,1).cross(n));perp.normalize();const knee=a.clone().addScaledVector(n,along).addScaledVector(perp,height);
 aimBone(b,mid,knee.sub(a));rig.heading.updateMatrixWorld(true);aimBone(mid,end,target.clone().sub(position(mid)));rig.heading.updateMatrixWorld(true);
}
function applyPose(p){
 const {heading,rest,find}=rig;heading.rotation.y=0;
 for(const [b,r]of rest){b.position.copy(r.position);b.quaternion.copy(r.quaternion);b.scale.copy(r.scale);}heading.updateMatrixWorld(true);
 const hip=find('Hip'),hipTarget=own(p.hip);hip.position.copy(hip.parent.worldToLocal(hipTarget.clone()));if(p.hipYaw)setWorldQuaternion(hip,Q().setFromAxisAngle(axisY,p.hipYaw).multiply(hip.getWorldQuaternion(Q())));heading.updateMatrixWorld(true);
 // Preserve an actual planted sole when the authored hip would overextend a source leg.
 let lower=0;for(const side of ['L','R'])if(p['foot'+side][2]<1.1){const a=position(find('Leg'+side)),b=position(find('Knee'+side)),c=position(find('Foot'+side)),target=own([p['foot'+side][0],p['foot'+side][1],p['foot'+side][2]+6]),reach=a.distanceTo(b)+b.distanceTo(c)-.03,horizontal=Math.hypot(a.x-target.x,a.z-target.z);if(horizontal<reach)lower=Math.max(lower,a.y-target.y-Math.sqrt(reach*reach-horizontal*horizontal));}
 rig.supportHipLowering=Math.max(0,lower);if(lower>0){hip.position.copy(hip.parent.worldToLocal(hipTarget.add(V(0,-lower,0))));heading.updateMatrixWorld(true);}
 const waist=find('Waist'),bust=find('Bust'),neck=find('Neck'),head=find('Head');
 if(waist&&neck)aimBone(waist,neck,own(p.chest).sub(position(waist)));heading.updateMatrixWorld(true);
 if(bust){setWorldQuaternion(bust,Q().setFromAxisAngle(axisY,p.twist||0).multiply(bust.getWorldQuaternion(Q())));heading.updateMatrixWorld(true);}
 if(neck&&head)aimBone(neck,head,own(p.head).sub(own(p.chest)));heading.updateMatrixWorld(true);
 for(const side of ['L','R']){
  solveLimb('Leg'+side,'Knee'+side,'Foot'+side,own([p['foot'+side][0],p['foot'+side][1],p['foot'+side][2]+6]),own(p['knee'+side]));
  const upper=find('Elbow'+side)?'Arm'+side:'Shoulder'+side,elbow=find('Elbow'+side)?'Elbow'+side:'Arm'+side;
  solveLimb(upper,elbow,'Hand'+side,own(p['hand'+side]),own(p['elbow'+side]));
  // Aim feet along the facing axis while preserving the original foot bind length.
  const foot=find('Foot'+side),toe=find('Toe'+side)||find('Toe'+side+'1');if(foot&&toe)aimBone(foot,toe,V(0,-3,9));
 }
 const desired=own(p.blade).normalize(),targetNormal=V(0,.86,.5);targetNormal.addScaledVector(desired,-targetNormal.dot(desired)).normalize();
 const sourceSide=rig.weaponAxis.clone().cross(rig.weaponNormal).normalize(),targetSide=desired.clone().cross(targetNormal).normalize();
 const sourceBasis=new T.Matrix4().makeBasis(sourceSide,rig.weaponAxis,rig.weaponNormal),targetBasis=new T.Matrix4().makeBasis(targetSide,desired,targetNormal);
 const haveWorld=Q().setFromRotationMatrix(targetBasis.multiply(sourceBasis.invert())),haveLocal=rig.haveR===rig.handR?Q():rig.rest.get(rig.haveR).quaternion.clone();
 // A full two-axis basis fixes blade roll independently from elbow IK.
 setWorldQuaternion(rig.handR,haveWorld.multiply(haveLocal.invert()));heading.updateMatrixWorld(true);
 // Close the original open bind-pose fingers around the source HaveR grip.
 const grip=position(rig.haveR).lerp(position(rig.handR),.10);
 for(let finger=1;finger<=5;finger++){
  const a=find('FingerR'+finger+'1'),b=find('FingerR'+finger+'2'),c=find('FingerR'+finger+'3');
  if(a&&b){aimBone(a,b,grip.clone().sub(position(a)));heading.updateMatrixWorld(true);}
  if(b&&c){const target=grip.clone().addScaledVector(desired,.5);aimBone(b,c,target.sub(position(b)));heading.updateMatrixWorld(true);}
 }

 // Small independent waist-cloth follow, when the source rig exposes cloth chains.
 for(const b of rig.bones.values())if(/Skirt|Cloth|Mantle|^S_(Apron|Ribbon|Belt|Collar|Swordstrap|Wolf)/i.test(b.name)&&!/Helper/i.test(b.name)){const r=rig.rest.get(b);b.quaternion.copy(r.quaternion).multiply(Q().setFromAxisAngle(V(1,0,0),p.cloth*.13));}
 readAnchors();
}
function readAnchors(){
 rig.heading.updateMatrixWorld(true);const find=rig.find;rig.anchors={};for(const [k,name]of Object.entries({hand:'HandR',fingerR:'FingerR33',footL:'FootL',footR:'FootR',head:'Head',hip:'Hip',chest:'Bust',waist:'Waist',neck:'Neck',shoulderL:'ShoulderL',shoulderR:'ShoulderR',toeL:'ToeL',toeR:'ToeR',grip:'HaveR'})){const b=find(name);if(b){const v=position(b);rig.anchors[k]=[-v.x,v.z,v.y];}}
 if(rig.rightWeapon&&rig.tipIndices.length){const tip=rig.tipIndices.reduce((v,i)=>v.add(rig.rightWeapon.getVertexPosition(i,V()).applyMatrix4(rig.rightWeapon.matrixWorld)),V()).multiplyScalar(1/rig.tipIndices.length);rig.anchors.tip=[-tip.x,tip.z,tip.y];}
 const n=rig.weaponNormal.clone().applyQuaternion(rig.haveR.getWorldQuaternion(Q()));rig.bladeNormal=[-n.x,n.z,n.y];
}
export async function loadMotionBank(){
 if(bank)return;const meta=await fetch(new URL('./assets/hades-motion-v2.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Motion bank missing');return r.json();});
 const data=new Float32Array(await fetch(new URL('./assets/hades-motion-v2.bin',import.meta.url)).then(r=>r.arrayBuffer()));bank={...meta,data,bones:meta.bones.map(n=>rig.find(n))};
 await rig.renderer.compileAsync(rig.scene,rig.camera);for(const m of rig.meshes)for(const mat of (Array.isArray(m.material)?m.material:[m.material]))if(mat.map)rig.renderer.initTexture(mat.map);
 sampleMotion('idle',0);rig.heading.rotation.y=0;rig.scene.updateMatrixWorld(true);rig.renderer.render(rig.scene,rig.camera);const warm=document.createElement('canvas');warm.width=320;warm.height=192;rig.renderer.getContext().finish();warm.getContext('2d').drawImage(rig.surface,0,0);await new Promise(requestAnimationFrame);rig.renderer.render(rig.scene,rig.camera);warm.getContext('2d').drawImage(rig.surface,0,0);
}
function sampleMotion(clip,time,transition=null){
 const c=bank.clips[clip]||bank.clips.idle,u=c.loop?((time%c.duration)+c.duration)%c.duration:Math.max(0,Math.min(time,c.duration)),f=u/c.duration*(c.frames-1),lo=Math.floor(f),hi=Math.min(c.frames-1,lo+1),a=f-lo;
 const stride=bank.bones.length*7,from=transition&&transition.duration>0?bank.clips[transition.clip]:null,fu=from?(from.loop?transition.time%from.duration:Math.min(from.duration,transition.time)):0,ff=from?fu/from.duration*(from.frames-1):0,fl=Math.floor(ff),fh=from?Math.min(from.frames-1,fl+1):0,fa=ff-fl,blend=transition?T.MathUtils.smoothstep(transition.elapsed,0,transition.duration):1;
 const qa=Q(),qb=Q(),qc=Q();for(let i=0;i<bank.bones.length;i++){
  const b=bank.bones[i],o=c.offset+lo*stride+i*7,n=c.offset+hi*stride+i*7;b.position.set(T.MathUtils.lerp(bank.data[o],bank.data[n],a),T.MathUtils.lerp(bank.data[o+1],bank.data[n+1],a),T.MathUtils.lerp(bank.data[o+2],bank.data[n+2],a));qa.fromArray(bank.data,o+3);qb.fromArray(bank.data,n+3);b.quaternion.copy(qa.slerp(qb,a));
  if(from&&blend<1){const x=from.offset+fl*stride+i*7,y=from.offset+fh*stride+i*7;const px=T.MathUtils.lerp(bank.data[x],bank.data[y],fa),py=T.MathUtils.lerp(bank.data[x+1],bank.data[y+1],fa),pz=T.MathUtils.lerp(bank.data[x+2],bank.data[y+2],fa);b.position.set(T.MathUtils.lerp(px,b.position.x,blend),T.MathUtils.lerp(py,b.position.y,blend),T.MathUtils.lerp(pz,b.position.z,blend));qa.fromArray(bank.data,x+3);qb.fromArray(bank.data,y+3);qc.copy(qa).slerp(qb,fa).slerp(b.quaternion,blend);b.quaternion.copy(qc);}
 }
}
export function bakeMotionBank(rate=120){
 const bones=[...rig.bones.values()],values=[],clips={};for(const [id,c]of Object.entries(CLIPS)){const frames=Math.ceil(c.duration*rate)+1,offset=values.length;for(let f=0;f<frames;f++){applyPose(poseFor(id,f/(frames-1)*c.duration));for(const b of bones)values.push(...b.position.toArray(),...b.quaternion.toArray());}clips[id]={duration:c.duration,loop:!!c.loop,frames,offset};}
 return {meta:{version:2,source:'Hand authored reference reconstruction; original mesh contains zero animations',sampleRate:rate,bones:bones.map(b=>b.name),clips},data:new Float32Array(values)};
}
export function drawRigAsset(ctx,{pose=null,clip='idle',time=0,transition=null,x=0,y=0,scale=1,angle=0,alpha=1,rasterScale=1}){
 if(!rig)throw Error('Zagreus textured rig is not loaded');
 const rw=rasterScale>2?640:320;if(rig.surface.width!==rw)rig.renderer.setSize(rw,rw*.6,false);
 rig.heading.rotation.y=0;if(pose||!bank)applyPose(pose||poseFor(clip,time));else{sampleMotion(clip,time,transition);readAnchors();}
 rig.heading.rotation.y=angle;rig.heading.updateMatrixWorld(true);rig.scene.overrideMaterial=null;rig.renderer.render(rig.scene,rig.camera);rig.renderAngle=angle;rig.renders++;
 ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(rig.surface,x-150*scale,y-125*scale,300*scale,180*scale);ctx.restore();return rig.anchors;
}
export function getRigCanvas(){return rig?.surface;}
export function rigAssetInfo(){return rig?{ready:true,source:'Phan21 / RagerGokuda textured skinned mesh',bones:rig.bones.size,meshes:rig.classifications.map(({name,vertices,dominant,share})=>({name,vertices,dominant,share})),factor:rig.factor,sourceHeight:rig.sourceHeight,correctedFingerVertices:rig.correctedFingerVertices,supportHipLowering:rig.supportHipLowering,hasRightSword:!!rig.rightWeapon,visibleWeapons:rig.meshes.filter(m=>m.visible&&/StygianBlade/i.test(m.name)).map(m=>m.name),texturedMaterials:rig.meshes.filter(m=>(Array.isArray(m.material)?m.material:[m.material]).every(a=>!!a.map)).length,anchors:rig.anchors,bladeNormal:rig.bladeNormal,renderAngle:rig.renderAngle,renders:rig.renders,cachedSprites:0,motionBank:bank?{sampleRate:bank.sampleRate,clips:Object.keys(bank.clips)}:null,renderer:rig.renderer.getContext().getParameter(rig.renderer.getContext().RENDERER)}: {ready:false,failure};}
export function disposeRigAsset(){if(rig){rig.renderer.dispose();rig.renderer.forceContextLoss();rig=null;}pending=null;failure=null;bank=null;spriteCache.clear();}

export function rigPoseBounds(pose,angle=.58){
 if(!rig)throw Error('Zagreus rig bounds requested before load');applyPose(pose);rig.heading.rotation.y=angle;rig.heading.updateMatrixWorld(true);
 const visible=rig.rightWeapon?.visible;if(rig.rightWeapon)rig.rightWeapon.visible=false;rig.scene.overrideMaterial=null;rig.renderer.render(rig.scene,rig.camera);
 const gl=rig.renderer.getContext(),width=rig.surface.width,height=rig.surface.height,rgba=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
 let minRow=height,maxRow=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(rgba[(y*width+x)*4+3]>32){minRow=Math.min(minRow,y);maxRow=Math.max(maxRow,y);}
 if(rig.rightWeapon)rig.rightWeapon.visible=visible;rig.heading.rotation.y=0;return {minY:55-(maxRow+1)/height*180,maxY:55-minRow/height*180,height:(maxRow+1-minRow)/height*180};
}

export function inspectRigPose(pose){if(!rig)throw Error("Load the rig before pose inspection");applyPose(pose);return {anchors:structuredClone(rig.anchors),bladeNormal:rig.bladeNormal};}
export function rigSkinDiagnostics(){
 if(!rig)return null;const sums={},names=['HandR','HaveR','FingerR11','FingerR12','FingerR13','FingerR21','FingerR22','FingerR23','FingerR31','FingerR32','FingerR33','FingerR41','FingerR42','FingerR43','FingerR51','FingerR52','FingerR53'];
 for(const m of rig.meshes){if(!m.isSkinnedMesh)continue;const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;for(let i=0;i<si.count;i++)for(let j=0;j<4;j++){const n=m.skeleton.bones[si.getComponent(i,j)]?.name;if(names.includes(n))sums[n]=(sums[n]||0)+sw.getComponent(i,j);}}
 return {fingerCorrection:rig.fingerCorrectionDebug,sums,bones:Object.fromEntries(names.map(name=>{const b=rig.find(name);return [name,b?{position:position(b).toArray(),quaternion:b.quaternion.toArray()}:null];}))};
}
export function drawGripCloseup(ctx,pose,angle=.6){
 if(!rig)throw Error('Load Zagreus before grip inspection');applyPose(pose);rig.heading.rotation.y=angle;rig.heading.updateMatrixWorld(true);const target=position(rig.haveR),camera=new T.OrthographicCamera(-18,18,13.5,-13.5,.1,1000);camera.position.copy(target).add(V(0,232*.56/.87,232));camera.lookAt(target);camera.updateMatrixWorld(true);rig.renderer.setSize(960,720,false);rig.scene.overrideMaterial=null;rig.renderer.render(rig.scene,camera);ctx.fillStyle='#1b2729';ctx.fillRect(0,0,960,720);ctx.drawImage(rig.surface,0,0);rig.renderer.setSize(640,384,false);return rigAssetInfo();
}
export function inspectSoles(pose){applyPose(pose);const results={};for(const side of ['L','R']){let min=Infinity,count=0;for(const m of rig.meshes){if(!m.isSkinnedMesh||/Stygian/.test(m.name))continue;const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;for(let i=0;i<si.count;i++){let weight=0;for(let j=0;j<4;j++)if(new RegExp('^(Foot|Toe)'+side).test(m.skeleton.bones[si.getComponent(i,j)]?.name))weight+=sw.getComponent(i,j);if(weight>.5){const v=m.getVertexPosition(i,V()).applyMatrix4(m.matrixWorld);min=Math.min(min,v.y);count++;}}}results[side]={minZ:min,vertices:count,ankle:position(rig.find('Foot'+side)).toArray()};}return results;}
