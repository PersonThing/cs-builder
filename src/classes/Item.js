export default class Item extends PIXI.Sprite {
  constructor(project, { itemId, x, y }, gridSize) {
    const itemConfig = project.items[itemId]
    const art = project.art[itemConfig.graphics.still]
    super(PIXI.Texture.from(art.png))

    this.x = x * gridSize + gridSize / 4
    this.y = y * gridSize + gridSize / 4
  }
}
