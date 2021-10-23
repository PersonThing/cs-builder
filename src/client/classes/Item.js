export default class Item extends PIXI.Sprite {
  constructor(itemConfig, art, { id, x, y }, gridSize) {
    super(PIXI.Texture.from(art.png))

    this.config = itemConfig

    this.x = x * gridSize + gridSize / 4
    this.y = y * gridSize + gridSize / 4

    // run our item.config.onCollision code
    const customOnCollisionHandler = Function('item', 'sprite', itemConfig.onCollision)
    this.onCollision = sprite => customOnCollisionHandler(this, sprite)
  }
}
