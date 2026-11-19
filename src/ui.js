import { COLORS, CSS, FONT } from './theme.js';

const RAD = Math.PI / 180;

// Centred text with theme defaults.
export function addText(scene, x, y, str, opts = {}) {
  const {
    font = 'body', size = 32, color = CSS.ink, weight = 'normal',
    spacing = 0, align = 'center', wrap = 0, lineSpacing = 0
  } = opts;
  const style = { fontFamily: FONT[font], fontSize: `${size}px`, color, fontStyle: weight, align };
  if (wrap) style.wordWrap = { width: wrap, useAdvancedWrap: true };
  const t = scene.add.text(x, y, str, style).setOrigin(0.5);
  if (spacing && t.setLetterSpacing) t.setLetterSpacing(spacing);
  if (lineSpacing) t.setLineSpacing(lineSpacing);
  return t;
}

// Shrink a text's font size until `str` fits within maxWidth. Leaves the text empty.
export function fitFontSize(t, str, maxWidth, baseSize) {
  let size = baseSize;
  t.setFontSize(size).setText(str);
  while (t.width > maxWidth && size > 12) {
    size -= 2;
    t.setFontSize(size);
  }
  t.setText('');
  return size;
}

// Flat-topped hexagon corner points.
export function hexPoints(r, ox = 0, oy = 0) {
  const pts = [];
  for (let i = 0; i < 6; i++) pts.push({ x: ox + r * Math.cos(60 * i * RAD), y: oy + r * Math.sin(60 * i * RAD) });
  return pts;
}

export function polar(r, deg) {
  return { x: r * Math.cos(deg * RAD), y: r * Math.sin(deg * RAD) };
}

export function strokeArc(g, r, a0, a1, width, color, alpha) {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.arc(0, 0, r, a0 * RAD, a1 * RAD, false);
  g.strokePath();
}

// Rectangle with two cut corners (top-left, bottom-right).
export function chamferPoints(x, y, w, h, cut) {
  return [
    { x: x + cut, y }, { x: x + w, y }, { x: x + w, y: y + h - cut },
    { x: x + w - cut, y: y + h }, { x, y: y + h }, { x, y: y + cut }
  ];
}

// L-shaped corner brackets around a rectangle.
export function brackets(g, x, y, w, h, len, width, color, alpha) {
  g.lineStyle(width, color, alpha);
  [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([cx, cy, sx, sy]) => {
    g.lineBetween(cx, cy, cx + len * sx, cy);
    g.lineBetween(cx, cy, cx, cy + len * sy);
  });
}

// Text version of the Naipunnya logo. Swap for the real PNG when available.
export function addLogo(scene, x, y, scale = 1) {
  const c = scene.add.container(x, y);
  const name = addText(scene, 0, 0, 'Naipunnya', { size: 76, weight: '600', color: CSS.teal });
  const reg = addText(scene, name.width / 2 + 14, -26, '®', { size: 26, weight: '600', color: CSS.navy });
  const star = addText(scene, 34, -62, '★', { size: 30, color: CSS.orange });
  const tag = addText(scene, 0, 58, 'To reach the unreachable', { size: 24, color: '#3B3F4F' });
  const auto = addText(scene, 0, 96, '(AUTONOMOUS)', { size: 24, weight: '600', color: CSS.orange });
  c.add([name, reg, star, tag, auto]);
  c.setScale(scale);
  return c;
}

// Decode effect: random glyphs resolve left-to-right into the final text.
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$/<>*+=';
// A text that was destroyed (e.g. its popup closed early) can't be written to.
const alive = (t) => t && t.active && t.scene;

