import * as PIXI from 'pixi.js'
import makeArtSprite from '../services/make-art-sprite.js'
import Projectile from './Projectile.js'

export default class LivingSprite extends PIXI.Container {
  constructor(config, graphics, abilities, x, y, levelGrid, showPaths) {
    super()
    this.x = x
    this.y = y

    this.abilities = abilities

    this.sortableChildren = true
    this.config = config
    this.config.width = graphics.still.width // for radius collision checking
    this.speed = config.speed // so events can modify without affecting config

    this.sprites = new PIXI.Container()
    this.sprites.zIndex = 2
    this.addChild(this.sprites)
    this.sprites.still = makeArtSprite(graphics.still)
    this.sprites.still.anchor.set(0.5)
    this.sprites.addChild(this.sprites.still)
    this.sprites.moving = makeArtSprite(graphics.moving)
    this.sprites.moving.anchor.set(0.5)
    this.sprites.moving.visible = false
    this.sprites.addChild(this.sprites.moving)

    this.isMoving = false
    this.useAttackingSprite = false

    this.path = []
    this.target = null
    this.zIndex = 2

    this.levelGrid = levelGrid
    this.showPaths = showPaths

    // render a little health bar
    this.nameTag = new PIXI.Text(config.name, {
      fontFamily: 'consolas',
      fontSize: 12,
      strokeThickness: 3,
      stroke: 0x000000,
      fill: 0xffffff,
    })
    this.nameTag.zIndex = 4
    this.nameTag.y = -this.sprites.still.height / 2 - 15
    this.nameTag.x = -this.nameTag.width / 2
    this.addChild(this.nameTag)

    this.health = config.health
    this.healthBar = new PIXI.Graphics()
    this.drawHealthBar()
    this.healthBar.zIndex = 3
    this.addChild(this.healthBar)
    this.healthBar.width = this.nameTag.width
    this.healthBar.x = -this.nameTag.width / 2
    this.healthBar.y = this.nameTag.y - 10
  }

  bringToFront() {
    // todo: check if we're already at the front?
    if (!this.parent) return

    this.parent.removeChild(this)
    this.parent.addChild(this)
  }

  setMoving(isMoving) {
    this.isMoving = isMoving
  }

  showCorrectSprites() {
    this.sprites.still.visible = !this.isMoving && !this.useAttackingSprite
    this.sprites.moving.visible = this.isMoving && !this.useAttackingSprite
  }

  canSee(target) {
    // check distance between ourself and target
    // a^2 + b^2 = c^2
    // a = distance in x
    const a = this.x - target.x

    // b = distance in y
    const b = this.y - target.y

    // c = distance in straight line from x1,y1 to x2,y2
    const c = Math.sqrt(a * a + b * b)

    // check if we can find a visible path to target
    return c <= this.config.sightRadius && this.levelGrid.canSee(this.position, target)
  }

  clearPathAfterCurrentTarget() {
    this.path = []
  }

  stopMoving() {
    this.path = []
    this.target = null
    this.endTarget = null
  }

  setTarget(target) {
    if (target == null) {
      this.stopMoving()
      return
    }
    if (target.x == this.x && target.y == this.y) return
    // don't recompute path if target position hasn't changed
    // if (this.endTarget?.x == target.x && this.endTarget?.y == target.y) return
    this.endTarget = target

    // make it compute a path around any tiles in the way
    // if no path available, get as close as possible to clicked point
    this.path = this.levelGrid.findPath(this.position, target)

    this.targetNextPathPoint()
  }

  targetNextPathPoint() {
    this.target = this.path.shift()
    if (this.target == null) {
      this.endTarget = null
    } else {
      this.rotateToward(this.target.x, this.target.y)
    }
  }

  rotateToward(x, y) {
    this.sprites.rotation = Math.atan2(y - this.y, x - this.x) + (90 * Math.PI) / 180
  }

  getDistanceTo(sprite) {
    const a = sprite.x - this.x
    const b = sprite.y - this.y
    return Math.sqrt(a * a + b * b)
  }

  isTouching(sprite, padDistance = 0) {
    let combinedRadius = this.getTouchRadius() + sprite.getTouchRadius()
    let distance = this.getDistanceTo(sprite)
    return distance < combinedRadius + padDistance
  }

  getTouchRadius() {
    return (this.sprites.width * this.sprites.scale.x) / 2
  }

