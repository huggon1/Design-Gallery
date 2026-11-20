import {approachPath,workStand,OBSTACLES} from './navigation.mjs';
export const EQUIPMENT=['bare','axe','pickaxe','shovel','spear'];
export const NAMES={bare:'空手',axe:'斧头',pickaxe:'鹤嘴锄',shovel:'铲子',spear:'长矛'};
export const TARGETS={
  flint:{x:-2,y:1.6,prop:'flint'},
  tree:{x:3.4,y:-.6,prop:'tree'},
  rock:{x:-4.1,y:-2.05,prop:'rock'},
  sapling:{x:2.6,y:3.2,prop:'sapling'},
};
const WORK={
  bare:{target:'flint',kind:'pickup',sequence:['pickup','pickup_pst']},
  axe:{target:'tree',kind:'chop',sequence:['chop_pre','chop_loop']},
  pickaxe:{target:'rock',kind:'mine',sequence:['pickaxe_pre','pickaxe_loop','pickaxe_pst']},
  shovel:{target:'sapling',kind:'dig',sequence:['shovel_pre','shovel_loop','shovel_pst']},
};
const CONTACT={punch:[8,'punch'],atk:[8,'attack'],pickup_pst:[1,'pickup'],chop_loop:[5,'chop'],pickaxe_loop:[9,'mine'],shovel_loop:[15,'dig'],eat:[28,'eat']};
const REPEAT_AT={chop_loop:14,pickaxe_loop:14,shovel_loop:35};
const LOCOMOTION=new Set(['idle_loop','run_pre','run_loop','run_pst']);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function createController(data){
  let state,queue=[],route=[],targetId=null,previous={},contacted=false;
  function reset(){
    state={x:0,y:0,prevX:0,prevY:0,time:0,equipment:'bare',action:'idle_loop',direction:'down',mirror:false,
      age:0,approach:null,events:[],activity:'idle',lastWork:null,recovery:{},moving:false};
    queue=[];route=[];targetId=null;previous={};contacted=false;
  }
  reset();
  const clip=()=>data.clips[state.action+'/'+state.direction]||data.clips[state.action+'/all'];
  function enter(name){state.action=name;state.age=0;contacted=false;}
  function face(dx,dy){
    if(Math.abs(dx)>Math.abs(dy)*.99){state.direction='side';state.mirror=dx<0;}
    else{state.direction=dy<0?'up':'down';state.mirror=false;}
  }
  function start(sequence,kind,target=null){
    const [first,...rest]=sequence;
    state.approach=null;state.activity=kind;state.moving=false;targetId=target;queue=rest;
    enter(first);
  }
  function attack(){start([state.equipment==='bare'?'punch':'atk'],'attack');}
  function work(){
    const plan=WORK[state.equipment];
    if(!plan){attack();return;}
    if((state.recovery[plan.target]||0)>state.time)return;
    state.approach=plan.target;
    const stand=workStand(plan.target,TARGETS[plan.target],state);
    route=approachPath(state,stand);
  }
  function connect(kind){
    state.events.push({kind,target:targetId,at:state.time,direction:state.direction,frame:Math.floor(state.age*30+1e-7)});
    if(state.events.length>30)state.events.shift();
    state.lastWork=kind;
    if(kind==='pickup')state.recovery.flint=state.time+1.5;
  }
  function finish(){
    queue=[];targetId=null;state.activity='idle';enter('idle_loop');
  }
  function step(dt,input={}){
    state.prevX=state.x;state.prevY=state.y;state.time+=dt;
    const just=key=>input[key]&&!previous[key];
    let dx=Number(!!input.right)-Number(!!input.left),dy=Number(!!input.down)-Number(!!input.up);
    const manual=!!(dx||dy);
    if(manual)state.approach=null;
    if(just('jump')){
      finish();state.approach=null;
      state.equipment=EQUIPMENT[(EQUIPMENT.indexOf(state.equipment)+1)%EQUIPMENT.length];
    }
    if(LOCOMOTION.has(state.action)){
      if(just('attack'))attack();
      else if(just('special'))start(['eat'],'eat');
      else if(just('dash'))work();
    }
    if(state.approach){
      const waypoint=route[0],toX=waypoint.x-state.x,toY=waypoint.y-state.y;
      if(Math.hypot(toX,toY)<=6*dt){
        state.x=waypoint.x;state.y=waypoint.y;route.shift();
        if(!route.length){
          const plan=WORK[state.equipment];state.direction=waypoint.direction;state.mirror=waypoint.mirror;
          start(plan.sequence,plan.kind,plan.target);
        }
        dx=0;dy=0;
      }else{dx=toX;dy=toY;}
    }
    const length=Math.hypot(dx,dy);
    if(LOCOMOTION.has(state.action)){
      state.moving=length>0;
      if(length>0){
        face(dx,dy);
        state.x=clamp(state.x+dx/length*6*dt,-13,13);
        state.y=clamp(state.y+dy/length*6*dt,-8.5,8.5);
        // Keep Wilson outside opaque tree trunks and the boulder. Slide along their rim.
        for(const o of OBSTACLES){
          const radius=o.r,x=state.x-o.x,y=state.y-o.y,distance=Math.hypot(x,y);
          if(distance<radius && distance>1e-8){state.x=o.x+x*radius/distance;state.y=o.y+y*radius/distance;}
        }
        if(state.action==='idle_loop'||state.action==='run_pst')enter('run_pre');
        state.activity='move';
      }else if(state.action==='run_pre'||state.action==='run_loop'){
        enter('run_pst');state.activity='stop';
      }
    }
    previous={...input};
    state.age+=dt;
    const tick=Math.floor(state.age*30+1e-8);
    const cue=CONTACT[state.action];
    if(cue&&!contacted&&tick>=cue[0]){contacted=true;connect(cue[1]);}
    if(input.dash&&REPEAT_AT[state.action]!==undefined&&tick>=REPEAT_AT[state.action]){
      enter(state.action);
      return;
    }
    // In the single-player stategraph movement can cancel after the strike has landed.
    if(manual&&((state.action==='punch'||state.action==='atk')&&tick>=12 || state.action==='eat'&&tick>=30)){
      finish();return;
    }
    if(state.age+1e-8<clip().frames.length/clip().fps)return;
    if(queue.length){enter(queue.shift());return;}
    if(state.action==='run_pre'||state.action==='run_loop')enter('run_loop');
    else if(state.action==='idle_loop')enter('idle_loop');
    else finish();
  }
  function frame(){const a=clip();return Math.min(a.frames.length-1,Math.floor(state.age*a.fps+1e-8));}
  return {get state(){return state;},get rows(){return clip().frames[frame()];},frame,step,reset,
    clear(){previous={};state.approach=null;},resetInterpolation(){state.prevX=state.x;state.prevY=state.y;}};
}
