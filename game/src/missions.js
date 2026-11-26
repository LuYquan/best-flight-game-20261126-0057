// SKYPOST missions: Ring Run, Mail Drop, Precision Landing — goals, rings, scoring.
import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { groundHeight, isOnRunway, runwayOffset } from './world.js';

export const MISSIONS = [
  { id: 'rings', name: 'RING RUN', tag: 'Thread 8 sky rings, then land on runway 27.' },
  { id: 'mail', name: 'MAIL DROP', tag: 'Drop 3 parcels on the marked fields, low and slow.' },
  { id: 'landing', name: 'PRECISION LANDING', tag: 'One circuit, one touchdown — grease it in the zone.' },
];

function numberSprite(n, color) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.beginPath();
  g.arc(64, 64, 56, 0, Math.PI * 2);
  g.fillStyle = 'rgba(6, 20, 38, 0.85)';
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = color;
  g.stroke();
  g.fillStyle = color;
  g.font = 'bold 64px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(n), 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(30, 30, 1);
  return sprite;
}

function makeRingMesh(radius, color) {
  const geo = new THREE.TorusGeometry(radius, 1.5, 12, 40);
  const mat = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geo, mat);
}
function buildRingCourse(world, rng) {
  const group = new THREE.Group();
  const rings = [];
  const cx = 0;
  const cz = 0;
  for (let i = 0; i < CONFIG.rings.count; i++) {
    const a = (i / CONFIG.rings.count) * Math.PI * 2 + 0.35;
    const r = 950 + Math.sin(i * 1.7) * 280;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const alt = 120 + Math.sin(i * 2.3) * 60 + 40;
    const prevA = ((i - 1) / CONFIG.rings.count) * Math.PI * 2 + 0.35;
    const prevR = 950 + Math.sin((i - 1) * 1.7) * 280;
    const prevPos = i === 0
      ? new THREE.Vector3(0, 40, 0)
      : new THREE.Vector3(
        cx + Math.cos(prevA) * prevR,
        120 + Math.sin((i - 1) * 2.3) * 60 + 40,
        cz + Math.sin(prevA) * prevR,
      );
    const dir = new THREE.Vector3().subVectors(prevPos, new THREE.Vector3(x, alt, z)).normalize();
    const pos = new THREE.Vector3(x, alt, z);
    const mesh = makeRingMesh(CONFIG.rings.radius, 0x37c8ff);
    mesh.position.copy(pos);
    mesh.lookAt(pos.clone().add(dir));
    const label = numberSprite(i + 1, '#7ef0c1');
    label.position.copy(pos).y += CONFIG.rings.radius + 24;
    group.add(mesh);
    group.add(label);
    rings.push({ pos, dir, mesh, label, passed: false, prevAlong: null });
  }
  world.scene.add(group);
  return { group, rings };
}

function buildDropZones(world, rng) {
  const group = new THREE.Group();
  const spots = [
    { x: 620, z: 420, name: 'NORTH FIELD' },
    { x: -880, z: 760, name: 'OLD MILL' },
    { x: 260, z: -980, name: 'SOUTH MEADOW' },
  ];
  const zones = spots.map((s) => {
    const y = groundHeight(s.x, s.z);
    const zone = new THREE.Group();
    const outer = new THREE.Mesh(
      new THREE.RingGeometry(26, 30, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd75e, side: THREE.DoubleSide }),
    );
    outer.rotation.x = -Math.PI / 2;
    zone.add(outer);
    const inner = new THREE.Mesh(
      new THREE.RingGeometry(10, 12, 32),
      new THREE.MeshBasicMaterial({ color: 0xff5d5d, side: THREE.DoubleSide }),
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.3;
    zone.add(inner);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 130, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd75e, transparent: true, opacity: 0.14, side: THREE.DoubleSide,
      }),
    );
    beam.position.y = 65;
    zone.add(beam);
    zone.position.set(s.x, y + 0.6, s.z);
    group.add(zone);
    return { x: s.x, z: s.z, y, name: s.name, group: zone, done: false };
  });
  world.scene.add(group);
  return { group, zones };
}
function buildGuideRing(world) {
  const group = new THREE.Group();
  const pos = new THREE.Vector3(-820, 175, 0);
  const dir = new THREE.Vector3(1, 0, 0);
  const mesh = makeRingMesh(30, 0xffd75e);
  mesh.position.copy(pos);
  mesh.lookAt(pos.clone().add(dir));
  group.add(mesh);
  const label = numberSprite('▼', '#ffd75e');
  label.position.set(-820, 175 + 54, 0);
  group.add(label);
  world.scene.add(group);
  return { pos, dir, mesh, passed: false, prevAlong: null };
}

