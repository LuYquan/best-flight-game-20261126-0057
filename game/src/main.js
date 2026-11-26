// SKYPOST main: boot, game loop, state machine, camera.
import { CONFIG, KNOTS_PER_MS } from './config.js';
import { createWorld } from './world.js';
import { createFlightState, createPlane } from './plane.js';
import { stepFlight } from './physics.js';
import { createInput } from './input.js';
import { createHud, showMessage, updateHud } from './hud.js';
import { createAudio } from './audio.js';
import { MISSIONS, createMission, missionStatus, updateMission } from './missions.js';
import { applyShotPreset, parseShotParams } from './shots.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => (v < lo ? lo : (v > hi ? hi : v));
const wrapAngle = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

const dtCap = new URLSearchParams(window.location.search).has('fast') ? 0.5 : 0.05;
const clock = new THREE.Clock();
let landedMsgShown = false;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
$('game').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 12000);
const world = createWorld(CONFIG.seed);
const plane = createPlane();
world.scene.add(plane.group);
const dashboard = buildDashboard();
plane.group.add(dashboard);
dashboard.visible = false;
let state = createFlightState();
let mission = createMission('rings', world, CONFIG.seed);
const input = createInput();
const hud = createHud();
const audio = createAudio();
let mode = 'menu';
let cameraMode = 'chase';
let autopilotTarget = null;
let elapsed = 0;
let bestScore = 0;
let endShown = false;
function buildDashboard() {
  const group = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 1.5, 4.6),
    new THREE.MeshLambertMaterial({ color: 0x1a2230 }),
  );
  panel.position.set(2.7, 0.35, 0);
  group.add(panel);
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#0c1420';
  g.fillRect(0, 0, 512, 96);
  const gauges = ['ALT', 'SPD', 'HDG', 'FUEL'];
  gauges.forEach((label, i) => {
    const x = 64 + i * 128;
    g.beginPath();
    g.arc(x, 44, 30, 0, Math.PI * 2);
    g.fillStyle = '#12283d';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#7ef0c1';
    g.stroke();
    g.fillStyle = '#eafaff';
    g.font = 'bold 13px Arial';
    g.textAlign = 'center';
    g.fillText(label, x, 82);
    g.strokeStyle = '#ffd75e';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, 44);
    g.lineTo(x + 18, 30);
    g.stroke();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.5),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  face.position.set(2.38, 0.85, 0);
  face.rotation.y = -Math.PI / 2;
  group.add(face);
  return group;
}

function showMenu(show) {
  $('menu').classList.toggle('hidden', !show);
  $('hud').classList.toggle('hidden', show);
  if (show) mode = 'menu';
}

function startFlight(kind) {
  disposeMission();
  state = createFlightState();
  mission = createMission(kind, world, CONFIG.seed);
  mode = 'flying';
  autopilotTarget = null;
  endShown = false;
  landedMsgShown = false;
  elapsed = 0;
  $('menu').classList.add('hidden');
  $('end').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('hud').classList.remove('hidden');
  const info = MISSIONS.find((m) => m.id === kind);
  showMessage(hud, info ? info.name : kind, 2.4);
  audio.ensure();
}

function disposeMission() {
  if (mission.group) world.scene.remove(mission.group);
  if (mission.guideRing) world.scene.remove(mission.guideRing.mesh.parent);
  for (const parcel of mission.parcels || []) {
    if (parcel.mesh.parent) parcel.mesh.parent.remove(parcel.mesh);
  }
}
const game = {
  get state() { return state; },
  get mission() { return mission; },
  world,
  startFlight,
  showMenu,
  setCamera(m) { cameraMode = m; dashboard.visible = (m === 'cockpit'); },
  setAutopilot(target) { autopilotTarget = target; },
};

function applyAutopilot(dt) {
  if (!autopilotTarget) return;
  const dx = autopilotTarget.x - state.pos.x;
  const dz = autopilotTarget.z - state.pos.z;
  const desired = Math.atan2(dx, -dz);
  const err = wrapAngle(desired - state.heading);
  input.roll = clamp(err * 1.6, -0.7, 0.7);
  if (state.onGround && state.speed > CONFIG.plane.stallSpeed + 6) {
    input.pitch = 0.5;
  } else {
    const altErr = autopilotTarget.y - state.pos.y;
    const desiredVs = clamp(altErr * 0.25, -6, 10);
    const speedForPitch = Math.max(20, state.speed);
    const wantPitch = Math.asin(clamp((desiredVs + 1.85) / (speedForPitch * 0.95), -0.5, 0.5));
    input.pitch = clamp(wantPitch / 0.6, -0.6, 0.75);
  }
  if (state.speed < 50) input.throttle = Math.min(0.85, input.throttle + dt * 0.4);
  else if (state.speed > 60) input.throttle = Math.max(0.45, input.throttle - dt * 0.4);
}

function handleEvents(events) {
  for (const ev of events) {
    state.score += ev.points || 0;
    if (ev.text) showMessage(hud, ev.text, ev.type === 'complete' ? 4 : 2.4);
    if (ev.type === 'ring') audio.chime();
    if (ev.type === 'landed') audio.thud();
    if (ev.type === 'complete') audio.fanfare();
    if (ev.type === 'drop' && ev.points > 0) audio.chime();
  }
}

