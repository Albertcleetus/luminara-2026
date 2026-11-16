import { Scene } from 'phaser';
import { COLORS, CSS, EVENT } from '../theme.js';
import { addLogo, addText, chamferPoints, makeRings, scramble } from '../ui.js';
import { sfx } from '../audio.js';

// The programme-name reveal, then the final event card that stays on screen.
// (Later this can play a Remotion-rendered MP4 before the final card.)
export class Reveal extends Scene {
  constructor() {
    super('Reveal');
  }

  create() {
    // Light rays, warm glow and thin HUD rings behind the title.
    const rays = this.add.image(960, 440, 'rays').setTint(COLORS.gold).setScale(2.4).setAlpha(0);
    this.tweens.add({ targets: rays, alpha: 0.35, duration: 1200, delay: 200 });
    this.tweens.add({ targets: rays, angle: 360, duration: 90000, repeat: -1 });
    const glow = this.add.image(960, 440, 'glow').setTint(0xffd27a).setScale(7).setAlpha(0);
    this.tweens.add({ targets: glow, alpha: 0.85, duration: 1200 });
    const rings = makeRings(this, 960, 440, { radius: 520, alpha: 0 });
    this.tweens.add({ targets: rings.c, alpha: 0.7, duration: 1500 });

    this.add.particles(0, 0, 'spark', {
      x: { min: 0, max: 1920 }, y: 1110, speedY: { min: -60, max: -170 }, speedX: { min: -25, max: 25 },
      lifespan: 8000, scale: { start: 0.55, end: 0.1 }, alpha: { start: 0.9, end: 0 },
      tint: [COLORS.gold, COLORS.orange, COLORS.red], frequency: 110
    });
    this.burster = this.add.particles(0, 0, 'spark', {
      speed: { min: 120, max: 420 }, lifespan: 1000, scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [COLORS.gold, COLORS.orange, 0xffffff], emitting: false
    });

    // Light streak that the title appears on.
    const streak = this.add.image(960, 440, 'glow').setTint(COLORS.orange).setScale(0, 0.12).setAlpha(0.8);
    this.tweens.add({ targets: streak, scaleX: 15, duration: 800, delay: 300, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: streak, alpha: 0.25, duration: 1000, delay: 1300 });

    // Title group: LUMINARA'26 decoded letter by letter + subtitle + tagline.
    this.group = this.add.container(960, 440);
    const chars = [...EVENT.name];
    const letters = chars.map((ch) => addText(this, 0, 0, ch, { font: 'head', size: 220, weight: 'bold', color: CSS.red }));
    const gap = 6;
    const total = letters.reduce((s, t) => s + t.width, 0) + gap * (letters.length - 1);
    let x = -total / 2;
    letters.forEach((t, k) => {
      t.x = x + t.width / 2;
      x += t.width + gap;
      t.setText('');
      this.group.add(t);
      const start = 700 + k * 100;
      this.time.delayedCall(start, () => {
        sfx.blip(k);
        this.burster.explode(12, 960 + t.x, 440);
        t.setScale(1.6);
        this.tweens.add({ targets: t, scale: 1, duration: 350, ease: 'Back.easeOut' });
      });
      scramble(this, t, chars[k], { delay: start, duration: 300 });
    });
    const lettersDone = 700 + letters.length * 100 + 300;

    const subtitle = addText(this, 0, 175, EVENT.subtitle, { font: 'head', size: 84, weight: 'bold', color: CSS.navy, spacing: 6 }).setAlpha(0);
    const tagline = addText(this, 0, 262, EVENT.tagline, { font: 'head', size: 40, weight: '500', color: CSS.red, spacing: 4 }).setAlpha(0);
    this.group.add([subtitle, tagline]);
    this.tweens.add({ targets: subtitle, alpha: 1, y: 155, duration: 700, delay: lettersDone, ease: 'Cubic.easeOut', onStart: () => sfx.success() });
    this.tweens.add({ targets: tagline, alpha: 1, y: 240, duration: 700, delay: lettersDone + 450, ease: 'Cubic.easeOut' });

    this.time.delayedCall(lettersDone + 3000, () => this.showDetails());

    const flash = this.add.rectangle(960, 540, 1920, 1080, 0xffffff).setDepth(1000);
    this.tweens.add({ targets: flash, alpha: 0, duration: 1100, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
  }

  showDetails() {
    sfx.whoosh();
    this.tweens.add({ targets: this.group, y: 215, scale: 0.78, duration: 1000, ease: 'Cubic.easeInOut' });

    const logo = addLogo(this, 340, 95, 0.55).setAlpha(0);

    // Date | time & venue, with red bars like the poster.
    const row = this.add.container(0, 560).setAlpha(0);
    const date = addText(this, 0, 0, EVENT.date, { font: 'head', size: 54, weight: 'bold', color: CSS.navy, align: 'left', lineSpacing: 2 }).setOrigin(0, 0.5);
    const tv = addText(this, 0, 0, EVENT.timeVenue, { size: 36, weight: '600', color: CSS.navy, align: 'left', lineSpacing: 12 }).setOrigin(0, 0.5);
    const barH = Math.max(date.height, tv.height);
    const wL = 38 + date.width;
    const wR = 38 + tv.width;
    let x = 960 - (wL + 140 + wR) / 2;
    const bar1 = this.add.rectangle(x, 0, 12, barH, COLORS.red).setOrigin(0, 0.5);
    date.x = x + 38;
    x += wL + 140;
    const bar2 = this.add.rectangle(x, 0, 12, barH, COLORS.red).setOrigin(0, 0.5);
    tv.x = x + 38;
    row.add([bar1, date, bar2, tv]);

    const inst = addText(this, 960, 745, EVENT.institute, { font: 'head', size: 54, weight: 'bold', color: CSS.navy, spacing: 1, lineSpacing: 4 }).setAlpha(0);
    const auto = addText(this, 960, 838, '(AUTONOMOUS)', { font: 'head', size: 34, weight: '500', color: CSS.navy, spacing: 2 }).setAlpha(0);

    // Accreditation chips (text placeholders for the real logos).
    const chips = this.add.container(0, 955).setAlpha(0);
    const items = EVENT.badges.map((label, k) => {
      const t = addText(this, 0, 0, label, { font: 'mono', size: 22, color: k % 2 ? CSS.navy : CSS.red, spacing: 2 });
      return { t, w: t.width + 56, k };
    });
    let px = 960 - (items.reduce((s, p) => s + p.w, 0) + 26 * (items.length - 1)) / 2;
    items.forEach(({ t, w, k }) => {
      const g = this.add.graphics();
      const col = k % 2 ? COLORS.navy : COLORS.red;
      g.fillStyle(0xffffff, 0.9);
      g.fillPoints(chamferPoints(px, -30, w, 60, 14), true);
      g.lineStyle(3, col, 1);
      g.strokePoints(chamferPoints(px, -30, w, 60, 14), true);
      t.x = px + w / 2;
      chips.add([g, t]);
      px += w + 26;
    });

    [logo, row, inst, auto, chips].forEach((obj, k) => {
      const y0 = obj.y;
      obj.y = y0 + 30;
      this.tweens.add({ targets: obj, alpha: 1, y: y0, duration: 700, delay: 500 + k * 250, ease: 'Cubic.easeOut' });
    });
  }
}
