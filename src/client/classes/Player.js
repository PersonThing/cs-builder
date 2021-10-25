import * as PIXI from 'pixi.js'
import LivingSprite from './LivingSprite.js'
import Projectile from './Projectile.js'

export default class Player extends LivingSprite {
  constructor(player, config, x, y, levelGrid, showPaths, rendererWidth, rendererHeight) {
    super(player, config, x, y, levelGrid, showPaths)

    this.drawAbilityBar(0, rendererHeight / 2)
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
          const projectile = new Projectile(this.world, a, this.x, this.y, pointerPosition.x, pointerPosition.y, time)
          this.world.projectileContainer.addChild(projectile)
        })
    }

    super.onTick()
  }

  drawAbilityBar(barX, barY) {
    const barWidth = this.config.abilities.length * 50
    const barHeight = 50

    this.abilityBar = new PIXI.Container()
    this.abilityBar.x = barX - barWidth / 2
    this.abilityBar.y = barY - barHeight - 15
    this.addChild(this.abilityBar)

    // background
    const abilityBarBackground = new PIXI.Graphics()
    abilityBarBackground.lineStyle(5, 0x000000)
    abilityBarBackground.beginFill(0x000000, 0.5)
    abilityBarBackground.drawRect(0, 0, barWidth, barHeight)
    this.abilityBar.addChild(abilityBarBackground)

    let x = 0
    this.config.abilities.forEach((ability, i) => {
      // art
      if (ability.art) {
        const abilityArt = new PIXI.Sprite(PIXI.Texture.from(ability.art.png))
        abilityArt.x = x + 5
        abilityArt.y = 5
        this.abilityBar.addChild(abilityArt)
      }

      // key
      if (ability.key) {
        const keyText = new PIXI.Text(ability.key.toUpperCase(), {
          fontFamily: 'consolas',
          fontSize: 24,
          strokeThickness: 3,
          stroke: 0x000000,
          fill: 0xffffff,
        })
        keyText.x = x + 5 + 12
        keyText.y = 5
        this.abilityBar.addChild(keyText)
      }

      x += 50
    })
  }

  destroy() {
    // this.removeChild(this.abilityBar)
    this.parent.removeChild(this)
    this.abilityBar.destroy()
    super.destroy()
  }
}
