export default class Item extends PIXI.Sprite {
  constructor(itemConfig, art, { id, x, y }, gridSize) {
    super(PIXI.Texture.from(art.png))

    this.config = {
      ...itemConfig,
      id,
      x,
      y,
      width: art.width, // for radius collision checks
    }

    this.x = x * gridSize + gridSize / 4
    this.y = y * gridSize + gridSize / 4

    // run our item.config.onCollision code
    const customOnCollisionHandler = Function('item', 'sprite', 'world', itemConfig.onCollision)
    this.onCollision = (sprite, world) => customOnCollisionHandler(this, sprite, world)
  }

  getTouchRadius() {
    return this.config.width / 2
  }

  isWithinRange(sprite, distance) {
    return this.getDistanceTo(sprite) < distance
  }

  getDistanceTo(sprite) {
    const a = sprite.x - this.x
    const b = sprite.y - this.y
    return Math.sqrt(a * a + b * b)
  }
}
