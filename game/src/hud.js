// SKYPOST HUD: instruments, compass, horizon, messages, menus.
import { CONFIG, FEET_PER_M, KNOTS_PER_MS } from './config.js';
import { missionStatus, nextTarget } from './missions.js';

const $ = (id) => document.getElementById(id);

function compassLabels() {
  const names = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
  let html = '';
  for (let d = 0; d < 720; d += 5) {
    const deg = d % 360;
    const label = names[deg] || (deg % 30 === 0 ? String(deg).padStart(3, '0') : '·');
    html += `<span style="display:inline-block;width:20px;text-align:center">${label}</span>`;
  }
  return html;
}

export function createHud() {
  const strip = $('compass-strip');
  strip.innerHTML = compassLabels();
  const hud = {
    alt: $('alt-value'),
    spd: $('spd-value'),
    hdg: $('hdg-value'),
    vs: $('vs-value'),
    fuelFill: $('fuel-fill'),
    fuelValue: $('fuel-value'),
    throttleFill: $('throttle-fill'),
    throttleValue: $('throttle-value'),
    gearValue: $('gear-value'),
    objectiveTitle: $('objective-title'),
    objectiveText: $('objective-text'),
    horizon: $('horizon'),
    message: $('message'),
    warning: $('warning'),
    strip,
    messageTimer: 0,
    warningText: '',
  };
  return hud;
}
export function showMessage(hud, text, seconds) {
  hud.message.textContent = text;
  hud.message.classList.add('show');
  hud.messageTimer = seconds || 2.2;
}

export function setWarning(hud, text) {
  if (text === hud.warningText) return;
  hud.warningText = text;
  hud.warning.textContent = text;
  hud.warning.classList.toggle('show', !!text);
}

function drawHorizon(hud, state) {
  const canvas = hud.horizon;
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const R = W / 2 - 4;
  g.clearRect(0, 0, W, H);
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.clip();
  g.translate(cx, cy);
  g.rotate(-state.roll);
  const pitchPx = state.pitch * 260;
  g.translate(0, pitchPx);
  g.fillStyle = '#3f8fd2';
  g.fillRect(-R - 10, -R - 10 - pitchPx, (R + 10) * 2, R + 10 + pitchPx);
  g.fillStyle = '#7a5230';
  g.fillRect(-R - 10, 0, (R + 10) * 2, R + 10);
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-R - 10, 0);
  g.lineTo(R + 10, 0);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 1;
  for (const deg of [-20, -10, 10, 20]) {
    const y = -deg * 4.4;
    const w = deg % 20 === 0 ? 34 : 20;
    g.beginPath();
    g.moveTo(-w, y);
    g.lineTo(w, y);
    g.stroke();
  }
  g.restore();
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.clip();
  g.strokeStyle = '#ffd75e';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(cx - 52, cy);
  g.lineTo(cx - 16, cy);
  g.moveTo(cx + 16, cy);
  g.lineTo(cx + 52, cy);
  g.moveTo(cx, cy - 4);
  g.lineTo(cx, cy + 4);
  g.stroke();
  g.fillStyle = '#ffd75e';
  g.beginPath();
  g.arc(cx, cy, 4, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
}
export function updateHud(hud, state, mission, world, dt) {
  const altFt = Math.max(0, Math.round((state.pos.y - CONFIG.runway.elevation) * FEET_PER_M));
  hud.alt.textContent = altFt.toLocaleString('en-US');
  hud.spd.textContent = String(Math.round(state.speed * KNOTS_PER_MS));
  const hdgDeg = ((state.heading * 180 / Math.PI) % 360 + 360) % 360;
  hud.hdg.textContent = String(Math.round(hdgDeg)).padStart(3, '0');
  const vsFpm = Math.round(state.verticalSpeed * FEET_PER_M * 60);
  hud.vs.textContent = (vsFpm >= 0 ? '+' : '') + vsFpm.toLocaleString('en-US');
  const fuelPct = Math.round(state.fuel / CONFIG.plane.fuelCapacity * 100);
  hud.fuelFill.style.width = `${fuelPct}%`;
  hud.fuelFill.classList.toggle('low', fuelPct < 25);
  hud.fuelValue.textContent = `${fuelPct}%`;
  const thrPct = Math.round(state.throttle * 100);
  hud.throttleFill.style.width = `${thrPct}%`;
  hud.throttleValue.textContent = state.engineOut ? 'OUT' : `${thrPct}%`;
  hud.gearValue.textContent = state.gearDown ? 'DOWN' : 'UP';
  hud.gearValue.style.color = state.gearDown ? '#7ef0c1' : '#ff9a3d';
  const pxPerDeg = 4;
  const stripW = 720 * pxPerDeg;
  let x = 170 - hdgDeg * pxPerDeg;
  x = ((x % stripW) - stripW) % stripW;
  hud.strip.style.transform = `translateX(${x - 360 * pxPerDeg}px)`;
  hud.objectiveTitle.textContent = `${mission.kind.toUpperCase()}  ·  SCORE ${state.score}`;
  const target = nextTarget(mission);
  const dx = target.pos.x - state.pos.x;
  const dz = target.pos.z - state.pos.z;
  const dist = Math.round(Math.hypot(dx, dz));
  hud.objectiveText.textContent = `${missionStatus(mission)}  —  ${target.label} ${dist} m`;
  drawHorizon(hud, state);
  if (hud.messageTimer > 0) {
    hud.messageTimer -= dt;
    if (hud.messageTimer <= 0) hud.message.classList.remove('show');
  }
  const gh = world.groundHeight(state.pos.x, state.pos.z);
  const clearance = state.pos.y - gh;
  const onFinal = Math.abs(state.pos.z) < 60 && state.pos.x > -1300 && state.pos.x < 500
    && Math.abs(((state.heading * 180 / Math.PI) % 360 + 360) % 360 - 90) < 35;
  let warn = '';
  if (state.crashed) warn = '';
  else if (!state.onGround && state.speed < CONFIG.plane.stallSpeed) warn = 'STALL — NOSE DOWN, POWER UP';
  else if (!state.onGround && clearance < 45 && state.verticalSpeed < -4 && !onFinal) warn = 'PULL UP — TERRAIN';
  else if (state.fuel < 20 && state.fuel > 0) warn = 'LOW FUEL — LAND SOON';
  else if (!state.gearDown && clearance < 130 && !state.onGround) warn = 'GEAR UP — LOWER GEAR TO LAND';
  setWarning(hud, warn);
}