export function scramble(scene, t, final, { duration = 600, delay = 0, onDone, onTick } = {}) {
  scene.time.delayedCall(delay, () => {
    if (!alive(t)) return;
    let elapsed = 0;
    let last = -1;
    const ev = scene.time.addEvent({
      delay: 40, loop: true,
      callback: () => {
        if (!alive(t)) { ev.remove(); return; }
        elapsed += 40;
        const p = Math.min(1, elapsed / duration);
        const n = Math.floor(p * final.length);
        let s = final.slice(0, n);
        for (let i = n; i < final.length; i++) {
          const ch = final[i];
          s += ch === ' ' || ch === '\n' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        t.setText(s);
        if (onTick && n !== last) { last = n; onTick(n); }
        if (p >= 1) {
          t.setText(final);
          ev.remove();
          if (onDone) onDone();
        }
      }
    });
  });
}

// Plain typewriter.
export function typeOut(scene, t, final, { speed = 30, delay = 0, onDone, onTick } = {}) {
  let i = 0;
  scene.time.delayedCall(delay, () => {
    const ev = scene.time.addEvent({
      delay: speed, repeat: final.length - 1,
      callback: () => {
        if (!alive(t)) { ev.remove(); return; }
        i++;
        t.setText(final.slice(0, i));
        if (onTick) onTick(i);
        if (i === final.length && onDone) onDone();
      }
    });
  });
}

// Thin rotating HUD rings (subtle tech accent on the light theme).
export function makeRings(scene, x, y, { radius = 300, color = COLORS.navy, alpha = 1 } = {}) {
  const c = scene.add.container(x, y).setAlpha(alpha);
  const a = scene.add.graphics();
  a.lineStyle(2, color, 0.25);
  a.strokeCircle(0, 0, radius);
  [[200, 250], [20, 70]].forEach(([s, e]) => strokeArc(a, radius + 14, s, e, 3, color, 0.45));

  const ticks = scene.add.graphics();
  for (let i = 0; i < 90; i++) {
    const long = i % 9 === 0;
    const p1 = polar(radius - (long ? 22 : 12), i * 4);
    const p2 = polar(radius - 4, i * 4);
    ticks.lineStyle(long ? 3 : 1.5, color, long ? 0.45 : 0.2);
    ticks.lineBetween(p1.x, p1.y, p2.x, p2.y);
  }

  const dashes = scene.add.graphics();
  for (let i = 0; i < 40; i++) strokeArc(dashes, radius - 40, i * 9, i * 9 + 5, 3, COLORS.red, 0.3);

  c.add([a, ticks, dashes]);
  const tweens = [
    scene.tweens.add({ targets: a, angle: 360, duration: 60000, repeat: -1 }),
    scene.tweens.add({ targets: ticks, angle: -360, duration: 90000, repeat: -1 }),
    scene.tweens.add({ targets: dashes, angle: 360, duration: 40000, repeat: -1 })
  ];
  return { c, tweens };
}

// ---------- ceremonial accents (gold) ----------

// Small diamond.
function diamond(g, x, y, r) {
  g.fillPoints([{ x, y: y - r }, { x: x + r, y }, { x, y: y + r }, { x: x - r, y }], true);
}

// A small spiral scroll (filigree) starting at the line and curling inward.
function scroll(g, cx, cy, r, sx, sy) {
  const pts = [];
  for (let a = 0; a <= Math.PI * 2.2; a += 0.15) {
    const rr = r * (1 - a / (Math.PI * 2.6));
    pts.push({ x: cx + sx * (Math.cos(a + Math.PI) * rr + r * 0.2), y: cy + sy * Math.sin(a + Math.PI) * rr });
  }
  g.strokePoints(pts, false);
}

// Gold divider: a fine line fading out to each side, with a diamond in the middle.
export function ornament(scene, x, y, w, { color = COLORS.goldLine, alpha = 1, accent = COLORS.red } = {}) {
  const g = scene.add.graphics({ x, y });
  const half = w / 2;
  const steps = 24;
  for (let k = 0; k < steps; k++) {
    const a = alpha * (1 - k / steps);
    const x0 = 48 + (half - 48) * (k / steps);
    const x1 = 48 + (half - 48) * ((k + 1) / steps);
    g.lineStyle(2, color, a);
    g.lineBetween(x0, 0, x1, 0);
    g.lineBetween(-x0, 0, -x1, 0);
  }
  g.fillStyle(color, alpha);
  diamond(g, 0, 0, 11);
  g.fillStyle(accent, alpha);
  diamond(g, 0, 0, 5);
  // Filigree: little scrolls curling up and down on both sides of the diamond.
  g.lineStyle(2, color, alpha);
  [1, -1].forEach((sx) => [1, -1].forEach((sy) => scroll(g, sx * 34, sy * 9, 9, sx, sy)));
  g.fillStyle(color, alpha * 0.8);
  diamond(g, 58, 0, 4);
  diamond(g, -58, 0, 4);
  return g;
}

// Fine double-line gold frame with diamond corners.
export function goldFrame(g, x, y, w, h, { color = COLORS.goldLine, alpha = 0.6, gap = 8 } = {}) {
  g.lineStyle(2, color, alpha);
  g.strokeRect(x, y, w, h);
  g.lineStyle(1, color, alpha * 0.6);
  g.strokeRect(x + gap, y + gap, w - gap * 2, h - gap * 2);
  g.fillStyle(color, alpha);
  [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx, cy]) => diamond(g, cx, cy, 9));
  return g;
}

