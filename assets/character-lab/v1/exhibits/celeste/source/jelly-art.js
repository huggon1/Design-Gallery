// Original native-resolution pixel art; collider origins are center-feet.
const palette={o:'#26314b',H:'#5599a9',L:'#8ec7ca',I:'#d5e9df',D:'#486581',r:'#bc8fba',k:'#202b43',f:'#e6eadd'};
const open=['........oooooo........','.....oooHHHHHHooo.....','...ooHLLLLLLLLLLHoo...','..oHLLLIIIIIIILLLLHo..','.oHLLLLIIIIIIILLLLLHo.','oHLLLLLLLLLLLLLLLLLLHo','oHLLLLLLLLLLLLLLLLLLHo','.oooooDDDDDDDDDDooooo.','..oDDooDooDDooDooDoo..'];
const folded=['.....oooo.....','...ooHIIHoo...','..oHLLIILLHo..','.oHLLLILLLLHo.','oHLLLLILLLLLHo','oHLLLDDDLLLLHo','.oooDDkDkDooo.','...oDDDDDDDo..','....ooDDoo....'];
function map(ctx,rows,x,y,colors=palette){for(let yy=0;yy<rows.length;yy++)for(let xx=0;xx<rows[yy].length;xx++){const c=colors[rows[yy][xx]];if(c){ctx.fillStyle=c;ctx.fillRect(x+xx,y+yy,1,1);}}}
export function drawJelly(ctx,e,time=0,player=null){
 if(e.removed||e.active===false)return;
 const x=Math.round(e.x),y=Math.round(e.y),opened=!!(e.open||(e.held&&player?.vy>20));
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(x,y);
 if(e.bubble&&!e.held){ctx.fillStyle='#7eafc3';for(let i=0;i<18;i++){const a=i*Math.PI/9;ctx.globalAlpha=i%3?.4:.7;ctx.fillRect(Math.round(Math.cos(a)*14),Math.round(-8+Math.sin(a)*14),1,1);}ctx.globalAlpha=1;}
 const sway=Math.round(Math.sin(time*4+(e.startX||e.x)*.1));
 if(opened){map(ctx,open,-11,-19);ctx.fillStyle='#26314b';ctx.fillRect(-3,-11,1,2);ctx.fillRect(3,-11,1,2);}
 else map(ctx,folded,-7,-14);
 for(let i=0;i<4;i++){const xx=[-6,-2,2,6][i],dy=i%2?1:0,curve=Math.round(Math.sin(time*4+i*1.7));ctx.fillStyle=palette.o;ctx.fillRect(xx,-7+dy,2,5);ctx.fillRect(xx+curve,-3+dy,2,3);ctx.fillStyle=i%2?palette.r:palette.L;ctx.fillRect(xx,-7+dy,1,5);ctx.fillRect(xx+curve,-3+dy,1,2);ctx.fillRect(xx+curve+sway,-1+dy,1,1);}
 ctx.restore();
}
const crystal=['....oooo....','...oIffIo...','..oIfLLfIo..','.oIfLLLLfIo.','oIfLLrrLLfIo','oILLLrrLLLIo','oILLLrrLLLIo','oIfLLLLLLfIo','.oIfLLLLfIo.','..oIfLLfIo..','...oIffIo...','....oooo....'];
export function drawCarryCrystal(ctx,e,time=0){
 if(e.removed||e.active===false)return;
 ctx.save();ctx.imageSmoothingEnabled=false;map(ctx,crystal,Math.round(e.x)-6,Math.round(e.y)-12,{...palette,H:'#686593',L:'#817ba8',I:'#b8b5d2',f:'#d4d1e2',r:'#515375'});ctx.restore();
}
