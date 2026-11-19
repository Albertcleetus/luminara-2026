// Sound uses recorded files (see SAMPLES below) for the music and the key reveal
// moments. Every one has a generated Web Audio fallback if its file is missing.
//
//  music  - the background track (intro + honeycomb), then the finale track
//           from level 7. Fallback: a generated track that builds in layers.
//  sfx    - one-shot effects: build-ups, hits, the final impact, UI blips.
//
// Browsers only allow audio after a user gesture, so call sfx.init() on the first tap.

let ctx = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let reverb = null;
let trackBus = null;

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

    // Recorded music tracks: same fades and ducking as musicBus, but no extra reverb.
    trackBus = ctx.createGain();
    trackBus.gain.value = 0.0001;
    trackBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);
    sfxBus.connect(reverb);

  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ---------- recorded sound files (Pixabay, free licence) ----------
// Each one is optional: if a file is missing or fails to load, the
// generated sound for that moment plays instead.
const SAMPLES = {
  bgm: 'assets/mp3/bgm.mp3',                    // intro + honeycomb background music
  finale: 'assets/mp3/finale-music.mp3',        // celebration "build and drop" after the reveal
  cardBuild: 'assets/mp3/card-buildup-b.mp3',   // riser before cards 1-5
  card6Build: 'assets/mp3/card-buildup-a.mp3',  // riser before the 6th card (played slower = deeper)
  cardHit: 'assets/mp3/card-hit.mp3',           // contains 5 different hits, one per card
  card6: 'assets/mp3/card6-hit.mp3',            // the 6th card's big hit
  finalRiser: 'assets/mp3/final-buildup.mp3',   // build-up after tapping the centre
  finalSting: 'assets/mp3/final-impact.mp3'     // the hit as LUMINARA'26 completes
};
// Measured timings inside the files (seconds).
const BGM_START = 0.02;                          // first beat
const BGM_LOOP = [26.125, 88.21];                // 28 bars, downbeat to downbeat (108 BPM)
const FINALE_DROP = 33.965;                      // the drop
const FINALE_START = FINALE_DROP - 2;            // start in the quiet break before the drop
const FINALE_LOOP = [FINALE_DROP, 100.85];       // drop to the next drop
const CARD_BUILD_PEAK = 1.6;                     // card riser tops out (and cuts) here
// The file's first hits are clean; from ~13 s on, other music plays under them,
// so only the first three are used (card 4 and 5 reuse them).
const CARD_HITS = [1.0, 5.0, 9.0, 1.0, 5.0, 9.0];
const CARD_HIT_LEN = 2.6;                        // play this much of each hit before fading
const CARD6_BUILD_PEAK = 1.78;                   // end of the 6th card riser's peak
const CARD6_BUILD_RATE = 0.75;                   // slowed down: longer and deeper
const CARD6_HIT = 25.34;                         // the big hit (silence just before it)
const CARD6_LEN = 1.5;                           // then fade out slowly, before the track's music comes in
const CARD6_FADE = 1.6;
const FINAL_BUILD_HIT = 57.5;                    // climax of the final build-up
const STING_START = 0.6;                         // short swell...
const STING_HIT = 1.04;                          // ...into the big logo hit
const TRACK_VOL = { bgm: 0.6, finale: 0.85 };

const sampleBuffers = {};
const sampleFailed = {};

// Fetch and decode all files at startup, before the first tap, so they are ready
// the moment they are needed. An offline context can decode without a user gesture.
export function preloadSamples() {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) return;
  const decoder = new OAC(2, 1, 44100);
  Object.entries(SAMPLES).forEach(([key, url]) => {
    fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(url))))
      .then((buf) => decoder.decodeAudioData(buf))
      .then((decoded) => {
        sampleBuffers[key] = decoded;
        music.sampleReady(key);
      })
      .catch(() => { sampleFailed[key] = true; music.sampleReady(key); });
  });
}

