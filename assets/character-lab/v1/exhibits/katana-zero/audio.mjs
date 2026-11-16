const names=['player_jump','player_land','player_roll','player_running_1','player_running_2','player_running_3','player_running_4','slash_1','slash_2','slash_bullet','gun_fire','Slowmo_Enter','Slowmo_Exit'];
export class ZeroAudio {
 constructor(){this.muted=true;this.context=null;this.buffers={};this.active=new Set();this.rate=1;this.ready=false;this.pending=null;this.closed=false;}
 async unlock(){
  if(this.closed)return;
  if(!this.context){this.context=new(window.AudioContext||window.webkitAudioContext)();this.capture=this.context.createMediaStreamDestination();}await this.context.resume();
  this.pending??=Promise.all(names.map(async name=>{const r=await fetch(new URL(`assets/audio/${name}.wav`,import.meta.url));if(!r.ok)throw Error(name+' '+r.status);this.buffers[name]=await this.context.decodeAudioData(await r.arrayBuffer());})).then(()=>{this.ready=true;});return this.pending;
 }
 setMuted(muted){this.muted=muted;if(muted)for(const n of this.active)n.gain.gain.setTargetAtTime(0,this.context.currentTime,.01);}
 setRate(rate){this.rate=rate;for(const n of this.active)n.source.playbackRate.setTargetAtTime(Math.max(.22,rate),this.context.currentTime,.025);}
 play(name,volume=.3,{fixedRate=false}={}){
  if(this.muted||!this.context||this.context.state!=='running'||!this.buffers[name])return;
  const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.buffers[name];source.playbackRate.value=fixedRate?1:this.rate;gain.gain.value=volume;source.connect(gain);gain.connect(this.context.destination);if(this.capture)gain.connect(this.capture);const node={source,gain};this.active.add(node);source.onended=()=>this.active.delete(node);source.start();
 }
 dispose(){this.closed=true;for(const n of this.active){try{n.source.stop();}catch{}}this.active.clear();this.context?.close();}
}