  setTint(tint) {
    this.sprites.still.tint = tint
    this.sprites.moving.tint = tint
  }

  setScale(scale) {
    this.sprites.scale.x = scale
    this.sprites.scale.y = scale
  }

  getScale() {
    return this.sprites.scale.x
  }

  onTick() {
    this.moveTowardTarget()
    this.showCorrectSprites()
  }

  moveTowardTarget() {
    if (this.target == null && this.path.length) {
      this.targetNextPathPoint()
    }

    this.drawPathLine()

    if (this.target) {
      // change to moving texture
      this.setMoving(true)

      // move player toward target
      const run = this.target.x - this.x
      const rise = this.target.y - this.y
      const length = Math.sqrt(rise * rise + run * run)
      let xChange = (run / length) * this.speed
      let yChange = (rise / length) * this.speed
      if (isNaN(xChange)) xChange = 0
      if (isNaN(yChange)) yChange = 0

      // change player position
      const canHitTargetX = Math.abs(this.target.x - this.x) <= xChange
      const canHitTargetY = Math.abs(this.target.y - this.y) <= yChange
      this.x = canHitTargetX ? this.target.x : this.x + xChange
      this.y = canHitTargetY ? this.target.y : this.y + yChange

      // if we hit our target on this frame, start moving toward the next target
      if (canHitTargetX && canHitTargetY) this.targetNextPathPoint()
    } else {
      this.setMoving(false)
    }
  }

  drawPathLine() {
    if (!this.showPaths) return

    if (this.pathLine == null) {
      this.pathLine = new PIXI.Graphics()
      this.pathLine.x = 0
      this.pathLine.y = 0
      this.pathLine.zIndex = 1
      this.parent.addChild(this.pathLine)
    } else {
      this.pathLine.clear()
    }

    if (this.target == null) return

    this.pathLine.moveTo(this.x, this.y)

    // line to current target
    this.pathLine.lineStyle(5, 0xffffff, 0.5)
    this.pathLine.lineTo(this.target.x, this.target.y)
    this.pathLine.drawCircle(this.target.x, this.target.y, 5)

    // line to each subsequent target
    this.pathLine.lineStyle(5, 0xffffff, 0.3)
    this.path.forEach(p => {
      this.pathLine.lineTo(p.x, p.y)
      this.pathLine.drawCircle(p.x, p.y, 5)
    })
  }

  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage)
    this.drawHealthBar()
    if (this.health <= 0) this.destroy()
  }

  drawHealthBar() {
    const healthPercent = this.health / this.config.health
    let color = 0x00ff00
    if (healthPercent < 0.3) {
      color = 0xff0000
    } else if (healthPercent < 0.6) {
      color = 0xffff00
    }
    this.healthBar.clear()
    this.healthBar.lineStyle(2, 0x000000)
    this.healthBar.beginFill(0x000000, 0.3)
    this.healthBar.drawRect(0, 0, this.nameTag.width, 10)
    this.healthBar.beginFill(color)
    this.healthBar.drawRect(0, 0, this.nameTag.width * healthPercent, 10)
  }

  destroy() {
    if (this.pathLine != null) {
      this.pathLine.parent.removeChild(this.pathLine)
      this.pathLine.destroy()
    }
    this.parent.removeChild(this)
    super.destroy()
  }

  fireAbility(time, ability, targetX, targetY) {
    ability.nextFire = time + 1000 / ability.attacksPerSecond

    this.rotateToward(targetX, targetY)

    // temporarily show this ability sprite
    if (ability.characterArt) {
      if (this.sprites.attacking) {
        this.sprites.removeChild(this.sprites.attacking)
        this.sprites.attacking.destroy()
      }
      this.sprites.attacking = makeArtSprite(ability.characterArt)
      this.sprites.attacking.loop = false
      this.sprites.attacking.anchor.set(0.5)
      // TODO: setting on characterAbility to say whether to ONLY show this sprite, or layer it on top
      // this.useAttackingSprite = true
      this.sprites.attacking.onComplete = () => {
        // this.useAttackingSprite = false
        this.sprites.removeChild(this.sprites.attacking)
      }
      this.sprites.addChild(this.sprites.attacking)
    }

    const projectile = new Projectile(this.world, ability, this.x, this.y, targetX, targetY, time)
    this.world.projectileContainer.addChild(projectile)
  }
}
