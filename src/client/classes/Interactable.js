import * as PIXI from 'pixi.js'
import audioService from '../services/audio-service.js'
import parseKidScript from '../services/kid-script-parser.js'

export default class Interactable extends PIXI.Sprite {
  constructor(interactableConfig, art, audioOnCollision, { id, x, y }, gridSize) {
    super(PIXI.Texture.from(art.png))

    this.audioOnCollision = audioOnCollision
    this.config = {
      ...interactableConfig,
      id,
      x,
      y,
      width: art.width, // for radius collision checks
    }

    this.x = x * gridSize + gridSize / 4
    this.y = y * gridSize + gridSize / 4

    // run our interactable.config.onCollision code
    const customOnCollisionHandler = Function('interactable', 'sprite', 'world', 'PIXI', parseKidScript(interactableConfig.onCollision))
    this.onCollision = (sprite, world) => {
      if (this.audioOnCollision?.data?.base64) {
        audioService.play(this.audioOnCollision.data.base64, this.audioOnCollision.start)
      }
      customOnCollisionHandler(this, sprite, world, PIXI)
    }
  }

  getTouchRadius() {
    return this.config.width / 2
  }

  isWithinRange(sprite, distance) {
    return this.getDistanceTo(sprite) < distance
  }

  getSquaredDistanceTo(sprite) {
    const a = sprite.x - this.x
    const b = sprite.y - this.y
    return a * a + b * b
  }

  getDistanceTo(sprite) {
    return Math.sqrt(this.getSquaredDistanceTo(sprite))
  }
}
