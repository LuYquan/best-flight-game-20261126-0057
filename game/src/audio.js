// SKYPOST audio: every sound is synthesised with WebAudio — no audio files.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;
  let windSrc = null;
  let windGain = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) {
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return;
    }
    started = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'square';
    engineOsc2.frequency.value = 28;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
    engineOsc2.start();
    const noiseLen = ctx.sampleRate * 2;
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) data[i] = Math.random() * 2 - 1;
    windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuf;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 480;
    windFilter.Q.value = 0.6;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    windSrc.start();
  }

  function setEngine(throttle, speed, onGround) {
    if (!ctx || !engineOsc) return;
    const t = ctx.currentTime;
    const rpm = 42 + throttle * 95 + speed * 0.35;
    engineOsc.frequency.setTargetAtTime(rpm, t, 0.08);
    engineOsc2.frequency.setTargetAtTime(rpm * 0.5, t, 0.08);
    engineFilter.frequency.setTargetAtTime(240 + throttle * 900, t, 0.1);
    const vol = onGround ? 0.05 + throttle * 0.10 : 0.04 + throttle * 0.12;
    engineGain.gain.setTargetAtTime(vol, t, 0.1);
    windGain.gain.setTargetAtTime(Math.min(0.14, speed * 0.0016), t, 0.15);
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
  function chime() {
    tone(880, 0.16, 'sine', 0.25, 0);
    tone(1318, 0.22, 'sine', 0.22, 0.09);
    tone(1760, 0.3, 'sine', 0.16, 0.18);
  }
  function thud() {
    tone(90, 0.25, 'sine', 0.5, 0, 45);
    tone(55, 0.3, 'triangle', 0.35, 0.02, 30);
  }
  function crash() {
    tone(160, 0.7, 'sawtooth', 0.4, 0, 40);
    tone(70, 0.9, 'square', 0.3, 0.05, 28);
    tone(1200, 0.2, 'sine', 0.12, 0, 300);
  }
  function fanfare() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'triangle', 0.22, i * 0.12));
  }
  function beep() { tone(1046, 0.12, 'square', 0.12, 0); }
  function drop() { tone(620, 0.12, 'sine', 0.25, 0, 320); }
  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = muted ? 0 : 0.5;
  }
  return {
    ensure, setEngine, chime, thud, crash, fanfare, beep, drop, setMuted,
    get isMuted() { return muted; },
  };
}

