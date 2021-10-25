import * as PIXI from 'pixi.js'
import LivingSprite from './LivingSprite.js'

export default class Enemy extends LivingSprite {
  constructor(config, graphics, abilities, x, y, levelGrid, showPaths, showSightRadius) {
    super(config, graphics, abilities, x, y, levelGrid, showPaths)

    // render a little sight radius circle
    if (showSightRadius) {
      this.radiusPreview = new PIXI.Graphics()
      // this.radiusPreview.beginFill(0xff0000, 0.2)
      this.radiusPreview.lineStyle(2, 0xffffff, 0.2)
      this.radiusPreview.drawCircle(0, 0, config.sightRadius ?? 150)
      this.radiusPreview.zIndex = 1
      this.addChild(this.radiusPreview)
    }
  }
}