// Gold glints that appear, spin a little and fade, at random spots inside an area.
export function twinkleStars(scene, { x = 0, y = 0, w = 1920, h = 1080, every = 400, size = 0.35, tints = [COLORS.gold, 0xffffff, COLORS.goldLight], depth = 0 } = {}) {
  return scene.time.addEvent({
    delay: every, loop: true,
    callback: () => {
      const s = scene.add.image(x + Math.random() * w, y + Math.random() * h, 'star')
        .setTint(tints[Math.floor(Math.random() * tints.length)]).setScale(0).setDepth(depth)
        .setAngle(Math.random() * 45);
      const peak = size * (0.6 + Math.random() * 0.8);
      scene.tweens.add({
        targets: s, scale: peak, angle: s.angle + 45, duration: 450, yoyo: true, ease: 'Sine.easeInOut',
        onComplete: () => s.destroy()
      });
    }
  });
}

// A burst of glints around a point (for a reveal moment).
export function glintBurst(scene, x, y, { count = 8, radius = 170, size = 0.5, depth = 30 } = {}) {
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + Math.random() * 0.4;
    const d = radius * (0.7 + Math.random() * 0.5);
    const s = scene.add.image(x + Math.cos(a) * d, y + Math.sin(a) * d, 'star')
      .setTint(k % 2 ? COLORS.gold : 0xffffff).setScale(0).setDepth(depth);
    scene.tweens.add({
      targets: s, scale: size * (0.7 + Math.random() * 0.6), angle: 90, duration: 380, delay: k * 45,
      yoyo: true, hold: 120, ease: 'Sine.easeOut', onComplete: () => s.destroy()
    });
  }
}

// Soft golden light that passes behind a title now and then.
export function lightSweep(scene, x, y, w, { every = 5000, delay = 800, scaleY = 1.2, alpha = 0.55, depth = -1, tint = COLORS.goldLight } = {}) {
  const run = () => {
    const s = scene.add.image(x - w / 2, y, 'glow').setTint(tint).setScale(0.9, scaleY).setAlpha(0).setDepth(depth);
    scene.tweens.add({ targets: s, x: x + w / 2, duration: 1600, ease: 'Sine.easeInOut', onComplete: () => s.destroy() });
    scene.tweens.add({ targets: s, alpha, duration: 800, yoyo: true, ease: 'Sine.easeInOut' });
  };
  scene.time.delayedCall(delay, run);
  return scene.time.addEvent({ delay: every, loop: true, callback: run });
}

// ---------- reference-style tech accents ----------

// Fingerprint made of broken concentric loops (drawn around 0,0).
export function drawFingerprint(g, { color = COLORS.tech, alpha = 1, width = 3, rings = 7, size = 1 } = {}) {
  g.lineStyle(width, color, alpha);
  for (let k = 0; k < rings; k++) {
    const rx = (8 + k * 6.5) * size;
    const ry = rx * 1.3;
    // Each loop has a gap at the bottom and one random-ish break.
    const a0 = -55 + k * 4;
    const a1 = 235 - k * 5;
    const brk = 10 + ((k * 67) % 200);
    const seg = (from, to) => {
      const pts = [];
      for (let a = from; a <= to; a += 6) pts.push({ x: Math.cos(a * RAD) * rx, y: -Math.sin(a * RAD) * ry + 4 * size });
      if (pts.length > 1) g.strokePoints(pts, false);
    };
    seg(a0, brk - 8);
    seg(brk + 8, a1);
  }
}

