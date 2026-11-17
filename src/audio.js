// All sound is synthesised live with Web Audio: no audio files needed.
//
//  music  - a looping event track that builds in layers (level 0..7).
//           Each revealed card raises the level; the finale switches to a full
//           "anthem" with drums and crashes.
//  sfx    - one-shot effects: build-ups, hits, the final impact, UI blips.
//
// Browsers only allow audio after a user gesture, so call sfx.init() on the first tap.

let ctx = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let reverb = null;

const MUSIC_VOL = 0.72;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);

    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(comp);

    // Big hall reverb shared by music and effects.
    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    reverb.connect(wet).connect(master);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.0001;
    musicBus.connect(master);
    musicBus.connect(reverb);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);
    sfxBus.connect(reverb);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function makeImpulse(seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

let noiseBuf = null;
function noiseBuffer() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// ---------- instrument building blocks (t = start time in ctx seconds) ----------

function env(g, t, peak, attack, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function osc(t, freq, { type = 'sine', vol = 0.2, attack = 0.005, dur = 0.5, to = null, out = sfxBus, filter = null } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(g, t, vol, attack, dur);
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    o.connect(f).connect(g);
  } else {
    o.connect(g);
  }
  g.connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(t, { dur = 0.3, vol = 0.2, type = 'highpass', freq = 1000, to = null, attack = 0.003, q = 0.8, out = sfxBus } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer();
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  env(g, t, vol, attack, dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.05);
}

const kick = (t, vol = 0.8, out = sfxBus) => {
  osc(t, 150, { vol, dur: 0.45, to: 42, out });
  osc(t, 2500, { type: 'triangle', vol: vol * 0.08, dur: 0.02, out });
};
const snare = (t, vol = 0.3, out = sfxBus) => {
  noise(t, { dur: 0.18, vol, freq: 1800, out });
  osc(t, 190, { type: 'triangle', vol: vol * 0.6, dur: 0.12, to: 140, out });
};
const hat = (t, vol = 0.05, open = false, out = sfxBus) => noise(t, { dur: open ? 0.3 : 0.05, vol, freq: 7500, out });
const crash = (t, vol = 0.25, out = sfxBus) => noise(t, { dur: 2.6, vol, freq: 4500, attack: 0.002, out });
const tom = (t, f, vol = 0.4, out = sfxBus) => osc(t, f, { vol, dur: 0.5, to: f * 0.55, out });

// Wide detuned synth chord (pads, brass-like stabs).
function chord(t, freqs, { dur = 1, vol = 0.05, attack = 0.3, cutoff = 1500, out = musicBus } = {}) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(cutoff, t);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - 0.5));
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  f.connect(g).connect(out);
  freqs.forEach((fr) => {
    [-8, 8].forEach((cents) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = fr;
      o.detune.value = cents;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  });
}

// ---------- music ----------

