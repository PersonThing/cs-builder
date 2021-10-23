import makeArtSprite from '../services/make-art-sprite.js'

export default class LivingSprite extends PIXI.Container {
  constructor(graphics, config, x, y, levelGrid, showPaths) {
    super()
    this.x = x
    this.y = y

    this.sortableChildren = true
    this.config = config
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

    this.path = []
    this.target = null
    this.zIndex = 2

    this.levelGrid = levelGrid
    this.showPaths = showPaths
  }

  bringToFront() {
    // todo: check if we're already at the front?
    if (!this.parent) return

    this.parent.removeChild(this)
    this.parent.addChild(this)
  }

  setMoving(isMoving) {
    if (this.isMoving == isMoving) return

    this.isMoving = isMoving
    this.sprites.still.visible = !isMoving
    this.sprites.moving.visible = isMoving
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

  setTarget(target) {
    if (target == null) {
      this.path = []
      this.target = null
      this.endTarget = null
      return
    }
    if (target.x == this.x && target.y == this.y) return
    // don't recompute path if target position hasn't changed
    // if (this.endTarget?.x == target.x && this.endTarget?.y == target.y) return
    this.endTarget = target

    // make it compute a path around any blocks in the way
    // if no path available, get as close as possible to clicked point
    this.path = this.levelGrid.findPath(this.position, target)

    this.targetNextPathPoint()
  }

  targetNextPathPoint() {
    this.target = this.path.shift()
    if (this.target == null) this.endTarget = null
    else {
      this.sprites.rotation = Math.atan2(this.target.y - this.y, this.target.x - this.x) + (90 * Math.PI) / 180
    }
  }

  setTint(tint) {
    this.sprites.still.tint = tint
    this.sprites.moving.tint = tint
  }

  onTick() {
    this.moveTowardTarget()
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
}
