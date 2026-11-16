import * as Phaser from 'phaser';
import { COLORS, CSS, EVENT, KEYWORDS, toCss } from '../theme.js';
import { addLogo, addText, brackets, chamferPoints, hexPoints, makeRings, polar, scramble, strokeArc } from '../ui.js';
import { sfx } from '../audio.js';

const R = 150;                       // hex radius (centre to corner)
const DIST = Math.sqrt(3) * R + 16;  // centre-to-centre distance incl. gap
const CX = 960;
const CY = 585;
const ANGLES = [-90, -30, 30, 90, 150, 210]; // clockwise from the top
const POPUP_AUTO_CLOSE = 7000;
const POPUP_MIN_OPEN = 300;          // ms before a tap can close the popup

// Interaction states:
//   'building'  tiles animating in (a tap on tile 1 is queued, not lost)
//   'ready'     waiting for a tap on the glowing tile
//   'flipping'  short tile flip before the popup (~0.4 s)
//   'popup'     keyword popup open; any tap closes it
//   'unlocked'  all six done; waiting for a tap on the centre
//   'done'      illumination running
export class Honeycomb extends Phaser.Scene {
  constructor() {
    super('Honeycomb');
  }

  create() {
    this.state = 'building';
    this.next = 0;
    this.count = 0;
    this.edges = [false, false, false, false, false, false];
    this.popup = null;
    this.queued = false;

    this.cameras.main.fadeIn(400, 251, 246, 242);

    addText(this, 960, 80, EVENT.tagline, { font: 'head', size: 42, weight: 'bold', color: CSS.red, spacing: 3 });

    this.buildLeftPanel();
    this.buildRightPanel();

    this.rings = makeRings(this, CX, CY, { radius: 445 });
    this.centerGlow = this.add.image(CX, CY, 'glow').setTint(COLORS.gold).setScale(3.4).setAlpha(0);
    this.beams = this.add.graphics();

    this.tiles = KEYWORDS.map((kw, i) => this.createTile(kw, i));
    this.createCenter();

    this.hint = addText(this, 960, 1042, '', { size: 28, weight: '600', color: CSS.navy });

    this.burster = this.add.particles(0, 0, 'spark', {
      speed: { min: 150, max: 480 }, lifespan: 900, scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [COLORS.gold, COLORS.orange, COLORS.red, COLORS.tech], emitting: false
    });

    this.flash = this.add.rectangle(960, 540, 1920, 1080, 0xffffff).setAlpha(0).setDepth(1000);

    // Build-in, then light the first tile.
    const all = [this.center.c, ...this.tiles.map((t) => t.c)];
    all.forEach((c, k) => {
      c.setScale(0);
      this.tweens.add({
        targets: c, scale: 1, duration: 420, delay: 200 + k * 90, ease: 'Back.easeOut',
        onStart: () => sfx.blip(k)
      });
    });
    this.time.delayedCall(200 + all.length * 90 + 300, () => {
      this.state = 'ready';
      this.activate(this.tiles[0]);
      if (this.queued) { this.queued = false; this.revealTile(this.tiles[0]); }
    });

    // A tap anywhere on the background while the popup is open also closes it.
    this.input.on('pointerdown', (pointer, over) => {
      if (this.state === 'popup' && over.length === 0) this.closePopup();
    });
    ['SPACE', 'ENTER', 'RIGHT'].forEach((k) => this.input.keyboard.on(`keydown-${k}`, () => this.advance()));
  }

  // ---------- side panels ----------

  buildLeftPanel() {
    const g = this.add.graphics();
    brackets(g, 110, 330, 380, 470, 28, 3, COLORS.navy, 0.35);
    addLogo(this, 300, 445, 0.9);
    addText(this, 300, 575, 'LECTURE SERIES', { font: 'mono', size: 18, color: CSS.grey, spacing: 3 });
    addText(this, 300, 670, 'MAR ANTONY CARDINAL\nPADIYARA COMMEMORATIVE\nLECTURE SERIES – V', {
      font: 'head', size: 30, weight: '500', color: CSS.navy, spacing: 1, lineSpacing: 6
    });
  }

