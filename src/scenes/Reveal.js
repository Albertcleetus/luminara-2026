import { Scene } from 'phaser';
import { COLORS, CSS, EVENT } from '../theme.js';
import { addLogo, addText, circuitTraces, dotGlobe, glintBurst, makeRings, mirrorPaths } from '../ui.js';
import { music, sfx } from '../audio.js';

const TY = 470; // title line

// Letter timing: the name completes (and the impact hits) IMPACT_MS after this screen starts.
const L_DELAY = 250;
const L_STEP = 85;
const L_DUR = 200;
const SWEEP = 1300; // the light beam crossing the name after the drop
export const IMPACT_MS =L_DELAY + ([...EVENT.name].length - 1) * L_STEP + L_DUR + 60;

// The programme-name reveal. It ends on a clean final page:
// Naipunnya logo, LUMINARA'26, Educational Conclave + tagline, NAAC and UGC badges.
export class Reveal extends Scene {
  constructor() {
    super('Reveal');
  }

  create() {
    const cam = this.cameras.main;
    // Dark theme for the final screen: a deep navy stage over the pastel background.
    this.dim = this.add.rectangle(960, 540, 1920, 1080, 0x0b1124, 0).setDepth(-10);
    this.tweens.add({ targets: this.dim, fillAlpha: 0.9, duration: 700, ease: 'Sine.easeOut' });
    this.finaleOn = music.track?.key === 'finale';
    this.sting = false;
    // Lock the letters to the music: shift them so the name completes on the drop,
    // whatever time the scene change took.
    const dropIn = music.finaleDropIn();
    const shift = dropIn ? Math.max(-L_DELAY, Math.min(800, dropIn * 1000 - IMPACT_MS)) : 0;

    // ---------- stage: darker edges + two sweeping spotlights ----------
    const vignette = this.add.image(960, 540, 'vignette').setAlpha(0);
    this.tweens.add({ targets: vignette, alpha: 1, duration: 900 });
    [[300, -20, 14], [1620, 20, -14]].forEach(([x, a0, a1], k) => {
      const beam = this.add.image(x, 1130, 'beam').setOrigin(0.5, 1).setTint(0xfff1c4)
        .setBlendMode('ADD').setAngle(a0).setScale(1.15, 0.95).setAlpha(0);
      this.tweens.add({ targets: beam, alpha: 0.4, duration: 900, delay: 300 + k * 150 });
      this.tweens.add({ targets: beam, angle: a1, duration: 3400 + k * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // ---------- light and shockwaves ----------
    // Rays stay hidden while the name is in shadow; they open up once it is lit.
    this.rays = this.add.image(960, TY, 'rays').setTint(COLORS.gold).setScale(2.6).setAlpha(0);
    // A faint backlight behind the dark letters.
    this.glow = this.add.image(960, TY, 'glow').setTint(0xffd27a).setScale(6, 2.2).setAlpha(0);
    this.tweens.add({ targets: this.glow, alpha: 0.22, duration: 900, delay: 300 });

    // Holographic dot globe slowly turning behind the name (tech accent).
    const globe = dotGlobe(this, 960, TY + 10, 330, { alpha: 0.3, speed: 0.18, dots: 1100 });
    globe.g.setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: globe.g, alpha: 1, scale: 1, duration: 2200, delay: 600, ease: 'Cubic.easeOut' });

    const rings = makeRings(this, 960, TY, { radius: 560, alpha: 0, color: 0x8fa3c8 });
    this.tweens.add({ targets: rings.c, alpha: 0.6, duration: 1500, delay: 400 });

    this.shockwave(0, COLORS.gold);
    this.shockwave(160, COLORS.orange);
    this.shockwave(320, COLORS.red);

    // ---------- particles ----------
    this.add.particles(0, 0, 'spark', {
      x: { min: 0, max: 1920 }, y: 1110, speedY: { min: -60, max: -170 }, speedX: { min: -25, max: 25 },
      lifespan: 8000, scale: { start: 0.5, end: 0.1 }, alpha: { start: 0.9, end: 0 },
      tint: [COLORS.gold, COLORS.orange, COLORS.red], frequency: 120
    });
    this.burster = this.add.particles(0, 0, 'spark', {
      speed: { min: 150, max: 520 }, lifespan: 1000, scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [COLORS.gold, COLORS.orange, 0xffffff], emitting: false
    }).setDepth(22);
    // Digital particles rising gently (tech feel), started at the impact.
    this.bits = this.add.particles(0, 1100, 'pixel', {
      x: { min: 0, max: 1920 }, speedY: { min: -40, max: -110 }, lifespan: 9000,
      scale: { min: 0.6, max: 1.2 }, alpha: { start: 0.8, end: 0 },
      tint: [COLORS.tech, COLORS.gold, COLORS.teal], frequency: 90, emitting: false
    }).setDepth(44);
    this.glitter = this.add.particles(0, -20, 'star', {
      x: { min: 0, max: 1920 }, speedY: { min: 40, max: 110 }, speedX: { min: -15, max: 15 },
      lifespan: 9000, scale: { min: 0.08, max: 0.2 }, rotate: { start: 0, end: 360 }, alpha: { start: 1, end: 0.2 },
      tint: [COLORS.gold, COLORS.goldLight, 0xffffff], frequency: 140, emitting: false
    }).setDepth(44);

    // Twinkling stars around the title (switched on at the impact).
    this.twinkles = this.add.particles(0, 0, 'star', {
      x: { min: 380, max: 1540 }, y: { min: 330, max: 610 }, lifespan: 700,
      scale: { start: 0.55, end: 0 }, alpha: { start: 1, end: 0 }, rotate: { start: 0, end: 90 },
      tint: [0xffffff, COLORS.gold, COLORS.goldLight], frequency: 70, emitting: false
    }).setDepth(30);


    // ---------- LUMINARA'26: letters slam in as dark silhouettes ----------
    // Each letter has three layers: the shadowed silhouette, the lit red letter,
    // and a bright rim light that flashes as the light beam passes over it.
    this.title = this.add.container(960, TY).setDepth(20);
    const style = { font: 'head', size: 230, weight: 'bold' };
    this.letters = [...EVENT.name].map((ch) => {
      const dark = addText(this, 0, 0, ch, { ...style, color: '#1a1f33' }).setPadding(40);
      const dg = dark.context.createLinearGradient(0, 0, 0, dark.height);
      dg.addColorStop(0, '#3a4160');
      dg.addColorStop(1, '#0c0f1c');
      dark.setFill(dg);
      dark.setStroke('#4a5272', 4);
      dark.setShadow(0, 22, 'rgba(0,0,0,0.6)', 28, true, true);

      const lit = addText(this, 0, 0, ch, { ...style, color: CSS.red }).setPadding(40);
      // Rich red gradient, white outline and a soft deep drop shadow.
      const grd = lit.context.createLinearGradient(0, 0, 0, lit.height);
      grd.addColorStop(0, '#FF5A3C');
      grd.addColorStop(0.5, '#E3262E');
      grd.addColorStop(1, '#A80F1A');
      lit.setFill(grd);
      lit.setStroke('#FFFFFF', 10);
      lit.setShadow(0, 16, 'rgba(70,5,15,0.45)', 18, true, true);
      lit.setAlpha(0);

      const rim = addText(this, 0, 0, ch, { ...style, color: 'rgba(255,255,255,0)' }).setPadding(40);
      rim.setStroke('#FFF3CC', 8);
      rim.setShadow(0, 0, '#FFD27A', 26, true, false);
      rim.setAlpha(0).setBlendMode('ADD');

      const c = this.add.container(0, 0, [dark, lit, rim]);
      return { c, dark, lit, rim, w: lit.width - 80, done: false };
    });
    const gap = 6;
    const total = this.letters.reduce((s, l) => s + l.w, 0) + gap * (this.letters.length - 1);
    this.titleWidth = total;
    let x = -total / 2;
    this.letters.forEach((l, k) => {
      l.c.x = x + l.w / 2;
      x += l.w + gap;
      l.c.setAlpha(0).setScale(3.2);
      this.title.add(l.c);
      this.tweens.add({
        targets: l.c, alpha: 1, scale: 1, duration: L_DUR, delay: L_DELAY + shift + k * L_STEP, ease: 'Quad.easeIn',
        onComplete: () => {
          if (!this.finaleOn) sfx.thump(k); // the finale music carries this moment cleanly
          this.burster.explode(8, 960 + l.c.x, TY + 60);
          cam.shake(80, 0.002);
        }
      });
    });
    const landed = IMPACT_MS - 60 + shift;

    // Slow push-out of the whole shot while the name lands.
    cam.setZoom(1.12);
    this.tweens.add({ targets: cam, zoom: 1, duration: 2400, ease: 'Sine.easeOut' });

    // Pre-drop build under the letters, ending exactly on the impact (the "drop").
    // Recorded logo sting if available (its hit lands on the impact); otherwise the generated pre-drop.
    // When the finale track is already running (started on the centre tap), its drop is
    // the impact, so no extra build-up or sting is layered on top.
    if (!this.finaleOn) {
      this.sting = sfx.finalSting((landed + 60) / 1000);
      const PRE_START = 100;
      this.time.delayedCall(PRE_START, () => sfx.preDrop((landed + 60 - PRE_START) / 1000));
    }
    this.time.delayedCall(landed + 60, () => this.impact());
    this.time.delayedCall(landed + 60 + SWEEP + 150, () => this.showRest());

    // Flash carried over from the honeycomb.
    const flash = this.add.rectangle(960, 540, 1920, 1080, 0xffffff).setDepth(1000);
    this.tweens.add({ targets: flash, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
  }

  shockwave(delay, tint) {
    const ring = this.add.image(960, TY, 'ring').setTint(tint).setScale(0.2).setAlpha(0);
    this.tweens.add({
      targets: ring, scale: 6, alpha: { from: 0.9, to: 0 }, duration: 1300, delay, ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });
  }

  // The big hit when the last letter lands.
  impact() {
    if (this.finaleOn) {
      // Music drop lands here by itself.
    } else if (this.sting) {
      // The recorded sting carries the hit. The finale track starts in its quiet
      // break under the sting's tail, and its drop lands ~4.5 s after the impact.
      this.time.delayedCall(2500, () => music.start(7));
    } else {
      sfx.impact();
      music.start(7); // full celebration anthem from here on
    }
    // On the drop: a soft warm pulse, then the light beam crosses the dark name.
    this.cameras.main.shake(300, 0.005);
    const flash = this.add.rectangle(960, 540, 1920, 1080, 0xfff1c4).setAlpha(0.3).setDepth(900);
    this.tweens.add({ targets: flash, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
    this.shockwave(0, COLORS.gold);
    this.bits.start();
    this.lightBeam();
  }

  // A beam of golden light crosses the name from left to right. Each letter it
  // passes catches a bright rim of light and turns from shadow to red.
  lightBeam() {
    const half = this.titleWidth / 2;
    const from = -half - 280;
    const to = half + 280;
    const src = { x: from };
    const D = 18; // behind the letters, above the dimmed stage
    const core = this.add.image(0, TY, 'glow').setTint(0xfff1c4).setBlendMode('ADD').setScale(1.5, 3.2).setDepth(D);
    const shafts = [-38, 38, -90, 90].map((a, k) => this.add.image(0, TY + 30, 'beam').setOrigin(0.5, 1)
      .setTint(k < 2 ? 0xffe7a3 : 0xfff6dd).setBlendMode('ADD').setAngle(a)
      .setScale(k < 2 ? 1.3 : 0.9, k < 2 ? 0.75 : 0.55).setDepth(D));
    const haze = this.add.image(0, TY, 'glow').setTint(0xfff1c4).setBlendMode('ADD').setScale(1.1, 2.6).setDepth(21);
    const parts = [core, ...shafts, haze];
    const peak = [0.95, 0.5, 0.5, 0.35, 0.35, 0.28];
    parts.forEach((p) => p.setAlpha(0));
    parts.forEach((p, k) => this.tweens.add({ targets: p, alpha: peak[k], duration: 260 }));
    parts.forEach((p, k) => this.tweens.add({ targets: p, alpha: 0, duration: 380, delay: SWEEP - 380 }));
    shafts.forEach((s, k) => this.tweens.add({ targets: s, angle: s.angle + (k % 2 ? -12 : 12), duration: SWEEP, ease: 'Sine.easeInOut' }));

    this.tweens.add({
      targets: src, x: to, duration: SWEEP, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const wx = 960 + src.x;
        parts.forEach((p) => p.setX(wx));
        this.letters.forEach((l) => {
          if (l.done || src.x < l.c.x - l.w * 0.25) return;
          l.done = true;
          this.tweens.add({ targets: l.rim, alpha: 1, duration: 110, hold: 80, yoyo: true, ease: 'Sine.easeOut' });
          this.tweens.add({ targets: l.lit, alpha: 1, duration: 420, ease: 'Sine.easeOut' });
          this.tweens.add({ targets: l.dark, alpha: 0, duration: 520, ease: 'Sine.easeIn' });
          this.tweens.add({ targets: l.c, scale: 1.05, duration: 140, yoyo: true, ease: 'Sine.easeOut' });
          this.burster.explode(6, 960 + l.c.x, TY - 70);
        });
      },
      onComplete: () => {
        parts.forEach((p) => p.destroy());
        this.afterLight();
      }
    });
  }

  // The name is fully lit: the stage brightens and the celebration details come in.
  afterLight() {
    this.shockwave(0, COLORS.red);
    this.tweens.add({ targets: this.rays, alpha: 0.28, duration: 1200, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: this.rays, angle: 140, duration: 3200, ease: 'Cubic.easeOut',
      onComplete: () => this.tweens.add({ targets: this.rays, angle: '+=360', duration: 120000, repeat: -1 }) });
    this.glow.setScale(4);
    this.tweens.add({ targets: this.glow, scale: 7, alpha: 0.55, duration: 900, ease: 'Cubic.easeOut' });

    // Circuit traces grow in from both sides with light pulses running along them.
    const left = [
      [[30, 300], [120, 300], [180, 360], [250, 360]],
      [[30, 600], [120, 600], [180, 660], [330, 660]],
      [[30, 820], [200, 820], [260, 880], [560, 880]],
      [[30, 960], [300, 960], [340, 1000], [600, 1000]],
      [[260, 1050], [260, 1000]]
    ];
    circuitTraces(this, [...left, ...mirrorPaths(left)], { alpha: 0.45, delay: 200, drawIn: 1400, pulseEvery: 450, depth: 3 });

    this.glitter.start();
    glintBurst(this, 960, TY, { count: 16, radius: 520, size: 0.8, depth: 31 });
    this.tweens.add({ targets: this.title, scale: 1.08, duration: 140, yoyo: true, ease: 'Quad.easeOut' });

    // Title breathes with a warm glow from now on.
    this.time.delayedCall(900, () => this.tweens.add({ targets: this.glow, scale: 6.2, alpha: 0.4, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));

    // Light sheen across the name, repeating.
    this.sheen();
    this.time.addEvent({ delay: 3800, loop: true, callback: () => this.sheen() });

    // Twinkling stars.
    this.twinkles.start();
  }

  sheen() {
    const s = this.add.image(960 - 900, TY, 'glow').setTint(0xfff6d8).setBlendMode('ADD').setScale(0.5, 3.2).setAlpha(0.8).setDepth(25);
    this.tweens.add({ targets: s, x: 960 + 900, duration: 1000, ease: 'Sine.easeInOut', onComplete: () => s.destroy() });
  }

  // Everything else on the final page.
  showRest() {
    const rise = (obj, delay, dy = 30) => {
      const y0 = obj.y;
      obj.setAlpha(0).setY(y0 + dy);
      this.tweens.add({ targets: obj, alpha: 1, y: y0, duration: 700, delay, ease: 'Cubic.easeOut' });
    };

    const subtitle = addText(this, 960, 650, EVENT.subtitle, { font: 'head', size: 86, weight: 'bold', color: '#F4F1EA', spacing: 8 });
    const tagline = addText(this, 960, 738, EVENT.tagline, { font: 'head', size: 40, weight: '500', color: '#FF6F5E', spacing: 4 });
    rise(subtitle, 0);
    rise(tagline, 400);
    this.time.delayedCall(0, () => sfx.success());

    // Naipunnya logo and the lecture series, as on the other pages.
    const logo = addLogo(this, 960, 120, 0.85, { dark: true });
    const series = addText(this, 960, 262, EVENT.series, { font: 'head', size: 30, weight: '500', color: '#D3D9E6', spacing: 2 });
    rise(logo, 800, -30);
    rise(series, 1000, -20);

    // Accreditation badges pop in.
    // Both badges share one centre line, the same visible height (BH) and an even gap.
    // Measured visible areas: NAAC shield y 36-371 of 500 (caption below is cropped off),
    // UGC y 10-191 of 200. Each pivots on the centre of its visible part.
    const BH = 210;
    const BY = 905;
    const nS = BH / 335;
    const uS = BH / 181;
    const nW = 401 * nS;
    const uW = 186 * uS;
    const GAP = 70;
    const left = 960 - (nW + GAP + uW) / 2;
    const naac = this.add.image(left + nW / 2, BY, 'naac').setOrigin(0.5, 203.5 / 500).setScale(nS);
    naac.setCrop(0, 0, 500, 372); // shield only, without the caption text under it
    const ugc = this.add.image(left + nW + GAP + uW / 2, BY, 'ugc').setOrigin(0.5, 100.5 / 200).setScale(uS);
    [naac, ugc].forEach((img, k) => {
      const halo = this.add.image(img.x, img.y, 'glow').setTint(COLORS.gold).setScale(0).setAlpha(0.55);
      halo.setDepth(img.depth - 1);
      this.tweens.add({ targets: halo, scale: 2.1, duration: 700, delay: 1400 + k * 220, ease: 'Back.easeOut',
        onComplete: () => this.tweens.add({ targets: halo, alpha: 0.3, scale: 1.9, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }) });
      const sx = img.scaleX;
      const sy = img.scaleY;
      img.setScale(0).setAlpha(0);
      this.tweens.add({
        targets: img, scaleX: sx, scaleY: sy, alpha: 1, duration: 550, delay: 1400 + k * 220, ease: 'Back.easeOut',
        onStart: () => sfx.blip(k + 4),
        onComplete: () => {
          this.burster.explode(18, img.x, img.y);
        }
      });
    });
    // Both badges float together, in step, so they always stay level.
    this.time.delayedCall(1400 + 220 + 600, () => {
      this.tweens.add({ targets: [naac, ugc], y: BY - 8, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }
}
