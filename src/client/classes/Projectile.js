import * as PIXI from 'pixi.js'
import ParticleEmitter from './ParticleEmitter'
import makeArtSprite from '../services/make-art-sprite'
import audioService from '../services/audio-service'
import damageTypes from '../config/damage-types'

export default class Projectile extends PIXI.Container {
  constructor(source, sourcePosition, config, target) {
    super()

    const time = performance.now()

    this.dying = false

    this.source = source
    this.createdAtMs = time
    this.config = config
    this.startPosition = {
      x: sourcePosition.x,
      y: sourcePosition.y,
    }
    this.x = this.startPosition.x
    this.y = this.startPosition.y
    this.target = target

    // make a sprite to represent projectile if ability has any art
    this.createProjectileArt()
    this.rotateToward(this.target)
    this.createParticles()

    this.onTicks = []
  }

  createProjectileArt() {
    if (this.config.graphics.projectile != null) {
      this.artSprite = makeArtSprite(this.config.graphics.projectile)
      this.artSprite.anchor.set(0.5)
      this.addChild(this.artSprite)
    }
  }

  rotateToward(target) {
    this._angle = Math.atan2(target.y - this.y, target.x - this.x)
    this.rotation = this._angle + (90 * Math.PI) / 180
  }

  createParticles() {
    if (this.config.graphics.particle) {
      // const particleTexture = ability.particleArt ? PIXI.Texture.from(ability.particleArt.png) : null
      const particleTexture = PIXI.Texture.from(this.config.graphics.particle.png)
      this.particles = new ParticleEmitter(particleTexture, this.source.world.particleContainer, this.rotation)
      this.particles.move(this.x, this.y)
    }
  }

  addOnTick(callback) {
    this.onTicks.push(callback)
  }

  onTick(time) {
    this.onTicks.forEach(callback => callback(time))
    this.particles?.onTick(time)

    if (this.dying) return

    if (this.config.speed > 0) {
      // move toward target in straight line
      this.x += Math.cos(this._angle) * this.config.speed
      this.y += Math.sin(this._angle) * this.config.speed
      this.particles?.move(this.x, this.y)
    }

    // check for direct hits
    if (!this.config.ignoreDirectHits) {
      const touchingEnemies = this.source
        .getEnemies()
        ?.filter(e => e.config != null)
        .filter(e => e.isTouching(this))
      if (touchingEnemies.length) {
        touchingEnemies.forEach(e => this.applyDamage(e, true))
        // TODO: optionally let projectile pierce an enemy to hit more enemies behind them, but don't do direct damage to the same enemy twice
        this.destroy(true)
        return
      }
    }

    // check for hits on solid tiles
    // could do here.. or could use collision stuff...
    if (!this.config.ignoreTiles) {
      const touchingTiles = this.source.world.tileContainer.children.filter(t => t.config != null && !t.config.canSee && this.isTouching(t))
      if (touchingTiles.length > 0) {
        this.destroy()
      }
    }

    // have we moved more than config.range from startPosition?
    if (this.getDistanceTo(this.startPosition) > this.config.range) {
      this.destroy()
    }

    // have we run out of time?
    if (this.config.lifetimeMs > 0 && time > this.createdAtMs + this.config.lifetimeMs) {
      this.destroy()
    }
  }

  // TODO: centralize
  isTouching(sprite, padDistance = 0) {
    let combinedRadius = this.getTouchRadius() + sprite.getTouchRadius()
    let distance = this.getDistanceTo(sprite)
    console.log(distance, combinedRadius + padDistance)
    return distance < combinedRadius + padDistance
  }

  getTouchRadius() {
    return this.width / 2
  }

  getDistanceTo(coords) {
    const a = coords.x - this.x
    const b = coords.y - this.y
    return Math.sqrt(a * a + b * b)
  }

  applyDamage(target, isDirectHit) {
    damageTypes[this.config.damageType].applyDamage(this.source, target, this.config, isDirectHit)
  }

  destroy(weHitSomething = false) {
    this.dying = true

    // before we're destroyed, we explode for area damage
    if (this.config.areaDamage > 0 && this.config.areaDamageRadius > 0) {
      // draw a circle indicating aoe radius.. later this could turn into an explosion animation setting or something
      this.drawAreaDamageCircle()

      // do area damage to enemies
      const enemiesInAreaDamageRadius = this.source.getEnemies()?.filter(e => e.isTouching(this, this.config.areaDamageRadius))
      enemiesInAreaDamageRadius.forEach(e => this.applyDamage(e, false))

      weHitSomething = weHitSomething || enemiesInAreaDamageRadius.length > 0
    }

    // if there's audio on hit and we hit something, play it
    if (weHitSomething && this.config.audioOnHit?.data?.base64) {
      audioService.play(this.config.audioOnHit.data.base64, this.config.audioOnHit.start)
    }

    if (this.particles) {
      this.particles.stop()
      this.removeChild(this.artSprite)
      // wait max particle lifetime before removing particles, so they can fade out
      setTimeout(() => {
        this.source.world.particleContainer.removeChild(this.particles)
        this.particles.destroy()
        this.parent?.removeChild(this)
        super.destroy()
      }, this.particles.getMaxLifetime() * 1000)
    } else {
      this.parent.removeChild(this)
      super.destroy()
    }
  }

  drawAreaDamageCircle() {
    const explosion = new PIXI.Graphics()
    explosion.beginFill(damageTypes[this.config.damageType].color, 0.3)
    explosion.drawCircle(this.x, this.y, this.config.areaDamageRadius)
    explosion.zIndex = 1
    this.source.world.particleContainer.addChild(explosion)
    // remove the circle quickly
    setTimeout(() => {
      explosion.alpha = 0.5
    }, 50)
    setTimeout(() => {
      explosion.parent.removeChild(explosion)
      explosion.destroy()
    }, 100)
  }
}