// Play part of a file. Returns the playing source, or null (so the caller can
// fall back to the generated sound) if it isn't loaded.
// `when`, `duration` and `fadeOut` are real seconds; `offset` is a position in the file.
function playSample(key, { when = 0, offset = 0, duration = null, fadeOut = 0, vol = 1, rate = 1, loop = null, fadeIn = 0, out = null } = {}) {
  const buf = sampleBuffers[key];
  if (!buf || !ensure()) return null;
  const t = ctx.currentTime + Math.max(0, when);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  if (loop) {
    src.loop = true;
    src.loopStart = loop[0];
    src.loopEnd = loop[1];
  }
  const g = ctx.createGain();
  if (fadeIn) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + fadeIn);
  } else {
    g.gain.value = vol;
  }
  src.connect(g).connect(out || master);
  src.fadeGain = g; // lets the caller fade it out early
  src.start(t, Math.max(0, offset));
  if (duration !== null) {
    if (fadeOut) {
      g.gain.setValueAtTime(vol, t + duration);
      g.gain.linearRampToValueAtTime(0.0001, t + duration + fadeOut);
    }
    src.stop(t + duration + fadeOut + 0.02);
  }
  return src;
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

// Wide "supersaw": 5 detuned saws, short or long.
function supersaw(t, freqs, { dur = 0.2, vol = 0.04, cutoff = 5000, attack = 0.005, out } = {}) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(g).connect(out);
  freqs.forEach((fr) => [-18, -8, 0, 8, 18].forEach((cents) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = fr;
    o.detune.value = cents;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 0.05);
  }));
}

// ---- Laser-show DROP (finale, level 7) ----
// D major festival drop: D - A - Bm - G.
const DROP_PROG = [
  { bass: N('D2'), chord: [N('D4'), N('F#4'), N('A4'), N('D5')], arp: [N('D5'), N('F#5'), N('A5'), N('D6')] },
  { bass: N('A1'), chord: [N('C#4'), N('E4'), N('A4'), N('C#5')], arp: [N('C#5'), N('E5'), N('A5'), N('C#6')] },
  { bass: N('B1'), chord: [N('D4'), N('F#4'), N('B4'), N('D5')], arp: [N('B4'), N('D5'), N('F#5'), N('B5')] },
  { bass: N('G1'), chord: [N('D4'), N('G4'), N('B4'), N('D5')], arp: [N('B4'), N('D5'), N('G5'), N('B5')] }
];
// Soaring lead, one bar of 16ths (index into arp, null = hold/rest).
const DROP_LEAD = [3, null, 2, null, 3, null, 1, null, 2, null, null, 1, 0, null, 1, 2];

