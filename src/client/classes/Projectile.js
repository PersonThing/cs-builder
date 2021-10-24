export default class Projectile extends PIXI.Container {
  constructor(world, ability, x, y, targetX, targetY) {
    super()

    this.world = world
    this.config = ability
    this.startX = x
    this.startY = y
    this.x = x
    this.y = y
    this.targetX = targetX
    this.targetY = targetY
    this.artSprite = new PIXI.Sprite(PIXI.Texture.from(ability.art.png))
    this.artSprite.anchor.set(0.5)
    this.addChild(this.artSprite)

    // this.graphics = new PIXI.Graphics()
    // this.graphics.beginFill(0xff0000, 0.2)
    // this.graphics.drawCircle(0, 0, 50)
    // this.graphics.zIndex = 1
    // this.addChild(this.graphics)

    // rotate toward target
    this._angle = Math.atan2(targetY - y, targetX - x)
    this.rotation = this._angle + (90 * Math.PI) / 180
  }

  onTick() {
    // move toward target in straight line
    this.x += Math.cos(this._angle) * this.config.speed
    this.y += Math.sin(this._angle) * this.config.speed

    // check if touching any enemies
    const touchingEnemies = this.world.enemyContainer.children.filter(e => e.config != null).filter(e => e.isTouching(this))

    if (touchingEnemies.length) {
      // TODO: handle areaDamage
      touchingEnemies.forEach(e => e.takeDamage(this.config.damage))

      // once it does damage, remove it all
      this.parent.removeChild(this)
      this.destroy()
      return
    }

    // have we moved more than config.range from startx / y?
    if (this.getDistanceTo(this.startX, this.startY) > this.config.range) {
      this.parent.removeChild(this)
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
}