const N = (name) => {
  const map = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const m = name.match(/^([A-G])(b|#)?(\d)$/);
  const semis = map[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
};

// Bright motion-graphics opener score (original): punchy, uplifting, major key.
// Progression C - G - Am - F; the finale anthem lifts up a whole step (D - A - Bm - G).
const PROG = [
  { bass: N('C2'), tones: [N('C4'), N('E4'), N('G4'), N('C5')] },
  { bass: N('G1'), tones: [N('B3'), N('D4'), N('G4'), N('B4')] },
  { bass: N('A1'), tones: [N('A3'), N('C4'), N('E4'), N('A4')] },
  { bass: N('F1'), tones: [N('A3'), N('C4'), N('F4'), N('A4')] }
];
const LIFT = Math.pow(2, 2 / 12); // key change for the anthem

const BPM = 124;
const SIXTEENTH = 60 / BPM / 4;

// Arpeggio order through the 4 chord tones, and the bell hook (null = rest).
const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2];
const HOOK = [3, null, 2, null, 3, null, 1, 2, null, 2, null, 0, 1, null, 2, null];
const HOOK_ANTHEM = [3, null, 3, 2, null, 3, null, 1, 2, null, 3, null, 2, 1, 0, null];

// --- instruments ---

// Plucky synth: short note with a filter that snaps shut.
function pluck(t, f, vol, out, bright = 3200) {
  const fl = ctx.createBiquadFilter();
  fl.type = 'lowpass';
  fl.frequency.setValueAtTime(bright, t);
  fl.frequency.exponentialRampToValueAtTime(380, t + 0.22);
  const g = ctx.createGain();
  env(g, t, vol, 0.004, 0.3);
  fl.connect(g).connect(out);
  [['sawtooth', 0], ['square', 7]].forEach(([type, cents]) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = cents;
    o.connect(fl);
    o.start(t);
    o.stop(t + 0.32);
  });
}

// Bell / glockenspiel: sine plus an inharmonic partial.
function bell(t, f, vol, out) {
  osc(t, f, { vol, dur: 1.1, out });
  osc(t, f * 2.76, { vol: vol * 0.3, dur: 0.5, out });
  osc(t, f * 4.07, { vol: vol * 0.12, dur: 0.25, out });
}

const snap = (t, vol, out) => noise(t, { type: 'bandpass', freq: 2600, q: 2.5, dur: 0.07, vol, out });
const clap = (t, vol, out) => {
  [0, 0.012, 0.024].forEach((d) => noise(t + d, { type: 'bandpass', freq: 1300, q: 1.4, dur: 0.1, vol: vol * 0.6, out }));
  noise(t + 0.03, { type: 'bandpass', freq: 1300, q: 1.2, dur: 0.22, vol, out });
};
const shaker = (t, vol, out) => noise(t, { type: 'highpass', freq: 8000, dur: 0.045, vol, out });
const lightKick = (t, vol, out) => osc(t, 120, { vol, dur: 0.28, to: 50, out });

// Short whoosh into the next phrase.
function riseWhoosh(t, dur, vol, out) {
  noise(t, { type: 'bandpass', freq: 400, to: 6000, dur, vol, attack: dur * 0.95, q: 1.2, out });
}

// Levels:
//   0 silence | 1 soft pad + plucks + snaps | 2 + bass + light kick
//   3 + 4-on-floor kick, claps, shaker | 4 + bell hook | 5 + big saw chords, 16th plucks
//   6 + whooshes, octave bass, fills | 7 ANTHEM: key change up, everything bright, crashes
export const music = {
  playing: false,
  level: 0,
  step: 0,
  nextTime: 0,
  timer: null,

  start(level = 1) {
    if (!ensure()) return;
    this.level = level;
    if (this.playing) return;
    this.playing = true;
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(0.0001, t);
    musicBus.gain.exponentialRampToValueAtTime(MUSIC_VOL, t + 1);
    this.step = 0;
    this.nextTime = t + 0.05;
    this.timer = setInterval(() => this.tick(), 25);
  },

  stop(fade = 0.5) {
    if (!ctx || !this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), t);
    musicBus.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  },

  setLevel(n) {
    this.level = Math.max(0, Math.min(7, n));
  },

  // Dip the music under a reveal, then bring it back.
  duck(to = 0.2, hold = 1.2, release = 2) {
    if (!ctx || !this.playing) return;
    const t = ctx.currentTime;
    const g = musicBus.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(g.value, 0.0001), t);
    g.linearRampToValueAtTime(MUSIC_VOL * to, t + 0.2);
    g.setValueAtTime(MUSIC_VOL * to, t + hold);
    g.linearRampToValueAtTime(MUSIC_VOL, t + hold + release);
  },

  tick() {
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.schedule(this.step, this.nextTime);
      this.nextTime += SIXTEENTH;
      this.step++;
    }
  },

  schedule(step, t) {
    const L = this.level;
    if (L <= 0) return;
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const anthem = L >= 7;
    const k = anthem ? LIFT : 1;
    const c = PROG[bar % 4];
    const tones = c.tones.map((f) => f * k);
    const bass = c.bass * k;
    const out = musicBus;
    const BAR = SIXTEENTH * 16;
    const phraseEnd = bar % 4 === 3;

    // Soft pad under everything; big bright saw chords from level 5.
    if (s === 0) {
      chord(t, tones, { dur: BAR + 0.2, vol: L >= 5 ? 0.05 : 0.03, attack: L >= 5 ? 0.02 : 0.3, cutoff: L >= 5 ? 3800 : 1500, out });
    }

    // Plucky arpeggio: 8ths, then 16ths.
    if (L >= 1 && (L >= 5 || s % 2 === 0)) {
      const f = tones[ARP[s]] * (L >= 6 && s >= 8 ? 2 : 1);
      pluck(t, f, L >= 5 ? 0.06 : 0.07, out, 2400 + L * 300);
    }

    // Snaps (early) / claps (from level 3) on 2 and 4.
    if (s === 4 || s === 12) {
      if (L >= 3) clap(t, 0.32, out);
      else snap(t, 0.25, out);
    }

    // Kick: 1 and 3, then four-on-the-floor.
    if (L >= 2 && (L >= 3 ? s % 4 === 0 : s === 0 || s === 8)) lightKick(t, L >= 5 ? 0.85 : 0.65, out);
    if (L >= 5 && s % 4 === 0) kick(t, 0.55, out);

    // Bass: plucky 8ths on the off-beats, octave jumps at the top.
    if (L >= 2 && s % 2 === 0 && (L >= 3 || s % 4 === 2)) {
      osc(t, bass * (L >= 6 && s % 4 === 2 ? 2 : 1), { type: 'sawtooth', vol: 0.12, dur: SIXTEENTH * 1.6, filter: 600 + L * 80, out });
    }

    // Shaker 16ths.
    if (L >= 3) shaker(t, s % 2 ? 0.035 : 0.02, out);

    // Bell hook.
    if (L >= 4) {
      const idx = (anthem ? HOOK_ANTHEM : HOOK)[s];
      if (idx !== null) bell(t, tones[idx] * 2, anthem ? 0.09 : 0.07, out);
    }

    // Phrase end: whoosh up into the next phrase and a little snare/clap fill.
    if (L >= 6 && phraseEnd) {
      if (s === 8) riseWhoosh(t, BAR / 2, 0.16, out);
      if (s >= 12) snare(t, 0.1 + (s - 12) * 0.06, out);
    }

    // Anthem extras: crash every 2 bars, sparkly top octave.
    if (anthem) {
      if (s === 0 && bar % 2 === 0) crash(t, 0.2, out);
      if (s % 4 === 2) bell(t, tones[3] * 4, 0.025, out);
    }
  }
};

