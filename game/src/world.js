// SKYPOST world: the Marrow Isles — terrain, sea, airfield, town, rings, sky.
import { CONFIG } from './config.js';
import { fbm2, makeRng, valueNoise2 } from './random.js';

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Distance outside the flattened airfield rectangle (0 inside it).
function airfieldOutside(x, z) {
  const dx = Math.max(Math.abs(x) - 700, 0);
  const dz = Math.max(Math.abs(z) - 260, 0);
  return Math.hypot(dx, dz);
}

// Distance outside the flattened town bowl (0 inside it).
function townOutside(x, z) {
  const dx = x - 780;
  const dz = z - 620;
  return Math.max(0, Math.hypot(dx, dz) - 300);
}
export function groundHeight(x, z) {
  const r = Math.hypot(x, z);
  const mask = 1 - smoothstep(1500, 2050, r);
  let h = fbm2(x * 0.00045 + 7.3, z * 0.00045 + 2.1, 4);
  h = Math.pow(h, 1.7) * CONFIG.world.maxHeight;
  const ridge = fbm2(x * 0.0011 + 40.2, z * 0.0011 + 9.7, 3);
  h += Math.max(0, ridge - 0.60) * 420 * mask;
  h = h * mask - 9 * (1 - mask);
  const air = smoothstep(0, 320, airfieldOutside(x, z));
  h = lerp(CONFIG.runway.elevation, h, air);
  const town = smoothstep(0, 200, townOutside(x, z));
  h = lerp(9, h, town);
  return h;
}

export function isOnRunway(x, z) {
  const rw = CONFIG.runway;
  return Math.abs(x - rw.x) <= rw.length / 2 && Math.abs(z - rw.z) <= rw.width / 2;
}

