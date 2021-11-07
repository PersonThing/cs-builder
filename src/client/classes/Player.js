import LivingSprite from './LivingSprite.js'

export default class Player extends LivingSprite {
  constructor(world, getEnemies, getAllies, config, audioOnDeath, graphics, abilities, x, y, levelGrid, showPaths) {
    super(world, getEnemies, getAllies, config, audioOnDeath, graphics, abilities, x, y, levelGrid, showPaths)

    this.inventory = [] // TODO: populate this from character
  }

  onTick(time, pressedKeys, pointerPosition) {
    // keys is map of key = true|false (whether its pressed or not)
    // abilities is array of { id, key }
    if (this.nextGcd < time && pressedKeys.length) {
      this.abilities?.find(a => pressedKeys.includes(a.config.key) && a.nextFire < time)?.use(pointerPosition)
      this.nextGcd = time + this.config.gcd
    }
    super.onTick()
  }

  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage)
    this.drawHealthBar()
    if (this.health <= 0) {
      this.playAudioOnDeath()
      this.setTint(0xff0000)
      this.dead = true
    }
  }
}
