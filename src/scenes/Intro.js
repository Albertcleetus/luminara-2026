import { Scene } from 'phaser';
import { COLORS, CSS, EVENT } from '../theme.js';
import { addLogo, addText, makeRings, scramble } from '../ui.js';
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
    const rings = makeRings(this, 960, 330, { radius: 330, alpha: 0 });
    rings.c.setScale(0.6);
    this.tweens.add({ targets: rings.c, alpha: 1, scale: 1, duration: 1200, delay: 300, ease: 'Cubic.easeOut' });

    const ring = this.add.image(960, 330, 'ring').setTint(COLORS.red).setScale(3).setAlpha(0);
    this.tweens.add({ targets: ring, scale: 1.1, alpha: 0.9, duration: 1200, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: ring, angle: 40, duration: 8000 });

    const dotL = this.add.image(-200, 540, 'circle').setTint(COLORS.red).setScale(0.22).setAlpha(0.9);
    const dotR = this.add.image(2120, 120, 'circle').setTint(COLORS.red).setScale(0.14).setAlpha(0.9);
    this.tweens.add({ targets: dotL, x: 700, duration: 1300, delay: 400, ease: 'Back.easeOut' });
    this.tweens.add({ targets: dotR, x: 1230, duration: 1300, delay: 550, ease: 'Back.easeOut' });

    const logo = addLogo(this, 960, 300, 0.95).setAlpha(0);
    logo.setScale(0.8);
    this.tweens.add({ targets: logo, alpha: 1, scale: 0.95, duration: 800, delay: 500, ease: 'Back.easeOut' });

    const series = addText(this, 960, 690, EVENT.series, { font: 'head', size: 36, weight: '500', color: CSS.navy, spacing: 3 }).setAlpha(0);
    this.tweens.add({ targets: series, alpha: 1, y: 660, duration: 700, delay: 1500, ease: 'Cubic.easeOut' });

    const rule = this.add.rectangle(960, 712, 640, 4, COLORS.red).setScale(0, 1);
    this.tweens.add({ targets: rule, scaleX: 1, duration: 600, delay: 2100, ease: 'Cubic.easeOut' });

    const line1 = addText(this, 960, 800, '', { font: 'head', size: 84, weight: 'bold', color: CSS.red, spacing: 2 });
    const line2 = addText(this, 960, 900, '', { font: 'head', size: 84, weight: 'bold', color: CSS.navy, spacing: 2 });
    scramble(this, line1, 'REIMAGINING EDUCATION', { delay: 2500, duration: 800, onTick: (n) => n % 2 === 0 && sfx.tick() });
    scramble(this, line2, 'FOR A FUTURE-READY KERALA', { delay: 3200, duration: 900, onTick: (n) => n % 2 === 0 && sfx.tick() });

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