// Rotating holographic dot globe. Returns { g, update(dt) }.
export function dotGlobe(scene, x, y, radius, { color = COLORS.tech, alpha = 0.5, dots = 900, speed = 0.25 } = {}) {
  const g = scene.add.graphics({ x, y });
  // Points on a sphere (Fibonacci lattice); some get "land" brightness from a simple noise.
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < dots; i++) {
    const yy = 1 - (i / (dots - 1)) * 2;
    const r = Math.sqrt(1 - yy * yy);
    const th = golden * i;
    const px = Math.cos(th) * r;
    const pz = Math.sin(th) * r;
    const land = Math.sin(px * 5.1 + yy * 2.3) + Math.cos(pz * 4.3 - yy * 3.7) + Math.sin((px + pz) * 3.1) > 0.9;
    pts.push({ x: px, y: yy, z: pz, land });
  }
  let rot = 0;
  const draw = () => {
    g.clear();
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const tilt = 0.35;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    for (const p of pts) {
      const x1 = p.x * c + p.z * s;
      const z1 = -p.x * s + p.z * c;
      const y1 = p.y * ct - z1 * st;
      const z2 = p.y * st + z1 * ct;
      if (z2 < -0.15) continue; // back side hidden
      const depth = (z2 + 1) / 2;
      g.fillStyle(color, alpha * (p.land ? 1 : 0.35) * (0.3 + depth * 0.7));
      g.fillCircle(x1 * radius, y1 * radius, (p.land ? 2.6 : 1.6) * (0.6 + depth * 0.5));
    }
    // Orbit ring.
    g.lineStyle(2, color, alpha * 0.5);
    g.strokeEllipse(0, radius * 0.05, radius * 2.7, radius * 0.55);
  };
  draw();
  const ev = scene.time.addEvent({ delay: 33, loop: true, callback: () => { rot += speed * 0.033; draw(); } });
  return { g, ev };
}

// Circuit-board traces: right-angle / 45° lines ending in small nodes, drawn in
// over `drawIn` ms, then small light pulses travel along them now and then.
// paths: arrays of [x, y] points.
export function circuitTraces(scene, paths, { color = COLORS.tech, alpha = 0.5, width = 2, drawIn = 1200, delay = 0, pulseEvery = 700, pulseTint = COLORS.tech, depth = 0 } = {}) {
  const g = scene.add.graphics().setDepth(depth);
  const segs = paths.map((p) => {
    let total = 0;
    const lens = [];
    for (let i = 1; i < p.length; i++) {
      const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      lens.push(l);
      total += l;
    }
    return { p, lens, total };
  });
  const pointAt = (s, d) => {
    for (let i = 0; i < s.lens.length; i++) {
      if (d <= s.lens[i]) {
        const f = d / s.lens[i];
        const a = s.p[i];
        const b = s.p[i + 1];
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
      d -= s.lens[i];
    }
    return s.p[s.p.length - 1];
  };
  const draw = (f) => {
    g.clear();
    segs.forEach((s) => {
      const d = s.total * f;
      const pts = [s.p[0]];
      let acc = 0;
      for (let i = 0; i < s.lens.length; i++) {
        if (acc + s.lens[i] <= d) { pts.push(s.p[i + 1]); acc += s.lens[i]; } else { pts.push(pointAt(s, d)); break; }
      }
      g.lineStyle(width, color, alpha);
      g.strokePoints(pts.map(([x, y]) => ({ x, y })), false);
      // Small via at the start, ring node at the end once reached.
      g.fillStyle(color, alpha);
      g.fillCircle(s.p[0][0], s.p[0][1], 3);
      if (f >= 1) {
        const e = s.p[s.p.length - 1];
        g.lineStyle(width, color, alpha);
        g.strokeCircle(e[0], e[1], 6);
        g.fillCircle(e[0], e[1], 2.5);
      }
    });
  };
  const prog = { f: 0 };
  draw(0);
  scene.tweens.add({ targets: prog, f: 1, duration: drawIn, delay, ease: 'Cubic.easeOut', onUpdate: () => draw(prog.f) });

  // Light pulses running along random traces.
  scene.time.delayedCall(delay + drawIn, () => {
    scene.time.addEvent({
      delay: pulseEvery, loop: true,
      callback: () => {
        const s = segs[Math.floor(Math.random() * segs.length)];
        const dot = scene.add.image(s.p[0][0], s.p[0][1], 'spark').setTint(pulseTint).setScale(0.45).setDepth(depth + 1);
        const t = { d: 0 };
        scene.tweens.add({
          targets: t, d: s.total, duration: s.total * 2.2, ease: 'Sine.easeIn',
          onUpdate: () => { const [x, y] = pointAt(s, t.d); dot.setPosition(x, y); },
          onComplete: () => scene.tweens.add({ targets: dot, scale: 1, alpha: 0, duration: 250, onComplete: () => dot.destroy() })
        });
      }
    });
  });
  return g;
}

// Mirror a set of left-side paths to the right side of a 1920-wide screen.
export const mirrorPaths = (paths) => paths.map((p) => p.map(([x, y]) => [1920 - x, y]));
