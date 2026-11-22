import * as THREE from './assets/vendor/three.module.js';
import {GLTFLoader} from './assets/vendor/GLTFLoader.mjs';
export async function loadSource(){
 const [gltf,motion]=await Promise.all([new GLTFLoader().loadAsync(new URL('./assets/original-table.glb',import.meta.url).href),fetch(new URL('./assets/original-motion.json',import.meta.url)).then(r=>r.json())]);
 const byId=new Map(),byPath=new Map();gltf.scene.traverse(n=>byId.set(n.name,n));for(const d of motion.nodes){const n=byId.get(d.id);if(n){byPath.set(d.path,n);n.userData.sourcePath=d.path;}}
 const clipCache=new Map();for(const c of motion.clips){if(!clipCache.has(c.name))clipCache.set(c.name,c);}
 function restore(){for(const d of motion.nodes){const n=byId.get(d.id);if(!n||!d.position)continue;n.position.fromArray(d.position);n.quaternion.fromArray(d.quaternion);n.scale.fromArray(d.scale);n.visible=d.visible;}}
 function apply(name,t,player=null){const c=player?motion.clips.find(c=>c.name===name&&c.player===player):clipCache.get(name);if(!c)return;for(const tr of c.tracks){if(t<tr.start)continue;const n=byId.get(tr.target);if(!n)continue;const f=THREE.MathUtils.clamp(t*c.fps,0,tr.samples.length-1),a=Math.floor(f),b=Math.min(a+1,tr.samples.length-1),u=f-a,v1=tr.samples[a],v2=tr.samples[b];if(v1==null)continue;const v=Array.isArray(v1)?v1.map((x,i)=>x+(v2[i]-x)*u):typeof v1==='number'?v1+(v2-v1)*u:v1,p=tr.property;if(p==='position')n.position.fromArray(v);else if(p==='rotation')n.rotation.set(v[0],v[1],v[2],'YXZ');else if(p==='scale')n.scale.fromArray(v);else if(p==='visible')n.visible=!!v;else if(p==='fov')n.fov=v;else if(p.includes(':')){const [prop,axis]=p.split(':');if(['position','rotation','scale'].includes(prop)&&['x','y','z'].includes(axis))n[prop][axis]=v;}}}
 function restoreNode(path){const id=motion.paths[path],d=motion.nodes.find(n=>n.id===id),n=byId.get(id);if(n&&d?.position){n.position.fromArray(d.position);n.quaternion.fromArray(d.quaternion);n.scale.fromArray(d.scale);n.visible=d.visible;}}
 return {root:gltf.scene,motion,byId,byPath,clipCache,apply,restore,restoreNode};
}
