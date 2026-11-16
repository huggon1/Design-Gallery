/** Hollow Knight sprite renderer. World context: +Y up; x/y are Knight feet.
 * Source clip order, repeated frames, loopStart, FPS and local positions come
 * from the recorded tk2d asset bundle. See research/lab-assets.md.
 */
const assetRoot = new URL('./assets/', import.meta.url);
let manifest = null;
let atlases = [];
let loading = null;
export const assetStatus = { loaded: false, loadedAtlases: 0, totalAtlases: 0, error: '' };
export const FOOT_OFFSET = 1.390625;
const animationState = new WeakMap();

export function loadArt() {
  if (loading) return loading;
  loading = (async () => {
    const response = await fetch(new URL('sprites.json', assetRoot));
    if (!response.ok) throw new Error(`Sprite manifest: HTTP ${response.status}`);
    manifest = await response.json();
    assetStatus.totalAtlases = manifest.atlases.length;
    atlases = await Promise.all(manifest.atlases.map(name => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { assetStatus.loadedAtlases++; resolve(image); };
      image.onerror = () => reject(new Error(`Sprite atlas failed: ${name}`));
      image.src = new URL(name, assetRoot).href;
    })));
    assetStatus.loaded = true;
    return manifest;
  })().catch(error => { assetStatus.error = error.message; throw error; });
  return loading;
}

export function clipInfo(name, group = 'knight') {
  const clip = manifest?.clips[group]?.[name];
  return clip ? { fps: clip.fps, frames: clip.frames.length, duration: clip.frames.length / clip.fps, loopStart: clip.loopStart, wrapMode: clip.wrapMode } : null;
}
export function getArtManifest() { return manifest; }

/** Pure source clip sampler, also useful for timeline/pose comparisons. */
export function sampleFrame(clip, seconds, { loop, hold = true } = {}) {
  if (!clip?.frames?.length) return null;
  const length = clip.frames.length;
  let index = Math.max(0, Math.floor(Math.max(0, seconds) * clip.fps + 1e-7));
  if (loop === true || (loop !== false && clip.wrapMode === 0)) index %= length;
  else if (loop !== false && clip.wrapMode === 1 && index >= length) {
    const start = Math.max(0, Math.min(length - 1, clip.loopStart));
    index = start + (index - start) % (length - start);
  } else if (index >= length) {
    if (!hold) return null;
    index = length - 1;
  }
  return clip.frames[index];
}

/** Draw an asset at its own Unity local origin. Source art faces LEFT.
 * Use facing=1 for the desired RIGHT-facing presentation.
 */
export function drawClip(ctx, group, name, seconds, x = 0, y = 0, options = {}) {
  if (!manifest || !assetStatus.loaded) return false;
  const clip = manifest.clips[group]?.[name];
  const key = sampleFrame(clip, seconds, options);
  const frame = key && manifest.frames[key];
  if (!frame) return false;
  const atlas = atlases[frame.atlas];
  const [sx, sy, sw, sh] = frame.rect;
  const [px, py, pw, ph] = frame.position;
  ctx.save();
  ctx.translate(x, y);
  if (options.rotation) ctx.rotate(options.rotation);
  const flip = options.native ? 1 : -(options.facing ?? 1);
  ctx.scale(flip * (options.scaleX ?? options.scale ?? 1), -(options.scaleY ?? options.scale ?? 1));
  if (options.alpha != null) ctx.globalAlpha *= options.alpha;
  if (options.blend) ctx.globalCompositeOperation = options.blend;
  ctx.drawImage(atlas, sx, sy, sw, sh, px, -(py + ph), pw, ph);
  ctx.restore();
  return true;
}

