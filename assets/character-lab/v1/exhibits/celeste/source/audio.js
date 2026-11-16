// Original, entirely local synthesis. Only physical events make sound: the
// accompanying `tech` evidence and derived achievement labels stay silent.
export class Audio {
  constructor({ context = null, persist = true } = {}) {
    this.muted = false;
    this.persist = persist;
    if (persist) try { this.muted = localStorage.getItem('summit-muted') === '1'; } catch {}
    this.ctx = context;
    this.output = null;
    this.noiseBuffer = null;
    this.last = new Map();
    this.voices = 0;
    if (context) this.graph();
  }
  unlock() {
    if (!this.ctx) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (Context) { this.ctx = new Context(); this.graph(); }
    }
    if (this.ctx?.state === 'suspended' && !this.ctx.startRendering) this.ctx.resume().catch(() => {});
  }
  graph() {
    if (this.output || !this.ctx) return;
    const ctx = this.ctx;
    this.output = ctx.createGain();
    // A soft safety stage catches unusual overlaps, with ample mix headroom.
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 5;
    compressor.attack.value = .003;
    compressor.release.value = .08;
    this.output.gain.value = this.muted ? 0 : .6;
    this.output.connect(compressor); compressor.connect(ctx.destination);
    this.noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .5), ctx.sampleRate);
    const samples = this.noiseBuffer.getChannelData(0);
    let seed = 0x41c6ce57;
    for (let i = 0; i < samples.length; i++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      samples[i] = (seed >>> 0) / 2147483648 - 1;
    }
  }
  toggle() {
    this.muted = !this.muted;
    if (this.persist) try { localStorage.setItem('summit-muted', this.muted ? '1' : '0'); } catch {}
    if (this.output) {
      const now = this.ctx.currentTime;
      this.output.gain.cancelScheduledValues(now);
      this.output.gain.setValueAtTime(this.output.gain.value, now);
      this.output.gain.linearRampToValueAtTime(this.muted ? 0 : .6, now + .015);
    }
    return this.muted;
  }
  ready() {
    return !this.muted && this.ctx && (this.ctx.state === 'running' || typeof this.ctx.startRendering === 'function');
  }
  envelope(node, volume, duration, start, attack = .004) {
    node.gain.setValueAtTime(0, start);
    node.gain.linearRampToValueAtTime(volume, start + Math.min(attack, duration * .2));
    node.gain.exponentialRampToValueAtTime(.00001, start + duration);
    node.gain.linearRampToValueAtTime(0, start + duration + .006);
  }
  voice(source, nodes, duration, start) {
    this.voices++;
    source.onended = () => { this.voices--; source.disconnect(); for (const node of nodes) node.disconnect(); };
    source.start(start); source.stop(start + duration + .01);
  }
  tone(freq, end, duration, volume = .025, type = 'triangle', delay = 0) {
    if (!this.ready() || this.voices >= 48) return;
    const start = this.ctx.currentTime + delay, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), start + duration);
    this.envelope(gain, volume, duration, start);
    osc.connect(gain); gain.connect(this.output);
    this.voice(osc, [gain], duration, start);
  }
  air(freq, end, duration, volume = .025, delay = 0, mode = 'bandpass') {
    if (!this.ready() || this.voices >= 48) return;
    const start = this.ctx.currentTime + delay, source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = mode; filter.Q.value = .7;
    filter.frequency.setValueAtTime(freq, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, end), start + duration);
    this.envelope(gain, volume, duration, start, .002);
    source.connect(filter); filter.connect(gain); gain.connect(this.output);
    this.voice(source, [filter, gain], duration, start);
  }
  // Optional delay also permits real OfflineAudioContext mix verification.
  event(e, delay = 0) {
    if (!this.ready()) return;
    const type = e?.type || e, now = this.ctx.currentTime + delay;
    // A simulation can emit multiple contact events in the same update.
    const repeated = this.last.get(type);
    if (repeated !== undefined && now - repeated < .035) return;
    const tone = (a, b, d, v, wave = 'triangle', offset = 0) => this.tone(a, b, d, v, wave, delay + offset);
    const air = (a, b, d, v, offset = 0, mode) => this.air(a, b, d, v, delay + offset, mode);
    switch (type) {
      case 'jump':
        tone(235, 480, .105, .025); air(1500, 2300, .045, .012); break;
      case 'walljump':
        tone(185, 510, .12, .025); air(800, 1900, .055, .022); break;
      case 'climb-jump':
        tone(260, 450, .11, .024); air(700, 1700, .045, .017); break;
      case 'climb-hop':
        tone(260, 460, .09, .021); tone(430, 620, .07, .012, 'sine', .035); break;
      case 'wallboost':
        air(1100, 2400, .07, .02); tone(190, 330, .07, .014); break;
      case 'wallbounce':
        tone(165, 740, .17, .032); tone(330, 1110, .12, .009, 'sine'); air(1100, 3600, .075, .026); break;
      case 'dash':
        air(2800, 500, .135, .04); tone(420, 85, .12, .017, 'triangle'); break;
      case 'super':
        tone(210, 590, .135, .028); air(1300, 3000, .085, .024); break;
      case 'hyper':
        tone(160, 310, .12, .03); air(2300, 650, .11, .032); break;
      case 'ultra':
        tone(95, 150, .13, .03); air(850, 2700, .13, .038); break;
      case 'land': {
        // Ultra already carries the landing transient, including its grit.
        if (now - (this.last.get('ultra') ?? -Infinity) < .04) return;
        const speed = typeof e === 'object' ? Math.abs(e.speed ?? 100) : 100;
        if (speed < 35) return;
        const weight = Math.min(1, speed / 180);
        tone(105, 48, .07, .022 * weight); air(700, 180, .055, .025 * weight); break;
      }
      case 'spring':
      case 'holdable-spring':
        tone(125, 690, .18, .032); tone(330, 920, .1, .012, 'sine', .025); break;
      case 'bumper':
        tone(145, 610, .2, .035, 'sine'); tone(510, 1020, .13, .015, 'triangle', .018); air(900, 3000, .07, .025); break;
      case 'refill':
        tone(880, 1080, .12, .019, 'sine'); tone(1320, 1580, .15, .013, 'sine', .045); break;
      case 'dream-enter':
        air(900, 280, .19, .035); tone(520, 210, .2, .021, 'sine'); break;
      case 'dream-exit':
        air(350, 2400, .17, .026); tone(390, 780, .16, .021, 'sine'); break;
      case 'dream-jump':
        tone(310, 690, .13, .024, 'sine'); air(1300, 2600, .06, .016); break;
      case 'pickup':
        tone(350, 520, .11, .018, 'sine'); tone(525, 700, .12, .012, 'sine', .035); break;
      case 'drop':
        tone(280, 140, .09, .016, 'sine'); air(600, 280, .045, .01); break;
      case 'throw':
        air(1600, 550, .12, .027); tone(330, 160, .1, .017, 'sine'); break;
      case 'jelly-float':
        // One finite breath when gliding begins, never a sustained loop.
        air(650, 1700, .28, .023); tone(460, 560, .23, .012, 'sine'); break;
      case 'jelly-boost':
        tone(340, 820, .17, .023, 'sine'); air(1100, 2600, .1, .021); break;
      case 'death':
        tone(280, 48, .26, .028); air(1600, 100, .22, .035); break;
      case 'complete':
      case 'strawberry':
        [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => tone(frequency, frequency, .25, .018, 'sine', i * .075)); break;
      default: return;
    }
    this.last.set(type, now);
  }
}
