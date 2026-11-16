/** Additional Knight layers. Existing lab Art remains the source sprite reader.
 * World coordinates use +Y up; player x/y is the collider foot.
 * Draw Back -> normal body -> Front. During a hazard, drawHazard owns the body.
 */
import * as Art from '../lab/art.mjs';
import {nailEffectPose} from './loadout.mjs';
export {nailEffectPose} from './loadout.mjs';

/** InvulnerablePulse multiplies source RGB towards opaque black, then back.
 * Its .1s half-period follows scaled player time, so Stun freezes its phase.
 * The body renderer applies brightness to its source pixels inside save/restore.
 */
export function hurtPresentation(player) {
 const active=(player.invulnerable||0)>1e-7,elapsed=Math.max(0,player.invulElapsed||0);
 const phase=(elapsed%.2)/.1,amount=phase<=1?phase:2-phase;
 return {brightness:active?Math.max(0,Math.min(1,1-amount)):1,alpha:1,
  phase:player.hurt?.phase||(active?'invulnerable':'normal')};
}

/** Ordinary slash VFX uses the same source child transform as attackPolygon. */
export function drawNailAttack(ctx,player,clock=0){
 const a=player.attack;if(!a)return false;const pose=nailEffectPose(a),facing=a.facing??player.renderFacing??player.facing??1;
 return Art.drawClip(ctx,'knight',pose.clip,a.time??clock,(player.x||0)-facing*pose.offsetX,
  (player.y||0)+Art.FOOT_OFFSET+pose.offsetY,{facing,scaleX:pose.scaleX,scaleY:pose.scaleY,hold:false});
}

export const HAZARD_TIMING = Object.freeze({
  antic: .3,                 // Knight Spike Death FSM, Stab/Wait.
  death: 8 / 15,             // Spike Death: 8 frames at 15fps.
  respawn: 20 / 16,          // Hazard Respawn: 20 frames at 16fps.
  pierces: 7 / 24,           // Pierce Spike: 7 frames at 24fps.
});
export const ABILITY_TIMING = Object.freeze({
  doubleJumpBody: 8 / 16,
  wings: 6 / 16,
  wallJump: 9 / 24,
  wallPuff: 6 / 20,
  shadowBurst: 13 / 20,
  shadowRecharge: 21 / 20,
  shadowRechargeLead: .85,   // Source wait = cooldown - .85.
  focusEnd: 2 / 20,
  focusHeal: 8 / 20,
  screamFx: 13 / 20,
  fireballFx: 8 / 24,
  shadeSoulFx: 10 / 24,
  divePillarLead: 7 / 20,
  diveImpactTail: 7 / 20 + 10 / 20,
});
const FOOT = Art.FOOT_OFFSET;
const number = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const facingOf = p => Math.sign(p.renderFacing ?? p.facing ?? p.face ?? 1) || 1;
const kindOf = e => String(e.kind || '').toLowerCase().replace(/[ _-]/g, '');
const ageOf = e => number(e.time) - number(e.delay);
const alive = (time, duration) => time >= 0 && time < duration;
const activeEffects = options => options.effects || [];

function attached(ctx, player, group, clip, time, transform, options = {}) {
  const [dx, dy, sx = 1, sy = sx] = transform;
  const face = facingOf(player);
  return Art.drawClip(ctx, group, clip, time,
    number(player.x) - face * dx, number(player.y) + FOOT + dy,
    { facing: face, scaleX: sx, scaleY: sy, hold: false, ...options });
}
function effectPoint(effect, player, follow = false) {
  return follow || effect.follow ? player : {
    x: number(effect.x, number(player.x)),
    y: number(effect.y, number(player.y)),
    facing: effect.facing ?? effect.face ?? facingOf(player),
    renderFacing: effect.facing ?? effect.face ?? facingOf(player),
  };
}

/** Wings follow the current interpolated feet, including the .08s preparation.
 * Effects may contain fixed-origin shadowBurst or wallPuff events.
 */
