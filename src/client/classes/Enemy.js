import LivingSprite from './LivingSprite.js'

export default class Enemy extends LivingSprite {
  constructor(graphics, config, x, y, levelGrid, showPaths) {
    super(graphics, config, x, y, levelGrid, showPaths)
  }
}
