const names=['hero_jump','hero_land_soft','hero_wall_jump','hero_wall_slide','hero_dash','hero_shade_dash_1','hero_shade_dash_2','hero_wings','hero_run_footsteps_stone','sword_2','sword_3','enemy_damage','sword_hit_reject','hero_damage_less_harsh_0','focus_health_charging','focus_health_heal','hero_fireball','hero_void_scream_spell','hero_quake_spell_prepare','hero_quake_spell_dash','hero_void_quake_impact'];
export class ArenaAudio{
 constructor(){
  this.context=null;this.buffers=new Map();this.active=new Set();this.loops=new Map();this.enabled=true;this.volume=.7;this.ready=false;
  this.musicBuffers=new Map();this.musicTrack='mantis-lords';this.musicBuffer=null;this.musicSource=null;this.musicOffset=0;this.musicStartedAt=0;this.musicWanted=false;this.musicVolume=.38;
 }
 async preload({music=false,clips=[]}={}){
  this.context=new(window.AudioContext||window.webkitAudioContext)();
  this.master=this.context.createGain();this.master.gain.value=this.volume;this.master.connect(this.context.destination);
  this.musicGain=this.context.createGain();this.musicGain.gain.value=this.musicVolume;this.musicGain.connect(this.master);
  const specs=names.map(name=>({name,url:new URL(`../lab/audio/${name}.wav`,import.meta.url)}));
  await Promise.all([...specs,...clips].map(async({name,url})=>{
   const r=await fetch(url);if(!r.ok)throw Error(`Audio ${name}`);
   this.buffers.set(name,await this.context.decodeAudioData(await r.arrayBuffer()));
  }));
  if(music){
   await Promise.all(['mantis-lords','sisters-of-battle'].map(async track=>{const r=await fetch(new URL(`./audio/${track}-preview.mp3`,import.meta.url));if(!r.ok)throw Error(`Battle music ${track}`);this.musicBuffers.set(track,await this.context.decodeAudioData(await r.arrayBuffer()))}));
   this.musicBuffer=this.musicBuffers.get(this.musicTrack);
  }
  this.ready=true;
 }
 unlock(){
  if(this.context?.state==='suspended')this.context.resume().then(()=>this.startMusic()).catch(()=>{});
  else this.startMusic();
 }
 play(name,gain=.6,{rate=1}={}){
  if(!this.enabled||this.context?.state!=='running')return null;
  const buffer=this.buffers.get(name);if(!buffer)return null;
  const source=this.context.createBufferSource(),volume=this.context.createGain();source.buffer=buffer;source.playbackRate.value=rate;
  volume.gain.value=gain;source.connect(volume);volume.connect(this.master);
  source.onended=()=>{this.active.delete(source);source.disconnect();volume.disconnect()};this.active.add(source);source.start();return source;
 }
 loop(name,on,gain=.2){
  const old=this.loops.get(name);
  if(!on||!this.enabled){if(old){try{old.stop()}catch{}this.loops.delete(name)}return}
  if(old)return;const source=this.play(name,gain);if(source){source.loop=true;this.loops.set(name,source)}
 }
 startMusic(){
  if(!this.musicWanted||!this.enabled||!this.musicBuffer||this.musicSource||this.context?.state!=='running')return;
  const source=this.context.createBufferSource();source.buffer=this.musicBuffer;source.loop=true;source.connect(this.musicGain);
  this.musicOffset%=this.musicBuffer.duration;this.musicStartedAt=this.context.currentTime;
  this.musicSource=source;source.start(0,this.musicOffset);
 }
 pauseMusic(){
  if(!this.musicSource)return;
  this.musicOffset=(this.musicOffset+this.context.currentTime-this.musicStartedAt)%this.musicBuffer.duration;
  try{this.musicSource.stop();this.musicSource.disconnect()}catch{}this.musicSource=null;
 }
 setMusic(on,{restart=false,track}={}){
  if(track&&track!==this.musicTrack){this.pauseMusic();this.musicTrack=track;this.musicBuffer=this.musicBuffers.get(track)||null;this.musicOffset=0}
  if(restart){this.pauseMusic();this.musicOffset=0}
  this.musicWanted=on;if(on)this.startMusic();else this.pauseMusic();
 }
 stop({keepMusic=false,resetMusic=false}={}){
  for(const source of this.active){try{source.stop()}catch{}}this.active.clear();this.loops.clear();
  if(!keepMusic)this.setMusic(false,{restart:resetMusic});
 }
 setEnabled(on){this.enabled=on;if(!on)this.stop();else this.startMusic()}
 setVolume(value){this.volume=Math.max(0,Math.min(1,value));if(this.master)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.025)}
 setMusicVolume(value){this.musicVolume=Math.max(0,Math.min(1,value));if(this.musicGain)this.musicGain.gain.setTargetAtTime(this.musicVolume,this.context.currentTime,.06)}
}