export function drawAbilityBack(ctx, player, clock = 0, options = {}) {
  const age = number(player.doubleJumpTime, -1);
  if (alive(age, ABILITY_TIMING.wings) && !player.hurt && !player.dead)
    attached(ctx, player, 'knight', 'Double Jump Wings 2', age, [.22, -.0637131]);
  for (const effect of activeEffects(options)) {
    const kind = kindOf(effect), time = ageOf(effect);
    if (kind === 'shadowburst' && alive(time, ABILITY_TIMING.shadowBurst)) {
      // HeroDash spawns this at its launch point, rather than attaching to body.
      attached(ctx, effectPoint(effect, player), 'knight', 'Shadow Dash Burst', time,
        [5.21, -.58, 1.9195913, 1.9195925]);
    } else if ((kind === 'wallpuff' || kind === 'walljumpdust') && alive(time, ABILITY_TIMING.wallPuff)) {
      attached(ctx, effectPoint(effect, player), 'dust', 'Wall Puff', time,
        [.91, -.32, 1.420771, 1.4207708]);
    }
  }
}

function drawFocus(ctx, player, options) {
  // For Q-only focus, focusTimer begins at zero. Body callers pass focusing:false
  // into lab Art.drawKnight when this module owns the attachment layer.
  if (player.focusing && !options.bodyDrawsAttachments)
    attached(ctx, player, 'lights', 'Focus Effect', number(player.focusTimer), [0, .15, 1.4103041, 1.4103043]);
  const phase = player.focusPhase;
  const effects = activeEffects(options);
  const eventHeal = effects.some(e => ['focusheal', 'heal'].includes(kindOf(e)) && alive(ageOf(e), ABILITY_TIMING.focusHeal));
  const eventEnd = effects.some(e => kindOf(e) === 'focusend' && alive(ageOf(e), ABILITY_TIMING.focusEnd));
  if (!eventHeal && phase === 'heal' && alive(number(player.focusPhaseTime), ABILITY_TIMING.focusHeal))
    attached(ctx, player, 'lights', 'Burst Effect', number(player.focusPhaseTime), [-.1318588, .8374352, 3]);
  if (!eventEnd && !player.focusing && (phase === 'end' || player.anim === 'Focus End')) {
    const time = phase === 'end' ? number(player.focusPhaseTime) : number(player.animTime);
    if (alive(time, ABILITY_TIMING.focusEnd))
      attached(ctx, player, 'lights', 'Focus Effect End', time, [0, .15, 1.4103041, 1.4103043]);
  }
}
function drawsIndependentSpell(effects, kind, id) {
  return effects.some(e => kindOf(e) === kind &&
    (e.id == null || id == null || e.id === id) && ageOf(e) >= 0 &&
    ageOf(e) < (kind === 'screamfx' ? ABILITY_TIMING.screamFx :
      number(e.level, 2) > 1 ? ABILITY_TIMING.shadeSoulFx : ABILITY_TIMING.fireballFx));
}

/** Spell Control Q2 Land starts the blast. Body frame seven triggers Q2 Pillar,
 * which starts the second pillar and mega while the body clip keeps advancing.
 */
export function diveEffectSchedule(level=2){
 return level>1?[
  {clip:'Quake 2 Blast',at:0,duration:6/20,transform:[0,1.38,4.5272241]},
  {clip:'Quake Blast',at:0,duration:6/20,transform:[.0848141,2.1562042,1.7522729]},
  {clip:'Quake 2 Pillar',at:7/20,duration:6/20,transform:[-.14,2.61,2.0404837,3.8653383]},
  {clip:'Quake 2 Mega',at:7/20,duration:10/20,transform:[.1559906,6.22,1.9352572]},
 ]:[];
}
function drawDiveImpact(ctx,origin,time,level){
 if(level<=1)return Art.drawSpell(ctx,{kind:'dive',phase:'land',phaseTime:time,time,level,x:origin.x,y:origin.y,facing:facingOf(origin)});
 for(const effect of diveEffectSchedule(level)){
  const age=time-effect.at;if(alive(age,effect.duration))attached(ctx,origin,'spells',effect.clip,age,effect.transform);
 }
}

