import { Scene } from 'phaser';
import { COLORS, CSS, EVENT } from '../theme.js';
import { addLogo, addText, dotGlobe, lightSweep, makeRings, scramble, twinkleStars } from '../ui.js';
import { sfx } from '../audio.js';

// ~7 second opening, then on to the honeycomb.
// A tap, Space, Enter or Right arrow skips straight ahead.
export class Intro extends Scene {
  constructor() {
    super('Intro');
  }

  create() {
    this.leaving = false;
    this.cameras.main.fadeIn(400, 251, 246, 242);

    // Red ring sweeping in around the logo (poster) inside thin HUD rings (tech).
    // Ring group centre. Outer HUD ring reaches ~RC-296, so it stays fully on screen.
    const RC = 355;
    const rings = makeRings(this, 960, RC, { radius: 280, alpha: 0 });
    rings.c.setScale(0.6);
    this.tweens.add({ targets: rings.c, alpha: 1, scale: 1, duration: 1200, delay: 300, ease: 'Cubic.easeOut' });

    // Holographic dot globe turning behind the logo.
    const globe = dotGlobe(this, 960, RC, 230, { alpha: 0.32, speed: 0.35 });
    globe.g.setAlpha(0).setScale(0.4);
    this.tweens.add({ targets: globe.g, alpha: 1, scale: 1, duration: 1400, delay: 200, ease: 'Cubic.easeOut' });

    const ring = this.add.image(960, RC, 'ring').setTint(COLORS.red).setScale(3).setAlpha(0);
    this.tweens.add({ targets: ring, scale: 0.98, alpha: 0.9, duration: 1200, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: ring, angle: 40, duration: 8000 });

    const dotL = this.add.image(-200, RC + 190, 'circle').setTint(COLORS.red).setScale(0.2).setAlpha(0.9);
    const dotR = this.add.image(2120, RC - 190, 'circle').setTint(COLORS.red).setScale(0.13).setAlpha(0.9);
    this.tweens.add({ targets: dotL, x: 740, duration: 1300, delay: 400, ease: 'Back.easeOut' });
    this.tweens.add({ targets: dotR, x: 1185, duration: 1300, delay: 550, ease: 'Back.easeOut' });

    // Logo sits well inside the red ring (its inner edge is ~205 px from the centre).
    const logo = addLogo(this, 960, RC - 40, 0.8).setAlpha(0);
    logo.setScale(0.65);
    this.tweens.add({ targets: logo, alpha: 1, scale: 0.8, duration: 800, delay: 500, ease: 'Back.easeOut' });

    const series = addText(this, 960, 720, EVENT.series, { font: 'head', size: 36, weight: '500', color: CSS.navy, spacing: 3 }).setAlpha(0);
    this.tweens.add({ targets: series, alpha: 1, y: 690, duration: 700, delay: 1500, ease: 'Cubic.easeOut' });


    // Gold glints around the logo ring, and a golden light behind the title.
    this.time.delayedCall(1200, () => twinkleStars(this, { x: 640, y: 80, w: 640, h: 560, every: 220, size: 0.4 }));
    lightSweep(this, 960, 865, 1300, { every: 4200, delay: 3300, scaleY: 0.9, alpha: 0.75 });

    // Only the short title here; the full tagline is saved for the reveal.
    const title = addText(this, 960, 865, '', { font: 'head', size: 110, weight: 'bold', color: CSS.red, spacing: 6 });
    scramble(this, title, EVENT.subtitle, {
      delay: 2500, duration: 900, onTick: (n) => n % 2 === 0 && sfx.tick(),
      onDone: () => {
        sfx.thump(0);
        this.tweens.add({ targets: title, scale: 1.06, duration: 120, yoyo: true });
      }
    });

    // Small loading bar (tech accent) that also shows the intro's progress.
    const DURATION = 6800;
    addText(this, 960, 1000, 'LOADING EXPERIENCE', { font: 'mono', size: 18, color: CSS.grey, spacing: 4 });
    this.add.rectangle(960, 1030, 420, 4, COLORS.navy, 0.12);
    const bar = this.add.rectangle(750, 1030, 420, 4, COLORS.tech).setOrigin(0, 0.5).setScale(0, 1);
    this.tweens.add({ targets: bar, scaleX: 1, duration: DURATION });

    this.time.delayedCall(900, () => sfx.whoosh());
    this.time.delayedCall(DURATION, () => this.leave());

    this.input.on('pointerdown', () => this.leave());
    ['SPACE', 'ENTER', 'RIGHT'].forEach((k) => this.input.keyboard.on(`keydown-${k}`, () => this.leave()));
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    sfx.whoosh();
    this.cameras.main.fadeOut(450, 251, 246, 242);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Honeycomb'));
  }
}
