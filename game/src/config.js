// SKYPOST tuning: every number that shapes how the Kestrel flies.
export const CONFIG = {
  seed: 20261126,
  world: {
    size: 4200,
    islandRadius: 1750,
    seaLevel: 0,
    maxHeight: 260,
    beachHeight: 3,
  },
  runway: {
    x: 0, z: 0,
    length: 900, width: 46,
    headingDeg: 90,
    elevation: 6,
  },
  plane: {
    stallSpeed: 26,
    maxSpeed: 78,
    cruiseSpeed: 55,
    climbRate: 9,
    sinkRate: 7,
    rollRate: 1.9,
    pitchRate: 1.05,
    throttleAccel: 13,
    drag: 0.16,
    fuelCapacity: 100,
    fuelBurn: 0.30,
    gearDownMaxSpeed: 48,
    flareSpeed: 34,
  },
  rings: { count: 8, radius: 26 },
  camera: { chaseDistance: 12.5, chaseHeight: 4.2, smoothing: 4.5 },
  scoring: {
    ring: 100,
    ringTimeBonus: 25,
    dropBullseye: 150,
    dropRing: 60,
    landingBase: 300,
    landingSoftBonus: 150,
  },
};
export const KNOTS_PER_MS = 1.94384;
export const FEET_PER_M = 3.28084;
export const DEG = Math.PI / 180;
export const WIND = { speed: 4, fromDeg: 300, gust: 1.6 };

