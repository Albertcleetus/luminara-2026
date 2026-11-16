import { Scene } from 'phaser';
import { makeTextures } from '../textures.js';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  create() {
    makeTextures(this);
    this.scene.start('Background');
  }
}
