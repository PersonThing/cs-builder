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

  export let level

  onMount(() => {
    pixiApp = new PIXI.Application({
      resizeTo: pixiContainer,
    })
    pixiContainer.appendChild(pixiApp.view)
  })

  $: if (pixiApp && level) renderLevel(level)

  function renderLevel(level) {
    pixiApp.renderer.backgroundColor = rgbaStringToHex(level.backgroundColor)
    pixiApp.stage.children.filter(c => c.template != null).forEach(c => pixiApp.stage.removeChild(c))

    for (const blockConfig of level.blocks) {
      const block = $project.blocks[blockConfig.blockId]
      const art = $project.art[block.graphic]
      let blockSprite = PIXI.Sprite.from(art.png)
      blockSprite.x = blockConfig.x * art.width
      blockSprite.y = blockConfig.y * art.height
      blockSprite.template = block
      pixiApp.stage.addChild(blockSprite)
    }

    renderPlayer()
  }

  PIXI.Sprite.prototype.bringToFront = function () {
    if (this.parent) {
      const parent = this.parent
      parent.removeChild(this)
      parent.addChild(this)
    }
  }

  let playerSprite = null
  function renderPlayer() {
    if (playerSprite) {
      playerSprite.bringToFront()
      return
    }

    // temp code to render a playable sprite
    // render the player sprite
    const player = $project.characters[0]
    const playerArt = $project.art[player.graphics.still]
    playerSprite = PIXI.Sprite.from(playerArt.png)
    playerSprite.x = 0
    playerSprite.y = 0
    pixiApp.stage.addChild(playerSprite)

    // pixiApp.stage.interactive = true
    // pixiApp.stage.mousemove = event => {
    //   console.log('mousemove', event)
    // }

    // pixiApp.renderer.plugins.interaction.on('mousedown', event => {
    //   console.log('pixi mousedown', event)
    // })
  }
</script>

<style>
  .pixi-container {
    width: 100%;
    height: 100%;
  }
</style>
