import * as PIXI from 'pixi.js'
import LivingSprite from './LivingSprite.js'

export default class Enemy extends LivingSprite {
  constructor(world, getEnemies, config, audioOnDeath, graphics, abilities, x, y, levelGrid, showPaths, showSightRadius) {
    super(world, getEnemies, config, audioOnDeath, graphics, abilities, x, y, levelGrid, showPaths)

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

  onTick(time) {
    if (this.abilities?.length) {
      const enemies = this.getEnemies()

      for (const e of enemies) {
        const canSeeResult = this.canSee(e)
        if (canSeeResult) {
          const distance = canSeeResult.distance
          const closestAbilityInRange = this.abilities
            .filter(a => a.nextFire < time && a.range > distance)
            .sort((a, b) => a.range - b.range)
            .shift()
          if (closestAbilityInRange) {
            closestAbilityInRange.nextFire = time + 1000 / closestAbilityInRange.attacksPerSecond
            setTimeout(() => {
              this.fireAbility(time, closestAbilityInRange, e.x, e.y)
            }, 500)
            break
          }
        }
      }
    }
    super.onTick()
  }
}
