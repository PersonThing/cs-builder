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
  import Enemy from '../classes/Enemy.js'
  import Block from '../classes/Block.js'
  import Item from '../classes/Item.js'
  import LevelGrid from '../classes/LevelGrid.js'
  import isTouching from '../services/hit-test.js'

  let pixiContainer
  let pixiApp
  let world
  let player
  let itemContainer
  let blockContainer
  let enemyContainer

  let levelGrid

  export let level
  export let screenTarget
  export let playable = false
  export let gridSize

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
    // set background color and clear stage whenever we re-render level (this should only be called once when playing levels, or any time the level is changed when editing levels)
    pixiApp.renderer.backgroundColor = rgbaStringToHex(level.backgroundColor)
    pixiApp.stage.children.forEach(c => pixiApp.stage.removeChild(c))

    // level grid helper for pathing
    levelGrid = new LevelGrid($project, level, gridSize)

    // world contains everything but player
    world = new PIXI.Container()

    // create blocks
    blockContainer = new PIXI.Container()
    for (const blockConfig of level.blocks) {
      const block = new Block($project, blockConfig, gridSize)
      blockContainer.addChild(block)
    }
    world.addChild(blockContainer)

    // create items
    itemContainer = new PIXI.Container()
    for (const itemConfig of level.items) {
      const item = new Item($project, itemConfig, gridSize)
      itemContainer.addChild(item)
    }
    world.addChild(itemContainer)

    enemyContainer = new PIXI.Container()
    for (const enemyConfig of level.enemies) {
      const enemy = new Enemy(
        $project,
        $project.enemies[enemyConfig.id],
        enemyConfig.x * gridSize,
        enemyConfig.y * gridSize,
        levelGrid,
        level.showPaths
      )
      enemyContainer.addChild(enemy)
    }
    world.addChild(enemyContainer)

    pixiApp.stage.addChild(world)
    pixiApp.stage.sortableChildren = true // makes pixi automatically sort children by zIndex

    // create player
    player = new Player($project, $project.characters[0], 1.5 * gridSize, 1.5 * gridSize, levelGrid, level.showPaths)
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

  let enemyFrames = 0
  function onTick() {
    player.onTick()
    centerViewOnPlayer()

    enemyContainer.children
      .filter(e => e.config != null)
      .forEach(enemy => {
        // shouldn't change target each frame.. should only do it if target position changed
        enemy.setTarget(player)
        enemy.onTick()
      })
    checkCollisions()
  }

  function centerViewOnPlayer() {
    screenCenter.x = pixiApp.renderer.width / 2
    screenCenter.y = pixiApp.renderer.height / 2

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

  function checkCollisions() {
    itemContainer.children.forEach(item => {
      if (isTouching(item, player)) {
        item.onCollision(player)
        if (item.config.removeOnCollision) itemContainer.removeChild(item)
      }
    })
  }
</script>

<style>
  .pixi-container {
    width: 100%;
    height: 100%;
  }
</style>