function laserDrop(step, t, out) {
  const s = step % 16;
  const bar = Math.floor(step / 16);
  const c = DROP_PROG[bar % 4];
  const BAR = SIXTEENTH * 16;
  const phraseEnd = bar % 8 === 7;

  // Pounding four-on-the-floor + sub.
  if (s % 4 === 0) {
    kick(t, 1, out);
    osc(t, 55, { vol: 0.35, dur: 0.25, to: 40, out });
  }
  // Bouncing off-beat bass (saw + sine sub).
  if (s % 4 === 2) {
    osc(t, c.bass * 2, { type: 'sawtooth', vol: 0.12, dur: SIXTEENTH * 1.8, filter: 1100, out });
    osc(t, c.bass, { vol: 0.2, dur: SIXTEENTH * 1.8, out });
  }
  // Big off-beat chord stabs + a wide pad underneath.
  if (s % 4 === 2) supersaw(t, c.chord, { dur: 0.2, vol: 0.035, cutoff: 5200, out });
  if (s === 0) supersaw(t, c.chord, { dur: BAR, vol: 0.012, cutoff: 2600, attack: 0.15, out });
  // Clap on 2 and 4, open hats on the off-beats, 16th hats.
  if (s === 4 || s === 12) clap(t, 0.4, out);
  if (s % 4 === 2) hat(t, 0.07, true, out);
  hat(t, s % 2 ? 0.035 : 0.02, false, out);
  // Fast arpeggio sparkle.
  pluck(t, c.arp[s % 4] * (s >= 8 ? 2 : 1), 0.035, out, 5000);
  // Soaring supersaw lead.
  const li = DROP_LEAD[s];
  if (li !== null) supersaw(t, [c.arp[li]], { dur: SIXTEENTH * 2.2, vol: 0.05, cutoff: 6000, out });
  // Crash every 4 bars; riser + snare roll into each 8-bar phrase.
  if (s === 0 && bar % 4 === 0) crash(t, 0.26, out);
  if (phraseEnd) {
    if (s === 0) riseWhoosh(t, BAR, 0.18, out);
    if (s >= 8) snare(t, 0.08 + (s - 8) * 0.03, out);
  }
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

  track: null,  // the recorded track playing now: { key, src }
  wanted: null, // the track that should be playing (null when stopped)

  // A file finished loading (or failed): start the track if it was waiting for it.
  sampleReady(key) {
    if (ctx && this.wanted === key && !this.track && !this.playing) this.start(this.level);
  },

  start(level = 1) {
    if (!ensure()) return;
    this.level = level;

    // Recorded music if loaded: the background track, or the finale track from level 7.
    const want = level >= 7 ? 'finale' : 'bgm';
    if (this.track && this.track.key === want) return;
    // Still loading: start it the moment it is ready (see sampleReady).
    if (!sampleBuffers[want] && !sampleFailed[want]) {
      this.stop(0.3);
      this.wanted = want;
      return;
    }
    if (sampleBuffers[want]) {
      this.stop(0.3);
      this.wanted = want;
      const t = ctx.currentTime;
      trackBus.gain.cancelScheduledValues(t);
      trackBus.gain.setValueAtTime(1, t);
      const opts = want === 'bgm'
        ? { offset: BGM_START, loop: BGM_LOOP, fadeIn: 0.8 }
        : { offset: FINALE_START, loop: FINALE_LOOP, fadeIn: 0.15 };
      const src = playSample(want, { ...opts, vol: TRACK_VOL[want], out: trackBus });
      this.track = { key: want, src };
      return;
    }

    // Fallback: the generated music.
    this.wanted = want;
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
    if (!ctx) return;
    this.wanted = null;
    if (this.track) {
      const { src } = this.track;
      const t = ctx.currentTime;
      const g = src.fadeGain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(Math.max(g.value, 0.0001), t);
      g.exponentialRampToValueAtTime(0.0001, t + fade);
      src.stop(t + fade + 0.05);
      this.track = null;
    }
    if (!this.playing) return;
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
    if (!ctx) return;
    const t = ctx.currentTime;
    const dip = (g, full) => {
      g.cancelScheduledValues(t);
      g.setValueAtTime(Math.max(g.value, 0.0001), t);
      g.linearRampToValueAtTime(full * to, t + 0.2);
      g.setValueAtTime(full * to, t + hold);
      g.linearRampToValueAtTime(full, t + hold + release);
    };
    if (this.track) dip(trackBus.gain, 1);
    if (this.playing) dip(musicBus.gain, MUSIC_VOL);
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
    if (L >= 7) { laserDrop(step, t, musicBus); return; } // finale: laser-show drop
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

// ---------- trailer sound design helpers ----------
// Movie-trailer style building blocks: sub drops, metallic impacts, braams,
// reverse "suck-in" swells, Shepard-style risers, ticking clocks and whoosh tails.

function subDrop(t, vol = 0.7, from = 90, to = 24, dur = 2.6) {
  osc(t, from, { vol, dur, to, out: sfxBus });
}

// Metallic clang: inharmonic partials plus a bright noise strike.
function metalHit(t, base = 180, vol = 0.12) {
  [1, 2.76, 5.4, 8.93, 13.3].forEach((m, k) =>
    osc(t, base * m, { type: 'triangle', vol: vol / (1 + k * 0.6), dur: Math.max(0.3, 1.6 - k * 0.25), to: base * m * 0.995 }));
  noise(t, { type: 'bandpass', freq: 3200, q: 2, dur: 0.25, vol: vol * 1.5 });
}

// "BRAAAM": low detuned brass whose filter swells open, then closes.
function braamHit(t, freqs, vol = 0.12, dur = 2) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 4;
  f.frequency.setValueAtTime(150, t);
  f.frequency.exponentialRampToValueAtTime(1500, t + 0.3);
  f.frequency.exponentialRampToValueAtTime(260, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(g).connect(sfxBus);
  freqs.forEach((fr) => [-10, 0, 10].forEach((cents) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = fr;
    o.detune.value = cents;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 0.05);
  }));
}

// Reverse "suck-in" swell that peaks exactly at the end.
function reverseSwell(t, dur, vol = 0.25) {
  noise(t, { type: 'bandpass', freq: 400, to: 5000, dur, vol, attack: dur * 0.97, q: 0.9 });
  noise(t, { type: 'highpass', freq: 6000, dur, vol: vol * 0.6, attack: dur * 0.97 });
}

