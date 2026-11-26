// SKYPOST shots: deterministic ?shot= presets so screenshots are real renders.
export function parseShotParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot') || '',
    seed: Number(q.get('seed') || 20261126),
  };
}

function placeOnRunway(game) {
  const s = game.state;
  s.pos.set(-390, 7.6, 0);
  s.heading = Math.PI / 2;
  s.pitch = 0;
  s.roll = 0;
  s.speed = 0;
  s.throttle = 0.35;
  s.onGround = true;
  s.gearDown = true;
}

function placeInAir(game, x, y, z, headingDeg, speed, throttle) {
  const s = game.state;
  s.pos.set(x, y, z);
  s.heading = headingDeg * Math.PI / 180;
  s.pitch = 0;
  s.roll = 0;
  s.speed = speed;
  s.throttle = throttle;
  s.verticalSpeed = 0;
  s.onGround = false;
  s.gearDown = true;
}

export function applyShotPreset(game, params) {
  const shot = params.shot;
  if (!shot) return null;
  if (shot === 'start') {
    game.startFlight('rings');
    placeOnRunway(game);
    game.setCamera('chase');
    game.showMenu(true);
    return 'start';
  }
  if (shot === 'play') {
    game.startFlight('rings');
    game.showMenu(false);
    const ring = game.mission.rings[0];
    const px = ring.pos.x - 260;
    const pz = ring.pos.z - 120;
    const headingToRing = Math.atan2(ring.pos.x - px, -(ring.pos.z - pz)) * 180 / Math.PI;
    placeInAir(game, px, ring.pos.y + 6, pz, headingToRing, 55, 0.72);
    game.state.gearDown = false;
    game.setCamera('chase');
    game.setAutopilot(ring.pos);
    return 'play';
  }
  if (shot === 'cockpit') {
    game.startFlight('landing');
    game.showMenu(false);
    placeInAir(game, -1250, 165, 40, 90, 46, 0.5);
    game.state.gearDown = true;
    game.setCamera('cockpit');
    game.setAutopilot(new THREE.Vector3(0, 60, 0));
    return 'cockpit';
  }
  if (shot === 'land') {
    game.startFlight('rings');
    game.showMenu(false);
    placeInAir(game, -720, 42, 8, 90, 38, 0.42);
    game.state.gearDown = true;
    game.setCamera('chase');
    game.setAutopilot(new THREE.Vector3(200, 8, 0));
    return 'land';
  }
  return null;
}

