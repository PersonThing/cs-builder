export default class Block extends PIXI.Sprite {
  constructor(project, { id, x, y }, gridSize) {
    const blockConfig = project.blocks[id]
    const art = project.art[blockConfig.graphic]
    super(PIXI.Texture.from(art.png))

    this.x = x * gridSize
    this.y = y * gridSize
  }
}
