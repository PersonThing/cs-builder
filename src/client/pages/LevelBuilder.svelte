<ItemTypeBuilder
  id={params.id}
  itemType="levels"
  store={levels}
  {itemTemplate}
  bind:input
  bind:this={itemTypeBuilder}
  {getItemGraphic}
  showButtons={false}
  let:isAdding
  let:hasChanges
>
  {#if input != null}
    <div class="level-builder-container">
      <div class="grow relative">
        <div class="btn-group play-edit-toggle">
          <button type="button" class="btn {!$isDrawing ? 'btn-success' : ''}" on:click={() => ($isDrawing = false)}>Play</button>
          <button type="button" class="btn {$isDrawing ? 'btn-success' : ''}" on:click={() => ($isDrawing = true)}>Edit</button>
        </div>
        {#if $isDrawing}
          <LevelRenderer
            level={input}
            playable={false}
            {gridSize}
            bind:this={levelRenderer}
            on:pointerdown={onDrawPointerDown}
            on:pointerup={onDrawPointerUp}
            on:pointermove={onDrawPointerMove}
          />
        {:else}
          <LevelRenderer level={input} playable {gridSize} bind:this={levelRenderer} />
        {/if}
      </div>

      <div class="col2 p1">
        <FormButtons {hasChanges} canDelete={!isAdding} on:delete={del}>
          <div class="grow" />
        </FormButtons>

        <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
        <div class="form-group">
          <label>Background color</label>
          <ColorPicker bind:value={input.backgroundColor} dropdownClass="below right" />
        </div>
        <FieldCheckbox bind:checked={input.smoothPathing} name="smooth-pathing" on:change={forceRender}>Smooth pathing</FieldCheckbox>
        <FieldCheckbox bind:checked={input.showPaths} name="show-paths" on:change={forceRender}>Show paths</FieldCheckbox>
        <FieldCheckbox bind:checked={input.showSightRadius} name="show-sight-radius" on:change={forceRender}>Show sight radius</FieldCheckbox>

        {#if $isDrawing}
          <div class="flex-column">
            <div class="draw-option" class:selected={drawMode == DrawMode.Blocks} on:click={() => setDrawMode(DrawMode.Blocks)}>
              <div class="form-group">
                <label>Place a block</label>
                <InputSelect bind:value={selectedBlockId} options={blockOptions} let:option>
                  {#if option.graphic != null}
                    <ArtThumb id={option.graphic} />
                  {/if}
                  {option.name}
                </InputSelect>
              </div>
            </div>

            <div class="draw-option" class:selected={drawMode == DrawMode.Items} on:click={() => setDrawMode(DrawMode.Items)}>
              <div class="form-group">
                <label>Place an item</label>
                <InputSelect bind:value={selectedItemId} options={itemOptions} let:option>
                  {#if option.graphics?.still != null}
                    <ArtThumb id={option.graphics.still} />
                  {/if}
                  {option.name}
                </InputSelect>
              </div>
            </div>

            <div class="draw-option" class:selected={drawMode == DrawMode.Enemies} on:click={() => setDrawMode(DrawMode.Enemies)}>
              <div class="form-group">
                <label>Place an enemy</label>
                <InputSelect bind:value={selectedEnemyId} options={enemyOptions} let:option>
                  {#if option.graphics?.still != null}
                    <ArtThumb id={option.graphics.still} />
                  {/if}
                  {option.name}
                </InputSelect>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</ItemTypeBuilder>

<script>
  //////////// common ItemTypeBuilder stuff ////////////
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'

  export let params = {}
  let input = null

  const itemTemplate = {
    name: '',
    backgroundColor: 'rgba(0,0,0,1)',
    smoothPathing: false,
    showPaths: true,
    showSightRadius: true,
    blocks: [],
    items: [],
    enemies: [],
  }

  function getItemGraphic(item) {
    return $characters.length ? $characters[0].graphics.still : null
  }

  //////////// things unique to level builder ////////////
  import { blocks, enemies, items, characters, levels } from '../stores/project-stores'
  import { sortByName } from '../services/object-utils'
  import ArtThumb from '../components/ArtThumb.svelte'
  import ColorPicker from '../components/ColorPicker.svelte'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'
  import FieldText from '../components/FieldText.svelte'
  import FormButtons from '../components/FormButtons.svelte'
  import InputSelect from '../components/InputSelect.svelte'
  import LevelRenderer from './LevelBuilder.Renderer.svelte'
  import LocalStorageStore from '../stores/local-storage-store'

  let itemTypeBuilder

  const gridSize = 40
  const DrawMode = {
    Blocks: 0,
    Items: 1,
    Enemies: 2,
  }

  let isDrawing = LocalStorageStore('is-drawing', false)
  let levelRenderer
  let selectedBlockId = 0
  let selectedItemId = null
  let selectedEnemyId = null
  let drawMode = DrawMode.Blocks
  let pointerIsDown = false

  $: blockOptions = [
    { value: null, name: 'Erase blocks' },
    ...$blocks
      .map(b => ({
        ...b,
        value: b.id,
      }))
      .sort(sortByName),
  ]

  $: itemOptions = [
    { value: null, name: 'Erase items' },
    ...$items
      .map(i => ({
        ...i,
        value: i.id,
      }))
      .sort(sortByName),
  ]

  $: enemyOptions = [
    { value: null, name: 'Erase enemies' },
    ...$enemies
      .map(i => ({
        ...i,
        value: i.id,
      }))
      .sort(sortByName),
  ]

  function forceRender() {
    // this works if nothing else
    // let inputC = JSON.parse(JSON.stringify(input))
    // input = null
    // await tick()
    // input = inputC

    levelRenderer.restartPixi()
  }

  function onDrawPointerDown(event) {
    pointerIsDown = true
    // if they do anything but left click, select the block at the current position (or eraser if null)
    if (event.detail.button != 0) {
      const { x, y } = getBlockCoordsFromEvent(event)
      switch (drawMode) {
        case DrawMode.Blocks:
          selectedBlockId = input.blocks.find(b => b.x == x && b.y == y)?.id
          break
        case DrawMode.Items:
          selectedItemId = input.items.find(i => i.x == x && i.y == y)?.id
          break
        case DrawMode.Enemies:
          selectedEnemyId = input.enemies.find(i => i.x == x && i.y == y)?.id
          break
      }
    } else {
      drawAtEvent(event)
    }
  }

  function onDrawPointerMove(event) {
    if (!pointerIsDown) return
    drawAtEvent(event)
  }

  function onDrawPointerUp(event) {
    pointerIsDown = false
  }

  function getBlockCoordsFromEvent(event) {
    return {
      x: Math.floor(event.detail.offsetX / gridSize),
      y: Math.floor(event.detail.offsetY / gridSize),
    }
  }

  function drawAtEvent(event) {
    const { x, y } = getBlockCoordsFromEvent(event)
    switch (drawMode) {
      case DrawMode.Blocks:
        input.blocks = replaceAtCoord(input.blocks, x, y, selectedBlockId)
        levelRenderer.redrawBlocks()
        break
      case DrawMode.Items:
        input.items = replaceAtCoord(input.items, x, y, selectedItemId)
        levelRenderer.redrawItems()
        break
      case DrawMode.Enemies:
        input.enemies = replaceAtCoord(input.enemies, x, y, selectedEnemyId)
        levelRenderer.redrawEnemies()
        break
    }
  }

  function replaceAtCoord(objects, x, y, id) {
    const objectsMinusAnyAtThisXY = objects
      // filter out blocks at THIS spot
      .filter(o => o.x != x || o.y != y)
      // also filter blocks that are in negative space (messes with grid path helper)
      .filter(b => b.x >= 0 && b.y >= 0)
    if (id == null) {
      objects = objectsMinusAnyAtThisXY
    } else {
      const newObject = { x, y, id }
      objects = [...objectsMinusAnyAtThisXY, newObject].sort((a, b) => (a.x == b.x ? a.y - b.y : a.x - b.x))
    }
    return objects
  }

  function setDrawMode(dm) {
    drawMode = dm
  }

  function del() {
    itemTypeBuilder(del())
  }
</script>

<style lang="scss">
  .level-builder-container {
    height: calc(100vh - 60px);
    display: flex;
    flex-direction: row;
    flex: 1;
    margin-bottom: 10px;
  }

  .draw-option {
    border: 2px solid transparent;
    border-radius: 5px;
    margin-bottom: 10px;
    padding: 5px 5px 5px 35px;
    cursor: pointer;
    position: relative;

    &.selected {
      border-color: rgb(0, 119, 255);
      background: rgba(0, 119, 200, 0.1);

      &::after {
        content: '';
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        left: 13px;
        border: 8px solid transparent;
        border-left-color: rgb(0, 119, 255);
      }
    }

    .form-group {
      margin-bottom: 0;
    }
  }

  .play-edit-toggle {
    background: rgba(255, 255, 255, 0.3);
    position: absolute;
    top: 0;
    right: 0;
    padding: 5px;
  }
</style>