// Shepard-style riser: stacked octaves gliding up together.
function shepard(t, dur, vol = 0.08, base = 110) {
  [1, 2, 4].forEach((m, k) => {
    const f0 = base * m;
    osc(t, f0, { type: 'sawtooth', vol: vol * (k === 1 ? 1 : 0.6), attack: dur * 0.85, dur, to: f0 * 2.2, filter: 2600 });
  });
}

// Tick-tock clock that speeds up.
function ticks(t, dur, { start = 0.3, end = 0.07, vol = 0.09 } = {}) {
  let x = 0;
  let gap = start;
  let tock = false;
  while (x < dur) {
    noise(t + x, { type: 'highpass', freq: tock ? 3500 : 6000, dur: 0.025, vol });
    osc(t + x, tock ? 700 : 1100, { type: 'square', vol: vol * 0.25, dur: 0.02, filter: 3000 });
    tock = !tock;
    x += gap;
    gap = Math.max(end, gap * 0.9);
  }
}

// Air whoosh that falls away after a hit.
function whooshTail(t, vol = 0.14) {
  noise(t, { type: 'bandpass', freq: 5000, to: 300, dur: 1.3, vol, attack: 0.02, q: 1 });
}

// Quick glitchy stutter right before a hit.
function stutter(t, n = 4, gap = 0.045, vol = 0.12) {
  for (let k = 0; k < n; k++) {
    noise(t + k * gap, { type: 'bandpass', freq: 1800, q: 1, dur: gap * 0.6, vol });
    osc(t + k * gap, 110, { type: 'square', vol: vol * 0.4, dur: gap * 0.6, filter: 800 });
  }
}

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

  // ---- Card reveal (cards 1-5), trailer style ----

  // Build-up: ticking clock, Shepard riser and a reverse swell, ending in a glitch stutter.
  buildup(dur = 1.3) {
    if (!ensure()) return;
    // Recorded riser, positioned so its peak lands exactly on the card hit.
    if (playSample('cardBuild', { offset: CARD_BUILD_PEAK - dur, duration: dur + 0.03, fadeOut: 0.04 })) return;
    const t0 = now();
    ticks(t0, dur * 0.8, { start: 0.22, end: 0.06, vol: 0.08 });
    shepard(t0, dur, 0.06, 98);
    reverseSwell(t0, dur, 0.24);
    snare(t0 + dur * 0.55, 0.08);
    stutter(t0 + dur - 0.2, 4, 0.045, 0.1);
  },

  // The hit: sub drop, braam, metallic clang, crash and a whoosh tail.
  // A small bell on top climbs a step with every card.
  hit(i = 0) {
    if (!ensure()) return;
    // Recorded hit: each card gets its own one from the file.
    if (playSample('cardHit', { offset: CARD_HITS[i % CARD_HITS.length], duration: CARD_HIT_LEN, fadeOut: 0.4 })) return;
    const t = now();
    kick(t, 1);
    subDrop(t, 0.6, 85, 26, 2.2);
    noise(t, { type: 'lowpass', freq: 3000, to: 120, dur: 1.2, vol: 0.3 });
    braamHit(t, [N('D1'), N('A1'), N('D2')], 0.11, 1.8);
    metalHit(t, 150 + i * 14, 0.11);
    crash(t, 0.26);
    whooshTail(t + 0.12, 0.12);
    const roots = [N('D5'), N('E5'), N('F#5'), N('G5'), N('A5'), N('B5')];
    osc(t + 0.02, roots[i % roots.length], { vol: 0.07, dur: 1.8 });
    osc(t + 0.02, roots[i % roots.length] * 2, { vol: 0.03, dur: 1.2 });
  },

  // ---- 6th card ----

  // Longer build: heartbeat, ticking clock, rising Shepard tone and drum roll,
  // then everything cuts out for a split-second pause before the hit.
  buildupFinal(dur = 2.4) {
    if (!ensure()) return;
    const t0 = now();
    const end = dur - 0.25; // dramatic silence before the hit
    // Recorded version: only the slowed-down riser, peaking on the hit.
    const riserLen = CARD6_BUILD_PEAK / CARD6_BUILD_RATE;
    const riser = playSample('card6Build', {
      when: dur - riserLen, offset: Math.max(0, (riserLen - dur) * CARD6_BUILD_RATE),
      rate: CARD6_BUILD_RATE, duration: Math.min(dur, riserLen) + 0.03, fadeOut: 0.08
    });
    if (riser) return;
    // Generated version: heartbeat, speeding up...
    let t = 0;
    let beat = 0.6;
    while (t < end * 0.6) {
      osc(t0 + t, 70, { vol: 0.5, dur: 0.22, to: 45 });
      osc(t0 + t + 0.16, 62, { vol: 0.35, dur: 0.2, to: 42 });
      t += beat;
      beat *= 0.86;
    }
    ticks(t0, end, { start: 0.3, end: 0.05, vol: 0.09 });
    shepard(t0, end, 0.08, 82);
    reverseSwell(t0, end, 0.3);
    let g = 0.12;
    for (let x = end * 0.5; x < end - 0.02; x += g) {
      const p = (x - end * 0.5) / (end * 0.5);
      tom(t0 + x, 90 + p * 150, 0.2 + p * 0.25);
      snare(t0 + x, 0.08 + p * 0.25);
      g = Math.max(0.03, g * 0.88);
    }
    stutter(t0 + end - 0.18, 4, 0.04, 0.12);
  },

  // The biggest card hit: double impact, huge braam, two metal clangs,
  // then a hopeful major chord blooming out of it.
  finalHit() {
    if (!ensure()) return;
    // Recorded hit on its own, with a slow fade so nothing else from the track comes in.
    if (playSample('card6', { offset: CARD6_HIT, duration: CARD6_LEN, fadeOut: CARD6_FADE })) return;
    const t = now();
    kick(t, 1);
    kick(t + 0.012, 0.9);
    subDrop(t, 0.75, 95, 22, 3);
    noise(t, { type: 'lowpass', freq: 4000, to: 100, dur: 1.8, vol: 0.35 });
    braamHit(t, [N('D1'), N('A1'), N('D2'), N('F2')], 0.15, 2.6);
    metalHit(t, 140, 0.13);
    metalHit(t + 0.02, 233, 0.08);
    crash(t, 0.4);
    crash(t + 0.04, 0.22);
    whooshTail(t + 0.15, 0.15);
    // Hope: D major blooms in after the darkness.
    chord(t + 0.45, [N('D4'), N('F#4'), N('A4'), N('D5')], { dur: 2.6, vol: 0.08, attack: 0.3, cutoff: 4500, out: sfxBus });
    [N('D6'), N('F#6'), N('A6'), N('D7')].forEach((f, k) => osc(t + 0.5 + k * 0.1, f, { vol: 0.04, dur: 1.6 }));
  },

  // The centre unlocks: metallic shimmer rising over a sub swell.
  charge() {
    if (!ensure()) return;
    const t = now();
    kick(t, 0.8);
    metalHit(t, 260, 0.07);
    osc(t, 40, { vol: 0.35, attack: 0.6, dur: 1.6, to: 55 });
    [N('D5'), N('F#5'), N('A5'), N('D6')].forEach((f, k) => osc(t + k * 0.1, f, { vol: 0.07, dur: 2 }));
    noise(t, { type: 'bandpass', freq: 800, to: 6000, dur: 1.2, vol: 0.1, attack: 0.8 });
  },

  // ---- Final reveal ----

  // Long build before the finale: Shepard tone, clock, drum roll and reverse swell,
  // cutting to silence ~0.3 s before the boom.
  megaRiser(dur = 2.2) {
    if (!ensure()) return;
    // Recorded build-up, positioned so its climax lands on the boom (~0.1 s after dur).
    const lead = dur + 0.1;
    if (playSample('finalRiser', { offset: FINAL_BUILD_HIT - lead, duration: lead + 0.15, fadeOut: 0.4 })) return;
    const t0 = now();
    const end = dur - 0.3;
    ticks(t0, end, { start: 0.28, end: 0.045, vol: 0.1 });
    shepard(t0, end, 0.1, 73);
    reverseSwell(t0, end, 0.34);
    let x = 0;
    let gap = 0.2;
    while (x < end - 0.02) {
      const p = x / end;
      snare(t0 + x, 0.06 + p * 0.3);
      if (gap > 0.09) tom(t0 + x, 90 + p * 120, 0.25 + p * 0.2);
      x += gap;
      gap = Math.max(0.03, gap * 0.9);
    }
    osc(t0, 55, { type: 'sawtooth', vol: 0.1, attack: end * 0.95, dur: end, to: 440, filter: 2200 });
    stutter(t0 + end - 0.2, 5, 0.04, 0.12);
  },

  // The flash into the reveal scene: a full trailer impact.
  boom() {
    if (!ensure()) return;
    const t = now();
    kick(t, 1);
    subDrop(t, 0.7, 90, 22, 2.8);
    noise(t, { type: 'lowpass', freq: 4000, to: 120, dur: 1.6, vol: 0.32 });
    braamHit(t, [N('D1'), N('A1'), N('D2')], 0.14, 2.2);
    metalHit(t, 120, 0.12);
    crash(t, 0.3);
    whooshTail(t + 0.1, 0.14);
  },

  // Recorded epic logo sting for the finale. It starts at its dramatic silence so
  // the letters land in that silence and its big hit lands exactly on the impact.
  // Returns true if the file played (the caller then skips the generated version).
  finalSting(secondsUntilImpact) {
    if (!ensure()) return false;
    return !!playSample('finalSting', { when: secondsUntilImpact - (STING_HIT - STING_START), offset: STING_START });
  },

  // Pre-drop build while LUMINARA'26 lands letter by letter. It ends exactly
  // when the name completes, where impact() hits and the laser drop starts.
  preDrop(dur = 2.3) {
    if (!ensure()) return;
    const t0 = now();
    // Snare roll: 8ths -> 16ths -> 32nds, getting louder.
    let x = 0;
    while (x < dur - 0.03) {
      const p = x / dur;
      snare(t0 + x, 0.06 + p * 0.26);
      x += p < 0.4 ? SIXTEENTH * 2 : p < 0.75 ? SIXTEENTH : SIXTEENTH / 2;
    }
    // Rising supersaw and pitch-up synth, plus an air riser.
    supersaw(t0, [N('D3'), N('A3'), N('D4')], { dur, vol: 0.03, cutoff: 1500, attack: dur * 0.9, out: sfxBus });
    osc(t0, N('D3'), { type: 'sawtooth', vol: 0.06, attack: dur * 0.9, dur, to: N('D5'), filter: 3000 });
    riseWhoosh(t0, dur, 0.24, sfxBus);
    noise(t0, { type: 'highpass', freq: 7000, dur, vol: 0.12, attack: dur * 0.97 });
  },

  // Each letter of LUMINARA'26 landing: short punchy trailer hit.
  thump(i = 0) {
    if (!ensure()) return;
    const t = now();
    kick(t, 0.85);
    osc(t, 60, { vol: 0.3, dur: 0.5, to: 32 });
    metalHit(t, 200 + i * 9, 0.05);
    noise(t, { type: 'bandpass', freq: 1500, q: 1, dur: 0.08, vol: 0.12 });
  },

  // The final impact as LUMINARA'26 completes: the biggest hit of the show,
  // resolving into a bright D major "logo sting" that leads into the anthem.
  impact() {
    if (!ensure()) return;
    const t = now();
    kick(t, 1);
    kick(t + 0.01, 0.85);
    subDrop(t, 0.8, 100, 22, 3.2);
    noise(t, { type: 'lowpass', freq: 6000, to: 100, dur: 2, vol: 0.36 });
    braamHit(t, [N('D1'), N('A1'), N('D2'), N('F#2')], 0.16, 3);
    metalHit(t, 130, 0.13);
    metalHit(t + 0.015, 207, 0.08);
    crash(t, 0.44);
    crash(t + 0.05, 0.24);
    clap(t, 0.45, sfxBus);
    whooshTail(t + 0.15, 0.16);
    chord(t, [N('D3'), N('A3'), N('D4'), N('F#4'), N('A4'), N('D5')], { dur: 3.2, vol: 0.11, attack: 0.01, cutoff: 5200, out: sfxBus });
    [N('D4'), N('F#4'), N('A4'), N('D5'), N('F#5'), N('A5'), N('D6')].forEach((f, k) => pluck(t + 0.05 + k * 0.045, f, 0.065, sfxBus, 4200));
    [N('A5'), N('D6'), N('F#6'), N('A6'), N('D7')].forEach((f, k) => bell(t + 0.4 + k * 0.08, f, 0.05, sfxBus));
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
