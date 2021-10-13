<div
  bind:this={pixiContainer}
  class="pixi-container"
  on:pointerdown|preventDefault
  on:pointerup|preventDefault
  on:pointermove|preventDefault
  on:contextmenu|preventDefault
/>

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

  PIXI.Sprite.prototype.bringToFront = function () {
    if (this.parent) {
      const parent = this.parent
      parent.removeChild(this)
      parent.addChild(this)
    }
  }

  function renderPlayer() {
    if (player) {
      player.bringToFront()
      return
    }

    const playerConfig = $project.characters[0]
    const playerArt = $project.art[playerConfig.graphics.still]
    player = PIXI.Sprite.from(playerArt.png)
    player.x = 0
    player.y = 0
    player.anchor.set(0.5)
    pixiApp.stage.addChild(player)
  }

  const speed = 5
  // let player = {
  //   x: 0,
  //   y: 0,
  // }

  const target = {
    x: 0,
    y: 0,
  }
  const screenCenter = {
    x: 0,
    y: 0,
  }

  $: if (screenTarget.x != 0 || screenTarget.y != 0) computeTarget()

  function computeTarget() {
    // translate click targets into world position
    target.x = screenTarget.x - screenCenter.x + player?.x ?? 0
    target.y = screenTarget.y - screenCenter.y + player?.y ?? 0
    console.log(target.x)
  }

  function onTick() {
    screenCenter.x = pixiApp.renderer.width / 2
    screenCenter.y = pixiApp.renderer.height / 2

    // move player toward target
    if (target.x != player.x || target.y != player.y) {
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
    }

    pixiApp.stage.position.x = screenCenter.x
    pixiApp.stage.position.y = screenCenter.y
    pixiApp.stage.pivot.x = player.position.x
    pixiApp.stage.pivot.y = player.position.y
  }
</script>

<style>
  .pixi-container {
    width: 100%;
    height: 100%;
  }
</style>
