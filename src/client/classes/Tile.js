import * as PIXI from 'pixi.js'

export default class Tile extends PIXI.Sprite {
  constructor(tile, art, levelTileConfig, gridSize) {
    super(PIXI.Texture.from(art.png))

    this.config = {
      ...tile,
      ...levelTileConfig,
    }
    this.x = levelTileConfig.x * gridSize
    this.y = levelTileConfig.y * gridSize
  }
}
