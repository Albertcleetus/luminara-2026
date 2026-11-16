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
export function scramble(scene, t, final, { duration = 600, delay = 0, onDone, onTick } = {}) {
  scene.time.delayedCall(delay, () => {
    let elapsed = 0;
    let last = -1;
    const ev = scene.time.addEvent({
      delay: 40, loop: true,
      callback: () => {
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
    scene.time.addEvent({
      delay: speed, repeat: final.length - 1,
      callback: () => {
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