function showEnd(title, sub) {
  if (endShown) return;
  endShown = true;
  mode = 'over';
  bestScore = Math.max(bestScore, state.score);
  $('end-title').textContent = title;
  $('end-sub').textContent = sub;
  $('end-score').textContent = `${state.score} PTS`;
  const mins = Math.floor(state.time / 60);
  const secs = Math.floor(state.time % 60);
  $('end-stats').textContent =
    `Flight time ${mins}:${String(secs).padStart(2, '0')}  ·  Best ${bestScore} pts\n` +
    `Fuel left ${Math.round(state.fuel)}%  ·  Damage ${Math.round(state.damage)}%\n` +
    `${missionStatus(mission)}`;
  $('end').classList.remove('hidden');
}
function updateCamera(dt) {
  const fwdX = Math.sin(state.heading);
  const fwdZ = -Math.cos(state.heading);
  if (cameraMode === 'cockpit') {
    camera.position.set(
      state.pos.x + fwdX * 1.2,
      state.pos.y + 1.3,
      state.pos.z + fwdZ * 1.2,
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(
      state.pos.x + fwdX * 120 + Math.sin(state.pitch) * 0,
      state.pos.y + Math.sin(state.pitch) * 40 - 2,
      state.pos.z + fwdZ * 120,
    );
    camera.rotation.z += state.roll * 0.55;
    return;
  }
  const dist = CONFIG.camera.chaseDistance;
  const height = CONFIG.camera.chaseHeight;
  const desired = new THREE.Vector3(
    state.pos.x - fwdX * dist,
    state.pos.y + height,
    state.pos.z - fwdZ * dist,
  );
  const gh = world.groundHeight(desired.x, desired.z);
  if (desired.y < gh + 2.5) desired.y = gh + 2.5;
  const k = 1 - Math.exp(-CONFIG.camera.smoothing * dt);
  camera.position.lerp(desired, k);
  camera.up.set(0, 1, 0);
  camera.lookAt(state.pos.x + fwdX * 24, state.pos.y + 1.5, state.pos.z + fwdZ * 24);
}

function syncPlaneMesh(dt) {
  plane.group.position.copy(state.pos);
  plane.group.rotation.order = 'YXZ';
  plane.group.rotation.y = Math.PI / 2 - state.heading;
  plane.group.rotation.x = state.roll;
  plane.group.rotation.z = state.pitch;
  const spin = state.engineOut ? 1.5 : 2 + state.throttle * 34;
  plane.prop.rotation.x += spin * dt;
  plane.gear.visible = state.gearDown;
  const blink = (elapsed % 1.4) < 0.14;
  plane.strobe.visible = blink;
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(dtCap, clock.getDelta());
  elapsed += dt;
  if (mode === 'flying') {
    input.update(dt);
    applyAutopilot(dt);
    state.throttle = input.throttle;
    if (input.consume('gearPressed')) {
      state.gearDown = !state.gearDown;
      showMessage(hud, state.gearDown ? 'GEAR DOWN' : 'GEAR UP', 1.2);
      audio.beep();
    }
    if (input.consume('cameraPressed')) {
      game.setCamera(cameraMode === 'chase' ? 'cockpit' : 'chase');
    }
    if (input.consume('mutePressed')) {
      audio.setMuted(!audio.isMuted);
      showMessage(hud, audio.isMuted ? 'SOUND OFF' : 'SOUND ON', 1.2);
    }
    if (input.consume('pausePressed')) {
      mode = 'paused';
      $('pause').classList.remove('hidden');
    }
    stepFlight(state, input, dt, world);
    const events = updateMission(mission, state, dt, input, elapsed);
    handleEvents(events);
    audio.setEngine(state.throttle, state.speed * KNOTS_PER_MS, state.onGround);
    if (state.crashed) {
      audio.crash();
      showEnd('CRASHED', 'The Kestrel is down. The mail will have to wait.');
    } else if (mission.complete && state.onGround && state.speed < 4) {
      state.stopped = true;
      audio.fanfare();
      showEnd('MISSION COMPLETE', 'Mail delivered, rings threaded, Kestrel home safe.');
    } else if (state.onGround && state.landed && state.speed < 4 && !mission.complete && !landedMsgShown) {
      landedMsgShown = true;
      showMessage(hud, 'LANDED — throttle up to take off again', 3);
    }
  } else if (mode === 'paused') {
    if (input.consume('pausePressed')) {
      mode = 'flying';
      $('pause').classList.add('hidden');
    }
  }
  if (input.consume('restartPressed') && mode !== 'menu') {
    startFlight(mission.kind);
  }
  world.update(dt);
  syncPlaneMesh(dt);
  updateCamera(dt);
  updateHud(hud, state, mission, world, dt);
  renderer.render(world.scene, camera);
  if (!window.__SKYPOST_READY__) window.__SKYPOST_READY__ = true;
}
document.querySelectorAll('.mission-btn[data-mission]').forEach((btn) => {
  btn.addEventListener('click', () => startFlight(btn.dataset.mission));
});
$('resume-btn').addEventListener('click', () => {
  mode = 'flying';
  $('pause').classList.add('hidden');
});
$('again-btn').addEventListener('click', () => startFlight(mission.kind));
$('menu-btn').addEventListener('click', () => {
  disposeMission();
  state = createFlightState();
  mission = createMission('rings', world, CONFIG.seed);
  $('end').classList.add('hidden');
  showMenu(true);
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.__SKYPOST__ = {
  game,
  get state() { return state; },
  get mission() { return mission; },
  get mode() { return mode; },
};

const shotParams = parseShotParams();
if (shotParams.shot) {
  applyShotPreset(game, shotParams);
  input.throttle = state.throttle;
} else {
  showMenu(true);
}
tick();