export function createMission(kind, world, seed) {
  const rng = makeRng(seed + kind.length * 977);
  const mission = {
    kind,
    seed,
    group: null,
    rings: [],
    nextRing: 0,
    ringsPassed: 0,
    zones: [],
    parcelsLeft: 0,
    parcels: [],
    guideRing: null,
    complete: false,
    landingScored: false,
    startTime: null,
    objective: '',
    events: [],
  };
  if (kind === 'rings') {
    const course = buildRingCourse(world, rng);
    mission.group = course.group;
    mission.rings = course.rings;
    mission.objective = 'Take off, thread rings 1–8, then land on runway 27.';
  } else if (kind === 'mail') {
    const dz = buildDropZones(world, rng);
    mission.group = dz.group;
    mission.zones = dz.zones;
    mission.parcelsLeft = 3;
    mission.objective = 'Drop 3 parcels on the glowing fields, then land on runway 27.';
  } else {
    mission.guideRing = buildGuideRing(world);
    mission.objective = 'Fly the circuit, pass the gold ring, land in the touchdown zone.';
  }
  return mission;
}
function checkRingCrossing(ring, planePos, events, mission, label) {
  const rel = new THREE.Vector3().subVectors(planePos, ring.pos);
  const along = rel.dot(ring.dir);
  const perp = rel.clone().addScaledVector(ring.dir, -along).length();
  if (ring.prevAlong !== null && ring.prevAlong > 0 && along <= 0 && perp < CONFIG.rings.radius) {
    ring.passed = true;
    return true;
  }
  ring.prevAlong = along;
  return false;
}

function dropParcel(mission, state) {
  if (mission.parcelsLeft <= 0) return;
  mission.parcelsLeft--;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.2, 1.6),
    new THREE.MeshLambertMaterial({ color: 0xd8a03a }),
  );
  mesh.position.copy(state.pos);
  mesh.position.y -= 2.5;
  mission.group.parent.add(mesh);
  const fwdX = Math.sin(state.heading);
  const fwdZ = -Math.cos(state.heading);
  mission.parcels.push({
    mesh,
    vel: new THREE.Vector3(fwdX * state.speed, -1, fwdZ * state.speed),
    landed: false,
  });
}