// ---------- sound effects ----------

const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
const now = () => ctx.currentTime;

export const sfx = {
  init: ensure,

  tick() {
    if (!ensure()) return;
    osc(now(), 1800 + Math.random() * 500, { type: 'square', vol: 0.012, dur: 0.03 });
  },
  blip(i = 0) {
    if (!ensure()) return;
    osc(now(), NOTES[i % NOTES.length] * 2, { type: 'triangle', vol: 0.06, dur: 0.18 });
  },
  pop() {
    if (!ensure()) return;
    osc(now(), 660, { vol: 0.1, dur: 0.25, to: 990 });
  },
  whoosh() {
    if (!ensure()) return;
    noise(now(), { type: 'bandpass', freq: 300, to: 3000, dur: 0.7, vol: 0.18, attack: 0.3 });
  },
  denied() {
    if (!ensure()) return;
    osc(now(), 160, { type: 'square', vol: 0.06, dur: 0.12, filter: 900 });
    osc(now() + 0.15, 130, { type: 'square', vol: 0.06, dur: 0.15, filter: 900 });
  },
  // Next tile is ready.
  ping() {
    if (!ensure()) return;
    const t = now();
    osc(t, N('E5'), { vol: 0.09, dur: 1.2 });
    osc(t + 0.12, N('B5'), { vol: 0.07, dur: 1.4 });
  },

  // Snare roll + riser that leads into a card reveal.
  buildup(dur = 1.3) {
    if (!ensure()) return;
    const t0 = now();
    let t = 0;
    let gap = 0.13;
    while (t < dur - 0.02) {
      const p = t / dur;
      snare(t0 + t, 0.05 + p * 0.22);
      t += gap;
      gap = Math.max(0.028, gap * 0.9);
    }
    noise(t0, { type: 'bandpass', freq: 300, to: 7000, dur, vol: 0.22, attack: dur * 0.9, q: 1.4 });
    osc(t0, 110, { type: 'sawtooth', vol: 0.07, attack: dur * 0.9, dur, to: 660, filter: 1800 });
  },

  // The hit when a card opens: drums, crash and a bright chord.
  hit(i = 0) {
    if (!ensure()) return;
    const t = now();
    kick(t, 1);
    osc(t, 55, { vol: 0.5, dur: 1.6, to: 38 });
    crash(t, 0.3);
    snare(t, 0.35);
    const roots = [N('C4'), N('D4'), N('E4'), N('F4'), N('G4'), N('A4')];
    const r = roots[i % roots.length];
    chord(t, [r, r * 1.26, r * 1.5, r * 2], { dur: 1.8, vol: 0.09, attack: 0.01, cutoff: 3200, out: sfxBus });
    osc(t + 0.02, r * 4, { vol: 0.08, dur: 1.6 });
  },

  // Build-up for the LAST card: heartbeat, rising tom roll, reverse-cymbal swell.
  buildupFinal(dur = 2.4) {
    if (!ensure()) return;
    const t0 = now();
    // Heartbeat: "lub-dub", getting faster.
    let t = 0;
    let beat = 0.62;
    while (t < dur * 0.55) {
      osc(t0 + t, 70, { vol: 0.5, dur: 0.22, to: 45 });
      osc(t0 + t + 0.16, 62, { vol: 0.35, dur: 0.2, to: 42 });
      t += beat;
      beat *= 0.86;
    }
    // Tom roll climbing into a snare roll.
    let g = 0.12;
    for (let x = dur * 0.45; x < dur - 0.02; x += g) {
      const p = (x - dur * 0.45) / (dur * 0.55);
      tom(t0 + x, 90 + p * 160, 0.2 + p * 0.25);
      snare(t0 + x, 0.08 + p * 0.25);
      g = Math.max(0.03, g * 0.88);
    }
    noise(t0, { type: 'highpass', freq: 3000, dur, vol: 0.22, attack: dur * 0.97 });
    noise(t0, { type: 'bandpass', freq: 200, to: 8000, dur, vol: 0.25, attack: dur * 0.95, q: 1.5 });
    osc(t0 + dur * 0.4, 110, { type: 'sawtooth', vol: 0.1, attack: dur * 0.55, dur: dur * 0.6, to: 880, filter: 2400 });
  },

  // The hit for the LAST card: biggest drums, a choir-like rising chord and a bell cascade.
  finalHit() {
    if (!ensure()) return;
    const t = now();
    kick(t, 1);
    kick(t + 0.012, 0.9);
    osc(t, 50, { vol: 0.65, dur: 2.4, to: 30 });
    crash(t, 0.4);
    crash(t + 0.04, 0.25);
    snare(t, 0.4);
    // Gong-like shimmer.
    [196, 293.66, 415.3].forEach((f) => osc(t, f, { type: 'triangle', vol: 0.06, dur: 3.2, to: f * 0.98 }));
    // Big major chord that blooms upward (choir/brass feel).
    chord(t, [N('C3'), N('G3'), N('C4'), N('E4'), N('G4')], { dur: 3.2, vol: 0.11, attack: 0.02, cutoff: 3500, out: sfxBus });
    chord(t + 0.35, [N('D4'), N('F#4'), N('A4'), N('D5')], { dur: 2.8, vol: 0.08, attack: 0.25, cutoff: 4500, out: sfxBus });
    // Bell cascade.
    [N('C6'), N('E6'), N('G6'), N('C7'), N('G6'), N('E6'), N('C7')].forEach((f, k) =>
      osc(t + 0.1 + k * 0.09, f, { vol: 0.05, dur: 1.6 }));
  },

  // The centre unlocks.
  charge() {
    if (!ensure()) return;
    const t = now();
    [N('C5'), N('E5'), N('G5'), N('C6')].forEach((f, k) => osc(t + k * 0.1, f, { vol: 0.08, dur: 2 }));
    noise(t, { type: 'bandpass', freq: 800, to: 5000, dur: 1.2, vol: 0.1, attack: 0.8 });
    kick(t, 0.8);
  },

  // Long, intense build before the final reveal.
  megaRiser(dur = 2.2) {
    if (!ensure()) return;
    const t0 = now();
    let t = 0;
    let gap = 0.2;
    while (t < dur - 0.02) {
      const p = t / dur;
      snare(t0 + t, 0.06 + p * 0.3);
      if (gap > 0.09) tom(t0 + t, 90 + p * 120, 0.25 + p * 0.2);
      t += gap;
      gap = Math.max(0.03, gap * 0.9);
    }
    noise(t0, { type: 'bandpass', freq: 200, to: 9000, dur, vol: 0.3, attack: dur * 0.95, q: 1.6 });
    osc(t0, 55, { type: 'sawtooth', vol: 0.12, attack: dur * 0.95, dur, to: 880, filter: 2500 });
    osc(t0, 110, { vol: 0.15, attack: dur * 0.95, dur, to: 1760 });
  },

  // Transition flash into the reveal.
  boom() {
    if (!ensure()) return;
    const t = now();
    kick(t, 1);
    osc(t, 60, { vol: 0.6, dur: 2, to: 30 });
    noise(t, { type: 'lowpass', freq: 4000, to: 150, dur: 1.4, vol: 0.3 });
  },

  // Each letter of LUMINARA'26 landing.
  thump(i = 0) {
    if (!ensure()) return;
    const t = now();
    kick(t, 0.85);
    tom(t, 160 - i * 6, 0.25);
    osc(t, NOTES[i % NOTES.length], { type: 'triangle', vol: 0.06, dur: 0.4 });
  },

  // The final "logo sting": punchy hit, bright D major chord (the anthem's key),
  // a fast pluck run up and a sparkle tail.
  impact() {
    if (!ensure()) return;
    const t = now();
    kick(t, 1);
    kick(t + 0.01, 0.8);
    osc(t, 70, { vol: 0.65, dur: 2.2, to: 30 });
    clap(t, 0.5, sfxBus);
    crash(t, 0.42);
    crash(t + 0.05, 0.22);
    noise(t, { type: 'lowpass', freq: 7000, to: 200, dur: 1.4, vol: 0.3 });
    chord(t, [N('D3'), N('A3'), N('D4'), N('F#4'), N('A4'), N('D5')], { dur: 3.2, vol: 0.12, attack: 0.01, cutoff: 5200, out: sfxBus });
    // Pluck run up the D major chord.
    [N('D4'), N('F#4'), N('A4'), N('D5'), N('F#5'), N('A5'), N('D6')].forEach((f, k) => pluck(t + 0.04 + k * 0.045, f, 0.07, sfxBus, 4200));
    // Sparkle tail.
    [N('A5'), N('D6'), N('F#6'), N('A6'), N('D7')].forEach((f, k) => bell(t + 0.35 + k * 0.08, f, 0.05, sfxBus));
    noise(t + 0.3, { type: 'highpass', freq: 9000, dur: 1.6, vol: 0.06 });
  },

  // Firework: launch whistle, pop and crackle.
  firework(delay = 0) {
    if (!ensure()) return;
    const t = now() + delay;
    osc(t, 900, { vol: 0.025, dur: 0.45, to: 2200 });
    noise(t + 0.45, { type: 'lowpass', freq: 2500, to: 300, dur: 0.5, vol: 0.22 });
    for (let k = 0; k < 7; k++) noise(t + 0.55 + k * 0.06 + Math.random() * 0.04, { dur: 0.03, vol: 0.06, freq: 5000 });
  },
  success() {
    if (!ensure()) return;
    const t = now();
    [N('C5'), N('E5'), N('G5'), N('C6')].forEach((f, k) => osc(t + k * 0.08, f, { vol: 0.07, dur: 1.8 }));
  }
};
