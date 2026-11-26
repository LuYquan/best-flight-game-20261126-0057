# best-flight-game-20261126-0057

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/LuYquan/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/LuYquan/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**SKYPOST — Island Mail Run** is a complete 3D flight game that runs offline in a desktop browser from static files. Fly the Kestrel K-4 bush plane over the Marrow Isles: thread glowing sky rings, drop mail on marked fields, and grease a precision landing on runway 27 — while fuel burns and the wind pushes back.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## How to play

Open `game/index.html` from any static server (`node serve.ts`, then http://localhost:8080) — no network request, no build step.

| Key | Action |
| --- | --- |
| Up / Down (W / S) | Pitch up / down |
| Left / Right (A / D) | Bank and turn |
| Shift / Ctrl | Throttle up / down |
| Space | Airbrake |
| F or mouse click | Drop a mail parcel |
| G | Landing gear up / down |
| C | Chase / cockpit camera |
| Mouse | Steer gently |
| R | Restart the sortie |
| P | Pause |
| M | Sound on / off |

## Missions

1. **Ring Run** — take off from runway 27, thread 8 glowing sky rings in order (fast rings pay a time bonus), then land back on the runway.
2. **Mail Drop** — carry 3 parcels to the glowing fields (North Field, Old Mill, South Meadow). Fly low and slow over a field and press F or click to drop. A bullseye pays 150 points.
3. **Precision Landing** — fly the circuit through the gold approach ring and put the Kestrel down in the touchdown zone. Soft, centred and slow scores best.

Fuel burns with throttle, and an empty tank means a dead engine — glide home. Landing needs the gear down, wings near level, a gentle descent and a speed under control. Touch down anywhere else and the sortie ends in the dirt.

## What is inside

- `game/index.html` — the page: canvas, HUD (altitude, speed, heading, vertical speed, compass strip, attitude indicator, fuel, throttle, gear) and menus.
- `game/src/config.js` — every tuning number: speeds, fuel burn, scoring.
- `game/src/random.js` — seeded random and value-noise terrain functions (deterministic island).
- `game/src/world.js` — the Marrow Isles: heightmap terrain, sea, golden-hour sky, airfield, town, trees, clouds.
- `game/src/plane.js` — the Kestrel K-4, built from primitives, and the flight state.
- `game/src/physics.js` — arcade flight: lift, stall, banked turns, wind, touchdown and crash rules.
- `game/src/input.js` — keyboard + mouse with smoothed stick feel.
- `game/src/hud.js` — instruments, compass, attitude indicator, messages and warnings.
- `game/src/audio.js` — engine, wind, ring chimes and impacts, all synthesised with WebAudio.
- `game/src/missions.js` — the three missions, rings, drop zones and scoring.
- `game/src/shots.js` — deterministic `?shot=` presets used for the screenshots.
- `game/src/main.js` — boot, game loop, cameras, state machine.
- `game/vendor/three.min.js` — Three.js r149, vendored.
- `screenshots/` — real renders of the game in a browser (see `shots.json`).

Everything is original: the island, the plane, the names, the art and the sounds were made for this entry. No network request is made while playing.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ull-n&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
<!-- __APPEND__ -->