export function runwayOffset(x, z) {
  return { along: x - CONFIG.runway.x, across: z - CONFIG.runway.z };
}
function makeSkyTexture() {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#1e4f8f');
  grad.addColorStop(0.35, '#4f8fc4');
  grad.addColorStop(0.55, '#8fc3e2');
  grad.addColorStop(0.68, '#ffd9a0');
  grad.addColorStop(0.74, '#ffb36b');
  grad.addColorStop(0.76, '#7fb6dd');
  grad.addColorStop(1.0, '#3d7cae');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSunTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 4, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255, 246, 220, 1)');
  grad.addColorStop(0.25, 'rgba(255, 214, 140, 0.95)');
  grad.addColorStop(0.6, 'rgba(255, 170, 80, 0.35)');
  grad.addColorStop(1, 'rgba(255, 160, 60, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
function buildSky(scene) {
  const skyGeo = new THREE.SphereGeometry(9000, 24, 14);
  const skyMat = new THREE.MeshBasicMaterial({
    map: makeSkyTexture(), side: THREE.BackSide, fog: false, depthWrite: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
  const sunMat = new THREE.SpriteMaterial({
    map: makeSunTexture(), fog: false, depthWrite: false, transparent: true,
  });
  const sun = new THREE.Sprite(sunMat);
  sun.position.set(-5200, 1500, -4200);
  sun.scale.set(2600, 2600, 1);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x4a6b3f, 0.75);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffdfae, 1.5);
  sunLight.position.set(-2600, 900, -2100);
  scene.add(sunLight);
  scene.fog = new THREE.Fog(0xa8c6de, 900, 6500);
  return sunLight;
}

function terrainColor(h, x, z, out) {
  const patch = valueNoise2(x * 0.004 + 3.1, z * 0.004 + 8.8);
  const field = valueNoise2(x * 0.0016 + 11.4, z * 0.0016 + 5.2);
  if (h < 1.5) { out.setRGB(0.85, 0.80, 0.62); return out; }
  if (h < 5) { out.setRGB(0.88, 0.83, 0.66); return out; }
  if (field > 0.74 && h < 120) {
    const tilled = field > 0.86;
    if (tilled) out.setRGB(0.55, 0.42, 0.27);
    else out.setRGB(0.62, 0.55, 0.30);
    return out;
  }
  if (h < 130) {
    const g = 0.46 + patch * 0.22;
    out.setRGB(0.30 + patch * 0.10, g, 0.24 + patch * 0.06);
    return out;
  }
  if (h < 240) { out.setRGB(0.48, 0.46, 0.42); return out; }
  out.setRGB(0.93, 0.95, 0.97);
  return out;
}
function buildTerrain(scene) {
  const size = CONFIG.world.size;
  const geo = new THREE.PlaneGeometry(size, size, 150, 150);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = groundHeight(x, z);
    pos.setY(i, h);
    terrainColor(h, x, z, c);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const terrain = new THREE.Mesh(geo, mat);
  scene.add(terrain);
  const seaGeo = new THREE.CircleGeometry(7000, 48);
  seaGeo.rotateX(-Math.PI / 2);
  const seaMat = new THREE.MeshLambertMaterial({
    color: 0x1e6f9e, transparent: true, opacity: 0.92,
  });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.position.y = 0.4;
  scene.add(sea);
  return terrain;
}

function makeRunwayTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#33373d';
  g.fillRect(0, 0, 1024, 128);
  g.fillStyle = '#3a3f46';
  for (let i = 0; i < 40; i++) g.fillRect(i * 26, 0, 13, 128);
  g.fillStyle = '#f4f6f8';
  for (let x = 120; x < 920; x += 64) g.fillRect(x, 60, 34, 8);
  for (let i = 0; i < 8; i++) {
    g.fillRect(18 + i * 12, 22, 6, 84);
    g.fillRect(1000 - 24 - i * 12, 22, 6, 84);
  }
  g.fillStyle = '#f4f6f8';
  g.font = 'bold 64px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('27', 74, 88);
  g.save();
  g.translate(950, 64);
  g.rotate(Math.PI);
  g.fillText('09', 0, 24);
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function buildAirfield(scene, rng) {
  const rw = CONFIG.runway;
  const group = new THREE.Group();
  const rwGeo = new THREE.PlaneGeometry(rw.length, rw.width);
  rwGeo.rotateX(-Math.PI / 2);
  const rwMat = new THREE.MeshLambertMaterial({ map: makeRunwayTexture() });
  const runway = new THREE.Mesh(rwGeo, rwMat);
  runway.position.set(rw.x, rw.elevation + 0.15, rw.z);
  group.add(runway);
  const apronGeo = new THREE.PlaneGeometry(220, 130);
  apronGeo.rotateX(-Math.PI / 2);
  const apron = new THREE.Mesh(apronGeo, new THREE.MeshLambertMaterial({ color: 0x4a4f55 }));
  apron.position.set(-120, rw.elevation + 0.1, -150);
  group.add(apron);
  const lightGeo = new THREE.SphereGeometry(1.1, 8, 6);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const lights = new THREE.InstancedMesh(lightGeo, lightMat, 40);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 20; i++) {
    const x = -rw.length / 2 + (i / 19) * rw.length;
    m.setPosition(x, rw.elevation + 1.2, -rw.width / 2 - 3);
    lights.setMatrixAt(i * 2, m);
    m.setPosition(x, rw.elevation + 1.2, rw.width / 2 + 3);
    lights.setMatrixAt(i * 2 + 1, m);
  }
  group.add(lights);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 11, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8dde2 }),
  );
  pole.position.set(120, rw.elevation + 5.5, -60);
  group.add(pole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 6, 10, 1, true),
    new THREE.MeshLambertMaterial({ color: 0xff7a2e, side: THREE.DoubleSide }),
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(120, rw.elevation + 10.6, -60);
  group.add(sock);
  scene.add(group);
  return { group, windsock: sock, edgeLights: lights };
}
function buildBuildings(scene, rng) {
  const group = new THREE.Group();
  const rw = CONFIG.runway;
  const hangarMat = new THREE.MeshLambertMaterial({ color: 0x8fa3b5 });
  const hangar = new THREE.Mesh(new THREE.BoxGeometry(46, 14, 34), hangarMat);
  hangar.position.set(-260, rw.elevation + 7, -150);
  group.add(hangar);
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(17, 17, 46, 12, 1, false, 0, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0x6b7f92 }),
  );
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.position.set(-260, rw.elevation + 14, -150);
  group.add(roof);
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 11),
    new THREE.MeshLambertMaterial({ color: 0x2c3844 }),
  );
  door.position.set(-260, rw.elevation + 5.5, -132.8);
  group.add(door);
  const towerBase = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 5.5, 30, 10),
    new THREE.MeshLambertMaterial({ color: 0xcfd6dc }),
  );
  towerBase.position.set(180, rw.elevation + 15, -120);
  group.add(towerBase);
  const cab = new THREE.Mesh(
    new THREE.CylinderGeometry(6.5, 5, 7, 8),
    new THREE.MeshLambertMaterial({ color: 0x2e4a66, emissive: 0x1a3a55 }),
  );
  cab.position.set(180, rw.elevation + 33, -120);
  group.add(cab);
  scene.add(group);
  return group;
}

