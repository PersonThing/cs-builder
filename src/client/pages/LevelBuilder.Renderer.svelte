<div
  bind:this={pixiContainer}
  class="pixi-container"
  on:pointerdown|preventDefault={onPointerDown}
  on:pointerup|preventDefault={onPointerUp}
  on:pointermove|preventDefault={onPointerMove}
  on:contextmenu|preventDefault
/>

<!-- <div style="position: absolute; top: 10px; left: 10px; color: red;">{debugInfo}</div> -->
<script>
  import { createEventDispatcher } from 'svelte'
  import { rgbaStringToHex } from '../services/rgba-to-hex.js'
  import { art, blocks, characters, enemies, items } from '../stores/project-stores.js'
  import Player from '../classes/Player.js'
  import Enemy from '../classes/Enemy.js'
  import Block from '../classes/Block.js'
  import Item from '../classes/Item.js'
  import LevelGrid from '../classes/LevelGrid.js'

  const dispatch = createEventDispatcher()

  let pixiContainer
  let pixiApp
  let world
  let player

  let screenTarget = {
    x: 0,
    y: 0,
  }

  export let level
  export let playable = false
  export let gridSize

  $: if (pixiContainer != null) startPixi()

  ////// input
  let pointerIsDown = false
  function onPointerDown(event) {
    pointerIsDown = true
    if (playable) movePlayerToEvent(event)
    dispatch('pointerdown', event)
  }

  function onPointerMove(event) {
    if (playable && pointerIsDown) movePlayerToEvent(event)
    dispatch('pointermove', event)
  }

  function onPointerUp(event) {
    pointerIsDown = false
    dispatch('pointerup', event)
  }

  function movePlayerToEvent(event) {
    screenTarget = {
      x: event.offsetX,
      y: event.offsetY,
    }
  }
  ////// end input

  function startPixi() {
    pixiApp = new PIXI.Application({
      resizeTo: pixiContainer,
    })
    pixiContainer.appendChild(pixiApp.view)
    pixiApp.ticker.add(onTick)

    renderLevel()
  }

  export function restartPixi() {
    pixiApp.destroy()
    pixiContainer.childNodes.forEach(c => pixiContainer.removeChild(c))
    startPixi()
  }

  export function redrawBlocks() {
    emptyContainer(world.blockContainer)
    for (const blockConfig of level.blocks) {
      const bc = $blocks.find(b => b.id == blockConfig.id)
      if (bc == null) continue

      const block = new Block(
        bc,
        $art.find(a => a.id == bc.graphic),
        blockConfig,
        gridSize
      )
      world.blockContainer.addChild(block)
    }
  }

  export function redrawItems() {
    emptyContainer(world.itemContainer)
    for (const itemConfig of level.items) {
      const ic = $items.find(i => i.id == itemConfig.id)
      const item = new Item(
        ic,
        $art.find(a => a.id == ic.graphics.still),
        itemConfig,
        gridSize
      )
      world.itemContainer.addChild(item)
    }
  }

  export function redrawEnemies() {
    emptyContainer(world.enemyContainer)
    for (const enemyConfig of level.enemies) {
      const e = $enemies.find(e => e.id == enemyConfig.id)
      const enemy = new Enemy(
        buildGraphics(e.graphics),
        e,
        enemyConfig.x * gridSize + gridSize / 2,
        enemyConfig.y * gridSize + gridSize / 2,
        world.levelGrid,
        level.showPaths,
        level.showSightRadius
      )
      world.enemyContainer.addChild(enemy)
    }
  }

  function emptyContainer(container) {
    container?.children.forEach(c => {
      c.destroy()
      container.removeChild(c)
    })
  }

  function renderLevel() {
    // clear pixi stage to re-render everything
    emptyContainer(pixiApp.stage)

    // preload art
    preloadArt().then(() => {
      // set background color and clear stage whenever we re-render level (this should only be called once when playing levels, or any time the level is changed when editing levels)
      pixiApp.renderer.backgroundColor = rgbaStringToHex(level.backgroundColor)

      // world contains everything but player
      world = new PIXI.Container()
      // helper for pathing - set on world so collisions and other places can access it
      world.levelGrid = new LevelGrid($blocks, level, gridSize)
      world.blockContainer = new PIXI.Container()
      world.addChild(world.blockContainer)
      redrawBlocks()

      world.itemContainer = new PIXI.Container()
      world.addChild(world.itemContainer)
      redrawItems()

      world.enemyContainer = new PIXI.Container()
      world.addChild(world.enemyContainer)
      redrawEnemies()

      pixiApp.stage.addChild(world)
      pixiApp.stage.sortableChildren = true // makes pixi automatically sort children by zIndex

      // create player
      if ($characters.length > 0) {
        const char = $characters[0]
        player = new Player(buildGraphics(char.graphics), char, 1.5 * gridSize, 1.5 * gridSize, world.levelGrid, level.showPaths)
        pixiApp.stage.addChild(player)
      }
    })
  }

  function preloadArt() {
    return new Promise((resolve, reject) => {
      const loader = new PIXI.Loader()
      $art.forEach(a => {
        loader.add(a.png)
        loader.onError.add(err => console.log('art loader failed', err))
      })
      loader.load(resolve)
    })
  }

  function buildGraphics(graphicIds) {
    const graphics = {}
    Object.keys(graphicIds).forEach(key => {
      graphics[key] = $art.find(a => a.id == graphicIds[key])
    })
    return graphics
  }

  const screenCenter = {
    x: 0,
    y: 0,
  }
  $: if (screenTarget.x != 0 || screenTarget.y != 0) setPlayerTarget()

  function setPlayerTarget() {
    if (player == null) return
    const worldCoordinates = {
      x: screenTarget.x - screenCenter.x + player?.x ?? 0,
      y: screenTarget.y - screenCenter.y + player?.y ?? 0,
    }
    player.setTarget(worldCoordinates)
  }

  function onTick() {
    player?.onTick()
    centerViewOnPlayer()

    if (playable) {
      world?.enemyContainer?.children
        .filter(e => e.config != null)
        .forEach(enemy => {
          // if enemy can see player, target player
          // otherwise clear their target
          if (enemy.canSee(player)) {
            enemy.setTarget(player)
          } else {
            enemy.clearPathAfterCurrentTarget()
          }
          enemy.onTick()
        })

      checkCollisions()
    }
  }

  function centerViewOnPlayer() {
    screenCenter.x = pixiApp.renderer.width / 2
    screenCenter.y = pixiApp.renderer.height / 2

    if (playable && player) {
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
    world?.itemContainer?.children.forEach(item => {
      if (item.config.playersCanUse) {
        if (player.isTouchingRadius(item)) {
          item.onCollision(player, world)
          if (item.config.removeOnCollision) world.itemContainer.removeChild(item)
        }
      }

      if (item.config.enemiesCanUse) {
        world.enemyContainer.children
          .filter(e => e.config != null)
          .forEach(enemy => {
            if (enemy.isTouchingRadius(item)) {
              item.onCollision(enemy, world)
              if (item.config.removeOnCollision) world.itemContainer.removeChild(item)
            }
          })
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