const aliases = {
  idle: 'Idle', run: 'Run', walk: 'Run', jump: 'Airborne', airborne: 'Airborne', fall: 'Fall',
  land: 'Land', hardland: 'HardLand', dash: 'Dash', shadowdash: 'Shadow Dash',
  doublejump: 'Double Jump', wallslide: 'Wall Slide', walljump: 'Walljump',
  slash: 'Slash', slashalt: 'SlashAlt', upslash: 'UpSlash', downslash: 'DownSlash',
  focus: 'Focus', focusget: 'Focus Get', focusend: 'Focus End',
  fireball: 'Fireball1 Cast', spirit: 'Fireball1 Cast', cast: 'Fireball1 Cast',
  shadesoul: 'Fireball2 Cast', scream: 'Scream', shriek: 'Scream 2',
  dive: 'Quake Fall', diveantic: 'Quake Antic', diveland: 'Quake Land',
  darkdive: 'Quake Fall 2', darkland: 'Quake Land 2',
  great: 'NA Big Slash', greatslash: 'NA Big Slash', dashslash: 'NA Dash Slash',
  cyclone: 'NA Cyclone', cyclonestart: 'NA Cyclone Start', cycloneend: 'NA Cyclone End',
  charge: 'NA Charge', superdashcharge: 'SD Charge Ground', superdash: 'SD Dash',
  superdashbrake: 'SD Air Brake', dreamcharge: 'DN Charge', dreamnail: 'DN Slash',
  recoil: 'Recoil', lookup: 'LookUp', lookdown: 'LookDown',
};
const normalized = value => String(value || '').toLowerCase().replace(/[ _-]/g, '');
const isAttack = value => value && typeof value === 'object';
function attackClip(attack) {
  const kind = normalized(attack?.kind || attack?.type || attack?.dir);
  if (kind === 'up' || kind === 'upslash') return 'UpSlash';
  if (kind === 'down' || kind === 'downslash') return 'DownSlash';
  if (kind.includes('great')) return 'NA Big Slash';
  if (kind.includes('dashslash')) return 'NA Dash Slash';
  if (kind.includes('cyclone')) return 'NA Cyclone';
  return (attack?.alternate || attack?.alt || attack?.variant === 1) ? 'SlashAlt' : 'Slash';
}
function chooseBody(p) {
  if (p.dashing && p.shadowDashing) return 'Shadow Dash';
  if (manifest?.clips.knight[p.anim]) return p.anim;
  if (aliases[normalized(p.anim)]) return aliases[normalized(p.anim)];
  if (isAttack(p.attack)) return attackClip(p.attack);
  if (p.casting) {
    const cast = typeof p.casting === 'object' ? p.casting : {};
    return aliases[normalized(cast.anim || cast.kind)] || 'Fireball1 Cast';
  }
  if (p.dashing || p.dashTime > 0) return p.shadowDash ? 'Shadow Dash' : 'Dash';
  if (p.wallSliding || p.wallSlide || p.wall && !p.grounded && p.vy < 0) return 'Wall Slide';
  if (!p.grounded) return p.vy > 0 ? 'Airborne' : 'Fall';
  if (p.focus > 0 || p.focusing) return 'Focus';
  return Math.abs(p.vx || 0) > .1 ? 'Run' : 'Idle';
}
function bodyTime(p, clip, clock) {
  if (Number.isFinite(p.animTime)) return p.animTime;
  if (isAttack(p.attack) && Number.isFinite(p.attack.time)) return p.attack.time;
  if (p.casting && Number.isFinite(p.casting.time)) return p.casting.time;
  let state = animationState.get(p);
  if (!state || state.clip !== clip) { state = { clip, started: clock }; animationState.set(p, state); }
  return Math.max(0, clock - state.started);
}

export function drawKnight(ctx, player, time = 0) {
  const clip = chooseBody(player);
  const seconds = bodyTime(player, clip, time);
  const facing = player.facing ?? player.face ?? 1;
  const x = player.x || 0, y = (player.y || 0) + FOOT_OFFSET;
  drawBodyAttachments(ctx, player, seconds);
  drawClip(ctx, 'knight', clip, seconds, x, y, { facing });
  return { clip, time: seconds, info: clipInfo(clip) };
}

