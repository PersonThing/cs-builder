import LivingSprite from './LivingSprite.js'
import Projectile from './Projectile.js'

export default class Player extends LivingSprite {
  constructor(player, config, x, y, levelGrid, showPaths) {
    super(player, config, x, y, levelGrid, showPaths)
  }

  onTick(time, keys, pointerPosition) {
    // keys is map of key = true|false (whether its pressed or not)
    // abilities is array of { id, key }
    if (this.config.abilities?.length) {
      const pressedKeys = Object.keys(keys).filter(k => keys[k])
      this.config.abilities
        .filter(a => pressedKeys.includes(a.key) && a.nextFire < time)
        .forEach(a => {
          a.nextFire = time + 1000 / a.attacksPerSecond
          const projectile = new Projectile(this.world, a, this.x, this.y, pointerPosition.x, pointerPosition.y)
          this.world.abilityContainer.addChild(projectile)
        })
    }

    super.onTick()
  }
}
