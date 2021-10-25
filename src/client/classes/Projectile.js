import * as PIXI from 'pixi.js'
import ParticleEmitter from './ParticleEmitter'

export default class Projectile extends PIXI.Container {
  constructor(world, ability, x, y, targetX, targetY, time) {
    super()

    this.createdAtMs = time
    this.world = world
    this.config = ability
    this.startX = x
    this.startY = y
    this.x = x
    this.y = y
    this.targetX = targetX
    this.targetY = targetY

    // make a sprite to represent projectile if ability has any art
    const texture = ability.art != null ? PIXI.Texture.from(ability.art.png) : null
    if (texture != null) {
      this.artSprite = new PIXI.Sprite(texture)
      this.artSprite.anchor.set(0.5)
      this.addChild(this.artSprite)
    }

    // rotate toward target
    this._angle = Math.atan2(targetY - y, targetX - x)
    this.rotation = this._angle + (90 * Math.PI) / 180

    this.dying = false

    this.particles = new ParticleEmitter(texture, world.particleContainer, this.rotation, time)
    this.particles.move(this.x, this.y)
  }

  onTick(time) {
    this.particles.onTick(time)

    if (this.dying) return

    if (this.config.speed > 0) {
      // move toward target in straight line
      this.x += Math.cos(this._angle) * this.config.speed
      this.y += Math.sin(this._angle) * this.config.speed
      this.particles.move(this.x, this.y)
    }

    // check if touching any enemies
    const touchingEnemies = this.world.enemyContainer.children.filter(e => e.config != null).filter(e => e.isTouching(this))
    if (touchingEnemies.length) {
      touchingEnemies.forEach(e => e.takeDamage(this.config.damage))
      this.destroy()
      return
    }

    // have we moved more than config.range from startx / y?
    if (this.getDistanceTo(this.startX, this.startY) > this.config.range) {
      this.destroy()
    }

    // have we run out of time?
    if (time > this.createdAtMs + this.config.lifetimeMs) {
      this.destroy()
    }
  }

  getTouchRadius() {
    return this.width / 2
  }

  getDistanceTo(x, y) {
    const a = x - this.x
    const b = y - this.y
    return Math.sqrt(a * a + b * b)
  }

  destroy() {
    // before we're destroyed, we explode for area damage
    if (this.config.areaDamage > 0 && this.config.areaDamageRadius > 0) {
      // draw a circle indicating aoe radius.. later this could turn into an explosion animation setting or something
      const explosion = new PIXI.Graphics()
      explosion.beginFill(0xff0000, 0.3)
      explosion.drawCircle(this.x, this.y, this.config.areaDamageRadius)
      explosion.zIndex = 1
      this.world.particleContainer.addChild(explosion)
      // remove the circle quickly
      setTimeout(() => {
        this.world.particleContainer.removeChild(explosion)
        explosion.destroy()
      }, 40)

      // do area damage to enemies
      const enemiesInAreaDamageRadius = this.world.enemyContainer.children
        .filter(e => e.config != null)
        .filter(e => e.isTouching(this, this.config.areaDamageRadius))
      enemiesInAreaDamageRadius.forEach(e => e.takeDamage(this.config.areaDamage))
    }

    this.dying = true

    if (this.artSprite != null) {
      this.removeChild(this.artSprite)
    }
    this.particles.stop()

    setTimeout(() => {
      this.parent.removeChild(this)
      this.particles.destroy()
      super.destroy()
    }, 300)
  }
}
