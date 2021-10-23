export default class Block extends PIXI.Sprite {
  constructor(block, art, { id, x, y }, gridSize) {
    super(PIXI.Texture.from(art.png))

    this.x = x * gridSize
    this.y = y * gridSize
  }
}