/** Owns focus, cast/projectile and recharge layers. Root removes its old spell loop.
 * options.bodyDrawsAttachments defaults false. Set true only if normal body keeps
 * lab Art.drawKnight's focusing fields; the ongoing focus light then draws there.
 */
export function drawAbilityFront(ctx, player, clock = 0, options = {}) {
  const effects = activeEffects(options);
  drawFocus(ctx, player, options);
  const casting = player.casting;
  if (casting) {
    const independentDive=casting.kind==='dive'&&casting.phase==='land'&&effects.some(e=>kindOf(e)==='divefx'&&(e.id==null||e.id===casting.id)&&alive(ageOf(e),e.level>1?.85:.75));
    const independent = casting.kind === 'scream'
      ? drawsIndependentSpell(effects, 'screamfx', casting.id)
      : casting.kind === 'fireball' && drawsIndependentSpell(effects, 'fireballfx', casting.id);
    if(casting.kind==='dive'&&casting.phase==='land'){
      if(!independentDive)drawDiveImpact(ctx,player,number(casting.phaseTime),number(casting.level,2));
    }else if (!independent) Art.drawSpell(ctx,
      { ...casting, x: player.x, y: player.y, facing: casting.facing ?? facingOf(player) }, clock);
  }
  for (const projectile of player.projectiles || [])
    Art.drawSpell(ctx, { ...projectile, phase: 'projectile' }, clock);
  for (const effect of effects) {
    const kind = kindOf(effect), time = ageOf(effect);
    if (kind === 'shadowrecharge' && alive(time, ABILITY_TIMING.shadowRecharge)) {
      attached(ctx, effectPoint(effect, player, effect.follow !== false),
        'knight', 'Shadow Recharge', time, [0, 0]);
    } else if (kind === 'screamfx' && alive(time, ABILITY_TIMING.screamFx)) {
      const p = effectPoint(effect, player, effect.follow !== false);
      Art.drawSpell(ctx, { ...effect, kind: 'scream', phase: 'burst',
        phaseTime: time, time, x: p.x, y: p.y, facing: facingOf(p) }, clock);
    } else if (kind === 'fireballfx') {
      const duration = number(effect.level, 2) > 1 ? ABILITY_TIMING.shadeSoulFx : ABILITY_TIMING.fireballFx;
      if (alive(time, duration)) {
        const p = effectPoint(effect, player);
        Art.drawSpell(ctx, { ...effect, kind: 'fireball', phase: 'cast',
          phaseTime: time, time, x: p.x, y: p.y, facing: facingOf(p) }, clock);
      }
    } else if(kind==='divefx'&&alive(time,number(effect.level,2)>1?ABILITY_TIMING.diveImpactTail:.75)){
      drawDiveImpact(ctx,effectPoint(effect,player),time,number(effect.level,2));
    } else if ((kind === 'focusheal' || kind === 'heal') && alive(time, ABILITY_TIMING.focusHeal)) {
      // Event age survives full HP, spent SOUL, release and the body state ending.
      attached(ctx,
        effectPoint(effect, player, effect.follow !== false), 'lights', 'Burst Effect', time,
        [-.1318588, .8374352, 3]);
    } else if (kind === 'focusend' && alive(time, ABILITY_TIMING.focusEnd)) {
      attached(ctx, effectPoint(effect, player, effect.follow !== false),
        'lights', 'Focus Effect End', time, [0, .15, 1.4103041, 1.4103043]);
    }
  }
}

/** Derived source effect schedule for a shadow-dash event.
 * Source Recharge begins before ready, then finishes its final .20s afterwards.
 */
export function shadowEffectEvents(event, cooldown = 1.5) {
  const delay = Math.max(0, cooldown - ABILITY_TIMING.shadowRechargeLead);
  return [
    { kind: 'shadowBurst', time: 0, life: ABILITY_TIMING.shadowBurst,
      x: event.x, y: event.y, facing: event.facing ?? 1, follow: false },
    { kind: 'shadowRecharge', time: 0, delay,
      life: delay + ABILITY_TIMING.shadowRecharge, follow: true },
  ];
}

