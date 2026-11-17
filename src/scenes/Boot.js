import { Scene } from 'phaser';
import { makeTextures } from '../textures.js';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('naac', 'assets/naac.webp');
    this.load.image('ugc', 'assets/ugc.webp');
  }

  create() {
    makeTextures(this);
    this.scene.start('Background');
  }
}
