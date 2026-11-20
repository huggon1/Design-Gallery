import {poseFor} from './motion.mjs';
import {loadRigAsset,loadMotionBank,drawRigAsset,rigAssetInfo,disposeRigAsset,rigPoseBounds} from './rig-renderer.mjs';
export async function loadCharacterAsset(){await loadRigAsset();await loadMotionBank();}
export const characterAssetInfo=rigAssetInfo,disposeCharacter=disposeRigAsset;
export function characterBounds(pose,angle){return rigPoseBounds(pose,angle);}
export function drawCharacter(ctx,{x,y,angle=0,clip='idle',time=0,scale=1,alpha=1,debug=false,pose=null,shadow=true,transition=null}){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha*=alpha;
 if(shadow){ctx.fillStyle='#02080766';ctx.beginPath();ctx.ellipse(0,2,17,8,0,0,7);ctx.fill();}
 const anchors=drawRigAsset(ctx,{pose,clip,time,transition,angle,rasterScale:scale});
 if(debug){const cs=Math.cos(angle),sn=Math.sin(angle);for(const [name,p]of Object.entries(anchors)){const q=[-p[0]*cs+p[1]*sn,(p[0]*sn+p[1]*cs)*.56-p[2]*.87];ctx.fillStyle='#81e3c1';ctx.beginPath();ctx.arc(...q,1.6,0,7);ctx.fill();ctx.font='5px monospace';ctx.fillText(name,q[0]+2,q[1]-2);}}
 ctx.restore();return anchors;
}