  buildRightPanel() {
    const g = this.add.graphics();
    brackets(g, 1430, 330, 380, 470, 28, 3, COLORS.navy, 0.35);
    addText(this, 1620, 400, 'KEYWORDS UNLOCKED', { font: 'mono', size: 20, color: CSS.grey, spacing: 3 });
    this.countText = addText(this, 1620, 500, '0 / 6', { font: 'head', size: 120, weight: 'bold', color: CSS.red });
    this.progress = this.add.graphics({ x: 1620, y: 640 });
    this.drawProgress();
  }

  drawProgress() {
    const g = this.progress;
    g.clear();
    for (let k = 0; k < 6; k++) {
      const x = (k - 2.5) * 50;
      const done = k < this.count;
      g.fillStyle(done ? KEYWORDS[k].color : 0xffffff, done ? 1 : 0.7);
      g.fillPoints(hexPoints(20, x, 0), true);
      g.lineStyle(2, done ? 0xffffff : 0xc9c9d6, 1);
      g.strokePoints(hexPoints(20, x, 0), true);
    }
  }

  // ---------- tiles ----------

  createTile(kw, i) {
    const p = polar(DIST, ANGLES[i]);
    const x = CX + p.x;
    const y = CY + p.y;
    const c = this.add.container(x, y);
    const glow = this.add.image(0, 0, 'glow').setTint(COLORS.red).setScale(2.6).setAlpha(0);
    const ping = this.add.graphics().setAlpha(0);
    ping.lineStyle(4, COLORS.red, 1);
    ping.strokePoints(hexPoints(R), true);
    const g = this.add.graphics();
    const icon = this.add.graphics();
    const num = addText(this, 0, -R * 0.58, String(i + 1).padStart(2, '0'), { font: 'mono', size: 26, color: CSS.grey });
    const status = addText(this, 0, R * 0.56, '', { font: 'mono', size: 18, color: CSS.red, spacing: 2 });
    const word = addText(this, 0, 6, '', { font: 'head', size: 44, weight: 'bold', color: CSS.white, spacing: 2 });
    c.add([glow, ping, g, icon, num, status, word]);

    g.setInteractive({ hitArea: new Phaser.Geom.Polygon(hexPoints(R)), hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true });
    g.on('pointerdown', () => this.onTile(i));
    g.on('pointerover', () => { if (t.state === 'active') this.tweens.add({ targets: glow, alpha: 0.8, duration: 150 }); });

    const t = { i, kw, c, glow, ping, g, icon, num, status, word, x, y, state: 'locked', pulses: [] };
    this.drawTile(t);
    return t;
  }

  drawTile(t) {
    const g = t.g;
    const pts = hexPoints(R);
    g.clear();
    g.fillStyle(0x000000, 0.07);
    g.fillPoints(hexPoints(R, 0, 10), true);
    if (t.state === 'revealed') {
      g.fillStyle(t.kw.color, 1);
      g.fillPoints(pts, true);
      g.lineStyle(5, 0xffffff, 1);
      g.strokePoints(pts, true);
      g.lineStyle(2, 0xffffff, 0.35);
      g.strokePoints(hexPoints(R - 16), true);
    } else if (t.state === 'active') {
      g.fillStyle(0xffffff, 0.94);
      g.fillPoints(pts, true);
      g.lineStyle(6, COLORS.red, 1);
      g.strokePoints(pts, true);
      g.lineStyle(1.5, COLORS.red, 0.25);
      g.strokePoints(hexPoints(R - 14), true);
    } else {
      g.fillStyle(0xffffff, 0.55);
      g.fillPoints(pts, true);
      g.lineStyle(3, 0xffffff, 0.95);
      g.strokePoints(pts, true);
      g.lineStyle(1, COLORS.navy, 0.08);
      g.strokePoints(hexPoints(R - 14), true);
    }
    const active = t.state === 'active';
    this.drawLock(t.icon, active ? COLORS.red : COLORS.navy, active ? 1 : 0.22);
    t.icon.setVisible(t.state !== 'revealed');
  }

  drawLock(g, color, alpha) {
    g.clear();
    g.lineStyle(5, color, alpha);
    g.beginPath();
    g.arc(0, -10, 15, Math.PI, 0, false);
    g.strokePath();
    g.lineBetween(-15, -10, -15, 2);
    g.lineBetween(15, -10, 15, 2);
    g.fillStyle(color, alpha);
    g.fillRoundedRect(-24, 0, 48, 38, 7);
  }

