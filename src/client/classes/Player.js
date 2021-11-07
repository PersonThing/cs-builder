import LivingSprite from './LivingSprite.js'

export default class Player extends LivingSprite {
  constructor(world, getEnemies, getAllies, character, characterClass, audioOnDeath, graphics, abilities, x, y, levelGrid, showPaths) {
    super(world, character.name, getEnemies, getAllies, characterClass, audioOnDeath, graphics, abilities, x, y, levelGrid, showPaths)

    this.character = character
    if (isNaN(this.character.currency)) this.character.currency = 0
    if (this.character.inventory == null) this.character.inventory = []

    this.maxHealth = characterClass.health ?? 0
    this.maxPower = characterClass.power ?? 0

    this.onItemPickupListeners = []
    this.onCurrencyPickupListeners = []
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

  pickupCurrency(amount) {
    this.character.currency += amount
    this.onCurrencyPickupListeners.forEach(l => l())
    this.character.dirty = true
  }

  pickupItem(item) {
    // find first null slot in inventory
    const emptySlotIndex = this.character.inventory.findIndex(i => i == null)
    if (emptySlotIndex != -1) {
      this.character.inventory[emptySlotIndex] = item
    } else if (this.character.inventory.length < 50) {
      this.character.inventory.push(item)
    }
    this.onItemPickupListeners.forEach(l => l())
    this.character.dirty = true
  }

  addItemPickupListener(listener) {
    this.onItemPickupListeners.push(listener)
  }

  addCurrencyPickupListener(listener) {
    this.onCurrencyPickupListeners.push(listener)
  }

  equipItem(index) {
    const item = this.inventory[index]
    // remove from inventory
    // add to equipped
    this.character.dirty = true
  }

  dropItem(index) {
    // todo: drop it on ground so someone else can pick up instead of just deleting it
    this.inventory[index] = null
    this.character.dirty = true
  }
}
