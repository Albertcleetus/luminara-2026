// Synthesised sci-fi sound effects (no audio files needed).
// Browsers only allow audio after a user gesture, so call sfx.init() on the first tap.

let ctx = null;
let master = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, { dur = 1.2, type = 'sine', vol = 0.2, delay = 0, attack = 0.01, to = null } = {}) {
  if (!ensure()) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise({ dur = 0.8, vol = 0.2, from = 300, to = 2500, delay = 0 } = {}) {
  if (!ensure()) return;
  const t = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

export const sfx = {
  init: ensure,
  tick() {
    tone(1800 + Math.random() * 500, { dur: 0.03, type: 'square', vol: 0.015 });
  },
  blip(i = 0) {
    tone(NOTES[i % NOTES.length] * 2, { dur: 0.12, type: 'square', vol: 0.04 });
  },
  decrypt(i = 0) {
    const f = NOTES[i % NOTES.length];
    [0, 1, 2, 3, 4].forEach((k) => tone(f * 2 * (1 + k * 0.2), { dur: 0.07, type: 'square', vol: 0.035, delay: k * 0.045 }));
    tone(f, { dur: 1.8, vol: 0.2, delay: 0.24 });
    tone(f * 1.5, { dur: 1.5, vol: 0.07, delay: 0.26 });
  },
  chime(i = 0) {
    const f = NOTES[i % NOTES.length];
    tone(f * 2, { dur: 0.08, type: 'square', vol: 0.025 });
    tone(f, { dur: 1.8, vol: 0.22, delay: 0.04 });
    tone(f * 2, { dur: 1.0, vol: 0.06, delay: 0.06 });
    tone(f * 1.5, { dur: 1.4, vol: 0.05, delay: 0.12 });
  },
  pop() {
    tone(660, { dur: 0.25, vol: 0.1, to: 990 });
  },
  open() {
    tone(300, { dur: 0.25, type: 'sine', vol: 0.12, to: 1200 });
    noise({ dur: 0.3, vol: 0.06, from: 1500, to: 5000 });
  },
  close() {
    tone(900, { dur: 0.18, type: 'sine', vol: 0.08, to: 300 });
  },
  whoosh() {
    noise({ dur: 0.7, vol: 0.18 });
  },
  glitch() {
    noise({ dur: 0.12, vol: 0.12, from: 2500, to: 6000 });
    tone(80, { dur: 0.1, type: 'square', vol: 0.05 });
  },
  denied() {
    tone(140, { dur: 0.12, type: 'sawtooth', vol: 0.1 });
    tone(140, { dur: 0.12, type: 'sawtooth', vol: 0.1, delay: 0.16 });
  },
  success() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => {
      tone(f * 2, { dur: 0.09, type: 'square', vol: 0.03, delay: k * 0.08 });
      tone(f, { dur: 2.2, vol: 0.11, delay: k * 0.08 });
    });
  },
  riser() {
    tone(110, { dur: 1.9, type: 'sawtooth', vol: 0.06, attack: 1.6, to: 880 });
    tone(220, { dur: 1.9, type: 'sine', vol: 0.12, attack: 1.6, to: 1760 });
    noise({ dur: 1.9, vol: 0.2, from: 200, to: 6000 });
  },
  boom() {
    tone(90, { dur: 1.6, vol: 0.5, to: 35 });
    noise({ dur: 1.2, vol: 0.25, from: 4000, to: 200 });
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, k) => tone(f, { dur: 3.5, vol: 0.08, delay: 0.05 + k * 0.04 }));
  }
};
