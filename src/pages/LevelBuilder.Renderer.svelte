<div
  bind:this={pixiContainer}
  class="pixi-container"
  on:pointerdown|preventDefault
  on:pointerup|preventDefault
  on:pointermove|preventDefault
  on:contextmenu|preventDefault
/>

<!-- <div style="position: absolute; top: 10px; left: 10px; color: red;">{debugInfo}</div> -->
<script>
  import { onMount } from 'svelte'
  import { rgbaStringToHex } from '../services/rgba-to-hex.js'
  import project from '../stores/active-project-store'

  let pixiContainer
  let pixiApp
  let world
  let player

  export let level
  export let screenTarget

  onMount(() => {
    pixiApp = new PIXI.Application({
      resizeTo: pixiContainer,
    })
    pixiContainer.appendChild(pixiApp.view)
    pixiApp.ticker.add(onTick)
  })

  $: if (pixiApp && level) renderLevel(level)

  function renderLevel(level) {
    pixiApp.renderer.backgroundColor = rgbaStringToHex(level.backgroundColor)
    pixiApp.stage.children.forEach(c => pixiApp.stage.removeChild(c))

    world = new PIXI.Container()

    for (const blockConfig of level.blocks) {
      const block = $project.blocks[blockConfig.blockId]
      const art = $project.art[block.graphic]
      let blockSprite = PIXI.Sprite.from(art.png)
      blockSprite.x = blockConfig.x * art.width
      blockSprite.y = blockConfig.y * art.height
      blockSprite.template = block
      world.addChild(blockSprite)
    }

    pixiApp.stage.addChild(world)

    renderPlayer()
  }

  PIXI.Container.prototype.bringToFront = function () {
    if (this.parent) {
      const parent = this.parent
      parent.removeChild(this)
      parent.addChild(this)
    }
  }

  let stillSprite
  let movingSprite
  function renderPlayer() {
    if (player) {
      player.bringToFront()
      return
    }

    const playerConfig = $project.characters[0]
    stillSprite = makeArtSprite(playerConfig.graphics.still)
    stillSprite.anchor.set(0.5)
    movingSprite = makeArtSprite(playerConfig.graphics.moving)
    movingSprite.anchor.set(0.5)
    player = new PIXI.Container()
    player.addChild(stillSprite)

    player.x = 0
    player.y = 0
    pixiApp.stage.addChild(player)
  }

  function makeArtSprite(artId) {
    const art = $project.art[artId]
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
      return new PIXI.Sprite(texture)
    }
  }

  const speed = 5
  let queuedTargets = []
  let target = null
  const screenCenter = {
    x: 0,
    y: 0,
  }

  $: if (screenTarget.x != 0 || screenTarget.y != 0) computePath()

  function computePath() {
    const worldCoordinatesClicked = {
      x: screenTarget.x - screenCenter.x + player?.x ?? 0,
      y: screenTarget.y - screenCenter.y + player?.y ?? 0,
    }

    // TODO:
    // make it compute a path around any blocks in the way
    // if no path available, get as close as possible to clicked point

    queuedTargets = [
      worldCoordinatesClicked,

      // uncomment to demonstrate target queue
      {
        x: player.x,
        y: player.y,
      },
    ]

    targetNextInQueue()
  }

  function targetNextInQueue() {
    target = queuedTargets.shift()
  }

  function onTick() {
    screenCenter.x = pixiApp.renderer.width / 2
    screenCenter.y = pixiApp.renderer.height / 2

    if (target == null) targetNextInQueue()
    if (target != null) {
      // change to moving texture
      setPlayerMoving(true)

      // move player toward target
      const run = target.x - player.x
      const rise = target.y - player.y
      const length = Math.sqrt(rise * rise + run * run)
      const xChange = (run / length) * speed
      const yChange = (rise / length) * speed

      // change player position
      const canHitTargetX = Math.abs(target.x - player.x) <= xChange
      const canHitTargetY = Math.abs(target.y - player.y) <= yChange
      player.x = canHitTargetX ? target.x : player.x + xChange
      player.y = canHitTargetY ? target.y : player.y + yChange

      // if we're not going to hit target on this frame, rotate player sprite
      // without this check, it'll rotate the wrong direction if it hits the target in 1 axis but not the other
      if (!canHitTargetX && !canHitTargetY) {
        player.rotation = Math.atan2(rise / length, run / length) + (90 * Math.PI) / 180
      }

      // if we're hitting our target on this frame, start moving toward the next target
      if (canHitTargetX && canHitTargetY) targetNextInQueue()
    } else {
      setPlayerMoving(false)
    }

    pixiApp.stage.x = screenCenter.x
    pixiApp.stage.y = screenCenter.y
    pixiApp.stage.pivot.x = player.x
    pixiApp.stage.pivot.y = player.y
  }

  const currentSprite = null
  function setPlayerMoving(moving) {
    const shouldBeSprite = moving ? movingSprite : stillSprite
    if (shouldBeSprite != currentSprite) {
      player.children.forEach(c => player.removeChild(c))
      player.addChild(shouldBeSprite)
    }
  }
</script>

<style>
  .pixi-container {
    width: 100%;
    height: 100%;
  }
</style>
