import LivingSprite from './LivingSprite.js'

export default class Player extends LivingSprite {
  constructor(world, getEnemies, getAllies, character, characterClass, audioOnDeath, graphics, abilities, x, y, levelGrid, showPaths) {
    super(world, character.name, getEnemies, getAllies, characterClass, audioOnDeath, graphics, abilities, x, y, levelGrid, showPaths)

    this.character = character
    if (isNaN(this.character.currency)) this.character.currency = 0
    if (this.character.inventory == null) this.character.inventory = []

    this.maxHealth = characterClass.health ?? 0
    this.maxPower = characterClass.power ?? 0
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
