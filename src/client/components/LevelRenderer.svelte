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
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { rgbaStringToHex } from '../services/rgba-to-hex.js'
  import { art, tiles, characterclasses } from '../stores/project-stores.js'
  import GUI from '../classes/GUI.js'
  import World from '../classes/World.js'
  import emptyContainer from '../services/empty-container.js'
  import LevelGrid from '../classes/LevelGrid.js'
  import abilityKeys from '../services/ability-keys.js'
  import * as PIXI from 'pixi.js'

  const dispatch = createEventDispatcher()

  let pixiContainer
  let pixiApp
  let world
  let player
  let gui

  let screenTarget = {
    x: 0,
    y: 0,
  }

  export let level
  export let character
  export let playable = false
  export let gridSize

  $: if (pixiContainer != null) startPixi()

  ////// input
  let pointerIsDown = false
  function onPointerDown(event) {
    pointerIsDown = true
    if (playable) setScreenTargetToEvent(event)
    dispatch('pointerdown', event)
  }

  function onPointerMove(event) {
    if (playable && pointerIsDown) setScreenTargetToEvent(event)
    dispatch('pointermove', event)
  }

  function onPointerUp(event) {
    pointerIsDown = false
    dispatch('pointerup', event)
  }

  let keys = {}
  function onKeyDown(event) {
    const key = event.key
    if (abilityKeys.includes(key)) {
      keys[key] = true
    }
    if (key === 'b') {
      gui.toggleInventory()
    }
  }
  function onKeyUp(event) {
    const key = event.key
    if (abilityKeys.includes(key)) {
      keys[key] = false
    }

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

  onDestroy(() => {
    pixiApp.destroy()
  })

  export function restartPixi() {
    if (pixiApp != null) {
      pixiApp.destroy()
      pixiContainer.childNodes.forEach(c => pixiContainer.removeChild(c))
      startPixi()
    }
  }

  export function getWorld() {
    return world
  }

  function renderLevel() {
    // clear pixi stage to re-render everything
    emptyContainer(pixiApp.stage)

    // preload art
    preloadArt().then(() => {
      // set background color and clear stage whenever we re-render level (this should only be called once when playing levels, or any time the level is changed when editing levels)
      pixiApp.renderer.backgroundColor = rgbaStringToHex(level.backgroundColor)

      // helper for pathing - set on world so collisions and other places can access it
      const levelGrid = new LevelGrid($tiles, level, gridSize)

      // world contains everything
      world = new World(levelGrid, level)
      pixiApp.stage.addChild(world)
      pixiApp.stage.sortableChildren = true // makes pixi automatically sort children by zIndex

      // create player
      if (playable && $characterclasses.length > 0) {
        const charConfig = JSON.parse(JSON.stringify($characterclasses.find(cc => cc.id == character.classId)))
        player = world.createPlayer(charConfig)
        gui = new GUI(player, pixiApp.renderer.width, pixiApp.renderer.height)
        gui.x = 0
        gui.y = 0
        pixiApp.stage.addChild(gui)
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
    if (playable && world && player) {
      if (player.dead) {
        gui.showDeathScreen()
        pixiApp.ticker.stop()
        return
      }
      screenCenter.x = pixiApp.renderer.width / 2
      screenCenter.y = pixiApp.renderer.height / 2
      world.centerViewOnPlayer(screenCenter)
      world.onTick(pointerPosition, keys)
    }
  }

  function setScreenTargetToEvent(event) {
    screenTarget = {
      x: event.offsetX,
      y: event.offsetY,
    }
  }
</script>

<style>
  .pixi-container {
    width: 100%;
    height: 100%;
  }
</style>
