import * as PIXI from 'pixi.js'

export default class Block extends PIXI.Sprite {
  constructor(block, art, levelBlockConfig, gridSize) {
    super(PIXI.Texture.from(art.png))

    this.config = {
      ...block,
      ...levelBlockConfig,
    }
    this.x = levelBlockConfig.x * gridSize
    this.y = levelBlockConfig.y * gridSize
  }
}
