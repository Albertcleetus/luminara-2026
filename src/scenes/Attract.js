import { Scene } from 'phaser';
import { COLORS, CSS, EVENT } from '../theme.js';
import { addLogo, addText, drawFingerprint, glintBurst, hexPoints, lightSweep, makeRings, polar, twinkleStars } from '../ui.js';
import { music, sfx } from '../audio.js';

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

    // Fingerprint scanner in the centre tile: the chief guest's touch launches the programme.
    this.fp = this.add.graphics({ x: 960, y: 636 });
    drawFingerprint(this.fp, { color: COLORS.tech, alpha: 0.9, width: 3, size: 0.85 });
    this.scanGlow = this.add.image(960, 590, 'glow').setTint(COLORS.tech).setScale(0.9, 0.12).setAlpha(0.8);
    this.scanLine = this.add.rectangle(960, 590, 120, 3, COLORS.tech);
    this.scan = this.tweens.add({ targets: [this.scanLine, this.scanGlow], y: 690, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.status = addText(this, 960, 908, 'FINGERPRINT SCANNER READY', { font: 'mono', size: 20, color: CSS.teal, spacing: 4 });

    // Glints around the honeycomb.
    twinkleStars(this, { x: 640, y: 330, w: 640, h: 620, every: 260, size: 0.42 });

    // Golden light passing behind the call to action.
    lightSweep(this, 960, 960, 760, { every: 3600, delay: 600, scaleY: 0.5, alpha: 0.7 });
    const cta = this.cta = addText(this, 960, 960, 'TOUCH TO BEGIN', { font: 'head', size: 54, weight: 'bold', color: CSS.red, spacing: 10 });
    this.tweens.add({ targets: cta, alpha: 0.4, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.input.on('pointerdown', () => this.begin());
    ['SPACE', 'ENTER', 'RIGHT'].forEach((k) => this.input.keyboard.on(`keydown-${k}`, () => this.begin()));
  }

  begin() {
    if (this.started) return;
    this.started = true;
    sfx.init();
    sfx.whoosh();
    music.start(1);

    // Quick scan, then access granted.
    this.scan.stop();
    this.tweens.killTweensOf(this.cta);
    this.tweens.add({ targets: this.cta, alpha: 0, duration: 300 });
    this.status.setText('SCANNING…');
    [this.scanLine, this.scanGlow].forEach((o) => o.setY(580));
    this.tweens.add({ targets: [this.scanLine, this.scanGlow], y: 700, duration: 300, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
    [0, 150, 300, 450, 600, 750].forEach((d, k) => this.time.delayedCall(d, () => sfx.blip(k)));
    this.time.delayedCall(1200, () => {
      this.scanLine.setVisible(false);
      this.scanGlow.setVisible(false);
      this.fp.clear();
      drawFingerprint(this.fp, { color: 0x1fa971, alpha: 1, width: 3.5, size: 0.85 });
      this.tweens.add({ targets: this.fp, scale: 1.15, duration: 160, yoyo: true });
      this.status.setText('ACCESS GRANTED').setColor(CSS.green);
      glintBurst(this, 960, 640, { count: 10, radius: 150, size: 0.5 });
      sfx.pop();
    });
    this.time.delayedCall(1900, () => {
      this.cameras.main.fadeOut(400, 251, 246, 242);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Intro'));
    });
  }
}
