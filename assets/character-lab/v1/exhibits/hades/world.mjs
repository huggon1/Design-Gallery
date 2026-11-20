export const WORLD={width:6400,height:4800,left:-3200,right:3200,top:-2400,bottom:2400,spawn:{x:0,y:0}};
export const LANDMARKS=[
 {id:'spawn',type:'spawn',x:0,y:0,label:'出生点'},
 {id:'blade',type:'dummy',x:720,y:-260,label:'基础剑 · 单桩'},
 {id:'ring',type:'column',x:-760,y:-500,r:56,label:'绕柱与转向'},
 {id:'reflex',type:'lane',x:-1640,y:860,label:'二连冲刺长道'},
 {id:'barrier',type:'bar',x:1460,y:760,label:'低障碍冲刺'},
 {id:'link',type:'dummy',x:2150,y:-1250,label:'移动与冲刺前刺'},
 {id:'north',type:'obelisk',x:-1600,y:-1620,label:'北侧折返'},
 {id:'south',type:'dummy',x:-860,y:1720,label:'南侧连招'}
];
export const DUMMIES=LANDMARKS.filter(x=>x.type==='dummy');
export const SOLIDS=[...LANDMARKS.filter(x=>x.type==='column'),{x:1360,y:760,r:34},{x:1410,y:760,r:34},{x:1460,y:760,r:34},{x:1510,y:760,r:34},{x:1560,y:760,r:34},{x:-670,y:-500,r:33},{x:-760,y:-590,r:33}];
export const CAMERA={groundY:.56,heightZ:.87,referenceViewWidth:1500,referenceViewHeight:840,follow:11,lead:.12};