// Ordinary attacks use HeroController runtime offsets and NailSlash scale.
// Nail arts use their source child transforms.
const attackEffects = {
  side: ['SlashEffect', [-.4, -.25, 1.601078, 1.645244]],
  alt: ['SlashEffectAlt', [-.4, -.25, 1.2569697, 1.422434]],
  up: ['UpSlashEffect', [-.1, .3, 1.15, 1.4]],
  down: ['DownSlashEffect', [.3, -1.75, 1.125, 1.28002]],
  great: ['NA Big Slash Effect', [-.68, 0, 1.3162084, 1.3162082]],
  dashslash: ['NA Dash Slash Effect', [-.68, 0, 1.3162084, 1.3162082]],
  cyclone: ['Cyclone Effect', [0, -.36286, 1.4402852, 1.9107084]],
};
/** attack.x/y = Knight feet. `time` is elapsed since the attack began.
 * The first two 40fps effect frames are blank in the source clip. Keep them.
 */
export function drawAttack(ctx, attack, time = 0) {
  if (!attack) return false;
  let kind = normalized(attack.kind || attack.type || 'side');
  if (kind === 'slash' || kind === 'normal') kind = 'side';
  if (kind === 'greatslash') kind = 'great';
  if (kind === 'side' && (attack.alternate || attack.alt || attack.variant === 1)) kind = 'alt';
  const [clip, transform] = attackEffects[kind] || attackEffects.side;
  const facing = attack.facing ?? attack.face ?? 1;
  const [dx, dy, scaleX, scaleY] = transform;
  const seconds = attack.time ?? time;
  return drawClip(ctx, 'knight', clip, seconds,
    (attack.x || 0) - facing * dx, (attack.y || 0) + FOOT_OFFSET + dy,
    { facing, scaleX, scaleY, hold: false, loop: kind === 'cyclone' });
}

const spellClips = {
  fireball: ['spells', 'Ball'], spirit: ['spells', 'Ball'], vengefulspirit: ['spells', 'Ball'],
  shade: ['spells', 'Ball Lv2'], shadesoul: ['spells', 'Ball Lv2'], projectile: ['spells', 'Ball'],
  blast: ['spells', 'Blast'], shadeblast: ['spells', 'Blast Lv2'], impact: ['spells', 'Impact'],
  fireballend: ['spells', 'Ball End'], scream: ['spells', 'Scream1'], wraiths: ['spells', 'Scream1'],
  scream2: ['spells', 'Scream2'], shriek: ['spells', 'Scream2'], abyssshriek: ['spells', 'Scream2'],
  screambase: ['spells', 'Scream1 Base'], shriekbase: ['spells', 'Scream2 Base'],
  quake: ['spells', 'Quake Blast'], dive: ['spells', 'Quake Blast'], quakepillar: ['spells', 'Quake 1 Pillar'],
  dark: ['spells', 'Quake 2 Mega'], darkdive: ['spells', 'Quake 2 Mega'], darkblast: ['spells', 'Quake 2 Blast'],
  darkpillar: ['spells', 'Quake 2 Pillar'], darktrail: ['spells', 'Quake 2 Trail'],
  focus: ['lights', 'Focus Effect'], focusend: ['lights', 'Focus Effect End'],
  hit: ['hits', 'Slash Impact 1'], hit2: ['hits', 'Slash Impact 2'], hitlines: ['hits', 'Impact Lines'],
  jumpdust: ['dust', 'Jump Puff'], dashdust: ['dust', 'Dash Puff'], walldust: ['dust', 'Wall Puff'],
  dashfx: ['knight', 'Dash Effect'], shadowburst: ['knight', 'Shadow Dash Burst'],
  wings: ['knight', 'Double Jump Wings 2'], chargenail: ['knight', 'NA Charged Effect'],
  crystalcharge: ['knight', 'SD Fx Charge'], crystalburst: ['knight', 'SD Fx Burst'],
};
/** spell.x/y = effect origin, in Unity world units (+Y up).
 * Pass feet:true to attach at the Knight root (feet + FOOT_OFFSET).
 * clip/group override exposes the recorded clips without a synthetic fallback.
 */
