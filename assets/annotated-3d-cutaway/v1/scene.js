/**
 * annotated-3d-cutaway — Clove C2 quiet hand grinder (v2 polish)
 * Method: M4 live Three.js · Style: I diagram/cutaway
 * Ban: neon, particles, bloom, HUD chrome, cyber grid
 */
import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const PALETTE = {
  paper: 0xefe8d8,
  ink: 0x1c211d,
  ochre: 0xb9832a,
  forest: 0x4f6756,
  walnut: 0x627566,
  aluminum: 0xc8c0b4,
  steel: 0xa8a39c,
  steelDark: 0x6e6964,
  brass: 0xb08a45,
  brassDark: 0x8a6a35,
  beech: 0xd2c0a0,
  liner: 0xcfc6b8,
  muted: 0x7a7468,
};

const CHAPTERS = [
  {
    id: 'exterior',
    label: 'Exterior',
    blurb: 'Closed shell — quiet product hero',
    cut: 0,
    explode: 0,
    cam: { theta: 0.68, phi: 1.15, radius: 12.4 },
    show: [],
    camDur: 2.6,
  },
  {
    id: 'section',
    label: 'Section',
    blurb: 'Half-shell removed — path of the bean',
    cut: 1,
    explode: 0,
    cam: { theta: 0.18, phi: 1.18, radius: 11.6 },
    show: ['body', 'burrs', 'shaft', 'cup'],
    camDur: 2.6,
  },
  {
    id: 'burrs',
    label: 'Burrs',
    blurb: 'True conical pair — stepless collar sets the gap',
    cut: 1,
    explode: 0.28,
    cam: { theta: -0.38, phi: 1.05, radius: 9.2 },
    show: ['burrs', 'collar', 'shaft'],
    camDur: 2.6,
  },
  {
    id: 'exploded',
    label: 'Exploded',
    blurb: 'Parts along the grind axis',
    cut: 0.55,
    explode: 1,
    cam: { theta: 0.88, phi: 1.12, radius: 14.5 },
    show: ['body', 'burrs', 'shaft', 'collar', 'hopper', 'cup', 'handle'],
    camDur: 2.9,
  },
];

/** Authored dock slots (side, rank) reduce overlap; rank 0 = top */
const ANNS = [
  { id: 'handle', title: 'Beech crank', body: 'Long arm, low effort. Knob free-spins on a brass pin.', local: new THREE.Vector3(2.35, 4.05, 0), side: 1, rank: 0 },
  { id: 'hopper', title: 'Walnut hopper', body: 'Holds ~25 g. Soft funnel into the burr throat.', local: new THREE.Vector3(0.9, 3.15, 0.4), side: 1, rank: 1 },
  { id: 'collar', title: 'Stepless collar', body: 'Brass ring lifts the upper burr — grind size without clicks.', local: new THREE.Vector3(1.2, 2.05, 0.15), side: 1, rank: 2 },
  { id: 'shaft', title: 'Drive shaft', body: 'Single axis from handle to upper burr — no gearbox noise.', local: new THREE.Vector3(0.05, 2.55, 0), side: 1, rank: 3 },
  { id: 'burrs', title: 'Conical burrs', body: 'Stainless pair. Lower fixed, upper rides the shaft.', local: new THREE.Vector3(0.55, 1.15, 0.35), side: -1, rank: 0 },
  { id: 'body', title: 'Forest body', body: 'Matte walnut-stained shell. Quiet grip, no polish flex.', local: new THREE.Vector3(1.15, 0.35, 0.25), side: -1, rank: 1 },
  { id: 'cup', title: 'Catch cup', body: 'Aluminum cup seats with a soft bayonet — grounds leave clean.', local: new THREE.Vector3(0.95, -1.65, 0.15), side: -1, rank: 2 },
];

function mat(opts) {
  const m = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0xffffff,
    roughness: opts.roughness ?? 0.6,
    metalness: opts.metalness ?? 0.05,
    flatShading: false,
    side: opts.side ?? THREE.FrontSide,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    map: opts.map ?? null,
    envMapIntensity: opts.envMapIntensity ?? 1,
  });
  m.clippingPlanes = opts.clip ? [opts.clip] : [];
  m.clipShadows = true;
  return m;
}

function addShadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Soft wood / stain strip map (no neon) */
function makeWoodMap() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#6a7d6e';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    const x = (i / 40) * 256 + Math.sin(i * 1.7) * 3;
    g.strokeStyle = `rgba(30,40,32,${0.04 + (i % 5) * 0.015})`;
    g.lineWidth = 1 + (i % 3);
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + 4, 80, x - 6, 160, x + 2, 256);
    g.stroke();
  }
  for (let i = 0; i < 12; i++) {
    g.fillStyle = `rgba(180,160,120,${0.03 + (i % 3) * 0.01})`;
    g.fillRect(20 + i * 18, 30 + (i % 4) * 40, 2, 40 + (i % 5) * 8);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(2, 1);
  return tex;
}

function makeMetalMap() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#9a9590';
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) {
    g.fillStyle = `rgba(255,255,255,${0.02 + (y % 7) * 0.004})`;
    g.fillRect(0, y, 128, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Lathe profile points [x=radius, y=height] */
function lathe(points, segments = 64) {
  const pts = points.map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, segments);
}

/**
 * Conical burr with helical flutes via vertex displacement on a lathe cone.
 * lower: wide base → tip up; upper: tip down into lower.
 */
function makeConicalBurr(opts) {
  const {
    rMax,
    rMin,
    h,
    flutes = 18,
    fluteDepth = 0.035,
    invert = false,
    matOpts,
  } = opts;
  // profile: outer cone with small ledge
  const profile = invert
    ? [
        [rMin * 0.35, h],
        [rMin, h * 0.92],
        [rMax * 0.55, h * 0.45],
        [rMax, h * 0.08],
        [rMax * 0.92, 0],
        [rMin * 0.4, 0],
      ]
    : [
        [rMin * 0.35, 0],
        [rMin, h * 0.08],
        [rMax * 0.55, h * 0.4],
        [rMax, h * 0.78],
        [rMax * 0.88, h],
        [rMin * 0.45, h],
      ];
  const geo = lathe(profile, 96);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ang = Math.atan2(v.z, v.x);
    const t = invert ? 1 - v.y / h : v.y / h;
    // helical flute: deeper mid-cone, fade at ends
    const envelope = Math.sin(Math.PI * THREE.MathUtils.clamp(t, 0.05, 0.95));
    const helix = ang * flutes + t * flutes * 0.85 * (invert ? -1 : 1);
    const groove = Math.max(0, Math.sin(helix));
    const cut = groove * groove * fluteDepth * envelope;
    const rr = Math.hypot(v.x, v.z);
    if (rr > 0.02) {
      const s = Math.max(0.15, 1 - cut / rr);
      v.x *= s;
      v.z *= s;
    }
    // light tooth ridge between flutes
    const ridge = Math.max(0, Math.cos(helix)) * 0.012 * envelope;
    if (rr > 0.02) {
      const s2 = 1 + ridge / rr;
      v.x *= s2;
      v.z *= s2;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return addShadow(new THREE.Mesh(geo, mat(matOpts)));
}

function buildGrinder(clipPlane, woodMap, metalMap) {
  const root = new THREE.Group();
  root.name = 'grinder';
  const parts = {};
  const clip = { clip: clipPlane };
  const segs = 72;

  // —— Catch cup ——
  const cup = new THREE.Group();
  cup.name = 'cup';
  const cupMat = mat({ color: PALETTE.aluminum, roughness: 0.38, metalness: 0.32, side: THREE.DoubleSide, map: metalMap, ...clip });
  const cupBody = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.08, 1.4, segs, 1, true), cupMat));
  cupBody.position.y = -1.58;
  const cupInner = addShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 0.96, 1.32, segs, 1, true),
      mat({ color: 0xd8d0c4, roughness: 0.48, metalness: 0.2, side: THREE.BackSide, ...clip })
    )
  );
  cupInner.position.y = -1.55;
  const cupFloor = addShadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.07, segs), mat({ color: PALETTE.aluminum, roughness: 0.45, metalness: 0.28, ...clip }))
  );
  cupFloor.position.y = -2.25;
  const cupRim = addShadow(
    new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.045, 10, segs), mat({ color: PALETTE.aluminum, roughness: 0.32, metalness: 0.4, ...clip }))
  );
  cupRim.rotation.x = Math.PI / 2;
  cupRim.position.y = -0.88;
  // bayonet nubs
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const nub = addShadow(
      new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.08), mat({ color: PALETTE.aluminum, roughness: 0.4, metalness: 0.35, ...clip }))
    );
    nub.position.set(Math.cos(a) * 1.12, -0.95, Math.sin(a) * 1.12);
    nub.rotation.y = -a;
    cup.add(nub);
  }
  cup.add(cupBody, cupInner, cupFloor, cupRim);
  parts.cup = cup;
  root.add(cup);

  // —— Body ——
  const body = new THREE.Group();
  body.name = 'body';
  const woodMat = mat({ color: PALETTE.walnut, roughness: 0.82, metalness: 0.02, side: THREE.DoubleSide, map: woodMap, ...clip });
  const shell = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 2.55, segs, 1, true), woodMat));
  shell.position.y = 0.32;
  const liner = addShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 2.5, segs, 1, true),
      mat({ color: PALETTE.liner, roughness: 0.58, metalness: 0.1, side: THREE.BackSide, ...clip })
    )
  );
  liner.position.y = 0.32;
  const band = addShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(1.255, 1.255, 0.2, segs, 1, true),
      mat({ color: PALETTE.forest, roughness: 0.72, metalness: 0.04, side: THREE.DoubleSide, map: woodMap, ...clip })
    )
  );
  band.position.y = -0.52;
  const rimGeo = new THREE.RingGeometry(1.1, 1.24, segs);
  const rimMat = mat({ color: PALETTE.walnut, roughness: 0.78, metalness: 0.02, side: THREE.DoubleSide, map: woodMap, ...clip });
  const rimTop = addShadow(new THREE.Mesh(rimGeo, rimMat));
  rimTop.rotation.x = -Math.PI / 2;
  rimTop.position.y = 1.595;
  const rimBot = addShadow(new THREE.Mesh(rimGeo.clone(), rimMat.clone()));
  rimBot.material.clippingPlanes = [clipPlane];
  rimBot.rotation.x = -Math.PI / 2;
  rimBot.position.y = -0.955;
  // wall thickness edge visible in cut — thin radial slabs at clip face
  body.add(shell, liner, band, rimTop, rimBot);
  parts.body = body;
  root.add(body);

  // —— Burrs (true cones) ——
  const burrs = new THREE.Group();
  burrs.name = 'burrs';
  const steelOpts = { color: PALETTE.steel, roughness: 0.32, metalness: 0.55, map: metalMap, ...clip };
  const lower = makeConicalBurr({
    rMax: 0.92,
    rMin: 0.22,
    h: 0.95,
    flutes: 20,
    fluteDepth: 0.055,
    invert: false,
    matOpts: steelOpts,
  });
  lower.position.y = 0.42;
  const lowerRing = addShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.98, 0.98, 0.1, segs),
      mat({ color: PALETTE.steelDark, roughness: 0.4, metalness: 0.5, ...clip })
    )
  );
  lowerRing.position.y = 0.38;
  burrs.add(lower, lowerRing);

  const upper = makeConicalBurr({
    rMax: 0.78,
    rMin: 0.18,
    h: 0.72,
    flutes: 20,
    fluteDepth: 0.048,
    invert: true,
    matOpts: { color: PALETTE.steel, roughness: 0.28, metalness: 0.58, map: metalMap, ...clip },
  });
  upper.position.y = 1.05;
  // bearing hub on upper
  const uHub = addShadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 24), mat({ color: PALETTE.steelDark, roughness: 0.35, metalness: 0.55, ...clip }))
  );
  uHub.position.y = 1.72;
  upper.add(uHub);
  burrs.add(upper);
  parts.burrs = burrs;
  parts.upperBurr = upper;
  root.add(burrs);

  // —— Shaft ——
  const shaft = new THREE.Group();
  shaft.name = 'shaft';
  const rod = addShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 4.35, 24),
      mat({ color: PALETTE.aluminum, roughness: 0.28, metalness: 0.58, map: metalMap, ...clip })
    )
  );
  rod.position.y = 1.95;
  const hub = addShadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.2, 28), mat({ color: PALETTE.brass, roughness: 0.36, metalness: 0.62, ...clip }))
  );
  hub.position.y = 4.05;
  const collarWash = addShadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 20), mat({ color: PALETTE.brassDark, roughness: 0.4, metalness: 0.55, ...clip }))
  );
  collarWash.position.y = 3.88;
  shaft.add(rod, hub, collarWash);
  parts.shaft = shaft;
  root.add(shaft);

  // —— Collar (machined ring, not fat torus) ——
  const collar = new THREE.Group();
  collar.name = 'collar';
  const collarBody = addShadow(
    new THREE.Mesh(
      lathe(
        [
          [1.05, 0],
          [1.22, 0.02],
          [1.26, 0.1],
          [1.26, 0.22],
          [1.2, 0.28],
          [1.05, 0.3],
        ],
        segs
      ),
      mat({ color: PALETTE.brass, roughness: 0.34, metalness: 0.62, ...clip })
    )
  );
  collarBody.position.y = 1.62;
  const tickMat = mat({ color: 0x4a4034, roughness: 0.5, metalness: 0.15, ...clip });
  for (let i = 0; i < 36; i++) {
    const major = i % 6 === 0;
    if (major) continue;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.025, major ? 0.1 : 0.06, 0.015), tickMat);
    const a = (i / 36) * Math.PI * 2;
    tick.position.set(Math.cos(a) * 1.24, 1.92, Math.sin(a) * 1.24);
    tick.rotation.y = -a;
    collar.add(tick);
  }
  const index = addShadow(
    new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.03), mat({ color: PALETTE.ochre, roughness: 0.42, metalness: 0.2, ...clip }))
  );
  index.position.set(0, 1.94, 1.24);
  collar.add(collarBody, index);
  parts.collar = collar;
  root.add(collar);

  // —— Hopper (seated onto collar) ——
  const hopper = new THREE.Group();
  hopper.name = 'hopper';
  const funnel = addShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(1.32, 0.62, 1.05, segs, 1, true),
      mat({ color: PALETTE.walnut, roughness: 0.8, metalness: 0.02, side: THREE.DoubleSide, map: woodMap, ...clip })
    )
  );
  funnel.position.y = 2.42;
  const funnelIn = addShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(1.24, 0.54, 1.02, segs, 1, true),
      mat({ color: 0xbfb5a6, roughness: 0.62, metalness: 0.06, side: THREE.BackSide, ...clip })
    )
  );
  funnelIn.position.y = 2.42;
  const lip = addShadow(
    new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.055, 10, segs), mat({ color: PALETTE.forest, roughness: 0.68, metalness: 0.04, map: woodMap, ...clip }))
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 2.94;
  // neck seat into collar
  const neck = addShadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.7, 0.22, segs, 1, true),
      mat({ color: PALETTE.walnut, roughness: 0.78, metalness: 0.02, side: THREE.DoubleSide, map: woodMap, ...clip })
    )
  );
  neck.position.y = 1.88;
  hopper.add(funnel, funnelIn, lip, neck);
  parts.hopper = hopper;
  root.add(hopper);

  // —— Handle ——
  const handle = new THREE.Group();
  handle.name = 'handle';
  const arm = addShadow(
    new THREE.Mesh(
      new THREE.CapsuleGeometry(0.07, 2.35, 6, 12),
      mat({ color: PALETTE.aluminum, roughness: 0.32, metalness: 0.45, map: metalMap, ...clip })
    )
  );
  arm.rotation.z = Math.PI / 2;
  arm.position.set(1.25, 4.05, 0);
  const knob = addShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 20), mat({ color: PALETTE.beech, roughness: 0.68, metalness: 0.04, ...clip }))
  );
  knob.position.set(2.55, 4.05, 0);
  const pin = addShadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.38, 12), mat({ color: PALETTE.brass, roughness: 0.32, metalness: 0.6, ...clip }))
  );
  pin.rotation.z = Math.PI / 2;
  pin.position.set(2.55, 4.05, 0);
  handle.add(arm, knob, pin);
  parts.handle = handle;
  root.add(handle);

  const rest = {};
  for (const [k, g] of Object.entries(parts)) {
    if (k === 'upperBurr') continue;
    rest[k] = g.position.clone();
  }
  return { root, parts, rest };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function shortestAngle(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d;
}
function sphericalToCart(theta, phi, radius, target) {
  const s = Math.sin(phi);
  return new THREE.Vector3(
    target.x + radius * s * Math.sin(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * s * Math.cos(theta)
  );
}

export function createCutaway(container, opts = {}) {
  const W = opts.width ?? (container.clientWidth || 960);
  const H = opts.height ?? (container.clientHeight || 540);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, opts.pixelRatio ?? 2));
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Clove C2 annotated cutaway');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.paper);
  scene.fog = new THREE.Fog(PALETTE.paper, 22, 38);

  const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 80);
  const target = new THREE.Vector3(0, 1.05, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 5;
  controls.maxDistance = 18;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minPolarAngle = 0.28;
  controls.target.copy(target);
  controls.enablePan = false;

  // Soft studio — warm key, cool fill, gentle top; no neon rim
  scene.add(new THREE.AmbientLight(0xf3eee4, 0.42));
  scene.add(new THREE.HemisphereLight(0xfff5e8, 0x8a8070, 0.48));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.35);
  key.position.set(5.2, 9.5, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 28;
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.radius = 3;
  key.shadow.bias = -0.00015;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd5e0ea, 0.42);
  fill.position.set(-6, 4, -2.5);
  scene.add(fill);
  const bounce = new THREE.DirectionalLight(0xe8dcc8, 0.28);
  bounce.position.set(0.5, -2, 4);
  scene.add(bounce);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8.2, 80),
    new THREE.MeshStandardMaterial({ color: 0xe6dfd2, roughness: 0.92, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.38;
  ground.receiveShadow = true;
  scene.add(ground);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(5.6, 5.72, 80),
    new THREE.MeshBasicMaterial({ color: 0xd0c6b4, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -2.37;
  scene.add(ring);

  const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const woodMap = makeWoodMap();
  const metalMap = makeMetalMap();
  const { root: grinder, parts, rest } = buildGrinder(clipPlane, woodMap, metalMap);
  scene.add(grinder);

  // Annotation layer
  const overlay = document.createElement('div');
  overlay.className = 'ann-layer';
  container.appendChild(overlay);
  const annNodes = ANNS.map((a) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = "ann ann-side-" + (a.side > 0 ? "right" : "left");
    el.dataset.id = a.id;
    el.innerHTML = `<span class="ann-dot"></span><span class="ann-card"><strong>${a.title}</strong><em>${a.body}</em></span>`;
    overlay.appendChild(el);
    el.addEventListener('click', () => focusPart(a.id));
    return { ...a, el, anchor: new THREE.Vector2(), dock: new THREE.Vector2() };
  });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('ann-leaders');
  overlay.insertBefore(svg, overlay.firstChild);
  const leaderMap = new Map();
  for (const a of annNodes) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('class', 'leader');
    svg.appendChild(line);
    leaderMap.set(a.id, line);
  }

  let chapterIndex = 0;
  let cut = 0;
  let explode = 0;
  let cutGoal = 0;
  let explodeGoal = 0;
  let autoplay = false;
  let autoT = 0;
  let camTween = null; // unused; unified `motion` tween
  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shaftSpin = 0;
  let activeIds = new Set();
  let highlightId = null;
  let running = true;
  let last = performance.now();
  let annFade = new Map(ANNS.map((a) => [a.id, 0]));

  const explodeOffsets = {
    hopper: new THREE.Vector3(0, 1.55, 0),
    collar: new THREE.Vector3(0, 0.85, 0),
    burrs: new THREE.Vector3(0, 0.12, 0),
    shaft: new THREE.Vector3(0, 0.45, 0),
    body: new THREE.Vector3(0, 0, 0),
    cup: new THREE.Vector3(0, -1.2, 0),
    handle: new THREE.Vector3(0, 1.35, 0),
  };

  // Cache materials once — never traverse/reassign clippingPlanes per frame (major hitch source)
  const clipMats = [];
  grinder.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      m.clippingPlanes = [clipPlane];
      clipMats.push(m);
    }
  });
  clipPlane.normal.set(-1, 0, 0);
  // Continuous section: amount 0 = plane outside +X (closed), 1 = through axis.
  // Plane eq: -x + constant = 0 → clips x > constant. Body radius ≈ 1.24.
  const CLIP_FAR = 1.55;
  const CLIP_NEAR = 0.02;
  function applyClip(amount) {
    const a = THREE.MathUtils.clamp(amount, 0, 1);
    clipPlane.constant = CLIP_FAR + (CLIP_NEAR - CLIP_FAR) * a;
  }

  function applyExplode(amount) {
    // amount is already eased by the motion tween — do not ease twice
    for (const [k, g] of Object.entries(parts)) {
      if (k === 'upperBurr') continue;
      const base = rest[k];
      const off = explodeOffsets[k] || new THREE.Vector3();
      g.position.set(base.x + off.x * amount, base.y + off.y * amount, base.z + off.z * amount);
    }
  }

  function readCamSpherical() {
    const offset = camera.position.clone().sub(target);
    const radius = Math.max(0.001, offset.length());
    const phi = Math.acos(THREE.MathUtils.clamp(offset.y / radius, -1, 1));
    const theta = Math.atan2(offset.x, offset.z);
    return { theta, phi, radius };
  }

  /** One continuous chapter motion: camera + cut + explode share the same duration & ease */
  let motion = null; // { t, dur, from:{cut,explode,theta,phi,radius}, to:{...} }

  function smootherstep(t) {
    // Ken Perlin smootherstep — softer than cubic in/out
    const x = THREE.MathUtils.clamp(t, 0, 1);
    return x * x * x * (x * (x * 6 - 15) + 10);
  }

  function applyMotionU(u) {
    const e = smootherstep(u);
    const f = motion.from;
    const to = motion.to;
    cut = lerp(f.cut, to.cut, e);
    explode = lerp(f.explode, to.explode, e);
    const th = lerp(f.theta, to.theta, e);
    const ph = lerp(f.phi, to.phi, e);
    const rd = lerp(f.radius, to.radius, e);
    camera.position.copy(sphericalToCart(th, ph, rd, target));
    camera.lookAt(target); // must look while OrbitControls is paused
    applyClip(cut);
    applyExplode(explode);
  }

  function syncControlsFromCamera() {
    controls.target.copy(target);
    // Drop leftover orbit inertia so re-enable does not nudge the authored pose
    if (controls._sphericalDelta) controls._sphericalDelta.set(0, 0, 0);
    if (controls._panOffset) controls._panOffset.set(0, 0, 0);
    controls.update();
  }

  function startMotion(to, dur, immediate) {
    const cam = readCamSpherical();
    const from = {
      cut,
      explode,
      theta: cam.theta,
      phi: cam.phi,
      radius: cam.radius,
    };
    const dest = {
      cut: to.cut,
      explode: to.explode,
      theta: shortestAngle(from.theta, to.theta),
      phi: to.phi,
      radius: to.radius,
    };
    if (immediate || reduced) {
      motion = null;
      cut = dest.cut;
      explode = dest.explode;
      camera.position.copy(sphericalToCart(dest.theta, dest.phi, dest.radius, target));
      camera.lookAt(target);
      applyClip(cut);
      applyExplode(explode);
      controls.enabled = true;
      syncControlsFromCamera();
      return;
    }
    // Retarget mid-flight without snapping: restart from live values
    motion = { t: 0, dur: Math.max(0.35, dur), from, to: dest };
    controls.enabled = false; // prevent OrbitControls damping from fighting the tween
    if (controls._sphericalDelta) controls._sphericalDelta.set(0, 0, 0);
    if (controls._panOffset) controls._panOffset.set(0, 0, 0);
  }

  function applyChapter(ch, immediate) {
    chapterIndex = CHAPTERS.indexOf(ch);
    cutGoal = ch.cut;
    explodeGoal = ch.explode;
    activeIds = new Set(ch.show);
    if (ch.id === 'exploded') activeIds = new Set(ANNS.map((a) => a.id));
    if (ch.id === 'exterior') activeIds = new Set();
    startMotion(
      { cut: ch.cut, explode: ch.explode, theta: ch.cam.theta, phi: ch.cam.phi, radius: ch.cam.radius },
      ch.camDur ?? 2.6,
      immediate
    );
  }

  function focusPart(id) {
    highlightId = id;
    let nextCut = Math.max(cutGoal, cut);
    if (cutGoal < 0.5 || id === 'burrs' || id === 'shaft' || id === 'collar') nextCut = 1;
    let nextExp = explodeGoal;
    if (id === 'hopper' || id === 'handle') nextExp = Math.max(nextExp, explode, 0.35);
    if (id === 'cup') nextExp = Math.max(nextExp, explode, 0.5);
    if (id === 'burrs' || id === 'shaft' || id === 'collar') nextExp = Math.max(nextExp, explode, 0.28);
    cutGoal = nextCut;
    explodeGoal = nextExp;
    activeIds.add(id);
    const ann = ANNS.find((a) => a.id === id);
    const cam = ann
      ? { theta: ann.side > 0 ? 0.72 : -0.48, phi: 1.08, radius: 10.2 }
      : readCamSpherical();
    startMotion({ cut: nextCut, explode: nextExp, ...cam }, 2.0, false);
  }

  /** Slot-based layout: fixed columns + vertical separation by rank among visible */
  function layoutAnnotations(cw, chH) {
    const chap = CHAPTERS[chapterIndex];
    const CARD_H = 58;
    const GAP = 10;
    const marginY = 52;
    const colL = cw * 0.015;
    const colR = cw * 0.985;

    const visible = [];
    for (const a of annNodes) {
      const world = a.local.clone();
      const part = parts[a.id];
      if (part && rest[a.id]) world.add(part.position).sub(rest[a.id]);
      grinder.localToWorld(world);
      const ndc = world.clone().project(camera);
      const behind = ndc.z > 1 || ndc.z < -1 || Math.abs(ndc.x) > 1.35 || Math.abs(ndc.y) > 1.35;
      const ax = (ndc.x * 0.5 + 0.5) * cw;
      const ay = (-ndc.y * 0.5 + 0.5) * chH;
      a.anchor.set(ax, ay);

      let want = false;
      if (chap.id === 'exterior') want = false;
      else if (chap.id === 'exploded') want = !behind;
      else want = !behind && activeIds.has(a.id);

      const goal = want ? 1 : 0;
      const cur = annFade.get(a.id) ?? 0;
      annFade.set(a.id, lerp(cur, goal, 0.18));
      const fade = annFade.get(a.id);
      a._want = want;
      a._fade = fade;
      if (fade > 0.05) visible.push(a);
    }

    // Separate left / right, sort by preferred Y then rank
    const left = visible.filter((a) => a.side < 0).sort((a, b) => a.rank - b.rank || a.anchor.y - b.anchor.y);
    const right = visible.filter((a) => a.side > 0).sort((a, b) => a.rank - b.rank || a.anchor.y - b.anchor.y);

    function placeColumn(list, isRight) {
      if (!list.length) return;
      // Ideal Y from anchors, then resolve overlaps top→bottom
      const ideals = list.map((a) => THREE.MathUtils.clamp(a.anchor.y, marginY, chH - marginY));
      const ys = ideals.slice();
      for (let i = 1; i < ys.length; i++) {
        const minY = ys[i - 1] + CARD_H + GAP;
        if (ys[i] < minY) ys[i] = minY;
      }
      // If overflow bottom, shift block up
      const overflow = ys[ys.length - 1] - (chH - marginY);
      if (overflow > 0) {
        for (let i = 0; i < ys.length; i++) ys[i] -= overflow;
      }
      // If now above top, compress from top
      if (ys[0] < marginY) {
        const shift = marginY - ys[0];
        for (let i = 0; i < ys.length; i++) ys[i] += shift;
      }
      // Final compress if still overflowing
      const span = ys[ys.length - 1] - ys[0];
      const maxSpan = chH - 2 * marginY;
      if (span > maxSpan && list.length > 1) {
        for (let i = 0; i < ys.length; i++) {
          ys[i] = marginY + (i / (ys.length - 1)) * maxSpan;
        }
      }
      list.forEach((a, i) => {
        const dockX = isRight ? colR : colL;
        a.dock.set(dockX, ys[i]);
      });
    }
    placeColumn(left, false);
    placeColumn(right, true);

    for (const a of annNodes) {
      const on = (a._fade ?? 0) > 0.08;
      a.el.classList.toggle('is-on', on);
      a.el.classList.toggle('is-focus', highlightId === a.id);
      a.el.style.opacity = String(a._fade ?? 0);
      if (!on) {
        leaderMap.get(a.id).classList.remove('is-on');
        continue;
      }
      const dockX = a.dock.x;
      const dockY = a.dock.y;
      a.el.style.transform = a.side > 0
        ? `translate(${dockX}px, ${dockY}px) translate(-100%, -50%)`
        : `translate(${dockX}px, ${dockY}px) translate(0, -50%)`;

      const line = leaderMap.get(a.id);
      const x = a.anchor.x;
      const y = a.anchor.y;
      const edgeX = a.side > 0 ? dockX - 8 : dockX + 8;
      const midX = x + (edgeX - x) * 0.45;
      const midY = y + (dockY - y) * 0.15;
      line.setAttribute('d', `M ${x.toFixed(1)} ${y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${edgeX.toFixed(1)} ${dockY.toFixed(1)}`);
      line.style.opacity = String(a._fade);
      line.classList.add('is-on');
    }
  }

  function projectAnn() {
    const rect = renderer.domElement.getBoundingClientRect();
    const cw = rect.width;
    const chH = rect.height;
    if (cw !== cachedAnnSize.w || chH !== cachedAnnSize.h) {
      cachedAnnSize.w = cw;
      cachedAnnSize.h = chH;
      svg.setAttribute('viewBox', `0 0 ${cw} ${chH}`);
    }
    layoutAnnotations(cw, chH);
  }

  let annClock = 0;
  let cachedAnnSize = { w: 0, h: 0 };

  function tick(now) {
    if (!running) return;
    // Cap dt but don't stretch — hitch recovery should not jump the tween
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // lost frames: advance at most 50ms (continuity over catch-up)
    if (dt < 0) dt = 0;

    if (motion) {
      motion.t += dt;
      const u = Math.min(1, motion.t / motion.dur);
      applyMotionU(u);
      if (u >= 1) {
        motion = null;
        controls.enabled = true;
        syncControlsFromCamera();
      }
    } else {
      // Manual cut/explode sliders still use a gentle critically-damped chase
      if (Math.abs(cut - cutGoal) > 1e-4 || Math.abs(explode - explodeGoal) > 1e-4) {
        const k = 1 - Math.exp(-dt * 4.2);
        cut = lerp(cut, cutGoal, k);
        explode = lerp(explode, explodeGoal, k);
        applyClip(cut);
        applyExplode(explode);
      }
      if (controls.enabled) controls.update();
    }

    if (!reduced && (cut > 0.35 || explode > 0.15)) {
      shaftSpin += dt * 0.45;
      parts.shaft.rotation.y = shaftSpin;
      parts.upperBurr.rotation.y = shaftSpin;
      parts.handle.rotation.y = shaftSpin;
    }

    if (autoplay && !reduced) {
      autoT += dt;
      // Overlap: start next chapter slightly before motion ends for continuous feel
      const dwell = 3.6;
      const busy = motion && motion.t / motion.dur < 0.92;
      if (autoT >= dwell && !busy) {
        autoT = 0;
        applyChapter(CHAPTERS[(chapterIndex + 1) % CHAPTERS.length], false);
      }
    }

    renderer.render(scene, camera);

    // Annotation DOM at ~30fps — full layout every frame was a hitch source
    annClock += dt;
    if (annClock >= 0.033 || motion) {
      // during motion refresh a bit more often for leader tracking
      if (motion) {
        if (annClock >= 0.022) {
          annClock = 0;
          projectAnn();
        }
      } else if (annClock >= 0.033) {
        annClock = 0;
        projectAnn();
      }
    }

    requestAnimationFrame(tick);
  }

  applyClip(0);
  applyExplode(0);
  applyChapter(CHAPTERS[reduced ? 1 : 0], true);
  if (reduced) {
    cut = 1;
    explode = 0;
    applyClip(1);
    applyExplode(0);
  }
  // Prime annotation layout once
  projectAnn();
  requestAnimationFrame(tick);

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  return {
    CHAPTERS,
    ANNS,
    palette: PALETTE,
    setChapter(id, immediate = false) {
      const ch = CHAPTERS.find((c) => c.id === id);
      if (!ch) return false;
      autoplay = false;
      autoT = 0;
      highlightId = null;
      applyChapter(ch, immediate);
      return true;
    },
    setCut(v) {
      cutGoal = THREE.MathUtils.clamp(+v, 0, 1);
      // Idle drag: apply 1:1 so the section plane tracks the slider continuously
      if (!motion) {
        cut = cutGoal;
        applyClip(cut);
      }
    },
    setExplode(v) {
      explodeGoal = THREE.MathUtils.clamp(+v, 0, 1);
      if (!motion) {
        explode = explodeGoal;
        applyExplode(explode);
      }
    },
    setAutoplay(on) {
      autoplay = !!on;
      autoT = 0;
    },
    focusPart,
    getState() {
      return {
        chapter: CHAPTERS[chapterIndex].id,
        cut: +cut.toFixed(3),
        explode: +explode.toFixed(3),
        autoplay,
        highlight: highlightId,
        annotationsOn: annNodes.filter((a) => (a._fade ?? 0) > 0.5).map((a) => a.id),
        motion: motion ? Math.min(1, motion.t / motion.dur) : 1,
        transitioning: !!motion,
      };
    },
    /** Resolve when chapter camera/cut/explode tween finishes */
    whenSettled() {
      return new Promise((resolve) => {
        const check = () => {
          if (!motion) resolve();
          else requestAnimationFrame(check);
        };
        check();
      });
    },
    async settle(ms = 1400) {
      return new Promise((r) => setTimeout(r, ms));
    },
    resize,
    renderer,
    canvas: renderer.domElement,
    dispose() {
      running = false;
      controls.dispose();
      renderer.dispose();
      overlay.remove();
      woodMap.dispose();
      metalMap.dispose();
    },
  };
}

export { CHAPTERS, ANNS, PALETTE };
