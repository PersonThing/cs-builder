import * as PIXI from 'pixi.js'

import LivingSprite from './LivingSprite.js'

export default class Enemy extends LivingSprite {
  constructor(world, getEnemies, config, audioOnDeath, graphics, abilities, x, y, levelGrid, showPaths, showSightRadius) {
    super(world, getEnemies, config, audioOnDeath, graphics, abilities, x, y, levelGrid, showPaths)

    this.config.sightRadius = config.sightRadius ?? 150

    // render a little sight radius circle
    if (showSightRadius) {
      this.drawSightRadius()
    }
  }

  onTick(time) {
    if (this.nextGcd < time && this.abilities?.length) {
      const closestVisibleEnemy = this.getClosestVisibleEnemyInRange(this.config.sightRadius)
      if (closestVisibleEnemy) {
        const distance = closestVisibleEnemy.distance
        const closestAbilityInRange = this.abilities
          .filter(a => a.nextFire < time && a.config.range > distance)
          .sort((a, b) => a.config.range - b.config.range)
          .shift()

        if (closestAbilityInRange) {
          closestAbilityInRange.nextFire = time + 1000 / closestAbilityInRange.usePerSecond
          setTimeout(() => closestAbilityInRange.use(closestVisibleEnemy.enemy), 500)
        }

        this.setTarget(closestVisibleEnemy.enemy)
      }
      this.nextGcd = time + this.config.gcd || 0
    }
    super.onTick()
  }

  drawSightRadius() {
    this.radiusPreview = new PIXI.Graphics()
    // this.radiusPreview.beginFill(0xff0000, 0.2)
    this.radiusPreview.lineStyle(2, 0xffffff, 0.2)
    this.radiusPreview.drawCircle(0, 0, this.config.sightRadius)
    this.radiusPreview.zIndex = 1
    this.addChild(this.radiusPreview)
  }
}