export function drawSpell(ctx, spell, time = 0) {
  if (!spell) return false;
  const kind = normalized(spell.kind || spell.type);
  if (spell.phase && ['fireball', 'scream', 'dive'].includes(kind)) return drawCasting(ctx, spell, time);
  const mapping = spellClips[kind] || ['spells', spell.kind];
  const group = spell.group || mapping[0], name = spell.clip || mapping[1];
  return drawClip(ctx, group, name, spell.time ?? time,
    spell.x || 0, (spell.y || 0) + (spell.feet ? FOOT_OFFSET : 0),
    { facing: spell.facing ?? spell.face ?? 1, scale: spell.scale ?? 1,
      scaleX: spell.scaleX, scaleY: spell.scaleY, rotation: spell.rotation,
      loop: spell.loop, hold: spell.hold ?? false, alpha: spell.alpha, blend: spell.blend });
}

/** The following child offsets/scales are serialized prefab values.
 * Source transforms are recorded in assets/source/prefab-transforms.json.
 */
function attached(ctx, p, group, name, seconds, transform, options = {}) {
  const [dx, dy, sx = 1, sy = sx] = transform;
  const facing = p.facing ?? p.face ?? 1;
  return drawClip(ctx, group, name, seconds,
    (p.x || 0) - facing * dx, (p.y || 0) + FOOT_OFFSET + dy,
    { facing, scaleX: sx, scaleY: sy, hold: false, ...options });
}
function drawBodyAttachments(ctx, p, seconds) {
  if (p.focusing) attached(ctx, p, 'lights', 'Focus Effect', Math.max(0, (p.focusTimer || 0) - .25), [0, .15, 1.4103041]);
  if (p.chargeReady) attached(ctx, p, 'knight', 'NA Charged Effect', p.charge || seconds, [0, -.4903641, 1.504427]);
  else if (p.charge > .1) attached(ctx, p, 'knight', 'NA Charge', p.charge, [.0578842, .5, 1.504427]);
  if (p.superDash) {
    const sd = p.superDash;
    if (sd.phase === 'charge' || sd.phase === 'ready') {
      attached(ctx, p, 'knight', 'SD Fx Charge', sd.time || 0, sd.wall ? [2.1349545, -.37, 2] : [.24145, .96, 2], { hold: true });
      if (sd.phase === 'ready') attached(ctx, p, 'knight', 'SD Fx Bling', Math.max(0, (sd.time || 0) - .8), [.057881, .5, 2.2958015], { loop: true });
    } else if (sd.phase === 'dash') attached(ctx, p, 'knight', 'SD Trail', sd.time || 0, [5.8221512, -.5280075, -1.504427, 1.504427]);
  }
  if (p.dream) {
    if (p.dream.phase === 'charge') attached(ctx, p, 'spells', 'DN Charge', p.dream.time || 0, [-.98, -.7], { hold: true });
    else if (p.dream.phase === 'slash') attached(ctx, p, 'spells', 'DN Slash', p.dream.time || 0, [-.98, -.7]);
  }
}
function drawCasting(ctx, spell, fallbackTime) {
  const t = spell.phaseTime ?? spell.time ?? fallbackTime;
  const upgraded = (spell.level ?? 1) > 1;
  const facing = spell.facing ?? (spell.vx < 0 ? -1 : 1);
  const p = { ...spell, facing };
  if (spell.phase === 'projectile') {
    // Fireball prefabs use scale +X for right, opposite to Knight body sprites.
    return drawClip(ctx, 'spells', upgraded ? 'Ball Lv2' : 'Ball', spell.time || 0,
      spell.x || 0, spell.y || 0, { facing: -facing, scale: upgraded ? 1.8 : 2, loop: true });
  }
  if (spell.kind === 'fireball') {
    // The antic phase only changes the Knight body. The projectile owns its Ball.
    if (spell.phase !== 'cast') return false;
    return drawClip(ctx, 'spells', upgraded ? 'Blast Lv2' : 'Blast', t,
      (spell.x || 0) + facing * .7, (spell.y || 0) + 1.1,
      { facing: -facing, scale: upgraded ? 3 : 2, hold: false });
  }
  if (spell.kind === 'scream') {
    if (!['burst', 'roarEnd', 'end'].includes(spell.phase)) return false;
    // End continues the source burst clip instead of restarting the heads.
    const at = t + (spell.phase === 'roarEnd' ? .3 : spell.phase === 'end' ? .45 : 0);
    attached(ctx, p, 'spells', upgraded ? 'Scream2' : 'Scream1', at,
      upgraded ? [-.02, 3.66, 2.5203242] : [0, 2.59, 1.4]);
    return attached(ctx, p, 'spells', upgraded ? 'Scream2 Base' : 'Scream1 Base', at,
      upgraded ? [0, 1.03, 3.13774] : [0, -.01, 1.6]);
  }
  if (spell.kind === 'dive') {
    if (spell.phase === 'antic') return attached(ctx, p, 'spells', 'Quake Charge', t, [-.6116486, .3731995, 3]);
    if (spell.phase === 'fall') return attached(ctx, p, 'spells', upgraded ? 'Quake 2 Trail' : 'Quake Dash', t,
      upgraded ? [.0932579, 1.652379, 1.4571452] : [.71, -8.2, 1.8, 2.5799994], { loop: true });
    if (spell.phase !== 'land') return false;
    if (upgraded) {
      attached(ctx, p, 'spells', 'Quake 2 Blast', t, [0, 1.38, 4.5272241]);
      attached(ctx, p, 'spells', 'Quake 2 Pillar', t, [-.14, 2.61, 2.0404837, 3.8653383]);
      attached(ctx, p, 'spells', 'Quake 2 Mega', t, [.1559906, 6.22, 1.9352572]);
      return attached(ctx, p, 'spells', 'Quake Blast', t, [.0848141, 2.1562042, 1.7522729]);
    }
    attached(ctx, p, 'spells', 'Quake Blast', t, [.03, .8218446, 1.3863136]);
    return attached(ctx, p, 'spells', 'Quake 1 Pillar', t, [.041113, 7.54, 4.1991677]);
  }
  return false;
}
/** `effect.x/y` is the event's actual impact point, in world units. */
export function drawHit(ctx, effect, time = 0) {
  const t = effect.time ?? time;
  drawClip(ctx, 'hits', 'Slash Impact 1', t, effect.x || 0, effect.y || 0,
    { facing: -(effect.facing ?? 1), scaleX: -.6, scaleY: 1, hold: false });
  return drawClip(ctx, 'hits', 'Impact Lines', t, effect.x || 0, effect.y || 0,
    { facing: effect.facing ?? 1, hold: false });
}
/** Draw before the Knight body. effect.x/y is the original jump feet point. */
export function drawWings(ctx, effect, time = 0) {
  return attached(ctx, effect, 'knight', 'Double Jump Wings 2', effect.time ?? time, [.22, -.0637131]);
}

