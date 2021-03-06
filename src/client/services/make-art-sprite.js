import * as PIXI from 'pixi.js'

export default function makeArtSprite(art) {
  const texture = PIXI.Texture.from(art.png)
  if (art.animated) {
    let frameX = 0
    let textureFrames = []
    while (frameX < art.width) {
      const textureFrame = texture.clone()
      textureFrame.frame = new PIXI.Rectangle(frameX, 0, art.frameWidth, art.height)
      textureFrame.updateUvs()
      textureFrames.push(textureFrame)
      frameX += art.frameWidth
    }
    const animation = new PIXI.AnimatedSprite(textureFrames)
    animation.animationSpeed = art.frameRate / 60
    animation.play()
    return animation
  } else {
    const sprite = new PIXI.Sprite(texture)
    return sprite
  }
}