  activate(t) {
    t.state = 'active';
    this.drawTile(t);
    t.num.setColor(CSS.red);
    t.status.setText('TAP TO REVEAL').setColor(CSS.red);
    t.pulses = [
      this.tweens.add({ targets: t.glow, alpha: 0.55, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
      this.tweens.add({ targets: t.c, scale: 1.05, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
      this.tweens.add({ targets: t.ping, scale: { from: 1, to: 1.25 }, alpha: { from: 0.7, to: 0 }, duration: 1300, repeat: -1, ease: 'Cubic.easeOut' })
    ];
    this.setDefaultHint();
  }

  onTile(i) {
    const t = this.tiles[i];
    if (this.state === 'popup') { this.closePopup(); return; }
    if (this.state === 'building') {
      if (i === 0) this.queued = true;
      return;
    }
    if (this.state === 'flipping' || this.state === 'done') return;
    if (t.state === 'revealed') {
      sfx.blip(i);
      this.tweens.add({ targets: t.c, scale: 1.05, duration: 100, yoyo: true });
      return;
    }
    if (this.state === 'unlocked' || i !== this.next) {
      this.wrong(t.c, 'Please touch the glowing tile');
      return;
    }
    this.revealTile(t);
  }

  revealTile(t) {
    this.state = 'flipping';
    this.hint.setText('');
    t.pulses.forEach((tw) => tw.stop());
    t.ping.setAlpha(0);
    t.glow.setAlpha(0);
    sfx.chime(t.i);

    this.tweens.chain({
      targets: t.c,
      tweens: [
        { scale: 0.92, duration: 80, ease: 'Quad.easeOut' },
        {
          scaleX: 0, scaleY: 1, duration: 130, ease: 'Quad.easeIn',
          onComplete: () => {
            t.state = 'revealed';
            this.drawTile(t);
            t.num.setColor(CSS.white).setAlpha(0.85);
            t.status.setText('UNLOCKED').setColor(CSS.white).setAlpha(0.8);
            scramble(this, t.word, t.kw.word, { duration: 350 });
            this.burster.explode(40, t.x, t.y);
          }
        },
        { scaleX: 1, duration: 220, ease: 'Back.easeOut' }
      ],
      onComplete: () => this.openPopup(t)
    });
  }

  // ---------- popup ----------

  openPopup(t) {
    this.state = 'popup';
    sfx.pop();
    const W = 1060;
    const H = 520;
    const color = t.kw.color;
    const css = toCss(color);

    const overlay = this.add.rectangle(960, 540, 1920, 1080, COLORS.navy, 0.4).setAlpha(0);
    const card = this.add.container(960, 560).setScale(0.85).setAlpha(0);

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.15);
    g.fillPoints(chamferPoints(-W / 2, -H / 2 + 16, W, H, 36), true);
    g.fillStyle(0xffffff, 1);
    g.fillPoints(chamferPoints(-W / 2, -H / 2, W, H, 36), true);
    g.lineStyle(4, color, 1);
    g.strokePoints(chamferPoints(-W / 2, -H / 2, W, H, 36), true);
    brackets(g, -W / 2 - 14, -H / 2 - 14, W + 28, H + 28, 40, 3, color, 0.8);
    g.lineStyle(1, color, 0.3);
    g.lineBetween(-W / 2 + 40, -H / 2 + 70, W / 2 - 40, -H / 2 + 70);

    const head = addText(this, -W / 2 + 50, -H / 2 + 36, `KEYWORD ${String(t.i + 1).padStart(2, '0')} / 06`, { font: 'mono', size: 22, color: CSS.grey, spacing: 3 }).setOrigin(0, 0.5);
    const ok = addText(this, W / 2 - 50, -H / 2 + 36, 'UNLOCKED ●', { font: 'mono', size: 22, color: CSS.green, spacing: 2 }).setOrigin(1, 0.5);
    const word = addText(this, 0, -40, '', { font: 'head', size: 150, weight: 'bold', color: css, spacing: 4 });
    const line = addText(this, 0, 110, t.kw.line, { size: 36, color: CSS.ink, wrap: 880 }).setAlpha(0);
    const hint = addText(this, 0, H / 2 - 56, 'Tap anywhere to continue', { size: 22, color: '#A0A4B8' });
    const bar = this.add.rectangle(-W / 2 + 60, H / 2 - 24, W - 120, 5, color, 0.6).setOrigin(0, 0.5);
    card.add([g, head, ok, word, line, hint, bar]);

    this.tweens.add({ targets: overlay, alpha: 1, duration: 220 });
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
    scramble(this, word, t.kw.word, { delay: 120, duration: 450 });
    this.tweens.add({ targets: line, alpha: 1, y: 100, duration: 400, delay: 450 });
    this.tweens.add({ targets: bar, scaleX: 0, duration: POPUP_AUTO_CLOSE });

    this.popup = {
      t, overlay, card, closing: false, openedAt: this.time.now,
      timer: this.time.delayedCall(POPUP_AUTO_CLOSE, () => this.closePopup(true))
    };
  }

  closePopup(force = false) {
    const p = this.popup;
    if (!p || p.closing) return;
    if (!force && this.time.now - p.openedAt < POPUP_MIN_OPEN) return;
    p.closing = true;
    p.timer.remove();
    this.popup = null;

    this.tweens.add({ targets: p.card, scale: 0.9, alpha: 0, duration: 200, ease: 'Quad.easeIn', onComplete: () => p.card.destroy() });
    this.tweens.add({ targets: p.overlay, alpha: 0, duration: 250, onComplete: () => p.overlay.destroy() });

    // Progress is updated right away so the next tile is ready immediately.
    this.count++;
    this.countText.setText(`${this.count} / 6`);
    this.tweens.add({ targets: this.countText, scale: 1.15, duration: 140, yoyo: true });
    this.drawProgress();
    this.center.count.setText(`${this.count} / 6`);
    this.sendSpark(p.t);

    if (this.count < 6) {
      this.next++;
      this.state = 'ready';
      this.activate(this.tiles[this.next]);
    } else {
      this.unlockCenter();
    }
  }

  // Cosmetic: a spark flies from the tile into the centre and lights one edge.
  sendSpark(t) {
    const target = polar(R * 0.87, ANGLES[t.i]);
    const spark = this.add.image(t.x, t.y, 'glow').setTint(t.kw.color).setScale(0.6);
    this.tweens.add({
      targets: spark, x: CX + target.x, y: CY + target.y, scale: 0.3, duration: 420, ease: 'Cubic.easeIn',
      onComplete: () => {
        spark.destroy();
        this.burster.explode(14, CX + target.x, CY + target.y);
        this.edges[t.i] = true;
        this.drawCenter();
      }
    });
  }

  // ---------- centre ----------

  createCenter() {
    const c = this.add.container(CX, CY);
    const g = this.add.graphics();
    const arcs = this.add.graphics();
    [[0, 70], [120, 190], [240, 310]].forEach(([a, b]) => strokeArc(arcs, 112, a, b, 4, COLORS.tech, 0.7));
    for (let k = 0; k < 30; k++) strokeArc(arcs, 98, k * 12, k * 12 + 5, 2, 0xffffff, 0.25);
    const icon = addText(this, 0, -34, '✦', { size: 56, color: CSS.gold }).setAlpha(0.5);
    const count = addText(this, 0, 30, '0 / 6', { font: 'head', size: 40, weight: 'bold', color: '#C9D1EA' });
    const label = addText(this, 0, 32, 'TOUCH TO\nILLUMINATE', { font: 'head', size: 30, weight: 'bold', color: CSS.gold, spacing: 2, lineSpacing: 0 }).setVisible(false);
    c.add([g, arcs, icon, count, label]);

    g.setInteractive({ hitArea: new Phaser.Geom.Polygon(hexPoints(R)), hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true });
    g.on('pointerdown', () => this.onCenter());

    const spin = this.tweens.add({ targets: arcs, angle: 360, duration: 12000, repeat: -1 });
    this.center = { c, g, arcs, icon, count, label, spin };
    this.drawCenter();
  }

  drawCenter() {
    const g = this.center.g;
    const pts = hexPoints(R);
    g.clear();
    g.fillStyle(0x000000, 0.12);
    g.fillPoints(hexPoints(R, 0, 10), true);
    g.fillStyle(COLORS.navy, 1);
    g.fillPoints(pts, true);
    g.lineStyle(4, 0x3c4c7a, 1);
    g.strokePoints(pts, true);
    this.edges.forEach((on, i) => {
      if (!on) return;
      const a = polar(R - 3, ANGLES[i] - 30);
      const b = polar(R - 3, ANGLES[i] + 30);
      g.lineStyle(9, KEYWORDS[i].color, 1);
      g.lineBetween(a.x, a.y, b.x, b.y);
    });
    if (this.state === 'unlocked' || this.state === 'done') {
      g.lineStyle(3, COLORS.gold, 0.8);
      g.strokePoints(hexPoints(R - 18), true);
    }
  }

  unlockCenter() {
    this.state = 'unlocked';
    sfx.success();
    const ctr = this.center;
    ctr.spin.timeScale = 3;
    ctr.count.setVisible(false);
    ctr.icon.setAlpha(1);
    ctr.label.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: ctr.label, alpha: 1, duration: 400, delay: 300 });
    this.tweens.add({ targets: this.centerGlow, alpha: 0.9, duration: 600, delay: 300 });
    this.time.delayedCall(450, () => {
      this.drawCenter();
      this.burster.explode(60, CX, CY);
      this.tiles.forEach((t, k) => this.tweens.add({ targets: t.c, scale: 1.07, duration: 150, delay: k * 60, yoyo: true }));
    });
    this.centerPulses = [
      this.tweens.add({ targets: this.centerGlow, scale: 4.2, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
      this.tweens.add({ targets: ctr.c, scale: 1.06, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
      this.tweens.add({ targets: ctr.icon, angle: 360, duration: 6000, repeat: -1 })
    ];
    this.setDefaultHint();
  }

  onCenter() {
    if (this.state === 'popup') { this.closePopup(); return; }
    if (this.state === 'unlocked') { this.illuminate(); return; }
    if (this.state === 'ready') this.wrong(this.center.c, `Reveal all six keywords first (${this.count} / 6)`);
  }

  illuminate() {
    this.state = 'done';
    sfx.riser();
    this.hint.setText('');
    this.centerPulses.forEach((tw) => tw.stop());
    this.center.spin.timeScale = 10;
    this.rings.tweens.forEach((tw) => { tw.timeScale = 8; });

    // Beams of light from every tile into the centre.
    const b = this.beams;
    this.tiles.forEach((t) => {
      b.lineStyle(8, t.kw.color, 0.9);
      b.lineBetween(t.x, t.y, CX, CY);
    });
    b.setAlpha(0);
    this.tweens.add({ targets: b, alpha: 1, duration: 100, yoyo: true, repeat: 3, onComplete: () => b.setAlpha(1) });

    this.tiles.forEach((t) => {
      this.tweens.add({ targets: t.c, x: CX + (t.x - CX) * 0.6, y: CY + (t.y - CY) * 0.6, scale: 0.8, duration: 1600, ease: 'Cubic.easeIn' });
    });
    this.tweens.add({ targets: this.center.c, scale: 1.25, duration: 1600, ease: 'Cubic.easeIn' });
    this.tweens.add({ targets: this.centerGlow, scale: 16, alpha: 1, duration: 1800, ease: 'Cubic.easeIn' });
    this.tweens.add({
      targets: this.flash, alpha: 1, duration: 600, delay: 1250,
      onComplete: () => {
        sfx.boom();
        this.scene.start('Reveal');
      }
    });
  }

  // ---------- helpers ----------

  advance() {
    if (this.state === 'popup') return this.closePopup();
    if (this.state === 'building') { this.queued = true; return; }
    if (this.state === 'unlocked') return this.illuminate();
    if (this.state === 'ready') this.revealTile(this.tiles[this.next]);
  }

  wrong(c, msg) {
    sfx.denied();
    if (!c.shaking) {
      c.shaking = true;
      const x0 = c.x;
      this.tweens.add({
        targets: c, x: x0 + 12, duration: 45, yoyo: true, repeat: 3,
        onComplete: () => { c.x = x0; c.shaking = false; }
      });
    }
    // Point at where to tap instead.
    const target = this.state === 'unlocked' ? this.center.c : this.tiles[this.next].c;
    this.tweens.add({ targets: target, scale: 1.12, duration: 140, yoyo: true });

    this.hint.setText(msg).setColor(CSS.red);
    if (this.hintTimer) this.hintTimer.remove();
    this.hintTimer = this.time.delayedCall(1600, () => this.setDefaultHint());
  }

  setDefaultHint() {
    const msg = this.state === 'unlocked'
      ? 'All six revealed – touch the centre to illuminate'
      : `Touch the glowing tile to reveal keyword ${this.next + 1}`;
    this.hint.setText(msg).setColor(CSS.navy);
  }
}
