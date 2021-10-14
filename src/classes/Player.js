import makeArtSprite from '../services/make-art-sprite.js'

export default class Player extends PIXI.Container {
  constructor(project, config, x, y) {
    super()
    this.x = x
    this.y = y

    this.config = config
    this.speed = config.speed // so events can modify without affecting config

    this.stillSprite = makeArtSprite(project, config.graphics.still)
    this.stillSprite.anchor.set(0.5)
    this.movingSprite = makeArtSprite(project, config.graphics.moving)
    this.movingSprite.anchor.set(0.5)
    this.movingSprite.visible = false
    this.addChild(this.stillSprite)
    this.addChild(this.movingSprite)

    this.isMoving = false

    this.path = []
    this.target = null
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
    this.stillSprite.visible = !isMoving
    this.movingSprite.visible = isMoving
  }

  setTarget(target) {
    // make it compute a path around any blocks in the way
    // if no path available, get as close as possible to clicked point
    this.path = this.parent.levelGrid.findPath(this.position, target, this.config.smoothPathing)
    this.targetNextPathPoint()
  }

  targetNextPathPoint() {
    this.target = this.path.shift()
    if (this.target != null) {
      // rotate to face the target
      this.rotation = Math.atan2(this.target.y - this.y, this.target.x - this.x) + (90 * Math.PI) / 180
    }
  }

  onTick() {
    // move toward target/s
    if (this.target == null && this.path.length) {
      this.targetNextPathPoint()
    }

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
      if (canHitTargetX && canHitTargetY) {
        this.targetNextPathPoint()
      }
    } else {
      this.setMoving(false)
    }
  }
}
