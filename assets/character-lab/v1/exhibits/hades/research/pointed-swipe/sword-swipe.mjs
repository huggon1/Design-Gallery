// RailgunLineSword3 uses the second texture as the central streak of
// SwordSwipeC. The local palette is baked once on load.
async function warmAtlas(file) {
  const image = new Image();
  image.src = new URL(file, import.meta.url).href;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const luminance = pixels.data[i] / 255;
    pixels.data[i + 1] *= 0.45 + 0.41 * luminance;
    pixels.data[i + 2] *= 0.15 + 0.35 * luminance;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

export async function loadSwordSwipe() {
  const [point, line] = await Promise.all([warmAtlas('./pointed.png'), warmAtlas('./centerline.png')]);
  return { point, line };
}

// Measured first and last bright columns of each original frame (22% of its
// own peak additive intensity). The late frames have several hundred pixels
// of black leading padding. Place the visible light against the weapon.
const left =  [53, 56,143,208,210,296,388,513,570,586,589,607,640];
const right = [263,260,449,646,670,673,684,695,706,717,719,718,664];

export function drawSwordSwipe(ctx, atlas, { x, y, tipX, tipY, screenAngle, time, standingHeight }) {
  const frame = Math.floor(time * 60);
  if (frame < 0 || frame >= left.length) return;
  const dx = tipX-x, dy = tipY-y;
  const bladeLength = Math.hypot(dx,dy);
  if (!(bladeLength > standingHeight*.08)) return;
  const towardsStrike = (dx*Math.cos(screenAngle) + dy*Math.sin(screenAngle)) / bladeLength;
  if (towardsStrike <= .1) return; // Sword is still in the backswing.

  const scale = standingHeight/480;
  const litWidth = (right[frame]-left[frame])*scale;
  const overlap = Math.min(bladeLength*.40, litWidth*.42);
  const protrusion = litWidth-overlap;
  const lineFrame = Math.floor(time*120);

  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(Math.atan2(dy,dx));
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= Math.min(1, (towardsStrike-.1)/.45) * Math.min(1,(13-frame)/3);

  const lineHeight = standingHeight*.23;
  const lineLength = bladeLength*.85 + protrusion;
  ctx.drawImage(atlas.line, (lineFrame%7)*400, Math.floor(lineFrame/7)*50, 400, 50,
                -bladeLength*.80, -lineHeight*.50, lineLength, lineHeight);
  ctx.drawImage(atlas.point, (frame%4)*720, Math.floor(frame/4)*120, 720, 120,
                -left[frame]*scale-overlap, -60*scale*1.4, 720*scale, 120*scale*1.4);
  ctx.restore();
}