function buildTown(scene, rng) {
  const group = new THREE.Group();
  const wallColors = [0xd8c9a8, 0xc9a06a, 0xb8c4cc, 0xd8a08a, 0xa8c4a0, 0xe8e0d0];
  const roofColors = [0x9a4a3a, 0x5a6b7a, 0x7a5a3a, 0x4a5a6a];
  for (let i = 0; i < 30; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = rng.range(30, 280);
    const x = 780 + Math.cos(a) * rr;
    const z = 620 + Math.sin(a) * rr * 0.8;
    const y = groundHeight(x, z);
    const w = rng.range(10, 18);
    const d = rng.range(10, 16);
    const h = rng.range(7, 13);
    const house = new THREE.Group();
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color: rng.pick(wallColors) }),
    );
    walls.position.y = h / 2;
    house.add(walls);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, d) * 0.75, rng.range(4, 7), 4),
      new THREE.MeshLambertMaterial({ color: rng.pick(roofColors) }),
    );
    roof.position.y = h + 2.5;
    roof.rotation.y = Math.PI / 4;
    house.add(roof);
    if (rng.next() < 0.6) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 3),
        new THREE.MeshBasicMaterial({ color: 0xffd98a }),
      );
      win.position.set(0, h * 0.55, d / 2 + 0.06);
      house.add(win);
    }
    house.position.set(x, y, z);
    house.rotation.y = rng.range(0, Math.PI * 2);
    group.add(house);
  }
  scene.add(group);
  return group;
}
function buildTrees(scene, rng) {
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 4, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a4028 });
  const crownGeo = new THREE.ConeGeometry(3.2, 11, 7);
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x2e6b34 });
  const count = 700;
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, count);
  const m = new THREE.Matrix4();
  const s = new THREE.Vector3();
  let placed = 0;
  let guard = 0;
  while (placed < count && guard < count * 40) {
    guard++;
    const x = rng.range(-1900, 1900);
    const z = rng.range(-1900, 1900);
    const h = groundHeight(x, z);
    if (h < 6 || h > 150) continue;
    if (Math.abs(x) < 760 && Math.abs(z) < 300) continue;
    if (Math.hypot(x - 780, z - 620) < 320) continue;
    const scale = rng.range(0.7, 1.7);
    s.set(scale, scale, scale);
    m.compose(new THREE.Vector3(x, h + 2 * scale, z), new THREE.Quaternion(), s);
    trunks.setMatrixAt(placed, m);
    m.compose(new THREE.Vector3(x, h + (4 + 5.5) * scale, z), new THREE.Quaternion(), s);
    crowns.setMatrixAt(placed, m);
    placed++;
  }
  trunks.count = placed;
  crowns.count = placed;
  scene.add(trunks);
  scene.add(crowns);
  return { trunks, crowns, count: placed };
}

function buildClouds(scene, rng) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({
    color: 0xffffff, transparent: true, opacity: 0.88,
  });
  const puffs = [];
  for (let i = 0; i < 24; i++) {
    const puff = new THREE.Group();
    const n = rng.int(3, 5);
    for (let j = 0; j < n; j++) {
      const r = rng.range(18, 42);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
      ball.position.set(rng.range(-40, 40), rng.range(-6, 8), rng.range(-18, 18));
      ball.scale.y = 0.55;
      puff.add(ball);
    }
    puff.position.set(
      rng.range(-2600, 2600),
      rng.range(320, 560),
      rng.range(-2600, 2600),
    );
    puffs.push(puff);
    group.add(puff);
  }
  scene.add(group);
  return { group, puffs };
}
export function createWorld(seed) {
  const scene = new THREE.Scene();
  const rng = makeRng(seed);
  buildSky(scene);
  buildTerrain(scene);
  const airfield = buildAirfield(scene, rng);
  buildBuildings(scene, rng);
  buildTown(scene, rng);
  buildTrees(scene, rng);
  const clouds = buildClouds(scene, rng);
  const world = {
    scene,
    groundHeight,
    isOnRunway,
    runwayOffset,
    windsock: airfield.windsock,
    clouds: clouds.puffs,
    time: 0,
    update(dt) {
      world.time += dt;
      const drift = dt * 6;
      for (const puff of world.clouds) {
        puff.position.x += drift;
        if (puff.position.x > 2800) puff.position.x = -2800;
      }
      const w = world.windsock;
      if (w) {
        w.rotation.y = -0.9 + Math.sin(world.time * 0.7) * 0.12;
        w.rotation.z = Math.PI / 2 + Math.sin(world.time * 1.3) * 0.05;
      }
    },
  };
  return world;
}