/** Screen-space HUD made from the same source mask/orb assets.
 * Call before/after the world transform. Pixel coordinates are explicit.
 */
export function drawHud(ctx, stats, x = 74, y = 76, scale = 28) {
  if (!manifest) return;
  ctx.save();ctx.translate(x, y);ctx.scale(scale, -scale);
  // The frame includes its dark orb backing, so fill and full-SOUL face draw on top.
  drawClip(ctx, 'hud', 'HUD Frame Idle', 0, .85, .2, { native: true });
  ctx.save();ctx.beginPath();ctx.arc(0, 0, .87, 0, Math.PI * 2);ctx.clip();
  const amount = Math.max(0, Math.min(1, (stats.soul ?? 99) / 99));
  ctx.save();ctx.beginPath();ctx.rect(-1, -.9, 2, amount * 1.8);ctx.clip();
  drawClip(ctx, 'soulfill', 'Idle', stats.time || 0, 0, 0, { native: true });ctx.restore();
  if (amount > .985) drawClip(ctx, 'hud', 'Soul Orb Glow', 0, 0, 0, { native: true });
  ctx.restore();
  const masks = stats.maxHp ?? stats.maxHealth ?? 5;
  for (let i = 0; i < masks; i++) drawClip(ctx, 'hud', i < (stats.hp ?? 5) ? 'Health Idle' : 'Health Empty', stats.time || 0, 1.95 + i * .94, .3, { native: true });
  ctx.restore();
}
