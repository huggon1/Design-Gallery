const cues={
  jump:['Player_Jump',.32],land:['Player_Land_Ground',.28],
  dash:['Player_Dash',.38],slap:['Player_Parry_Slap',.27],parry:['Player_Parry_Power',.42],
  shot:['PeaShooter_Loop',.24,.11],hit:['PeaShooter_Death',.21],
  ex:['Player_Special_Attack',.40],exHit:['PeaShooter_Death',.34],
};
export function createAudio() {
  let context, capture, loading, closed=false, muted=true;
  const buffers=new Map(), voices=new Set();
  function silence() {
    for (const source of voices) source.stop();
    voices.clear();
  }
  async function unlock() {
    if (closed) return;
    if (!context) {
      context=new AudioContext(); capture=context.createMediaStreamDestination();
    }
    await context.resume();
    loading??=Promise.all([...new Set(Object.values(cues).map(([name])=>name))].map(async name=>{
      const response=await fetch(new URL('assets/'+name+'.wav',import.meta.url));
      if (!response.ok) throw Error(name+' '+response.status);
      const buffer=await context.decodeAudioData(await response.arrayBuffer());
      if (!closed) buffers.set(name,buffer);
    }));
    return loading;
  }
  function play(type) {
    const cue=cues[type];
    if (muted||closed||!cue||!buffers.has(cue[0])) return;
    const [name,volume,duration]=cue, source=context.createBufferSource(), gain=context.createGain();
    source.buffer=buffers.get(name);
    gain.gain.value=volume;source.connect(gain);gain.connect(context.destination);gain.connect(capture);
    voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};
    if (duration) {
      const end=context.currentTime+duration;
      gain.gain.setValueAtTime(volume,end-.009);gain.gain.linearRampToValueAtTime(0,end);
      source.start(0,0,duration);
    } else source.start();
  }
  return {unlock,play,silence,setMuted(value){muted=value;if (muted) silence();},
    get stream(){return capture?.stream;},get ready(){return buffers.size===new Set(Object.values(cues).map(([name])=>name)).size;},
    dispose(){closed=true;silence();capture?.stream.getTracks().forEach(track=>track.stop());context?.close();}};
}
