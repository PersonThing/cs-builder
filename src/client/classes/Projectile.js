import * as PIXI from 'pixi.js'
import ParticleEmitter from './ParticleEmitter'
import makeArtSprite from '../services/make-art-sprite'
import audioService from '../services/audio-service'
import damageTypes from '../config/damage-types'

export default class Projectile extends PIXI.Container {
  constructor(world, source, getEnemies, ability, x, y, targetX, targetY, time) {
    super()

    this.source = source
    this.getEnemies = getEnemies
    this.ability = ability
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
    if (ability.projectileArt != null) {
      this.artSprite = makeArtSprite(ability.projectileArt)
      this.artSprite.anchor.set(0.5)
      this.addChild(this.artSprite)
    }

    // rotate toward target
    this._angle = Math.atan2(targetY - y, targetX - x)
    this.rotation = this._angle + (90 * Math.PI) / 180

    this.dying = false

    if (ability.particleArt) {
      // const particleTexture = ability.particleArt ? PIXI.Texture.from(ability.particleArt.png) : null
      const particleTexture = PIXI.Texture.from(ability.particleArt.png)
      this.particles = new ParticleEmitter(particleTexture, world.particleContainer, this.rotation, time)
      this.particles.move(this.x, this.y)
    }

    // TODO: visualization of path + range for debugging / demo?
    // const path = new PIXI.Graphics()
    // explosion.beginFill(0xff0000, 0.3)
    // explosion.drawCircle(this.x, this.y, this.config.areaDamageRadius)
    // explosion.zIndex = 1
  }

  onTick(time) {
    this.particles?.onTick(time)

    if (this.dying) return

    if (this.config.speed > 0) {
      // move toward target in straight line
      this.x += Math.cos(this._angle) * this.config.speed
      this.y += Math.sin(this._angle) * this.config.speed
      this.particles?.move(this.x, this.y)
    }

    // check for direct hits
    const touchingEnemies = this.getEnemies()
      ?.filter(e => e.config != null)
      .filter(e => e.isTouching(this))
    if (touchingEnemies.length) {
      touchingEnemies.forEach(e => this.applyDamage(e, true))
      this.destroy(true)
      return
    }

    // have we moved more than config.range from startx / y?
    if (this.getDistanceTo(this.startX, this.startY) > this.config.range) {
      this.destroy()
    }

    // have we run out of time?
    if (this.config.lifetimeMs > 0 && time > this.createdAtMs + this.config.lifetimeMs) {
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

  applyDamage(target, isDirectHit) {
    damageTypes[this.ability.damageType].applyDamage(this.source, target, this.ability, isDirectHit)
  }

  destroy(weHitSomething = false) {
    this.dying = true

    // before we're destroyed, we explode for area damage
    if (this.config.areaDamage > 0 && this.config.areaDamageRadius > 0) {
      // draw a circle indicating aoe radius.. later this could turn into an explosion animation setting or something
      const explosion = new PIXI.Graphics()
      explosion.beginFill(damageTypes[this.ability.damageType].color, 0.3)
      explosion.drawCircle(this.x, this.y, this.config.areaDamageRadius)
      explosion.zIndex = 1
      this.world.particleContainer.addChild(explosion)
      // remove the circle quickly
      setTimeout(() => {
        explosion.alpha = 0.5
      }, 50)
      setTimeout(() => {
        explosion.parent.removeChild(explosion)
        explosion.destroy()
      }, 100)

      // do area damage to enemies
      const enemiesInAreaDamageRadius = this.getEnemies()?.filter(e => e.isTouching(this, this.config.areaDamageRadius))
      enemiesInAreaDamageRadius.forEach(e => this.applyDamage(e, false))

      weHitSomething = weHitSomething || enemiesInAreaDamageRadius.length > 0
    }

    // if there's audio on hit and we hit something, play it
    if (weHitSomething && this.ability.audioOnHit?.data?.base64) {
      audioService.play(this.ability.audioOnHit.data.base64, this.ability.audioOnHit.start)
    }

    if (this.particles) {
      this.particles.stop()
      this.removeChild(this.artSprite)
      // wait max particle lifetime before removing particles, so they can fade out
      setTimeout(() => {
        this.world.particleContainer.removeChild(this.particles)
        this.particles.destroy()
        this.parent.removeChild(this)
        super.destroy()
      }, this.particles.getMaxLifetime() * 1000)
    } else {
      this.parent.removeChild(this)
      super.destroy()
    }
  }
}
