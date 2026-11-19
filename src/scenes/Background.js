import { Scene } from 'phaser';
import { COLORS, CSS } from '../theme.js';
import { addText, brackets, circuitTraces, goldFrame, mirrorPaths, twinkleStars } from '../ui.js';
import { music } from '../audio.js';

const FLOW = ['Attract', 'Intro', 'Honeycomb', 'Reveal'];

// Always-running backdrop plus operator keys:
//   R = reset to the waiting screen, F = toggle fullscreen.
export class Background extends Scene {
  constructor() {
    super('Background');
  }

  create() {
    this.add.image(960, 540, 'bg');

    // Slowly drifting pastel light.
    [[300, 300, 0xffb3c6], [1650, 250, 0xaed6f1], [1600, 880, 0xd2c4f2], [350, 850, 0xffd1a8]].forEach(([x, y, tint], i) => {
      const b = this.add.image(x, y, 'glow').setTint(tint).setAlpha(0.35).setScale(5);
      this.tweens.add({
        targets: b, x: x + (i % 2 ? -120 : 120), y: y + (i < 2 ? 80 : -80),
        duration: 9000 + i * 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    });

    // Poster details: halftone dots and red circles.
    this.add.image(0, 1080, 'dots').setOrigin(0, 1).setTint(COLORS.red).setAlpha(0.5);
    this.add.image(1920, 0, 'dots').setOrigin(0, 1).setAngle(180).setTint(0x8f98a8).setAlpha(0.3);
    [[1800, 150, 0.3], [110, 150, 0.17], [1830, 960, 0.2]].forEach(([x, y, s], i) => {
      const c = this.add.image(x, y, 'circle').setTint(COLORS.red).setScale(s).setAlpha(0.85);
      this.tweens.add({ targets: c, y: y + 18, duration: 3000 + i * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // Soft golden bokeh drifting up, like light in a ceremony hall.
    this.add.particles(0, 0, 'glow', {
      x: { min: 0, max: 1920 }, y: { min: 200, max: 1150 },
      speedY: { min: -8, max: -22 }, speedX: { min: -6, max: 6 }, lifespan: 9000,
      scale: { start: 0.08, end: 0.22 }, alpha: { onEmit: () => 0, onUpdate: (p, key, t) => Math.sin(t * Math.PI) * 0.5 },
      tint: [COLORS.gold, COLORS.goldLight, 0xffc0a0], frequency: 380
    });

    // Light floaters (a few tech-teal ones stay for the tech blend).
    this.add.particles(0, 0, 'spark', {
      x: { min: 0, max: 1920 }, y: { min: 0, max: 1080 },
      speedY: { min: -10, max: -35 }, lifespan: 6000,
      scale: { start: 0.22, end: 0 }, alpha: { start: 0.6, end: 0 },
      tint: [COLORS.gold, COLORS.tech, COLORS.red, COLORS.orange], frequency: 160
    });

    // Gold glints twinkling around the edges.
    twinkleStars(this, { every: 700, size: 0.28 });

    // Fine gold frame with diamond corners, plus the tech corner brackets.
    const g = this.add.graphics();
    goldFrame(g, 22, 22, 1876, 1036, { alpha: 0.55 });
    brackets(g, 40, 40, 1840, 1000, 46, 3, COLORS.navy, 0.25);
    // Faint circuit traces in the corners (subtle tech feel on every page).
    const corner = [
      [[40, 230], [130, 230], [180, 180], [330, 180]],
      [[40, 290], [210, 290], [240, 260]],
      [[40, 860], [150, 860], [200, 910], [380, 910]],
      [[40, 960], [260, 960], [300, 1000], [420, 1000]]
    ];
    circuitTraces(this, [...corner, ...mirrorPaths(corner)], { alpha: 0.2, drawIn: 2000, pulseEvery: 1400, depth: 1 });

    addText(this, 52, 1030, 'NIMIT · LUMINARA ’26', { font: 'mono', size: 16, color: CSS.grey }).setOrigin(0, 0.5);

    this.input.keyboard.on('keydown-R', () => this.resetFlow());
    this.input.keyboard.on('keydown-F', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });

    this.scene.launch('Attract');
  }

  resetFlow() {
    music.stop(0.6);
    FLOW.forEach((key) => this.scene.stop(key));
    this.scene.launch('Attract');
  }
}
