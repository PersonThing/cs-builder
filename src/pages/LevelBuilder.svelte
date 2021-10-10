<AppLayout active="levels">
  <div class="col1">
    <ItemListNav slug="levels" type="level" collection={$project.levels} active={paramId} let:item>
      <div class="level-nav-item" style="background-image:url({item.thumbnail})">
        {item.name}
      </div>
    </ItemListNav>
  </div>
  <div class="grow">
    <div
      bind:this={pixiContainer}
      on:pointerdown|preventDefault={onPointerDown}
      on:pointerup|preventDefault={onPointerUp}
      on:pointermove|preventDefault={onPointerMove}
      on:contextmenu|preventDefault
    />
  </div>
  <div class="col2 rows">
    <div class="grow">
      <!-- Name, background, other settings -->
      <div>
        <label>Background color</label>
        <ColorPicker bind:value={backgroundColor} dropdownClass="below right" />
      </div>

      <div>
        <label>Block to draw</label>
        <InputSelect bind:value={selectedBlockId} options={blockOptions} let:option>
          <ArtThumb id={option.graphic} />
          {option.name}
        </InputSelect>
      </div>
    </div>
    <div class="grow">Properties of selected item, if any</div>
  </div>
</AppLayout>

<script>
  import { onMount } from 'svelte'
  import { rgbaStringToHex } from '../services/rgba-to-hex.js'
  import { sortByName } from '../services/object-utils'
  import AppLayout from '../components/AppLayout.svelte'
  import ArtThumb from '../components/ArtThumb.svelte'
  import ColorPicker from '../components/ColorPicker.svelte'
  import InputSelect from '../components/InputSelect.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import project from '../stores/active-project-store'

  export let params = {}
  $: paramId = decodeURIComponent(params.id) || 'new'

  let backgroundColor = 'rgba(0,0,0,1)'

  let selectedBlockId = 0
  $: blockOptions = Object.values($project.blocks)
    .map(b => ({
      ...b,
      value: b.id,
    }))
    .sort(sortByName)

  let sampleLevel = {
    blocks: [
      { x: 0, y: 0, blockId: 0 },
      { x: 1, y: 1, blockId: 0 },
      // { x: 0, y: 3, blockId: 0 },
      // { x: 2, y: 4, blockId: 0 },
      // { x: 3, y: 5, blockId: 0 },
      // { x: 4, y: 6, blockId: 1 },
      // { x: 1, y: 1, blockId: 1 },
      // { x: 1, y: 2, blockId: 1 },
    ],
    enemies: [],
  }

  let pixiContainer
  let pixiApp

  onMount(() => {
    pixiApp = new PIXI.Application()
    pixiContainer.appendChild(pixiApp.view)
  })

  $: if (pixiApp) renderLevel(sampleLevel, rgbaStringToHex(backgroundColor))

  function renderLevel(level, bgColor) {
    pixiApp.renderer.backgroundColor = bgColor
    pixiApp.stage.children.forEach(c => pixiApp.stage.removeChild(c))

    for (const blockConfig of level.blocks) {
      const block = $project.blocks[blockConfig.blockId]
      const art = $project.art[block.graphic]
      let blockSprite = PIXI.Sprite.from(art.png)
      blockSprite.x = blockConfig.x * art.width
      blockSprite.y = blockConfig.y * art.height
      pixiApp.stage.addChild(blockSprite)
    }
  }

  let pointerIsDown = false
  let isErasing = false
  function onPointerDown(event) {
    pointerIsDown = true
    isErasing = event.button != 0
    drawAtEvent(event)
  }

  function onPointerUp(event) {
    pointerIsDown = false
    isErasing = false
  }

  function onPointerMove(event) {
    if (pointerIsDown) {
      drawAtEvent(event)
    }
  }

  function drawAtEvent(event) {
    const x = Math.floor(event.offsetX / 40)
    const y = Math.floor(event.offsetY / 40)
    const blocksMinusAnyAtThisXY = sampleLevel.blocks.filter(b => b.x != x || b.y != y)
    if (isErasing) {
      sampleLevel.blocks = blocksMinusAnyAtThisXY
    } else {
      const newBlock = { x, y, blockId: selectedBlockId }
      sampleLevel.blocks = [...blocksMinusAnyAtThisXY, newBlock]
    }
  }
</script>

<style lang="scss">
  .level-nav-item {
    height: 60px;
    width: 100%;
    background-size: contain;
    background-position: 10px 20px;
    background-repeat: no-repeat;
  }
</style>
