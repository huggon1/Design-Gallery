import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, step, STEP, WORLD} from '../controller.mjs';
import {createInput} from '../../../hall-runtime.mjs';

function play(state, input, ticks = 1) {
  for (let i = 0; i < ticks; i++) step(state, input, STEP);
}
function apex(heldTicks) {
  const s = createState();
  let top = s.y;
  for (let i = 0; i < 120; i++) {
    play(s, {jump: i < heldTicks});
    top = Math.min(s.y, top);
  }
  assert.equal(s.ground, 'floor');
  assert.equal(s.stats.parries, 0);
  return WORLD.floor - top;
}
test('held jump rises higher than tap and neither triggers an automatic slap', () => {
  assert(apex(20) > apex(2) * 1.25);
});
test('air dash suspends descent, locks direction and requires a landing before reuse', () => {
  const s = createState();
  play(s, {jump:true}, 13);
  play(s, {right:true, dash:true});
  const y = s.y, x = s.x;
  play(s, {left:true}, 5);
  assert.equal(s.y, y);
  assert(s.x > x);
  play(s, {}, 35);
  play(s, {dash:true});
  assert.equal(s.stats.dashes, 1);
  play(s, {}, 100);
  play(s, {dash:true});
  assert.equal(s.stats.dashes, 2);
});
test('only a fresh airborne slap near pink causes a rebound and hit pause', () => {
  const s = createState();
  play(s, {jump:true}, 8);
  play(s, {});
  play(s, {jump:true});
  assert.equal(s.stats.parries, 0);
  play(s, {}, 100);
  s.x = WORLD.orb.x;
  play(s, {jump:true}, 10);
  play(s, {});
  play(s, {jump:true}, 14);
  assert.equal(s.stats.parries, 1);
  assert(s.vy < 0);
});
test('locking preserves position and turns the shot, release ends the stream', () => {
  const s = createState(), x = s.x;
  play(s, {grab:true, up:true, left:true, attack:true}, 60);
  assert.equal(s.x,x);
  assert(s.stats.shots >= 3);
  assert(s.aim.x < 0 && s.aim.y < 0);
  const shots = s.stats.shots;
  play(s, {}, 90);
  assert.equal(s.stats.shots, shots);
});
test('landing on a one-way shelf and dropping through reaches the floor', () => {
  const s=createState();
  s.x=WORLD.shelf.x+WORLD.shelf.w/2;
  play(s,{jump:true},100);
  assert.equal(s.ground,'shelf');
  play(s,{});
  play(s,{down:true,jump:true});
  play(s,{},100);
  assert.equal(s.ground,'floor');
});
test('a held shot hits the near target, fills a card, and EX spends it once', () => {
  const s=createState();
  play(s,{special:true});assert.equal(s.stats.ex,0);
  play(s,{attack:true},170);assert(s.meter>=1);const saved=s.meter;
  play(s,{special:true},140);assert.equal(s.stats.ex,1);assert(s.meter<saved);
  assert.equal(s.bullets.length,0);
});
test('a solid block stops travel from either side and can be crossed on foot by jumping', () => {
  const s=createState();
  play(s,{right:true},240);
  assert.equal(s.x,WORLD.block.x-25);
  play(s,{right:true,jump:true},80);assert(s.x>WORLD.block.x+WORLD.block.w);
  play(s,{},140);
  if (s.ground==='shelf') {play(s,{down:true,jump:true});play(s,{},100);}
  play(s,{left:true},180);
  assert.equal(s.x,WORLD.block.x+WORLD.block.w+25);
});
test('release and press again between hall samples still starts an airborne slap', () => {
  const input=createInput(),s=createState();s.x=WORLD.orb.x;
  input.hold('Space','jump');
  for(let i=0;i<12;i++) step(s,input.sample(),STEP);
  input.release('Space');input.hold('KeyK','jump');input.release('KeyK');
  step(s,input.sample(),STEP);
  assert.equal(s.stats.parries,1);
  input.hold('KeyL','dash');input.release('KeyL');
  for(let i=0;i<12;i++) step(s,input.sample(),STEP);
  assert.equal(s.stats.dashes,1);
});
