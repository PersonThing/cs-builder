import LivingSprite from './LivingSprite.js'

export default class Enemy extends LivingSprite {
  constructor(project, config, x, y, levelGrid, showPaths) {
    super(project, config, x, y, levelGrid, showPaths)
  }
}
