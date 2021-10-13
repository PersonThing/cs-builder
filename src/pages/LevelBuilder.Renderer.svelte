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
  import Player from '../classes/Player.js'
  import Block from '../classes/Block.js'
  import LevelGrid from '../classes/LevelGrid.js'

  let pixiContainer
  let pixiApp
  let world
  let player

  export let level
  export let screenTarget
  export let playable = false

  let mounted = false
  onMount(() => {
    pixiApp = new PIXI.Application({
      resizeTo: pixiContainer,
    })
    pixiContainer.appendChild(pixiApp.view)
    pixiApp.ticker.add(onTick)
    mounted = true
  })

  $: if (mounted && level != null) renderLevel(level)

  function renderLevel(level) {
    pixiApp.renderer.backgroundColor = rgbaStringToHex(level.backgroundColor)
    pixiApp.stage.children.forEach(c => pixiApp.stage.removeChild(c))

    // set level grid on stage so sprites can access it via hierarchy?
    pixiApp.stage.levelGrid = new LevelGrid($project, level, 40)

    world = new PIXI.Container()

    for (const blockConfig of level.blocks) {
      const block = new Block($project, blockConfig)
      world.addChild(block)
    }

    pixiApp.stage.addChild(world)

    player = new Player($project, $project.characters[0], 60, 60)
    pixiApp.stage.addChild(player)
  }

  const screenCenter = {
    x: 0,
    y: 0,
  }
  $: if (screenTarget.x != 0 || screenTarget.y != 0) setPlayerTarget()

  function setPlayerTarget() {
    const worldCoordinates = {
      x: screenTarget.x - screenCenter.x + player?.x ?? 0,
      y: screenTarget.y - screenCenter.y + player?.y ?? 0,
    }
    player.setTarget(worldCoordinates)
  }

  function onTick() {
    screenCenter.x = pixiApp.renderer.width / 2
    screenCenter.y = pixiApp.renderer.height / 2
    player.onTick()

    if (playable) {
      pixiApp.stage.x = screenCenter.x
      pixiApp.stage.y = screenCenter.y
      pixiApp.stage.pivot.x = player.x
      pixiApp.stage.pivot.y = player.y
    } else {
      pixiApp.stage.x = 0
      pixiApp.stage.y = 0
      pixiApp.stage.pivot.x = 0
      pixiApp.stage.pivot.y = 0
    }
  }
</script>

<style>
  .pixi-container {
    width: 100%;
    height: 100%;
  }
</style>
