import LivingSprite from './LivingSprite.js'

export default class Enemy extends LivingSprite {
  constructor(graphics, config, x, y, levelGrid, showPaths, showSightRadius) {
    super(graphics, config, x, y, levelGrid, showPaths)

    // render a little sight radius circle
    if (showSightRadius) {
      this.radiusPreview = new PIXI.Graphics()
      this.radiusPreview.beginFill(0xff0000, 0.2)
      // radiusPreview.lineStyle(2, 0xffffff, 0.5)
      this.radiusPreview.drawCircle(0, 0, config.sightRadius ?? 150)
      this.radiusPreview.zIndex = 1
      this.addChild(this.radiusPreview)
    }
  }
}