/** Hazard x/y is the feet origin at the start of this phase.
 * Antic/death keep the collision origin. Respawn uses the safe feet location.
 * The source Fling uses speed20, an angle in80..100deg and gravityScale .7.
 * A centered90deg/70units gravity preview is the deterministic default; root may
 * supply flingAngle/flingGravity or explicit bodyX/bodyY after its own integration.
 */
export function hazardPose(player, visual = {}) {
  const phase = visual.phase || 'antic', time = Math.max(0, number(visual.time));
  const baseX = number(visual.x, number(player.x)), baseY = number(visual.y, number(player.y));
  let x = baseX, y = baseY, clip, clipTime = time, duration;
  if (phase === 'antic') { clip = 'Spike Death Antic'; duration = HAZARD_TIMING.antic; }
  else if (phase === 'death') {
    clip = 'Spike Death'; duration = HAZARD_TIMING.death;
    const angle = number(visual.flingAngle, 90) * Math.PI / 180;
    const gravity = number(visual.flingGravity, 70), speed = number(visual.flingSpeed, 20);
    x += Math.cos(angle) * speed * time;
    y += Math.sin(angle) * speed * time - gravity * time * time / 2;
  } else if (phase === 'respawn') { clip = 'Hazard Respawn'; duration = HAZARD_TIMING.respawn; }
  else return { drawn: false, phase, time, complete: true };
  x = number(visual.bodyX, x);y = number(visual.bodyY, y);
  return { drawn: true, phase, time, x, y, clip, clipTime, duration,
    facing: Math.sign(visual.facing ?? facingOf(player)) || 1,
    complete: time >= duration, hidesNormalBody: true };
}
function drawPierces(ctx, origin, time, angle = 90) {
  if (!alive(time, HAZARD_TIMING.pierces)) return;
  const children = [
    [.7920097, -.2833402, 1.7555725, 1.7555723],
    [.3004497, -1.2313902, 1.4922367, 1.4922365],
    [.16, .77, 1.3166795, 1.3166792],
  ];
  ctx.save();ctx.translate(origin.x, origin.y + FOOT);
  ctx.scale(-origin.facing, 1);ctx.translate(.24, .33);ctx.rotate(angle * Math.PI / 180);
  for (const [x, y, scaleX, scaleY] of children)
    Art.drawClip(ctx, 'hits', 'Pierce Spike', time, x, y,
      { native: true, scaleX, scaleY, hold: false });
  ctx.restore();
}
export function drawHazard(ctx, player, visual, clock = 0) {
  if (!visual) return { drawn: false, hidesNormalBody: false };
  const pose = hazardPose(player, visual);
  if (!pose.drawn) return pose;
  Art.drawClip(ctx, 'knight', pose.clip, pose.clipTime,
    pose.x, pose.y + FOOT,
    { facing: pose.facing, loop: false, hold: true, rotation: visual.rotation });
  if (pose.phase === 'antic') drawPierces(ctx, pose, pose.time,
    number(visual.spikeAngle, 0) + 90);
  return pose;
}

export function validateAbilityClips() {
  const expected = [
    ['knight', 'Double Jump', 16, 8], ['knight', 'Double Jump Wings 2', 16, 6],
    ['knight', 'Walljump', 24, 9], ['knight', 'Wall Slide', 12, 4],
    ['knight', 'Shadow Dash Burst', 20, 13], ['knight', 'Shadow Recharge', 20, 21],
    ['knight', 'Spike Death', 15, 8], ['knight', 'Hazard Respawn', 16, 20],
    ['hits', 'Pierce Spike', 24, 7], ['lights', 'Focus Effect', 20, 13],
    ['lights', 'Burst Effect', 20, 8], ['spells', 'Scream2', 20, 13],
  ];
  return expected.map(([group, clip, fps, frames]) => {
    const actual = Art.clipInfo(clip, group);
    return { group, clip, expected: { fps, frames }, actual,
      matches: !!actual && actual.fps === fps && actual.frames === frames };
  });
}
