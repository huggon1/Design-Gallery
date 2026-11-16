export const WORLD = Object.freeze({
 bounds:{left:0,right:44,bottom:0,top:23},
 solids:[
  {id:'low',x:17.2,y:2.4,w:4.2,h:.65},
  {id:'mid',x:23.3,y:5.4,w:4.0,h:.65},
  {id:'high',x:29.3,y:8.5,w:3.5,h:.65},
  {id:'claw-wall',x:34.5,y:16.5,w:1.8,h:16.5},
  {id:'claw-start',x:38.2,y:1.25,w:2.6,h:1.25},
  {id:'claw-perch',x:39.0,y:15.3,w:2.0,h:.65},
 ],
 targets:[{id:'nail-bell',x:12.4,y:.55,w:.8,h:1.5,damageable:true,givesSoul:false,pogoable:true}],
});
export const SPAWNS=Object.freeze({run:{x:6,y:0,facing:1},jump:{x:19,y:2.4,facing:1},wall:{x:43.4,y:0,facing:1},nail:{x:10.7,y:0,facing:1}});
export const sections=[{id:'run',label:'跑跳与冲刺'},{id:'jump',label:'二段跳'},{id:'wall',label:'螳螂爪'},{id:'nail',label:'骨钉'}];
