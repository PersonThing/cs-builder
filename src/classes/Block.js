export default class Block extends PIXI.Sprite {
  constructor(project, { blockId, x, y }) {
    const blockConfig = project.blocks[blockId]
    const art = project.art[blockConfig.graphic]
    super(PIXI.Texture.from(art.png))

    this.x = x * art.width
    this.y = y * art.height
  }
}
