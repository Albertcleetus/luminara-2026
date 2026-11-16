import { Scene } from 'phaser';
import { COLORS, CSS, EVENT } from '../theme.js';
import { addLogo, addText, hexPoints, makeRings, polar } from '../ui.js';
import { sfx } from '../audio.js';

// Waiting screen shown before the launch starts. Tap anywhere to begin.
export class Attract extends Scene {
  constructor() {
    super('Attract');
  }

  create() {
    this.started = false;

    addLogo(this, 960, 165, 1.05);
    addText(this, 960, 335, EVENT.series, { font: 'head', size: 34, weight: '500', color: CSS.navy, spacing: 2 });

    const glow = this.add.image(960, 640, 'glow').setTint(COLORS.gold).setScale(3).setAlpha(0.45);
    this.tweens.add({ targets: glow, alpha: 0.8, scale: 3.4, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    makeRings(this, 960, 640, { radius: 250 });

    // Ghost honeycomb.
    const g = this.add.graphics({ x: 960, y: 640 });
    const r = 70;
    const d = Math.sqrt(3) * r + 8;
    g.lineStyle(4, COLORS.red, 0.6);
    g.strokePoints(hexPoints(r), true);
    [-90, -30, 30, 90, 150, 210].forEach((a) => {
      const p = polar(d, a);
      g.lineStyle(3, COLORS.red, 0.3);
      g.strokePoints(hexPoints(r, p.x, p.y), true);
    });
    this.tweens.add({ targets: g, scale: 1.04, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const cta = addText(this, 960, 960, 'TOUCH TO BEGIN', { font: 'head', size: 54, weight: 'bold', color: CSS.red, spacing: 10 });
    this.tweens.add({ targets: cta, alpha: 0.4, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.input.on('pointerdown', () => this.begin());
    ['SPACE', 'ENTER', 'RIGHT'].forEach((k) => this.input.keyboard.on(`keydown-${k}`, () => this.begin()));
  }

  begin() {
    if (this.started) return;
    this.started = true;
    sfx.init();
    sfx.whoosh();
    this.cameras.main.fadeOut(400, 251, 246, 242);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Intro'));
  }
}
