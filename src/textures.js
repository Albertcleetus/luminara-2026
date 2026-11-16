// Generates all graphics at startup so the demo needs no image files.

export function makeTextures(scene) {
  const T = scene.textures;
  const canvas = (key, w, h, draw) => {
    if (T.exists(key)) return;
    const ct = T.createCanvas(key, w, h);
    draw(ct.getContext(), w, h);
    ct.refresh();
  };

  const radial = (c, cx, cy, r, stops) => {
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  };

  canvas('glow', 256, 256, (c) => {
    c.fillStyle = radial(c, 128, 128, 128, [
      [0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']
    ]);
    c.fillRect(0, 0, 256, 256);
  });

  canvas('spark', 48, 48, (c) => {
    c.fillStyle = radial(c, 24, 24, 24, [
      [0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']
    ]);
    c.fillRect(0, 0, 48, 48);
  });

  canvas('circle', 512, 512, (c) => {
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(256, 256, 254, 0, Math.PI * 2);
    c.fill();
  });

  canvas('ring', 512, 512, (c) => {
    c.strokeStyle = '#fff';
    c.lineWidth = 40;
    c.beginPath();
    c.arc(256, 256, 232, 0, Math.PI * 2);
    c.stroke();
  });

  // Halftone dot fan, big dots in the bottom-left corner fading out.
  canvas('dots', 560, 560, (c, w, h) => {
    c.fillStyle = '#fff';
    const s = 20;
    for (let y = s / 2; y < h; y += s) {
      for (let x = s / 2; x < w; x += s) {
        const r = (1 - Math.hypot(x, h - y) / w) * 7.5;
        if (r < 0.6) continue;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
    }
  });

  canvas('rays', 1024, 1024, (c) => {
    c.translate(512, 512);
    const n = 28;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, 512, a0, a0 + (Math.PI / n) * 0.6);
      c.closePath();
      c.fillStyle = radial(c, 0, 0, 512, [[0, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]);
      c.fill();
    }
  });

  // Pastel watercolour background (poster) with a faint hex grid (tech).
  canvas('bg', 1920, 1080, (c, w, h) => {
    c.fillStyle = '#FBF6F2';
    c.fillRect(0, 0, w, h);
    [
      [200, 250, 700, '255,170,195', 0.55],
      [150, 850, 600, '255,196,150', 0.45],
      [1750, 200, 650, '170,212,240', 0.5],
      [1700, 900, 700, '205,190,240', 0.4],
      [960, 540, 800, '255,240,220', 0.5],
      [1100, 1050, 500, '255,215,170', 0.35]
    ].forEach(([x, y, r, rgb, a]) => {
      c.fillStyle = radial(c, x, y, r, [[0, `rgba(${rgb},${a})`], [1, `rgba(${rgb},0)`]]);
      c.fillRect(0, 0, w, h);
    });

    const r = 46;
    const sx = r * 1.5;
    const sy = Math.sqrt(3) * r;
    c.strokeStyle = 'rgba(29,43,79,0.045)';
    c.lineWidth = 1;
    for (let col = -1; col * sx < w + r; col++) {
      for (let row = -1; row * sy < h + r; row++) {
        const cx = col * sx;
        const cy = row * sy + (col % 2 ? sy / 2 : 0);
        c.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = (Math.PI / 3) * i;
          if (i) c.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
          else c.moveTo(cx + r, cy);
        }
        c.stroke();
      }
    }
  });
}