function scoreParcel(mission, parcel, events) {
  let best = null;
  let bestDist = 1e9;
  for (const zone of mission.zones) {
    if (zone.done) continue;
    const d = Math.hypot(parcel.mesh.position.x - zone.x, parcel.mesh.position.z - zone.z);
    if (d < bestDist) { bestDist = d; best = zone; }
  }
  if (!best) return;
  best.done = true;
  let points = 0;
  let text = '';
  if (bestDist < 12) { points = CONFIG.scoring.dropBullseye; text = `BULLSEYE at ${best.name}! +${points}`; }
  else if (bestDist < 30) { points = CONFIG.scoring.dropRing; text = `On target at ${best.name}! +${points}`; }
  else { text = `${best.name} missed by ${Math.round(bestDist)} m`; }
  events.push({ type: 'drop', points, text });
}
export function updateMission(mission, state, dt, input, t) {
  const events = mission.events;
  events.length = 0;
  if (mission.kind === 'rings' && mission.nextRing < mission.rings.length) {
    const ring = mission.rings[mission.nextRing];
    ring.mesh.material.color.setHex(0xffd75e);
    const pulse = 1 + Math.sin(t * 3.2) * 0.045;
    ring.mesh.scale.set(pulse, pulse, 1);
    if (checkRingCrossing(ring, state.pos, events, mission)) {
      mission.ringsPassed++;
      mission.nextRing++;
      const par = mission.ringsPassed * 45;
      const bonus = state.time <= par ? CONFIG.scoring.ringTimeBonus : 0;
      const points = CONFIG.scoring.ring + bonus;
      events.push({
        type: 'ring', points,
        text: `RING ${mission.ringsPassed}/8  +${points}${bonus ? ' (fast!)' : ''}`,
      });
      ring.mesh.material.color.setHex(0x2aff66);
      ring.label.material.opacity = 0.25;
    }
  }
  if (mission.guideRing && !mission.guideRing.passed) {
    const ring = mission.guideRing;
    ring.mesh.scale.setScalar(1 + Math.sin(t * 3.2) * 0.045);
    if (checkRingCrossing(ring, state.pos, events, mission)) {
      events.push({ type: 'ring', points: 50, text: 'ON THE GLIDESLOPE  +50' });
    }
  }
  if (input && input.consume('dropPressed') && mission.kind === 'mail') {
    dropParcel(mission, state);
    events.push({ type: 'drop', points: 0, text: `Parcel away — ${mission.parcelsLeft} left` });
  }
  for (const parcel of mission.parcels) {
    if (parcel.landed) continue;
    parcel.vel.y -= 7.5 * dt;
    parcel.mesh.position.addScaledVector(parcel.vel, dt);
    parcel.mesh.rotation.y += dt * 0.8;
    const gh = groundHeight(parcel.mesh.position.x, parcel.mesh.position.z);
    if (parcel.mesh.position.y <= gh + 0.7) {
      parcel.mesh.position.y = gh + 0.7;
      parcel.landed = true;
      scoreParcel(mission, parcel, events);
    }
  }
  scoreLanding(mission, state, events);
  return events;
}
function scoreLanding(mission, state, events) {
  if (!state.landed || mission.landingScored || mission.complete) return;
  mission.landingScored = true;
  const off = runwayOffset(state.pos.x, state.pos.z);
  const centerline = Math.abs(off.across);
  const vs = Math.abs(state.touchdownVs || 0);
  const spd = state.speed;
  let points = CONFIG.scoring.landingBase;
  if (vs < 2.5) points += CONFIG.scoring.landingSoftBonus;
  else if (vs < 4.5) points += 60;
  if (centerline < 6) points += 80;
  else if (centerline < 14) points += 30;
  if (spd < 40) points += 40;
  const done = missionDone(mission);
  events.push({
    type: 'landed', points,
    text: done ? `TOUCHDOWN — ${points} pts. MISSION COMPLETE!` : `TOUCHDOWN  +${points}`,
  });
  if (done) {
    mission.complete = true;
    events.push({ type: 'complete', points: 0, text: 'MISSION COMPLETE' });
  }
}

function missionDone(mission) {
  if (mission.kind === 'rings') return mission.ringsPassed >= CONFIG.rings.count;
  if (mission.kind === 'mail') return mission.zones.every((z) => z.done);
  return true;
}

export function nextTarget(mission) {
  if (mission.kind === 'rings' && mission.nextRing < mission.rings.length) {
    return { pos: mission.rings[mission.nextRing].pos, label: `RING ${mission.nextRing + 1}` };
  }
  if (mission.kind === 'mail') {
    const zone = mission.zones.find((z) => !z.done);
    if (zone) return { pos: new THREE.Vector3(zone.x, zone.y + 20, zone.z), label: zone.name };
  }
  if (mission.guideRing && !mission.guideRing.passed) {
    return { pos: mission.guideRing.pos, label: 'APPROACH RING' };
  }
  return { pos: new THREE.Vector3(0, 40, 0), label: 'RUNWAY 27' };
}

export function missionStatus(mission) {
  if (mission.kind === 'rings') return `Rings ${mission.ringsPassed}/${CONFIG.rings.count} — then land on runway 27`;
  if (mission.kind === 'mail') {
    const done = mission.zones.filter((z) => z.done).length;
    return `Parcels delivered ${done}/3 — ${mission.parcelsLeft} in the hold — then land`;
  }
  return mission.landingScored ? 'Landed — mission complete!' : 'Fly the circuit and land in the zone';
}

