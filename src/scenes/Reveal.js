import { Scene } from 'phaser';
import { COLORS, CSS, EVENT } from '../theme.js';
import { addLogo, addText, circuitTraces, dotGlobe, glintBurst, makeRings, mirrorPaths } from '../ui.js';
import { music, sfx } from '../audio.js';

const TY = 470; // title line

// Letter timing: the name completes (and the impact hits) IMPACT_MS after this screen starts.
const L_DELAY = 250;
const L_STEP = 85;
const L_DUR = 200;
export const IMPACT_MS = L_DELAY + ([...EVENT.name].length - 1) * L_STEP + L_DUR + 60;

// The programme-name reveal. It ends on a clean final page:
// Naipunnya logo, LUMINARA'26, Educational Conclave + tagline, NAAC and UGC badges.
export class Reveal extends Scene {
  constructor() {
    super('Reveal');
  }

  create() {
    const cam = this.cameras.main;
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
    const rays = this.add.image(960, TY, 'rays').setTint(COLORS.gold).setScale(2.6).setAlpha(0);
    this.tweens.add({ targets: rays, alpha: 0.45, duration: 900 });
    this.tweens.add({
      targets: rays, angle: 140, duration: 3200, ease: 'Cubic.easeOut',
      onComplete: () => this.tweens.add({ targets: rays, angle: '+=360', duration: 120000, repeat: -1 })
    });
    this.glow = this.add.image(960, TY, 'glow').setTint(0xffd27a).setScale(3).setAlpha(0.9);
    this.tweens.add({ targets: this.glow, scale: 8, duration: 1800, ease: 'Cubic.easeOut' });

    // Holographic dot globe slowly turning behind the name (tech accent).
    const globe = dotGlobe(this, 960, TY + 10, 330, { alpha: 0.22, speed: 0.18, dots: 1100 });
    globe.g.setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: globe.g, alpha: 1, scale: 1, duration: 2200, delay: 600, ease: 'Cubic.easeOut' });

    const rings = makeRings(this, 960, TY, { radius: 560, alpha: 0 });
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
    });
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

    // Fireworks: one emitter per colour.
    this.fireworks = [COLORS.gold, COLORS.red, COLORS.orange, COLORS.teal, 0xc2185b, 0x2e5aac].map((tint) =>
      this.add.particles(0, 0, 'spark', {
        speed: { min: 120, max: 440 }, lifespan: { min: 900, max: 1500 }, gravityY: 260,
        scale: { start: 0.8, end: 0 }, alpha: { start: 1, end: 0 }, tint, emitting: false
      }).setDepth(40));

    // Twinkling stars around the title (switched on at the impact).
    this.twinkles = this.add.particles(0, 0, 'star', {
      x: { min: 380, max: 1540 }, y: { min: 330, max: 610 }, lifespan: 700,
      scale: { start: 0.55, end: 0 }, alpha: { start: 1, end: 0 }, rotate: { start: 0, end: 90 },
      tint: [0xffffff, COLORS.gold, COLORS.goldLight], frequency: 70, emitting: false
    }).setDepth(30);

    // ---------- LUMINARA'26: letters slam in one by one ----------
    this.title = this.add.container(960, TY).setDepth(20);
    const letters = [...EVENT.name].map((ch) => {
      const t = addText(this, 0, 0, ch, { font: 'head', size: 230, weight: 'bold', color: CSS.red });
      // Rich red gradient, white outline and a solid drop shadow for depth.
      const grd = t.context.createLinearGradient(0, 0, 0, t.height);
      grd.addColorStop(0, '#FF5A3C');
      grd.addColorStop(0.5, '#E3262E');
      grd.addColorStop(1, '#A80F1A');
      t.setFill(grd);
      t.setStroke('#FFFFFF', 10);
      t.setShadow(0, 10, 'rgba(90,10,20,0.35)', 0, true, true);
      return t;
    });
    const gap = 6;
    const total = letters.reduce((s, t) => s + t.width, 0) + gap * (letters.length - 1);
    let x = -total / 2;
    letters.forEach((t, k) => {
      t.x = x + t.width / 2;
      x += t.width + gap;
      t.setAlpha(0).setScale(3.2);
      this.title.add(t);
      this.tweens.add({
        targets: t, alpha: 1, scale: 1, duration: L_DUR, delay: L_DELAY + shift + k * L_STEP, ease: 'Quad.easeIn',
        onComplete: () => {
          if (!this.finaleOn) sfx.thump(k); // the finale music carries this moment cleanly
          this.burster.explode(14, 960 + t.x, TY + 60);
          cam.shake(90, 0.003);
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
    this.time.delayedCall(landed + 500, () => this.showRest());

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
    this.cameras.main.shake(450, 0.012);
    const flash = this.add.rectangle(960, 540, 1920, 1080, 0xffffff).setAlpha(0.85).setDepth(900);
    this.tweens.add({ targets: flash, alpha: 0, duration: 650, onComplete: () => flash.destroy() });
    this.shockwave(0, COLORS.gold);
    this.shockwave(120, COLORS.red);
    this.burster.explode(90, 960, TY);
    this.bits.start();

    // Circuit traces grow in from both sides with light pulses running along them.
    const left = [
      [[30, 300], [120, 300], [180, 360], [250, 360]],
      [[30, 600], [120, 600], [180, 660], [330, 660]],
      [[30, 820], [200, 820], [260, 880], [560, 880]],
      [[30, 960], [300, 960], [340, 1000], [600, 1000]],
      [[260, 1050], [260, 1000]]
    ];
    circuitTraces(this, [...left, ...mirrorPaths(left)], { alpha: 0.45, delay: 200, drawIn: 1400, pulseEvery: 450, depth: 3 });

    // A scan line passes over the name once it is complete.
    const scan = this.add.rectangle(960, TY - 140, 1500, 3, COLORS.tech, 0.9).setDepth(26);
    const scanGlow = this.add.image(960, TY - 140, 'glow').setTint(COLORS.tech).setScale(7, 0.18).setAlpha(0.6).setDepth(26);
    this.tweens.add({ targets: [scan, scanGlow], y: TY + 140, duration: 900, delay: 350, ease: 'Sine.easeInOut',
      onComplete: () => this.tweens.add({ targets: [scan, scanGlow], alpha: 0, duration: 300, onComplete: () => { scan.destroy(); scanGlow.destroy(); } }) });
    this.glitter.start();
    glintBurst(this, 960, TY, { count: 16, radius: 520, size: 0.8, depth: 31 });
    this.tweens.add({ targets: this.title, scale: 1.08, duration: 140, yoyo: true, ease: 'Quad.easeOut' });

    // Title breathes with a warm glow from now on.
    this.tweens.add({ targets: this.glow, scale: 7, alpha: 0.7, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Light sheen across the name, repeating.
    this.sheen();
    this.time.addEvent({ delay: 3800, loop: true, callback: () => this.sheen() });

    // Stars and fireworks.
    this.twinkles.start();
    [0, 250, 500, 900, 1200].forEach((d) => this.time.delayedCall(d, () => this.firework()));
    const loop = () => this.time.delayedCall(900 + Math.random() * 900, () => { this.firework(); loop(); });
    this.time.delayedCall(1800, loop);
  }

  sheen() {
    const s = this.add.image(960 - 900, TY, 'glow').setTint(0xfff6d8).setBlendMode('ADD').setScale(0.5, 3.2).setAlpha(0.8).setDepth(25);
    this.tweens.add({ targets: s, x: 960 + 900, duration: 1000, ease: 'Sine.easeInOut', onComplete: () => s.destroy() });
  }

  // A rocket rises from the bottom and bursts on one side of the title.
  firework() {
    const left = Math.random() < 0.5;
    const x = left ? 180 + Math.random() * 420 : 1320 + Math.random() * 420;
    const y = 130 + Math.random() * 300;
    const em = this.fireworks[Math.floor(Math.random() * this.fireworks.length)];
    const em2 = this.fireworks[Math.floor(Math.random() * this.fireworks.length)];
    sfx.firework();
    const rocket = this.add.image(x + (Math.random() - 0.5) * 80, 1100, 'spark').setScale(0.7).setBlendMode('ADD').setDepth(40);
    this.tweens.add({
      targets: rocket, x, y, duration: 450, ease: 'Quad.easeOut',
      onComplete: () => {
        rocket.destroy();
        em.explode(80, x, y);
        em2.explode(40, x, y);
        const pop = this.add.image(x, y, 'glow').setBlendMode('ADD').setScale(0.4).setAlpha(0.9).setDepth(39);
        this.tweens.add({ targets: pop, scale: 1.6, alpha: 0, duration: 450, onComplete: () => pop.destroy() });
      }
    });
  }

  // Everything else on the final page.
  showRest() {
    const rise = (obj, delay, dy = 30) => {
      const y0 = obj.y;
      obj.setAlpha(0).setY(y0 + dy);
      this.tweens.add({ targets: obj, alpha: 1, y: y0, duration: 700, delay, ease: 'Cubic.easeOut' });
    };

    const subtitle = addText(this, 960, 650, EVENT.subtitle, { font: 'head', size: 86, weight: 'bold', color: CSS.navy, spacing: 8 });
    const tagline = addText(this, 960, 738, EVENT.tagline, { font: 'head', size: 40, weight: '500', color: CSS.red, spacing: 4 });
    rise(subtitle, 0);
    rise(tagline, 400);
    this.time.delayedCall(0, () => sfx.success());

    // Naipunnya logo and the lecture series, as on the other pages.
    const logo = addLogo(this, 960, 120, 0.85);
    const series = addText(this, 960, 262, EVENT.series, { font: 'head', size: 30, weight: '500', color: CSS.navy, spacing: 2 });
    rise(logo, 800, -30);
    rise(series, 1000, -20);

    // Accreditation badges pop in.
    const naac = this.add.image(815, 905, 'naac').setDisplaySize(270, 270);
    const ugc = this.add.image(1100, 900, 'ugc').setDisplaySize(215, 215);
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
          this.tweens.add({ targets: img, y: img.y - 8, duration: 2200 + k * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      });
    });
  }
}
