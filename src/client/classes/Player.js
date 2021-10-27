import * as PIXI from 'pixi.js'
import makeArtSprite from '../services/make-art-sprite.js'
import LivingSprite from './LivingSprite.js'

export default class Player extends LivingSprite {
  constructor(world, getEnemies, config, graphics, abilities, x, y, levelGrid, showPaths, rendererWidth, rendererHeight) {
    super(world, getEnemies, config, graphics, abilities, x, y, levelGrid, showPaths)
    this.drawAbilityBar(0, rendererHeight / 2)
  }

  onTick(time, keys, pointerPosition) {
    // keys is map of key = true|false (whether its pressed or not)
    // abilities is array of { id, key }
    if (this.abilities?.length) {
      const pressedKeys = Object.keys(keys).filter(k => keys[k])
      this.abilities
        .filter(a => pressedKeys.includes(a.key) && a.nextFire < time)
        .forEach(a => this.fireAbility(time, a, pointerPosition.x, pointerPosition.y))
    }
    super.onTick()
  }

  drawAbilityBar(barX, barY) {
    const buttonWidth = 45
    const buttonHeight = 45
    const buttonPadding = 10
    const barWidth = this.abilities.length * (buttonWidth + buttonPadding + buttonPadding)
    const barHeight = buttonHeight + buttonPadding

    this.abilityBar = new PIXI.Container()
    this.abilityBar.x = barX - barWidth / 2
    this.abilityBar.y = barY - barHeight - 15
    this.addChild(this.abilityBar)

    let x = 0
    this.abilities.forEach((ability, i) => {
      const bg = new PIXI.Graphics()
      bg.x = x
      bg.y = 0
      bg.lineStyle(5, 0x000000)
      bg.beginFill(0x000000, 0.5)
      bg.drawRect(0, 0, buttonWidth, buttonHeight)
      this.abilityBar.addChild(bg)

      // art
      const art = ability.projectileArt ? ability.projectileArt : ability.characterArt ? ability.characterArt : null
      if (art) {
        const abilityArt = makeArtSprite(art) // new PIXI.Sprite(PIXI.Texture.from(art))
        abilityArt.x = x + buttonWidth / 2
        abilityArt.y = buttonHeight / 2
        abilityArt.anchor.set(0.5)
        this.abilityBar.addChild(abilityArt)
      }

      // key text
      if (ability.key) {
        const keyText = new PIXI.Text(ability.key.toUpperCase(), {
          fontFamily: 'consolas',
          fontSize: 24,
          strokeThickness: 3,
          stroke: 0x000000,
          fill: 0xffffff,
        })
        keyText.x = x + buttonWidth / 2 - keyText.width / 2
        keyText.y = -buttonHeight / 2
        this.abilityBar.addChild(keyText)
      }

      // ability name text
      const nameText = new PIXI.Text(ability.name, {
        fontFamily: 'consolas',
        fontSize: 14,
        strokeThickness: 4,
        stroke: 0x000000,
        fill: 0xffffff,
      })
      nameText.x = x + buttonWidth / 2 - nameText.width / 2
      nameText.y = buttonHeight
      this.abilityBar.addChild(nameText)

      x += buttonWidth + buttonPadding + buttonPadding
    })
  }

  destroy() {
    this.abilityBar.parent.removeChild(this.abilityBar)
    this.abilityBar.destroy()
    super.destroy()
  }

  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage)
    this.drawHealthBar()
    if (this.health <= 0) {
      this.setTint(0xff0000)
      this.dead = true
    }
  }
}
