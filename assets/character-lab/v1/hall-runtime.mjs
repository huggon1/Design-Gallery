const actions = ['left','right','up','down','jump','dash','attack','grab','special','reload','slow','hook','fireUp','fireDown','fireLeft','fireRight'];
const impulses=new Set(['jump','dash','attack','special','reload','hook']);
export function createInput(){
  const held=new Map(),pending=new Set(),aim={x:.5,y:.5,active:false};
  let specialPress=0;
  const snapshot=()=>{const active=new Set(held.values());return Object.fromEntries(actions.map(action=>[action,active.has(action)]));};
  return {
    hold(id,action){
      if(!actions.includes(action))return;
      if(!held.has(id)){
        if(impulses.has(action))pending.add(action);
        if(action==='special')specialPress++;
      }
      held.set(id,action);
    },
    release(id){held.delete(id);},
    clear(){held.clear();pending.clear();specialPress=0;aim.active=false;},
    setAim(x,y,active=true){aim.x=Math.max(0,Math.min(1,Number.isFinite(x)?x:.5));aim.y=Math.max(0,Math.min(1,Number.isFinite(y)?y:.5));aim.active=Boolean(active);},
    get aim(){return {...aim};},
    snapshot,
    sample(){const state=snapshot();for(const action of pending)state[action]=true;pending.clear();return {...state,specialPress,aim:{...aim}};},
  };
}
export function createTransport(input){
  let scene=null,paused=false,speed=1,previous=null,remainder=0,time=0;
  const clear=()=>{input.clear();scene?.clearInput?.();scene?.resetInterpolation?.();previous=null;remainder=0;};
  return {
    get scene(){return scene;},get paused(){return paused;},get speed(){return speed;},get time(){return time;},
    get interpolationAlpha(){return paused?1:Math.max(0,Math.min(1,remainder/(scene?.fixedStep||1/60)));},
    clearInput:clear,
    setScene(next){clear();scene?.dispose?.();scene=next;time=0;paused=false;},
    setPaused(value){paused=Boolean(value);clear();},
    setSpeed(value){if([.25,.5,1].includes(value)){speed=value;previous=null;remainder=0;scene?.resetInterpolation?.();}},
    resetClock(){clear();time=0;},
    frame(timestamp){
      const elapsed=previous===null?0:Math.min(.1,Math.max(0,(timestamp-previous)/1000));previous=timestamp;
      if(!scene||paused){remainder=0;return;}
      const dt=scene.fixedStep||1/60;remainder+=elapsed*speed;
      while(remainder+1e-9>=dt){scene.step(dt,input.sample());time+=dt;remainder-=dt;}
    },
    dispose(){clear();scene?.dispose?.();scene=null;},
  };
}
