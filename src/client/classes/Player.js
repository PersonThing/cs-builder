import LivingSprite from './LivingSprite.js'

export default class Player extends LivingSprite {
  constructor(player, config, x, y, levelGrid, showPaths) {
    super(player, config, x, y, levelGrid, showPaths)
  }
}
