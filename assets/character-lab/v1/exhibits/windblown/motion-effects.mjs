// Isolated VFX from Motion Twin's Closed Alpha recording. The character and
// its ground ring are still drawn in 3D by the playable scene.
async function loadTexture(file) {
  const image = new Image();
  image.src = new URL('./assets/motion-v3/' + file, import.meta.url).href;
  await image.decode();
  return image;
}

export async function loadDeparture() {
  const [origin, front, streak] = await Promise.all([
    loadTexture('departure.webp'),
    loadTexture('dash-front.webp'),
    loadTexture('dash-streak.webp')
  ]);
  return {origin, front, streak};
}

export function drawDash(ctx, textures, project, event, now, bodyHeight) {
  const age = now - event.t;
  if (age < 0 || age > .245) return;
  const start = project(event.x, .40, event.z);
  const dest = project(event.x + event.dx*event.distance, .80, event.z + event.dz*event.distance);
  const distance = Math.hypot(dest.x-start.x, dest.y-start.y);
  if (distance < 1) return;
  const fraction = Math.min(1, Math.max(0, event.fraction));
  const travelled = distance * fraction;
  const angle = Math.atan2(dest.y-start.y, dest.x-start.x);
  const frame = Math.floor(age*60);
  ctx.save();
  ctx.translate(start.x,start.y);
  ctx.rotate(angle);
  if (frame < 12) {
    ctx.save();
    ctx.rotate(.60);
    const size = bodyHeight*2.54;
    ctx.drawImage(textures.origin, (frame%6)*144, Math.floor(frame/6)*144, 144, 144,
                  -size*.5, -size*.5, size, size);
    ctx.restore();
  }

  const sourceFrame = Math.floor((age-.008)*60);
  const trailFrame = sourceFrame-2;
  if (trailFrame >= 0 && trailFrame < 11) {
    // Leave room behind the body for the extended foot, tail and blade.
    // The white streak splits and erodes within the individual movie cells.
    const from = Math.min(bodyHeight*.50, travelled*.22);
    const to = travelled - bodyHeight*.33;
    const height = bodyHeight*.83;
    if (to>from) {
      ctx.drawImage(textures.streak, (trailFrame%4)*256, Math.floor(trailFrame/4)*72, 256, 72,
                    from, -height*.50, to-from, height);
    }
  }
  if (sourceFrame>=0 && sourceFrame<4) {
    // Only the first four 60 Hz source frames cover the player. The leading
    // edge clears before the late split-leg pose and subsequent landing.
    const scale = bodyHeight/87;
    ctx.drawImage(textures.front, sourceFrame*256, 0, 256, 192,
                  travelled-144*scale, -96*scale, 256*scale, 192*scale);
  }
  ctx.restore();
}
