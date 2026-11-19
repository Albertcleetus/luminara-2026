import { Game, AUTO, Scale } from 'phaser';
import { Boot } from './scenes/Boot.js';
import { Background } from './scenes/Background.js';
import { Attract } from './scenes/Attract.js';
import { Intro } from './scenes/Intro.js';
import { Honeycomb } from './scenes/Honeycomb.js';
import { Reveal } from './scenes/Reveal.js';
import { preloadSamples } from './audio.js';

// Start fetching the recorded sound files right away.
preloadSamples();

const config = {
  type: AUTO,
  width: 1920,
  height: 1080,
  parent: 'game-container',
  backgroundColor: '#FBF6F2',
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
    fullscreenTarget: 'game-container'
  },
  // Background renders underneath; the others are started by the flow.
  scene: [Boot, Background, Attract, Intro, Honeycomb, Reveal]
};

// Wait for the web fonts so Phaser text doesn't render in a fallback font.
async function loadFonts() {
  if (!document.fonts) return;
  const fonts = ['700 40px Oswald', '500 40px Oswald', '400 20px Poppins', '600 20px Poppins', '20px "Share Tech Mono"'];
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))), timeout]);
}

loadFonts().finally(() => {
  const game = new Game(config);
  if (import.meta.env.DEV) window.__game = game; // dev-only handle for testing
});
