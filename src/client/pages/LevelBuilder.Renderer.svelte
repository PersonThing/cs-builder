<svelte:window on:keydown={onKeyDown} on:keyup={onKeyUp} />

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
  import { abilities, art, tiles, characters, enemies, items, audio } from '../stores/project-stores.js'
  import Player from '../classes/Player.js'
  import Enemy from '../classes/Enemy.js'
  import Tile from '../classes/Tile.js'
  import Item from '../classes/Item.js'
  import LevelGrid from '../classes/LevelGrid.js'
  import abilityKeys from '../services/ability-keys.js'
  import * as PIXI from 'pixi.js'

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

  let keys = {}
  function onKeyDown(event) {
    const key = event.key
    if (abilityKeys.includes(key)) keys[key] = true
  }
  function onKeyUp(event) {
    const key = event.key
    if (abilityKeys.includes(key)) keys[key] = false

    if (key == 'Enter') {
      player.dead = false
      restartPixi()
    }
  }
  let pointerPosition = {
    x: 0,
    y: 0,
  }
  function onPixiPointerMove(e) {
    pointerPosition = {
      x: e.data.global.x - screenCenter.x + player?.x ?? 0,
      y: e.data.global.y - screenCenter.y + player?.y ?? 0,
    }
  }
  ////// end input

  function startPixi() {
    pixiApp = new PIXI.Application({
      resizeTo: pixiContainer,
    })
    PIXI.settings.ROUND_PIXELS = true
    pixiContainer.appendChild(pixiApp.view)
    pixiApp.ticker.add(onTick)
    pixiApp.stage.interactive = true
    pixiApp.stage.on('pointermove', onPixiPointerMove)

    renderLevel()
  }

  export function restartPixi() {
    if (pixiApp != null) {
      pixiApp.destroy()
      pixiContainer.childNodes.forEach(c => pixiContainer.removeChild(c))
      startPixi()
    }
  }

  export function redrawTiles() {
    emptyContainer(world.tileContainer)
    for (const tileConfig of level.tiles) {
      const bc = $tiles.find(b => b.id == tileConfig.id)
      if (bc == null) continue
      const tile = new Tile(
        bc,
        $art.find(a => a.id == bc.graphic),
        tileConfig,
        gridSize
      )
      world.tileContainer.addChild(tile)
    }
  }

  export function redrawItems() {
    emptyContainer(world.itemContainer)
    for (const itemConfig of level.items) {
      const ic = $items.find(i => i.id == itemConfig.id)
      const item = new Item(
        ic,
        $art.find(a => a.id == ic.graphics.still),
        $audio.find(au => au.id == ic.audioOnCollision),
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
      e.audioOnDeath = $audio.find(au => au.id == e.audioOnDeath)
      const enemy = new Enemy(
        world,
        // function to get enemies for enemies
        () => [player],
        e,
        buildGraphics(e.graphics),
        buildAbilities(e.abilities),
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
      container.removeChild(c)
      c.destroy()
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
      world.levelGrid = new LevelGrid($tiles, level, gridSize)
      world.tileContainer = new PIXI.Container()
      world.addChild(world.tileContainer)
      redrawTiles()

      world.itemContainer = new PIXI.Container()
      world.addChild(world.itemContainer)
      redrawItems()

      world.enemyContainer = new PIXI.Container()
      world.addChild(world.enemyContainer)
      redrawEnemies()

      world.projectileContainer = new PIXI.Container()
      world.addChild(world.projectileContainer)

      world.particleContainer = new PIXI.Container()
      world.addChild(world.particleContainer)

      pixiApp.stage.addChild(world)
      pixiApp.stage.sortableChildren = true // makes pixi automatically sort children by zIndex

      // create player
      if (playable && $characters.length > 0) {
        const charConfig = JSON.parse(JSON.stringify($characters[0]))
        player = new Player(
          world,
          // function to get enemies for player
          () => world.enemyContainer?.children.filter(e => e.config != null),
          charConfig,
          buildGraphics(charConfig.graphics),
          buildAbilities(charConfig.abilities),
          1.5 * gridSize,
          1.5 * gridSize,
          world.levelGrid,
          level.showPaths,
          pixiContainer.clientWidth,
          pixiContainer.clientHeight
        )
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

  function buildAbilities(charAbilities) {
    return charAbilities.map(charAbility => {
      const ability = $abilities.find(ab => ab.id == charAbility.id)
      return {
        ...ability,
        key: charAbility.key,
        projectileArt: $art.find(ar => ar.id == ability.graphic),
        particleArt: $art.find(ar => ar.id == ability.particleGraphic),
        characterArt: $art.find(ar => ar.id == charAbility.characterArt),
        audioOnUse: $audio.find(au => au.id == ability.audioOnUse),
        audioOnHit: $audio.find(au => au.id == ability.audioOnHit),
        nextFire: 0,
      }
    })
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
    if (playable) {
      if (player?.dead) {
        drawGameOverScreen()
        pixiApp.ticker.stop()
        return
      }
      const time = performance.now()
      player?.onTick(time, keys, pointerPosition)
      centerViewOnPlayer()
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
          enemy.onTick(time)
        })

      world?.projectileContainer?.children.forEach(projectile => projectile.onTick(time))
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
      if (item.config.playersCanUse && player) checkAndHandleItemCollision(player, item)

      if (item.config.enemiesCanUse) {
        world.enemyContainer.children.filter(e => e.config != null).forEach(enemy => checkAndHandleItemCollision(enemy, item))
      }
    })
  }

  function checkAndHandleItemCollision(sprite, item) {
    if (sprite.isTouching(item)) {
      item.onCollision(sprite, world)
      if (item.config.removeOnCollision) {
        world.itemContainer.removeChild(item)
        item.destroy()
      }
    }
  }

  function movePlayerToEvent(event) {
    screenTarget = {
      x: event.offsetX,
      y: event.offsetY,
    }
  }

  function drawGameOverScreen() {
    // const graphics = new PIXI.Graphics()
    // graphics.beginFill(0x000000, 0.5)
    // graphics.drawRect(0, 0, pixiContainer.clientWidth, pixiContainer.clientHeight)
    // graphics.zIndex = 10
    // pixiApp.stage.addChild(graphics)
    // const text = new PIXI.Text('Press enter to restart', { fontFamily: 'Arial', fontSize: 50, fill: 0xffffff })
    // text.x = 100 // screenCenter.x - text.width / 2
    // text.y = 100 // screenCenter.y - text.height / 2
  }
</script>

<style>
  .pixi-container {
    width: 100%;
    height: 100%;
  }
</style>
