import {rooms} from './source/rooms.js';
export const sections=[{id:'jump',label:'跳跃'},{id:'height',label:'跳跃高度'},{id:'dash',label:'八向冲刺'},{id:'climb',label:'抓墙攀爬'},{id:'walljump',label:'墙跳'}];
const indices={jump:0,height:1,dash:2,climb:4,walljump:6};
export function createRoom(section='jump'){
 const original=rooms[indices[section]??0],room=structuredClone(original);
 room.width=320;room.height=180;room.hazards=[];room.goal=null;room.requiredTech=[];
 if(section==='walljump'){
  room.solids=[{x:0,y:164,w:320,h:16,kind:'solid'},{x:92,y:44,w:12,h:120,kind:'solid'},{x:152,y:44,w:12,h:120,kind:'solid'},{x:20,y:44,w:72,h:10,kind:'solid'}];
 }
 const floor=section==='jump'?164:176;
 room.solids.push({x:0,y:0,w:4,h:180,kind:'boundary'},{x:316,y:0,w:4,h:180,kind:'boundary'},{x:0,y:0,w:320,h:4,kind:'boundary'},{x:0,y:floor,w:320,h:180-floor,kind:'boundary'});
 return room;
}
