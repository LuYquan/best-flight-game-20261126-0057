// SKYPOST plane: the Kestrel K-4 bush plane, built from primitives, and its flight model.
import { CONFIG } from './config.js';

function mat(color, emissive) {
  return new THREE.MeshLambertMaterial({
    color, emissive: emissive || 0x000000,
  });
}

function makeTailTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#c23a2e';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#f2e8d5';
  g.font = 'bold 40px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('K-4', 128, 46);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPlane() {
  const group = new THREE.Group();
  const cream = mat(0xf2e8d5);
  const red = mat(0xc23a2e);
  const dark = mat(0x2e3440);
  const glass = new THREE.MeshLambertMaterial({
    color: 0x9fd4e8, emissive: 0x2a5a72,
  });
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.8, 6.4, 12), cream);
  fuselage.rotation.z = Math.PI / 2;
  group.add(fuselage);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.8, 12), red);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 4.1;
  group.add(nose);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.5, 12), red);
  stripe.rotation.z = Math.PI / 2;
  stripe.position.x = 0.6;
  group.add(stripe);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 10), glass);
  canopy.scale.set(1.7, 0.85, 0.95);
  canopy.position.set(1.2, 0.95, 0);
  group.add(canopy);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 11.4), red);
  wing.position.set(0.4, 0.35, 0);
  group.add(wing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.24, 0.5), cream);
  wingTipL.position.set(0.4, 0.35, 5.55);
  group.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.z = -5.55;
  group.add(wingTipR);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 4.4), red);
  tail.position.set(-3.4, 0.35, 0);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.4, 0.2), red);
  fin.position.set(-3.4, 1.3, 0);
  group.add(fin);
  const tailMark = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.4),
    new THREE.MeshBasicMaterial({ map: makeTailTexture() }),
  );
  tailMark.position.set(-4.28, 1.35, 0.11);
  tailMark.rotation.y = Math.PI / 2;
  group.add(tailMark);
  const tailMark2 = tailMark.clone();
  tailMark2.position.z = -0.11;
  tailMark2.rotation.y = -Math.PI / 2;
  group.add(tailMark2);
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), dark);
  prop.add(hub);
  const bladeMat = new THREE.MeshLambertMaterial({
    color: 0x2e3440, transparent: true, opacity: 0.45,
  });
  const bladeGeo = new THREE.BoxGeometry(0.08, 3.0, 0.5);
  const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
  prop.add(blade1);
  const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
  blade2.rotation.x = Math.PI / 2;
  prop.add(blade2);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.9, 24),
    new THREE.MeshBasicMaterial({
      color: 0x888888, transparent: true, opacity: 0.10, side: THREE.DoubleSide,
    }),
  );
  disc.rotation.y = Math.PI / 2;
  prop.add(disc);
  prop.position.x = 5.1;
  group.add(prop);
  const gear = new THREE.Group();
  const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.6, 6);
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12);
  wheelGeo.rotateX(Math.PI / 2);
  for (const side of [1, -1]) {
    const leg = new THREE.Mesh(legGeo, dark);
    leg.position.set(0.9, -1.3, side * 1.5);
    gear.add(leg);
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.position.set(0.9, -2.0, side * 1.5);
    gear.add(wheel);
  }
  const noseLeg = new THREE.Mesh(legGeo, dark);
  noseLeg.position.set(3.2, -1.2, 0);
  gear.add(noseLeg);
  const noseWheel = new THREE.Mesh(wheelGeo, dark);
  noseWheel.position.set(3.2, -1.9, 0);
  gear.add(noseWheel);
  group.add(gear);
  const navL = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
  );
  navL.position.set(0.4, 0.35, 5.8);
  group.add(navL);
  const navR = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x2aff66 }),
  );
  navR.position.set(0.4, 0.35, -5.8);
  group.add(navR);
  const strobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), strobeMat);
  strobe.position.set(-4.1, 0.6, 0);
  group.add(strobe);
  group.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return { group, prop, gear, strobe, strobeMat };
}

export function createFlightState() {
  const rw = CONFIG.runway;
  return {
    pos: new THREE.Vector3(-rw.length / 2 + 60, rw.elevation + 1.6, 0),
    heading: 90 * Math.PI / 180,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    fuel: CONFIG.plane.fuelCapacity,
    verticalSpeed: 0,
    gearDown: true,
    onGround: true,
    engineOut: false,
    crashed: false,
    landed: false,
    stopped: false,
    damage: 0,
    score: 0,
    time: 0,
    prevSide: null,
  };
}

