// Native SwordSwipeAFlipped and SwordSwipeB slide selection at 60 Hz.
// The skipped source frames have DurationFrames=0 in the weapon FX definitions.
const slides = {
  'slash-1': [1,2,3,3,4,5,6,7,8,9,10,11,12,13,14],
  'slash-2': [3,4,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
};

async function bladeAtlas(file) {
  const image = new Image();
  image.src = new URL(file, import.meta.url).href;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image,0,0);
  const pixels = ctx.getImageData(0,0,canvas.width,canvas.height);
  for (let i=0; i<pixels.data.length; i+=4) {
    const l = pixels.data[i]/255;
    // The supplied dark-opacity layer forms the crimson edge. The most
    // luminous pixels become a warm white edge in the additive pass.
    pixels.data[i] = 120+135*Math.sqrt(l);
    pixels.data[i+1] = 7+235*Math.pow(l,1.45);
    pixels.data[i+2] = 16+182*l*l;
  }
  ctx.putImageData(pixels,0,0);
  return canvas;
}

export async function loadSwordArcs() {
  const [sweep,chop] = await Promise.all([bladeAtlas('./sweep.png'),bladeAtlas('./chop.png')]);
  return {'slash-1':sweep,'slash-2':chop};
}

// Screen-space origin, grip and tip use the same coordinates as the character.
// angle is the world heading used to render the strike, clockwise from screen down.
export function drawSwordArc(ctx, atlas, {clip, elapsed, x, y, gripX, gripY, tipX, tipY, angle, standingHeight}) {
  const schedule = slides[clip];
  if (!schedule || !Number.isFinite(elapsed) || elapsed<0) return;
  const tick = Math.floor(elapsed*60);
  if (tick>=schedule.length) return;
  const frame=schedule[tick]-1;
  const h=standingHeight, forwardX=Math.sin(angle), forwardY=Math.cos(angle);
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha*=Math.min(1,(schedule.length-tick)/6);
  if(clip==='slash-1'){
    ctx.translate(x+(gripX-x)*.24, y-h*.47);
    ctx.scale(1,.62);
    ctx.rotate(Math.atan2(forwardY,forwardX));
    ctx.scale(h/82,-h/82);
    // Half-resolution atlas, original 512x512 frame and (200,256) pivot.
    ctx.drawImage(atlas[clip],(frame%5)*256,Math.floor(frame/5)*256,256,256,-100,-128,256,256);
  }else{
    // The source attaches the overhead slice to a weapon marker. The blade
    // sweeps through a vertical plane, and narrows when viewed end-on.
    const handToTip=.76;
    const attachX=gripX+(tipX-gripX)*handToTip;
    const attachY=gripY+(tipY-gripY)*handToTip;
    ctx.translate(attachX,attachY);
    const lateral=(forwardX>=0?1:-1)*Math.max(.30,Math.abs(forwardX));
    const scale=h/79;
    ctx.transform(lateral*scale, forwardY*.56*scale, 0, scale, 0, 0);
    ctx.drawImage(atlas[clip],(frame%5)*256,Math.floor(frame/5)*256,256,256,-207.5,-131.5,256,256);
  }
  ctx.restore();
}
