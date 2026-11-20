export const OBSTACLES=[{x:3.4,y:-.6,r:.42},{x:-4.1,y:-2.05,r:.8}];
// Offsets are Wilson's feet relative to the prop. Side distances are measured against
// the visible blade and bark/stone silhouettes at the single-player contact tick.
const STANCE={
  tree:{side:1.76,depth:.66,sideY:.09,frontX:-.19},
  rock:{side:2.30,rightSide:2.07,depth:1.11,sideY:.13,frontX:0},
  flint:{side:.18,depth:.18,sideY:.06,frontX:.11},
  sapling:{side:.75,depth:.58,sideY:.07,frontX:0},
};
export function workStand(id,prop,actor){
  const {side,rightSide=side,depth,sideY,frontX}=STANCE[id];
  const stands=[
    {x:prop.x-side,y:prop.y+sideY,direction:'side',mirror:false},
    {x:prop.x+rightSide,y:prop.y+sideY,direction:'side',mirror:true},
    {x:prop.x+frontX,y:prop.y+depth,direction:'up',mirror:false},
    {x:prop.x+frontX,y:prop.y-depth,direction:'down',mirror:false},
  ];
  return stands.reduce((a,b)=>Math.hypot(actor.x-a.x,actor.y-a.y)<Math.hypot(actor.x-b.x,actor.y-b.y)?a:b);
}
function visible(a,b){
  const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
  if(!len)return true;
  return OBSTACLES.every(o=>{
    const t=Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.y-a.y)*dy)/len));
    return Math.hypot(a.x+t*dx-o.x,a.y+t*dy-o.y)>=o.r-.00001;
  });
}
export function approachPath(start,end){
  if(visible(start,end))return [end];
  const nodes=[start,end];
  for(const o of OBSTACLES)for(let i=0;i<12;i++){
    const angle=i*Math.PI/6,r=o.r*1.09+.06;
    nodes.push({x:o.x+Math.cos(angle)*r,y:o.y+Math.sin(angle)*r});
  }
  const distance=nodes.map(()=>Infinity),parent=nodes.map(()=>-1),open=new Set(nodes.keys());distance[0]=0;
  while(open.size){
    let next=-1;
    for(const id of open)if(next<0||distance[id]<distance[next])next=id;
    if(next===1||!Number.isFinite(distance[next]))break;
    open.delete(next);
    for(const id of open){
      if(!visible(nodes[next],nodes[id]))continue;
      const cost=distance[next]+Math.hypot(nodes[next].x-nodes[id].x,nodes[next].y-nodes[id].y);
      if(cost<distance[id]){distance[id]=cost;parent[id]=next;}
    }
  }
  const result=[];
  for(let id=1;id>0;id=parent[id])result.unshift(nodes[id]);
  return result;
}
