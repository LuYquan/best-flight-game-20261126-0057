// SKYPOST input: keyboard + mouse, with smooth stick feel.
export function createInput() {
  const keys = new Set();
  const state = {
    keys,
    pitch: 0,
    roll: 0,
    throttle: 0,
    brake: false,
    mouseX: 0,
    mouseY: 0,
    mouseActive: false,
    dropPressed: false,
    gearPressed: false,
    cameraPressed: false,
    restartPressed: false,
    pausePressed: false,
    mutePressed: false,
    anyPressed: false,
  };
  const down = (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    state.anyPressed = true;
    if (e.code === 'KeyF') state.dropPressed = true;
    if (e.code === 'KeyG') state.gearPressed = true;
    if (e.code === 'KeyC') state.cameraPressed = true;
    if (e.code === 'KeyR') state.restartPressed = true;
    if (e.code === 'KeyP' || e.code === 'Escape') state.pausePressed = true;
    if (e.code === 'KeyM') state.mutePressed = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  };
  const up = (e) => { keys.delete(e.code); };
  const onMouseMove = (e) => {
    state.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    state.mouseActive = true;
  };
  const onMouseDown = (e) => {
    if (e.button === 0) state.dropPressed = true;
    state.anyPressed = true;
  };
  const onBlur = () => { keys.clear(); };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('blur', onBlur);
  state.detach = () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('blur', onBlur);
  };
  function readAxes() {
    let pitchIn = 0;
    let rollIn = 0;
    if (keys.has('ArrowUp') || keys.has('KeyW')) pitchIn += 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) pitchIn -= 1;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) rollIn -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) rollIn += 1;
    if (state.mouseActive && !keys.has('ArrowLeft') && !keys.has('ArrowRight')
      && !keys.has('KeyA') && !keys.has('KeyD')) {
      rollIn += state.mouseX * 0.7;
    }
    if (state.mouseActive && !keys.has('ArrowUp') && !keys.has('ArrowDown')
      && !keys.has('KeyW') && !keys.has('KeyS')) {
      pitchIn -= state.mouseY * 0.55;
    }
    return { pitchIn, rollIn };
  }

  function update(dt) {
    const { pitchIn, rollIn } = readAxes();
    const k = Math.min(1, dt * 7);
    state.pitch += (pitchIn - state.pitch) * k;
    state.roll += (rollIn - state.roll) * k;
    if (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Equal')) {
      state.throttle = Math.min(1, state.throttle + dt * 0.55);
    }
    if (keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('Minus')) {
      state.throttle = Math.max(0, state.throttle - dt * 0.55);
    }
    state.brake = keys.has('Space');
  }
  function consume(name) {
    const v = state[name];
    state[name] = false;
    return v;
  }
  state.update = update;
  state.consume = consume;
  return state;
}

