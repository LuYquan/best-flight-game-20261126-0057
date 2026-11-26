// SKYPOST physics: arcade flight — lift, drag, bank, stall, wind, ground.
import { CONFIG, DEG, WIND } from './config.js';
import { groundHeight, isOnRunway } from './world.js';

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a, b, t) { return a + (b - a) * t; }

export function forwardVector(heading) {
  return { x: Math.sin(heading), z: -Math.cos(heading) };
}

export function stepFlight(state, input, dt, world) {
  const p = CONFIG.plane;
  state.time += dt;
  if (state.crashed || state.stopped) return;
  const hasFuel = state.fuel > 0;
  state.engineOut = !hasFuel;
  if (hasFuel) {
    state.fuel = Math.max(0, state.fuel - (0.05 + state.throttle * p.fuelBurn) * dt);
  }
  const thrust = state.engineOut ? 0 : state.throttle;
  state.speed += thrust * p.throttleAccel * dt;
  state.speed -= state.speed * p.drag * dt;
  if (state.onGround) {
    state.speed -= (input.brake ? 16 : 4) * dt;
    if (state.speed < 0) state.speed = 0;
  }
  if (state.speed > p.maxSpeed) state.speed = p.maxSpeed;
  const targetRoll = input.roll * 0.85;
  const targetPitch = input.pitch * 0.6;
  const rollRate = state.onGround ? 0 : p.rollRate;
  const pitchRate = p.pitchRate;
  state.roll += clamp(targetRoll - state.roll, -rollRate * dt, rollRate * dt);
  state.pitch += clamp(targetPitch - state.pitch, -pitchRate * dt, pitchRate * dt);
  const flying = !state.onGround;
  if (flying) {
    const turnAuthority = clamp(state.speed / p.cruiseSpeed, 0.15, 1);
    state.heading += state.roll * 0.55 * turnAuthority * dt;
  }
  const stalled = state.speed < p.stallSpeed;
  let targetVs = 0;
  if (flying) {
    targetVs = Math.sin(state.pitch) * state.speed * 0.95;
    if (stalled) targetVs -= p.sinkRate * 1.6;
    else targetVs -= p.sinkRate * 0.25;
    if (state.speed < p.stallSpeed * 0.7) targetVs -= 4;
  }
  state.verticalSpeed += (targetVs - state.verticalSpeed) * Math.min(1, dt * 2.2);
  const fwd = forwardVector(state.heading);
  const gust = Math.sin(state.time * 0.5 + state.pos.x * 0.002) * WIND.gust;
  const windX = Math.sin((WIND.fromDeg + 180) * DEG) * (WIND.speed + gust);
  const windZ = -Math.cos((WIND.fromDeg + 180) * DEG) * (WIND.speed + gust);
  state.pos.x += (fwd.x * state.speed + windX) * dt;
  state.pos.z += (fwd.z * state.speed + windZ) * dt;
  state.pos.y += state.verticalSpeed * dt;
  const gh = groundHeight(state.pos.x, state.pos.z);
  const clearance = state.pos.y - gh;
  if (state.onGround) {
    state.pos.y = gh + 1.6;
    state.verticalSpeed = 0;
    if (state.speed > p.stallSpeed + 6 && state.pitch > 0.08 && !state.engineOut) {
      state.onGround = false;
      state.pos.y += 0.5;
    }
  } else if (clearance <= 1.6) {
    resolveTouchdown(state, gh, dt);
  }
  if (Math.abs(state.pos.x) > 3200 || Math.abs(state.pos.z) > 3200) {
    state.crashed = true;
    state.damage = 100;
  }
}

function resolveTouchdown(state, gh, dt) {
  const p = CONFIG.plane;
  const onRw = isOnRunway(state.pos.x, state.pos.z);
  const vs = state.verticalSpeed;
  const gentle = vs > -7 && Math.abs(state.roll) < 0.3 && state.speed < p.gearDownMaxSpeed + 14;
  state.pos.y = gh + 1.6;
  state.touchdownVs = vs;
  state.touchdownSpeed = state.speed;
  if (onRw && gentle && state.gearDown) {
    state.onGround = true;
    state.landed = true;
    state.verticalSpeed = 0;
    state.pitch = 0;
    state.roll *= 0.3;
    if (vs < -3.5) state.damage += 12;
  } else if (onRw && gentle && !state.gearDown) {
    state.crashed = true;
    state.damage = 100;
  } else {
    state.crashed = true;
    state.damage = 100;
  }
}
// __APPEND__
